# Webpresa — Operations Runbooks

**Last updated:** 2026-08-14

Stage 24 operational runbooks. Each entry covers a failure mode this app can actually produce, based on the real architecture documented in `architecture.md` and the real incidents recorded in `deployment.md`/`build_log.md` — not a generic incident-response template.

`/admin/operations` is the primary place to look first: it surfaces failed/stale scans, scan executions, postcards, lead notifications, and Stripe webhook failures directly from the durable records these systems already keep, with safe recovery buttons where one genuinely exists. These runbooks are for the failure modes that page can't fully resolve on its own, or that require AWS/Vercel/provider-console access to fix.

**Where structured logs actually live:** `web/lib/logging/log.ts` events are emitted by Next.js code running on Vercel, not inside AWS. There is no Vercel→CloudWatch log drain in this project, so those logs are visible in Vercel's own log viewer/CLI (`vercel logs <deployment-url>`), never in CloudWatch. Only the two real Lambdas (`screenshot-capture`, `postcard-render`) and Step Functions have genuine CloudWatch Logs/metrics — see the CloudWatch dashboard at `webpresa-{env}-operations` for those.

**Retry vs. replay vs. rerun**, used throughout this document (see `implementation.md`, Stage 24, "Preserve existing recovery semantics"):
- **Automatic retry** — bounded, in-process, transient-failure handling inside one attempt. Already exists for Firecrawl (`lib/firecrawl/retry.ts`) and Step Functions tasks (`scan-workflow-stack.ts`'s `addRetry`). Never admin-triggered.
- **Replay** — re-processing an already-received durable event. Only Lob webhooks have a durable event store (`PostcardWebhookEvent`) that could support this in principle; nothing currently replays it automatically. Stripe webhooks have no durable event to replay (see item 7).
- **Rerun** — a brand-new historical attempt (`ScanEvent`/`ScanExecution`), never mutating a prior terminal record. This is what `/admin/operations`' "Retry"/"Rerun" buttons actually do.

---

## 1. Step Functions scan workflow fails immediately

**Symptoms:** A `ScanExecution` goes straight from `queued`/`running` to `failed` within seconds of being started, `failure.step === 'initializing'`.

**Likely cause:** `StartExecutionCommand` itself threw — usually a missing/wrong `SCAN_WORKFLOW_STATE_MACHINE_ARN` Vercel env var, or `webpresa-vercel-{env}` missing `states:StartExecution` (see `lib/workflow/run-scan-workflow.ts`'s `startExecution()`).

**How to verify:** Check `/admin/operations` or the business's Workflow section for the `failure.safeMessage`. Confirm the env var: `aws cloudformation describe-stacks --stack-name WebpresaDevScanWorkflowStack --profile webpresa-dev --query "Stacks[0].Outputs"`. Confirm the IAM grant: `aws iam get-policy-version` on `webpresa-{env}-vercel-compute-invoke` (see `deployment.md`, "AWS credentials for Vercel").

**Safe recovery:** Fix the env var/IAM grant, then use `/admin/operations`' rerun button (or the business page's "Rerun") — always creates a fresh `ScanExecution`, never resets the failed one.

**Retry/replay/rerun:** Rerun only — `failure.retryEligible: true` for this category (`internal`), matching `isWorkflowFailureRetryable`.

**Confirm recovery:** The new `ScanExecution` reaches `running` and its `executionArn` is populated.

---

## 2. EventBridge Connection becomes unauthorized

**Symptoms:** Every Step Functions task fails with `States.Http.StatusCode.401` on the first attempt, then `Events.ConnectionResource.InvalidConnectionState` on every retry after EventBridge marks the Connection `DEAUTHORIZED`.

**Likely cause:** The `internal-api` Secrets Manager secret was rotated/populated *after* the EventBridge Connection (`webpresa-{env}-internal-api`) was already created — the Connection bakes the credential into its own AWS-managed secret at creation time and never re-reads the source secret. This exact incident already happened in prod on 2026-08-12 — see `deployment.md`, "Redeploy after rotating internal-api/capture-token/vercel-protection-bypass".

**How to verify:** `aws events describe-connection --name webpresa-{env}-internal-api --profile webpresa-{env}` — check `ConnectionState`.

**Safe recovery:** `aws events update-connection` with the current `internal-api` secret value (no CDK change needed — the Connection resource itself is unchanged, just its live credential). See `deployment.md` for the exact command shape.

**Retry/replay/rerun:** Not applicable to the Connection itself. Once fixed, rerun any `ScanExecution`s that failed while it was down.

**Confirm recovery:** `ConnectionState` returns to `AUTHORIZED`; a fresh scan workflow run completes past its first `HttpInvoke` task.

---

## 3. Screenshot Lambda captures Webpresa's login/404 page instead of the preview

**Symptoms:** A `generated_preview` `ScanEvent` reports `status: completed` — a screenshot genuinely exists in S3 — but opening it shows Vercel's login page or Webpresa's own 404, not the actual business preview.

**Likely cause:** The screenshot Lambda minted a capture token using a stale `capture-token` signing key (secret rotated but the Lambda's warm execution environments never re-fetched it), so `verifyCaptureToken()` fails and `resolvePreview()` falls through to `notFound()`. This is invisible from the `ScanEvent` status alone — the only way to catch it is opening the image. Real incident: `deployment.md`, "Redeploy after rotating internal-api/capture-token/vercel-protection-bypass", 2026-08-12.

**How to verify:** Open the actual screenshot image (admin business page → Scans → the `generated_preview` scan's stored image via its signed URL).

**Safe recovery:** Redeploy the screenshot stack to force new execution environments that re-fetch the current secret: `npm run deploy:screenshot` (or `:prod`) — a no-op `cdk deploy` won't force this since nothing else about the stack changed; bump something trivial if needed. Then trigger a fresh `generated_preview` capture.

**Retry/replay/rerun:** Rerun (a fresh capture creates a new `ScanEvent`) — never trust the old "completed" result once this is suspected.

**Confirm recovery:** Open the new capture's image and confirm it shows the real business preview.

---

## 4. Screenshot scan becomes stale/stuck

**Symptoms:** A `ScanEvent` (`provider: 'playwright'`) sits `queued`/`running` for well past the time a capture should take.

**Likely cause:** The Lambda invocation was dropped, crashed before writing any status, or the async invocation itself never actually reached the Lambda.

**How to verify:** `/admin/operations` surfaces this automatically once the scan exceeds `STALE_SCAN_THRESHOLD_MS` (10 minutes — `lib/screenshots/capture.ts`). The business page's Screenshots section also shows an amber "stale" banner.

**Safe recovery:** Click "Mark as failed" (`markStaleScanFailedAction`) on `/admin/operations` or the business page — this is the existing, already-safe admin override; it re-validates staleness server-side before transitioning. Then start a fresh capture.

**Retry/replay/rerun:** The stale scan is marked `failed` in place (the one deliberate exception to "never mutate a non-terminal record", since the scan isn't yet terminal); the actual retry is a brand-new capture/`ScanEvent`.

**Confirm recovery:** The stale `ScanEvent` shows `status: failed`; a newly started capture completes normally.

---

## 5. Screenshot DLQ contains a failed invocation

**Symptoms:** `/admin/operations`' System Status shows a non-zero screenshot DLQ depth, or the `webpresa-{env}-screenshot-lambda-errors`/`-screenshot-dlq-depth` CloudWatch alarms are in `ALARM` state.

**Likely cause:** The Lambda's async invocation failed at the platform level (threw before writing any `ScanEvent` status, or exceeded `maxEventAge` of 10 minutes before running at all) — automatic Lambda retries are deliberately disabled (`MaximumRetryAttempts: 0`), so this is the only failure path such an invocation takes.

**How to verify:** `/admin/operations` reports the depth (read-only `sqs:GetQueueAttributes`, via `lib/sqs/dlq.ts`). To inspect actual message contents (not just depth), use the AWS Console/CLI against the queue URL — this app has no in-app message viewer, deliberately: `aws sqs receive-message --queue-url <url> --profile webpresa-{env}` (does not delete the message; use `--visibility-timeout 0` and don't call `delete-message` if you just want to look).

**Safe recovery:** The message payload is `{ businessId, scanId, targetType, previewId? }` — enough to identify the affected `ScanEvent` directly. That `ScanEvent` almost always also shows up as stale (see item 4) since nothing else updated it — use the same "Mark as failed" → fresh capture path. There is no automated DLQ consumer/redrive in this design (see implementation.md, Stage 24, "Dead-letter queues") — this stage exposes the existing gap operationally rather than redesigning the workflow around queue redrive.

**Retry/replay/rerun:** Rerun (fresh capture) for the affected business, once identified via the DLQ message or the corresponding stale `ScanEvent`.

**Confirm recovery:** DLQ depth returns to 0 after the investigation (messages age out after 14 days if left alone); the affected business has a successful capture.

---

## 6. Screenshot Lambda container image was updated but the Lambda is running stale code

**Symptoms:** A code fix to `infra/lambda/screenshot-capture/src/**` was built and pushed, but captures still exhibit the old bug.

**Likely cause:** This Lambda is pinned to the ECR `:latest` tag, not a digest. `DockerImageCode.fromEcr(repository, { tagOrDigest: 'latest' })` embeds the literal string `...:latest` in the CloudFormation template — CloudFormation can't detect the underlying image content changed, so a plain `cdk deploy` reports `(no changes)` even right after a real push. Confirmed the hard way — see `deployment.md`, "Chromium-on-real-Lambda fixes".

**How to verify:** `aws lambda get-function --function-name webpresa-{env}-screenshot-capture --profile webpresa-{env} --query 'Configuration.CodeSha256'` — compare against the digest of the image you just pushed (`aws ecr describe-images`).

**Safe recovery:** Force the update directly, bypassing `cdk deploy`:
```bash
aws lambda update-function-code \
  --function-name webpresa-{env}-screenshot-capture \
  --image-uri <account>.dkr.ecr.<region>.amazonaws.com/webpresa-{env}-screenshot-capture:latest \
  --profile webpresa-{env} --region us-east-1
aws lambda wait function-updated --function-name webpresa-{env}-screenshot-capture --profile webpresa-{env}
```

**Retry/replay/rerun:** Not applicable — this is a deployment-hygiene issue, not a data-recovery one. Once the function is confirmed updated, a fresh capture exercises the new code.

**Confirm recovery:** `CodeSha256` matches the freshly pushed image; a fresh capture no longer shows the old bug.

---

## 7. Stripe webhook processing fails

**Symptoms:** A `StripeWebhookFailure` item appears on `/admin/operations` (category `stripe_webhook`).

**Likely cause — `invalid_signature`:** The `webpresa-{env}-stripe` secret's `webhookSecret` doesn't match what's registered in Stripe's dashboard/CLI for this endpoint — usually a rotation that wasn't applied on both sides.

**Likely cause — `processing_failed`:** A genuine internal error (DynamoDB/Stripe API failure) during `stripe.subscriptions.retrieve()` or the resulting `updateBusiness()` call — see `app/api/webhooks/stripe/route.ts`.

**How to verify:** `/admin/operations` shows the safe error message and (when resolvable) the affected business. Stripe's own Dashboard → Developers → Webhooks → this endpoint shows delivery attempt history and response codes independently.

**Safe recovery:** For `invalid_signature`: re-sync the webhook secret (`aws secretsmanager put-secret-value --secret-id webpresa-{env}-stripe ...`, matching Stripe's dashboard value exactly — see `deployment.md`, "Populating a real secret value"). For `processing_failed`: Stripe automatically retries failed deliveries on its own backoff schedule — no admin action needed unless the underlying cause (e.g. a DynamoDB outage) needs separate attention.

**Retry/replay/rerun:** Neither — there is no durable Stripe event store to replay from (reconciliation is snapshot-first; see architecture.md, "Stripe Subscriptions (Stage 18)"). Recovery is either Stripe's own automatic redelivery, or `stripe trigger <event>` in Stripe's test-mode CLI to manually re-exercise the path (dev/test only, never against production keys).

**Confirm recovery:** Stripe's dashboard shows the endpoint delivering `200`s again; `Business.lastStripeSyncAt` advances on the next real event.

---

## 8. Lob webhook processing fails

**Symptoms:** `postcard.status` doesn't advance despite Lob showing real delivery activity, or `POST /api/webhooks/lob` is returning non-200s in Lob's dashboard delivery log.

**Likely cause:** Signature mismatch (`webpresa-{env}-lob`'s `webhookSecret` out of sync with Lob's registered webhook) or a genuine internal error during `applyPostcardWebhookRollup`.

**How to verify:** Unlike Stripe, every Lob delivery is durably recorded in `PostcardWebhookEvent` (`postcard-webhook-events` table) regardless of outcome — check `listWebhookEventsForPostcard(postcardId)` via the postcard's admin detail page for the actual delivery history, including `rawPayload` for diagnosis (admin-only, never exposed to the browser as raw JSON).

**Safe recovery:** Re-sync the webhook secret if it's a signature failure. Lob retries failed webhook deliveries on its own schedule; there is no in-app replay of a `PostcardWebhookEvent` today (durable history exists, but nothing re-applies it — see implementation.md, Stage 24, "Webhook Event Persistence & Replay").

**Retry/replay/rerun:** None needed in the common case — Lob's own retry handles transient failures. If a specific event was permanently dropped, Lob's dashboard can usually resend a specific webhook delivery manually.

**Confirm recovery:** New `PostcardWebhookEvent` rows appear for the affected postcard with the expected `eventType`/`mappedStatus`.

---

## 9. Lob postcard submission fails (including authentication)

**Symptoms:** `Postcard.status === 'failed'` with a `failureReason`; shows on `/admin/operations` as "Postcard submission failed," classified `requires_configuration_fix` when the message looks auth-related, otherwise `requires_manual_review` — **no retry button either way**.

**Likely cause:** Invalid/expired Lob API key, a malformed mailing address, or a genuine Lob-side rejection (see `lib/lob/submit-postcard.ts`).

**How to verify:** The `failureReason` on the postcard record is already a safe, Lob-derived message. For an auth-specific check: `aws secretsmanager get-secret-value --secret-id webpresa-{env}-lob --profile webpresa-{env}` (confirms the secret is populated — never print the key value in a shared terminal/log).

**Safe recovery:** **There is no retry path for a failed submission by design** — `transitionPostcardToSubmitting` already moved the record past `pending`, and `markPostcardSubmissionFailed` transitions it onward to a terminal `failed`, never back. A new postcard must be generated from the same `CampaignRecipient` (the existing "Generate postcard" action on the campaign page) once the underlying problem (bad key, bad address) is fixed.

**Retry/replay/rerun:** Rerun only, and only by generating an entirely new `Postcard` record — this is why `/admin/operations` never shows a button for this case.

**Confirm recovery:** The freshly generated postcard reaches `submitted` with a real `providerPostcardId`.

---

## 10. SES lead notification fails

**Symptoms:** A `Lead` with `notificationStatus: 'failed'` appears on `/admin/operations`, with a "Retry notification" button.

**Likely cause:** `Business.email` is malformed/doesn't resolve, or a transient SES error. See `lib/leads/notify.ts`.

**How to verify:** `lastNotificationError` on the Lead record holds the SES exception name (never the raw response). Confirm SES production access is still active: `aws sesv2 get-account --profile webpresa-{env} --query 'ProductionAccessEnabled'`.

**Safe recovery:** Click "Retry notification" on `/admin/operations` or the business's Leads section (`retryLeadNotificationAction`) — calls the exact same shared `sendLeadNotificationAndRecordOutcome()` every other caller uses. If the address itself is wrong, fix `Business.email` first (Settings page), then retry.

**Retry/replay/rerun:** Retry only — this is the one record in the whole app where a failed attempt is mutated in place (`notificationAttempts` incremented) rather than spawning a new record, since a Lead's notification is a delivery attempt on a fixed, already-durable record, not a new unit of work. The daily Vercel Cron sweep also retries automatically for up to 5 attempts before giving up.

**Confirm recovery:** `notificationStatus` flips to `'sent'`; the verified inbox receives the email.

---

## 11. Vercel API authentication fails

**Symptoms:** Domain-connection calls in `lib/vercel/client.ts` fail with `VercelApiError('auth', ...)`.

**Likely cause:** The `webpresa-{env}-vercel-api` secret's `accessToken` expired. **This token expires 2026-10-29** for both dev and prod (they share one token scoped to the `andrew-mudges-projects` team) — `/admin/operations` surfaces a "Credential expiring soon" warning starting 30 days out.

**How to verify:** Any domain-connection admin/customer action returning an auth error; or proactively, the Operations page's credential-expiration card.

**Safe recovery:** Generate a new token at vercel.com/account/tokens, then:
```bash
aws secretsmanager put-secret-value --secret-id webpresa-{env}-vercel-api \
  --secret-string '{"accessToken":"...","teamId":"...","projectId":"..."}' --profile webpresa-{env}
```
(`teamId`/`projectId` unchanged — only rotate `accessToken`.) No redeploy needed — `lib/vercel/client.ts` reads the secret fresh each call, unlike the capture-token/internal-api secrets (see item 3).

**Retry/replay/rerun:** Not applicable — this is a credential fix, not a data-recovery action. Once fixed, the customer/admin simply retries the domain action that failed.

**Confirm recovery:** A domain-connection call succeeds; the credential-expiration warning updates to the new date once `web/lib/operations/credential-expirations.ts` is updated with the new expiry (a code change, not just a secret rotation — update that file's `VERCEL_API_TOKEN_EXPIRATION.expiresAt`).

---

## 12. OpenAI authentication/rate-limit/provider failure

**Symptoms:** A `ScanEvent` (`provider: 'openai'`) fails with `failureCategory` of `ai_request_failed`, `ai_timeout`, or `invalid_ai_schema_output`.

**Likely cause:** Invalid/revoked API key (auth), OpenAI-side rate limiting, or a genuine timeout/schema mismatch. See `lib/scoring/score-business.ts`'s `classifyAiError()`.

**How to verify:** `/admin/operations` shows the failure with `provider: 'openai'`. Confirm the key: `aws secretsmanager get-secret-value --secret-id webpresa-{env}-openai --profile webpresa-{env}` (confirms presence, never verify by printing the key).

**Safe recovery:** For an auth problem, rotate the key via the standard `put-secret-value` pattern. For rate-limiting/timeouts, these are not currently bounded-retried automatically at the AI-scoring layer (unlike Firecrawl) — `/admin/operations` classifies these `requires_manual_review`; re-running "AI Scoring" from the business page creates a fresh `ScanEvent` and is safe to do repeatedly.

**Retry/replay/rerun:** Rerun — `scoreBusinessWebsite()` is explicitly safe to call repeatedly (its own doc comment: "each call creates a brand-new ScanEvent").

**Confirm recovery:** The new scoring `ScanEvent` reaches `completed`.

---

## 13. Firecrawl authentication/rate-limit/provider failure

**Symptoms:** A `ScanEvent` (`provider: 'firecrawl'`) fails with `firecrawl_auth`, `firecrawl_rate_limit`, `firecrawl_timeout`, or `firecrawl_provider_error`.

**Likely cause:** Invalid/revoked API key (`firecrawl_auth` — `/admin/operations` classifies this `requires_configuration_fix` specifically, per implementation.md's provider-auth special-casing), or a transient rate limit/timeout/provider error (already bounded-inline-retried up to `MAX_AUTOMATIC_RETRIES` = 2 before the `ScanEvent` is marked failed).

**How to verify:** `/admin/operations` or the business's Enrichment section shows the failure category directly.

**Safe recovery:** For `firecrawl_auth`, rotate `webpresa-{env}-firecrawl`'s `apiKey`. For the other three categories, `/admin/operations`' "Retry" button (`retryEnrichmentAction`) is offered directly — it's gated on exactly these retryable categories.

**Retry/replay/rerun:** Retry (cross-attempt) for the three transient categories — always creates a new `ScanEvent` (`retryOfScanId` + `attempt + 1`), never mutates the failed one. No button for `firecrawl_auth` until the key is fixed.

**Confirm recovery:** The new `ScanEvent` reaches `completed`.

---

## 14. Google Places quota/authentication failure

**Symptoms:** The admin Discover page's search returns a generic "search failed" or "try again later" message.

**Likely cause:** Invalid/revoked API key (401/403 from Google), or daily quota exhausted (429/`RESOURCE_EXHAUSTED`) — see `deployment.md`, Stage 12, "Expected failure behavior".

**How to verify:** No durable record exists for this — Stage 12 search/import activity is deliberately non-persistent (see implementation.md). Reproduce the search and observe the admin-facing message; check the Google Cloud Console's Places API (New) quota/usage page directly.

**Safe recovery:** For an auth failure, rotate `webpresa-{env}-google-places`'s `apiKey` and confirm the key is still restricted to Places API (New) only. For quota exhaustion, wait for the daily quota reset or raise the console-configured limit — this is never retried automatically, by design (Stage 12 has no automated batch mode).

**Retry/replay/rerun:** Retry only — the admin simply re-runs the search once the underlying quota/key issue is fixed. Nothing to rerun in the ScanEvent sense; Google Places import never creates one.

**Confirm recovery:** A search returns real results again.

---

## 15. DynamoDB throttling

**Symptoms:** The `webpresa-{env}-{table}-throttled-requests` CloudWatch alarm fires for one of the four monitored high-traffic tables (scan-events, scan-executions, postcards, businesses).

**Likely cause:** All tables use `PAY_PER_REQUEST` billing, which auto-scales but can still throttle on a sudden burst that outpaces its own scaling. Separately — and worth checking first — every table's `status-index` GSI is explicitly flagged in `infra/lib/stacks/data-stack.ts` as a pre-production low-cardinality hot-partition risk; a throttle concentrated on reads/writes touching that index specifically (rather than general table traffic) is this known, already-documented risk materializing, not a new bug.

**How to verify:** The CloudWatch dashboard (`webpresa-{env}-operations`) shows which table and roughly when. `aws dynamodb describe-table --table-name webpresa-{env}-{table} --profile webpresa-{env}` for current state; CloudWatch Metrics console for the specific throttled request type (read vs. write, table vs. GSI).

**Safe recovery:** Usually self-resolving (PAY_PER_REQUEST auto-scales within minutes). If it's concentrated on a `status-index` GSI and recurring, that's the trigger to actually execute the pre-production note's recommended fix (filter expressions on a higher-cardinality index, or a composite `status#YYYY-MM` key) — a real schema change, not a quick operational fix, and out of scope for a runbook response.

**Retry/replay/rerun:** Not applicable — no data is lost to a throttle (DynamoDB queues/retries at the SDK level for most operations); affected requests should be retried by their normal caller path, which most write paths in this codebase already do implicitly by being idempotent (`putScanEvent`, etc.).

**Confirm recovery:** The alarm returns to `OK`; no application-level errors correlate with the throttle window.

---

## 16. AWS production spend alarm

**Status:** Not implemented as CDK-provisioned infrastructure — AWS Budgets/Cost Explorer are the intended tool (per implementation.md, Stage 24: "AWS account-level spend should continue to use AWS Budgets/Cost Explorer rather than attempting to rebuild AWS billing inside Webpresa"), and this project has no existing CDK precedent for provisioning a Budget.

**Recommended manual setup (not yet done):**
1. AWS Console → Billing → Budgets → Create budget, one per account (`webpresa-dev`, `webpresa-prod`).
2. A modest monthly threshold per environment — prod should be materially higher than dev, since dev has no live provider traffic.
3. Alert recipient: an email address someone actually monitors (this project has no Slack/pager integration — see "Deferred work").

**Symptoms once configured:** An email alert when spend crosses the configured threshold.

**Likely cause:** Real usage growth, a runaway Lambda (e.g. a bug causing repeated invocations), or a leaked/misused credential.

**How to verify:** AWS Cost Explorer, filtered by service, to identify what's actually driving spend.

**Safe recovery:** Depends entirely on the cause — there is no generic safe action. If a specific Lambda/resource is clearly runaway, the screenshot/postcard-render Lambdas' `reservedConcurrentExecutions: 5` already caps their own blast radius; investigate via CloudWatch before taking any destructive action (never disable billing/delete resources reactively without understanding the cause first).

**Retry/replay/rerun:** Not applicable.

**Confirm recovery:** Cost Explorer shows spend returning to the expected baseline.

---

## Credential expiration / rotation

`/admin/operations` surfaces a warning card 30 days before any credential in `web/lib/operations/credential-expirations.ts` expires. Currently tracked:

| Credential | Expires | Rotation procedure |
|---|---|---|
| Vercel API token (`vercel-api` secret, both dev and prod) | 2026-10-29 | See item 11 above |

To add a newly-discovered expiring credential to this tracking, add an entry to `CREDENTIAL_EXPIRATIONS` in `web/lib/operations/credential-expirations.ts` — no infrastructure change needed, it's a static config file checked at page-render time.

---

## Deferred work (see implementation.md, Stage 24, "Deferred work")

- Minimal availability/synthetic monitoring for `/` and `/account/sign-in` — no existing precedent in this repo, Vercel's own dashboard already gives basic reachability signal.
- Vercel→CloudWatch log drain — would unlock CloudWatch-based alarming on Stripe/Lob webhook failures and provider auth failures at the infrastructure level, on top of `/admin/operations`' existing DynamoDB-backed visibility for the same failures.
- Pager/Slack/SMS alert integration — alarms are CloudWatch-console-visible only today.
- Full provider cost accounting / per-business unit economics.
- Centralized log analytics, distributed tracing, SLOs/error budgets, automated incident response, customer-facing status page.
