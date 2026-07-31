# Webpresa — Deployment

**Last updated:** 2026-07-18

> **Hosting:** Vercel (migrated from AWS Amplify in Stage 7). CDK/DynamoDB infrastructure remains on AWS.

---

## Quick reference

```bash
# 1. Authenticate
aws sso login --profile webpresa

# 2. Preview changes (safe — no AWS writes)
cd infra
npx cdk diff WebpresaDevDataStack --profile webpresa

# 3. Deploy (requires explicit approval — see below)
npx cdk deploy WebpresaDevDataStack --profile webpresa --require-approval never
```

---

## AWS CLI profiles

| Profile | Account | Purpose |
|---|---|---|
| `webpresa` | `539898341083` | Development — the only deployed environment |
| `webpresa-prod` | TBD | Production — not yet created |

Both profiles use AWS SSO. Sessions expire; re-authenticate when you see `Token has expired and refresh failed`.

```bash
aws sso login --profile webpresa
```

Verify the active session at any time:

```bash
aws sts get-caller-identity --profile webpresa
```

---

## CDK bootstrap

Bootstrap is a one-time operation per account/region that creates the `CDKToolkit` CloudFormation stack (S3 staging bucket, ECR repo, IAM roles).

**Development account:** Already bootstrapped (`539898341083 / us-east-1`).

**Production account:** Run this once before the first production deployment:

```bash
npx cdk bootstrap --profile webpresa-prod
```

To verify whether an account is already bootstrapped:

```bash
aws cloudformation describe-stacks --stack-name CDKToolkit --profile webpresa \
  --query "Stacks[0].StackStatus" --output text
```

Returns `UPDATE_COMPLETE` or `CREATE_COMPLETE` if bootstrapped; an error if not.

---

## Required environment variables

### `infra/` — CDK project

No environment variables are needed. Account and region are resolved from the active CLI profile via `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` at synth time. These are set automatically by the CDK CLI when you pass `--profile`.

### `web/` — Next.js application

The admin dashboard requires the following environment variables.  The public homepage still works without any.

Copy `web/.env.local.example` to `web/.env.local` for local development.

| Variable | Value source | Notes |
|---|---|---|
| `AWS_REGION` | `us-east-1` | Required by DynamoDB client |
| `AWS_ACCESS_KEY_ID` | IAM user `webpresa-vercel-dev` | **Vercel only** — see "AWS credentials for Vercel" below |
| `AWS_SECRET_ACCESS_KEY` | IAM user `webpresa-vercel-dev` | **Vercel only** — see "AWS credentials for Vercel" below |
| `BUSINESSES_TABLE_NAME` | CloudFormation export `webpresa-dev-businesses-name` | See "How outputs reach the application" |
| `SITE_PREVIEWS_TABLE_NAME` | CloudFormation export `webpresa-dev-site-previews-name` | |
| `SCAN_EVENTS_TABLE_NAME` | CloudFormation export `webpresa-dev-scan-events-name` | |
| `SCAN_EXECUTIONS_TABLE_NAME` | CloudFormation export `webpresa-dev-scan-executions-name` | Stage 16 — not yet deployed |
| `POSTCARDS_TABLE_NAME` | CloudFormation export `webpresa-dev-postcards-name` | |
| `ASSETS_BUCKET_NAME` | CloudFormation export `webpresa-dev-assets-name` | S3 assets bucket (Stage 9) |
| `OPENAI_SECRET_NAME` | Deterministic name — `webpresa-dev-openai` | Secrets Manager (Stage 10) |
| `FIRECRAWL_SECRET_NAME` | Deterministic name — `webpresa-dev-firecrawl` | Secrets Manager (Stage 10) |
| `GOOGLE_PLACES_SECRET_NAME` | Deterministic name — `webpresa-dev-google-places` | Secrets Manager (Stage 10) |
| `STRIPE_SECRET_NAME` | Deterministic name — `webpresa-dev-stripe` | Secrets Manager (Stage 10) |
| `LOB_SECRET_NAME` | Deterministic name — `webpresa-dev-lob` | Secrets Manager (Stage 10) |
| `CAPTURE_TOKEN_SECRET_NAME` | Deterministic name — `webpresa-dev-capture-token` | Secrets Manager (Stage 14) — deployed, real signing key populated, added to Vercel |
| `SCREENSHOT_LAMBDA_FUNCTION_NAME` | CloudFormation export `webpresa-dev-screenshot-capture-name` | Stage 14 — deployed (`webpresa-dev-screenshot-capture`), added to Vercel |
| `INTERNAL_API_SECRET_NAME` | Deterministic name — `webpresa-dev-internal-api` | Secrets Manager (Stage 16) — not yet deployed |
| `SCAN_WORKFLOW_STATE_MACHINE_ARN` | CloudFormation export `webpresa-dev-scan-workflow-arn` | Stage 16 — not yet deployed |
| `STOCK_IMAGES_BUCKET_NAME` | CloudFormation export `webpresa-dev-stock-images-name` | Stock image repository (Phase 1) — not yet deployed |
| `STOCK_IMAGES_CDN_DOMAIN` | CloudFormation export `webpresa-dev-stock-images-cdn-domain` | CloudFront domain fronting the stock-images bucket — not yet deployed. Also needs adding to `next.config.ts`'s `images.remotePatterns` at build time (falls back to `*.cloudfront.net` if unset) |
| `STOCK_IMAGES_TABLE_NAME` | CloudFormation export `webpresa-dev-stock-image-metadata-name` | Stock image repository (Phase 1) — table deliberately named differently from the bucket to avoid a duplicate CloudFormation export name; not yet deployed |
| `ADMIN_USERNAME` | Set manually | Admin sign-in username |
| `ADMIN_PASSWORD_HASH` | scrypt hash — see `.env.local.example` for generation command | No quoting needed; pure hex output |
| `SESSION_SECRET` | `openssl rand -base64 32` | Signs admin JWT session cookies |
| `CLAIMS_TABLE_NAME` | CloudFormation export `webpresa-dev-claims-name` | Stage 17 — deployed (`webpresa-dev-claims`) |
| `CLAIM_TOKEN_SECRET_NAME` | Deterministic name — `webpresa-dev-claim-token` | Secrets Manager (Stage 17) — deployed, real `hmacSecret` populated |
| `COGNITO_USER_POOL_ID` | CloudFormation export `webpresa-dev-customers-user-pool-id` | Stage 17 — deployed (`webpresa-dev-customers`) |
| `COGNITO_USER_POOL_CLIENT_ID` | CloudFormation export `webpresa-dev-customers-user-pool-client-id` | Stage 17 — deployed |
| `CUSTOMER_SESSION_SECRET` | `openssl rand -base64 32` | Stage 17 — signs customer JWT session cookies; deliberately a separate secret from `SESSION_SECRET` |
| `CLAIM_ATTEMPT_SECRET` | `openssl rand -base64 32` | Stage 17 — signs the short-lived claim-attempt cookie; deliberately a third, separate secret |
| `CUSTOMER_BILLING_PROFILES_TABLE_NAME` | CloudFormation export `webpresa-dev-customer-billing-profiles-name` | Stage 18 — deployed (`webpresa-dev-customer-billing-profiles`); not yet added to Vercel |
| `STRIPE_PRICE_ID_BASIC` | Stripe test-mode Price ID (created via CLI, see below) | Stage 18 — created (`price_1TyjryHTxTryrfUCNCT4A9Yn`); not yet added to Vercel. Not a secret, but server-only (never `NEXT_PUBLIC_`) |
| `STRIPE_PRICE_ID_GROWTH` | Stripe test-mode Price ID (created via CLI, see below) | Stage 18 — created (`price_1TyjsnHTxTryrfUCMeAT0q3K`); not yet added to Vercel. Not a secret, but server-only (never `NEXT_PUBLIC_`) |
| `WEBPRESA_APP_BASE_URL` | Real deployed app URL | Stage 18 — not yet added to Vercel; server-only, used to build Checkout success/cancel URLs and the Customer Portal return URL. Same variable name as the existing infra-side (Stage 14/16) shell variable, added here as a `web/` runtime variable — see "Stage 18 — Stripe Subscriptions deployment guidance" below |
| `CUSTOMER_ONBOARDING_TABLE_NAME` | CloudFormation export `webpresa-dev-customer-onboarding-name` | Stage 19.x, Part 1 — deployed via `cdk synth`/tests only, not yet a real `cdk deploy`; not yet added to Vercel |
| `DOMAIN_CONNECTIONS_TABLE_NAME` | CloudFormation export `webpresa-dev-domain-connections-name` | Stage 19.x, Part 2 — deployed via `cdk synth`/tests only, not yet a real `cdk deploy`; not yet added to Vercel |
| `VERCEL_API_SECRET_NAME` | Deterministic name — `webpresa-dev-vercel-api` | Secrets Manager (Stage 19.x, Part 2) — deployed 2026-07-31, real `{ accessToken, teamId, projectId }` populated (`teamId`/`projectId` sourced from `web/.vercel/project.json`). **The `accessToken` is a personal access token scoped to the `andrew-mudges-projects` team and expires 2026-10-29** — rotate it before then (generate a new token at vercel.com/account/tokens, then `aws secretsmanager put-secret-value --secret-id webpresa-dev-vercel-api --secret-string '{"accessToken":"...","teamId":"...","projectId":"..."}' --profile webpresa`) or domain-connection calls in `lib/vercel/client.ts` will start failing with `VercelApiError('auth', ...)`. |
| `WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH` | `dev` | Stage 19.x, Part 2 (added 2026-07-31) — added to Vercel's **Preview environment only** (left unset in Production). Passed as `gitBranch` on every `addProjectDomain()` call so a newly connected customer domain serves this app's `dev` branch instead of silently falling through to Vercel's Production default — see "Domain-to-branch targeting" below. Must be removed (or the whole mechanism revisited) once Stage 17+ is genuinely deployed to Production. |

Never put these in client-side code or commit `.env` files that contain real values.

---

## Local vs deployed AWS credentials

### Local development

The CDK CLI and AWS CLI use the `webpresa` SSO profile, which resolves to temporary credentials from the SSO token. These credentials are never embedded in code.

```bash
# All infra commands pass the profile explicitly:
npx cdk synth --profile webpresa
npx cdk diff  --profile webpresa
npx cdk deploy WebpresaDevDataStack --profile webpresa
```

When running the Next.js application locally against real DynamoDB tables, set `AWS_PROFILE=webpresa` in `.env.local`. The AWS SDK resolves SSO credentials automatically from the active session.

### Deployed (Vercel)

Vercel has no IAM role concept, so a dedicated **IAM user** (`webpresa-vercel-dev`) provides the credentials. Store the user's access keys as Vercel environment variables. See "AWS credentials for Vercel" below.

---

## AWS credentials for Vercel

Create a least-privilege IAM user once and store its keys in Vercel. Do not use root credentials or the personal `webpresa` SSO user.

### Create the IAM user (one-time, manual — not CDK)

```bash
# Create user (no console access)
aws iam create-user --user-name webpresa-vercel-dev --profile webpresa

# Generate access keys
aws iam create-access-key --user-name webpresa-vercel-dev --profile webpresa
```

The `create-access-key` response contains `AccessKeyId` and `SecretAccessKey`. Add both to Vercel immediately and do not store them anywhere else.

The user and its access keys are deliberately **not** managed by CDK — a long-lived secret access key should never flow through a CloudFormation template or output. CDK only attaches permission policies to this already-existing user (see below).

### Permissions — CDK-managed (`infra/lib/stacks/vercel-access-stack.ts`)

**Migrated 2026-07-24** from five hand-run `aws iam put-user-policy` inline policies to two CDK-managed policies, after a `put-user-policy` call while adding Stage 16's grants failed with `LimitExceeded: Maximum policy size of 2048 bytes exceeded for user` — a hard, non-adjustable AWS limit on the *aggregate* size of all inline policies on one user (confirmed via `aws service-quotas list-service-quotas`, unlike the Lambda concurrency limit hit in Stage 14 — there is no quota to request an increase for here). A customer-managed policy allows 6,144 characters *each*, and a user can have up to 10 attached, so this isn't a limit this project will realistically hit again.

`WebpresaVercelAccessStack` imports the existing user by name (`iam.User.fromUserName`) and attaches two managed policies:

- `webpresa-{env}-vercel-data-access` — DynamoDB (all 6 tables + their indexes, including `scan-executions` — a gap the migration also closed, since Stage 16's internal API routes needed it and nothing had granted it yet — and `claims`, Stage 17), S3 (assets bucket), Secrets Manager (all 9 secrets, incl. `claim-token`, Stage 17), and (Stage 17) a minimal, explicit `cognito-idp:*` action set scoped to the customer User Pool ARN.
- `webpresa-{env}-vercel-compute-invoke` — `lambda:InvokeFunction` on the screenshot Lambda (Stage 14), `states:StartExecution` on the scan workflow state machine (Stage 16).

**To grant a new permission** (e.g. Stage 18 Stripe webhooks, Stage 22 Lob): add a `PolicyStatement` to the relevant `iam.ManagedPolicy` in `vercel-access-stack.ts`, then `cdk diff WebpresaDevVercelAccessStack` → review → `cdk deploy WebpresaDevVercelAccessStack`, same gate as every other resource in this repo. No more hand-run CLI commands to keep in sync with this document.

> Future Lambda execution roles (Stage 22 postcard service) should still get their own prefix/secret-scoped policy (e.g. `s3:PutObject` on `arn:aws:s3:::webpresa-dev-assets/scans/*` only, or `secretsmanager:GetSecretValue` on just its one secret) rather than reusing the Vercel app's broader data-access policy — this note carries forward from before the migration and still applies to any *new* execution role, just not to the Vercel user's own permissions anymore.

## Vercel CLI — managing environment variables

Env vars can be managed from the terminal instead of the Vercel dashboard. The CLI isn't installed globally (global `npm install -g vercel` failed with `EACCES` in this environment) — invoke it via `npx vercel`, which downloads and caches it on first use, no install/permissions needed.

### One-time setup (already done on this machine)

```bash
npx vercel login          # device-flow auth: opens a URL + code, approve once in a browser
npx vercel link           # links the current directory to a Vercel project
```

Run both from `web/` (`.vercel/project.json` lives there, gitignored). This machine is logged in as `andrewmudge` and `web/` is linked to `andrew-mudges-projects/webpresa` — the real, deployed project.

**Gotcha (hit 2026-07-29):** `vercel link --yes` with no project match prompts interactively; running it non-interactively without `--project <name>` silently **creates a new empty project** instead of linking to the existing one, rather than erroring. Always pass the project explicitly to relink:

```bash
npx vercel link --yes --project webpresa
```

Verify the link before trusting any `env` command: `cat web/.vercel/project.json` should show `"projectName":"webpresa"`.

### List variables

```bash
npx vercel env ls
```

### Add a variable

```bash
npx vercel env add MY_VAR_NAME production
npx vercel env add MY_VAR_NAME preview
```

Prompts for the value (or pipe it: `echo -n "value" | npx vercel env add MY_VAR_NAME production`). This project sets each var on both `production` and `preview` — see "Required environment variables" above for the full list and what each one is for. `development` is not used; local dev reads `.env.local` directly (see "Local vs deployed AWS credentials" above).

### Remove a variable

```bash
npx vercel env rm MY_VAR_NAME production
```

### Pull deployed values into `.env.local`

```bash
npx vercel env pull .env.local
```

Overwrites local values with what's actually deployed — useful for confirming drift, but review the diff before committing to it, since `.env.local` may hold local-only overrides (e.g. `AWS_PROFILE`) that don't exist in Vercel.

---

## Populating a real secret value (Stage 10)

Secrets are created by CDK with a random placeholder only — never a real value. Populate the real value out-of-band once the stage that needs it is being implemented:

```bash
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-openai \
  --secret-string '{"apiKey":"sk-..."}' \
  --profile webpresa
```

For the two-key Stripe secret, include both keys:

```bash
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-stripe \
  --secret-string '{"secretKey":"sk_test_...","webhookSecret":"whsec_..."}' \
  --profile webpresa
```

Google Places (Stage 12) follows the same one-key shape as OpenAI, Firecrawl, and Lob:

```bash
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-google-places \
  --secret-string '{"apiKey":"AIza..."}' \
  --profile webpresa
```

The claim-token secret (Stage 17) is generated locally, not obtained from a third party — same pattern as `capture-token`/`internal-api` (see "Stage 17" above for the full command).

Because CloudFormation only touches a secret's value when the CDK construct's `jsonKeys` change, running `cdk deploy` afterward does not overwrite a value set this way. Never paste real secret values into a commit, a CDK construct prop, or this document.

---

## Stage 12 — Google Places Discovery deployment guidance

**Application code is implemented and manually verified** (see `build_log.md`, "Stage 12 — Google Places Discovery"). The `webpresa-dev-google-places` secret now holds a real API key (populated via the standard `aws secretsmanager put-secret-value --profile webpresa` command below — no other AWS resource was created or modified). **No Google Cloud project configuration, IAM key-restriction setup, quota, or budget alert has been performed** — the guidance below (API key restrictions, quota limits, budget alerts) still describes required setup, not completed setup. No Vercel change or deployment was performed.

### Google Cloud project and API setup

1. Use (or create) a Google Cloud project dedicated to Webpresa's server-side integrations.
2. Enable **Places API (New)** — the current generation of the API. Do not enable the deprecated legacy Places API.
3. Enable billing on the project — Places API (New) requires an active billing account even within the free-tier usage included each month.

### API key restrictions (server-side Vercel integration)

Webpresa's Places API calls run entirely server-side (Next.js Server Actions / Route Handlers on Vercel), never from the browser, so the key must be restricted accordingly:

- **API restrictions:** restrict the key to Places API (New) only — never leave it unrestricted or allow every enabled API.
- **Application restrictions:** prefer IP address restrictions scoped to known server egress ranges where practical. Vercel serverless functions don't expose a small, stable IP range by default, so if IP restriction isn't practical, leave the key unrestricted on application type but keep the API restriction in place — the primary control is that the key is only ever read from Secrets Manager inside `server-only` code and is never sent to the browser. **Never** use an HTTP-referrer (browser-key) restriction for this key — that restriction type assumes the key is meant to be seen by the browser, which it must never be.
- Do not reuse this key for any other Google Cloud product or Webpresa integration.

### Quota limits and budget alerts

- Set a daily request quota on the Places API (New) console page sized for manual, admin-driven searches — Stage 12 has no automated batch mode, so the limit should be low.
- Configure a Google Cloud Billing budget alert (a modest monthly threshold) that notifies before real spend becomes significant. Places API (New) bills per request, and `rating`/`userRatingCount`/`regularOpeningHours` sit in a higher-cost tier than basic identity/location fields — see `implementation.md`, Stage 12, "Economical field-mask requirements." The Stage 12 follow-on Place Details `reviews` field mask (`lib/google-places/client.ts`'s `getPlaceReviews()`, used to populate individual Google reviews into the Testimonials section) sits in that same higher-cost SKU tier — factor one Details call per Google Places import into the same budget alert.
- No Google Places Photos API access, quota, or S3 storage permission is required for Stage 12. Stage 12 does not download or store Google Places photos (see `implementation.md` and `architecture.md`) — do not enable that capability or grant any photo-storage IAM permission as part of this stage's setup.

### Secret name, JSON shape, and environment variable

Already provisioned in Stage 10 — no new secret is created for Stage 12:

| | |
|---|---|
| Secret name | `webpresa-{env}-google-places` (dev: `webpresa-dev-google-places`) |
| JSON shape | `{ "apiKey": "..." }` |
| Environment variable (the secret's *name*, never the key value) | `GOOGLE_PLACES_SECRET_NAME` — already set to `webpresa-dev-google-places` in `.env.local.example` and in the environment-variable table above |
| IAM | Already granted via the `webpresa-dev-vercel-data-access` managed policy on `webpresa-vercel-dev` (see "AWS credentials for Vercel" above) |

Populate the real API key with the same pattern used for every other secret — see "Populating a real secret value" above.

### Local development requirements

- `GOOGLE_PLACES_SECRET_NAME=webpresa-dev-google-places` in `.env.local` (already present in `.env.local.example`).
- `AWS_PROFILE=webpresa` so the local Secrets Manager client can resolve the secret via SSO credentials, matching every other integration.
- No other local environment variable is needed — application code reads only the secret's *name* from the environment; the key value itself always comes from Secrets Manager.

### Verifying the key is not exposed

Before considering Stage 12 done, confirm:

- No occurrence of the raw API key value in the built client bundle (inspect the `.next` build output) or in any deployed page's source.
- No Server Action or Route Handler response body, error message, or redirect URL ever includes the raw key.
- Browser network requests for the search/import flow go only to Webpresa's own server (a Server Action or Route Handler), never directly to `places.googleapis.com`.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| Secret missing / `GOOGLE_PLACES_SECRET_NAME` unset | Server Action returns a controlled error; no stack trace or secret name leaks to the client |
| Invalid or revoked API key | Google returns 401/403; surfaced to the admin as a generic "search failed" message, logged safely server-side |
| Key restricted to the wrong API or application type | Google returns 403 (`PERMISSION_DENIED`); same safe-error handling as an invalid key |
| Quota exhausted | Google returns 429 / `RESOURCE_EXHAUSTED`; surfaced as a clear "try again later" admin message, never retried silently in a loop |

---

## Stage 13 — Firecrawl Website Enrichment deployment guidance

**Application code is implemented, automatically tested (472 tests), and manually verified** against the real Firecrawl v2 API, the real OpenAI API, and the real dev S3/DynamoDB (see `build_log.md`, "Stage 13 — Firecrawl Website Enrichment"). The `webpresa-dev-firecrawl` secret now holds a real API key. No infrastructure change was needed — the secret, its IAM grant, and `FIRECRAWL_SECRET_NAME` were already provisioned in Stage 10 and already present in `.env.local`/`.env.local.example`/the environment-variable table above.

### `FIRECRAWL_API_KEY` — how it's actually delivered

There is no `FIRECRAWL_API_KEY` environment variable anywhere in this app, by design — matching every other third-party credential in this codebase. The application reads only the secret's *name* from `FIRECRAWL_SECRET_NAME` (already `webpresa-dev-firecrawl`); the real key value is fetched from Secrets Manager at runtime via `getFirecrawlSecret()` (`web/lib/secrets/index.ts`) and cached per process. The real key was populated using the same command already documented above for every other secret:

```bash
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-firecrawl \
  --secret-string '{"apiKey":"fc-..."}' \
  --profile webpresa
```

Never paste the real key into a commit, a CDK construct prop, this document, or any other file in the repo.

### Server-runtime requirements

Stage 13 runs entirely inside existing Next.js Server Actions (`enrichWebsiteAction`/`retryEnrichmentAction`) and library code called from them — no new Route Handler, no new Lambda, no new Vercel configuration. It uses:
- `fetch` (built into the Node.js runtime Vercel already uses for this app — no `runtime: 'edge'` opt-in, and none is used elsewhere in this codebase) for the Firecrawl REST call and for fetching discovered website images.
- `sharp` (already a dependency, already used by `lib/theme/logo-color.ts`/`lib/image/hero-dimensions.ts`) for image dimension checks — no new native dependency.
- `node:dns`/`node:net` (Node built-ins) for the SSRF guard — requires the Node.js runtime, not Edge; this app has never opted into Edge runtime for any route, so no change was needed.

No new environment variable, no new IAM policy, no new S3 prefix registration beyond what "Adding a new S3 prefix" below already covers (the `scans/` prefix was already allowed in `web/lib/s3/assets.ts`'s `ALLOWED_PREFIXES` since Stage 9).

### Smoke-test procedure (without exposing secrets)

The real end-to-end smoke test was run as a local script (not committed) that: loads `.env.local`, creates a throwaway dev `Business` with `websiteUrl: 'https://www.firecrawl.dev'` (Firecrawl's own marketing site — stable, scrape-friendly, and unambiguously permitted to be scraped by their own API) and a minimal `servicesOffered` value, calls `enrichBusinessWebsite()` directly, and logs only non-sensitive fields (status, scanId, previewId, S3 key names, image counts) — never the API key, never raw page content. Result: `status: 'completed'`, real HTTP 200 from Firecrawl, both `crawl.json`/`extracted.json` artifacts written to the correct S3 keys, 9 candidate images discovered with 3 accepted and uploaded, a real OpenAI-generated `SitePreview` v1 with `generationMetadata.source: 'firecrawl_enriched'`, and `Business.enrichmentStatus: 'enrichment_completed'`.

To repeat this smoke test:
1. Ensure `.env.local` has `FIRECRAWL_SECRET_NAME`, `AWS_PROFILE=webpresa` (or Vercel's AWS keys), and the other standard variables set (see the environment-variable table above).
2. Create a throwaway `Business` via the admin UI (`/admin/businesses/new`) with a real, safe public `websiteUrl` and at least a minimal value in "Services offered" (or accept that Stage 13 can supply services itself when the business has none — see `implementation.md`, Stage 13).
3. Click "Enrich Website" on that business's detail page.
4. Confirm a new `SitePreview` draft appears, the "Website Enrichment" card shows `Enrichment completed`, and (optionally) inspect the S3 console under `scans/{businessId}/` for the artifacts — `crawl.json`/`extracted.json` are private (no console "make public" action needed or wanted); accepted images are viewable directly via their `/api/assets/scans/...` proxy URL.
5. Delete the throwaway business afterward if it shouldn't remain in the dev table (cascade-deletes its previews/scans via the existing "Delete business" action).

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| Secret missing / `FIRECRAWL_SECRET_NAME` unset | Server Action returns a controlled error; no stack trace or secret name leaks to the client |
| Invalid or revoked API key | Firecrawl returns 401/403; classified `firecrawl_auth`; surfaced as a safe generic message, not retried |
| Rate limit (429) | Classified `firecrawl_rate_limit`; bounded inline retry honoring `Retry-After` before the `ScanEvent` is marked `failed`; admin can retry again afterward |
| Firecrawl 5xx | Classified `firecrawl_provider_error`; same bounded inline retry, then `failed` if still unsuccessful |
| Business has no website | Never calls Firecrawl at all — `manual_approval_required`, `missing_website` |
| Private/internal/malformed website URL | Rejected before any Firecrawl call — `blocked_url`/`invalid_url` |

---

## Stage 14 — Playwright Screenshots deployment guidance

**Infrastructure deployed to dev and live-verified on 2026-07-23; `webpresa-vercel-dev`'s IAM extended and the two Vercel environment variables set the same day.** `WebpresaDevDataStack` (capture-token + Vercel protection-bypass secrets, real values populated), `WebpresaDevScreenshotRepositoryStack` (ECR repo), and `WebpresaDevScreenshotStack` (Lambda/DLQ, `reservedConcurrentExecutions: 5` per spec) are all deployed; the container image is built and pushed; a real `existing_site` capture was invoked directly against the deployed Lambda and both viewports completed successfully (real screenshots verified in S3), the DLQ path was confirmed working, and capture-token rejection-after-terminal was confirmed. `webpresa-vercel-dev` has `lambda:InvokeFunction` on the screenshot Lambda and `secretsmanager:GetSecretValue` on the capture-token secret (see "Extending `webpresa-vercel-dev`" below — note the Vercel protection-bypass secret deliberately is **not** granted to this identity, since only the Lambda itself ever reads it). See `build_log.md`, "Stage 14 — Playwright Screenshots", for the full record, including six real bugs hit and fixed getting here: two AWS account-quota issues (see "Account-quota fixes" below), three Chromium/Lambda-runtime issues only reproducible on the real deployed Lambda, never in local Docker/RIE testing (see "Chromium-on-real-Lambda fixes" below), and one platform-level issue found during the first real browser-based test — Vercel's own Deployment Protection blocking the Lambda's `generated_preview` navigation entirely (see "Vercel Deployment Protection bypass" below). The steps below are the actual sequence used — three separate stacks, not two, since the ECR repository was split into its own stack (`WebpresaScreenshotRepositoryStack`) deployed before the Lambda stack that references it, to avoid a first-deploy rollback deleting a freshly-created repo. Any remaining/future-environment deploys (e.g. prod) still require explicit approval per this project's deployment gate (`AGENTS.md`).

### Deploy sequence (first time)

```bash
# 1. Data stack — adds the one new capture-token secret. Review first:
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa
npx cdk deploy WebpresaDevDataStack --profile webpresa

# 2. Populate the real signing key (same pattern as every other secret —
#    this one is generated locally, not obtained from a third party):
openssl rand -base64 48 | tr -d '\n' > /tmp/capture-token-key.txt
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-capture-token \
  --secret-string "{\"signingKey\":\"$(cat /tmp/capture-token-key.txt)\"}" \
  --profile webpresa
rm /tmp/capture-token-key.txt

# 3. Screenshot repository stack — creates only the ECR repo. Must be
#    deployed and exist before step 4 can push an image, and before step 5
#    deploys the Lambda that references it as a cross-stack import.
npx cdk diff WebpresaDevScreenshotRepositoryStack --profile webpresa
npx cdk deploy WebpresaDevScreenshotRepositoryStack --profile webpresa

# 4. Build and push the container image (the Lambda in step 5 will fail to
#    find an image if this hasn't run yet):
./scripts/build-and-push-screenshot-lambda.sh dev webpresa

# 5. Screenshot stack — Lambda, DLQ, IAM. Requires WEBPRESA_APP_BASE_URL set
#    to the real deployed app URL first — see "Required environment
#    variables" below.
WEBPRESA_APP_BASE_URL=https://<real-app-domain> npx cdk diff WebpresaDevScreenshotStack --profile webpresa
WEBPRESA_APP_BASE_URL=https://<real-app-domain> npx cdk deploy WebpresaDevScreenshotStack --profile webpresa

# 6. If the Lambda's imageTag prop pins a digest rather than 'latest',
#    redeploy the screenshot stack so it picks up the new image:
WEBPRESA_APP_BASE_URL=https://<real-app-domain> npx cdk deploy WebpresaDevScreenshotStack --profile webpresa
```

### Account-quota fixes (hit during the 2026-07-23 dev deploy)

Two `cdk deploy WebpresaDevScreenshotStack` attempts failed at the AWS API level (not a CDK/synth error) and auto-rolled back cleanly before the fix:

1. **`MemorySize` 3072 rejected.** This AWS account's Lambda service quota caps container-image functions at the legacy 3008 MB ceiling (some accounts don't automatically get the newer 10,240 MB limit). Fixed by lowering `memorySize` to `3008` in `webpresa-screenshot-lambda.ts` — still within implementation.md's specified 2048–3072 MB range.
2. **`ReservedConcurrentExecutions: 5` rejected.** This account's total Lambda concurrency quota was only 10 (the account minimum — normal accounts default to 1000). AWS requires ≥10 unreserved concurrency to remain account-wide after any reservation, so with a quota of exactly 10, no reservation above 0 was possible at all until the account's quota itself was raised. Fixed at the time by omitting `reservedConcurrentExecutions` entirely. implementation.md's conditional-transition idempotency logic remained the primary guard against double-execution either way — reserved concurrency was documented as an additional backstop, not the only one.

**Resolved 2026-07-23 (later the same day):** AWS raised this account's Lambda concurrent-executions quota to 1000. `reservedConcurrentExecutions: 5` was re-added to `webpresa-screenshot-lambda.ts` per implementation.md's 2-5 spec, `cdk diff` confirmed a single additive change (no image/digest involved — a plain `cdk deploy WebpresaDevScreenshotStack` was sufficient, no rebuild/push needed), and `aws lambda get-function --function-name webpresa-dev-screenshot-capture --query 'Concurrency'` confirmed `ReservedConcurrentExecutions: 5` live.

### Chromium-on-real-Lambda fixes (hit during 2026-07-23 live testing, after the stack itself deployed successfully)

Once the stack existed, a real end-to-end `existing_site` capture (invoked directly against the deployed Lambda, not through the app) failed three times in a row with Chromium crashing near-instantly — every time invisible to the pre-deploy Lambda Runtime Interface Emulator testing, because a local Docker/RIE container has a fully writable filesystem and a far less restricted process model than the real deployed Lambda:

1. **`ENV HOME=/tmp` added to the Dockerfile.** Real Lambda's filesystem is read-only except `/tmp`; the base image's default `HOME` (`/root`) isn't writable there, so Chromium crashed the instant it tried to create its profile/cache dir.
2. **`--single-process`/`--no-zygote` added to `launchBrowser()`'s args** (`infra/lambda/screenshot-capture/src/browser.ts`). Chromium's normal multi-process architecture can't reliably start inside Lambda's restricted process/PID namespace without these — the standard fix every serverless-Chromium project on Lambda uses.
3. **`handler.ts` restructured to launch a fresh `Browser` per viewport** instead of sharing one across both desktop and mobile. A single-process Chromium instance (required by fix #2) is unstable when a second `BrowserContext` is created after the first has closed — the first viewport captured fine, the second crashed identically every time until this fix.

**Rebuild → redeploy for a Lambda pinned to the `:latest` tag is NOT `cdk deploy` alone.** `DockerImageCode.fromEcr(repository, { tagOrDigest: 'latest' })` embeds the literal string `...:latest` in the CloudFormation template, not a resolved digest — CloudFormation can't detect the underlying image content changed and reports `(no changes)` even right after a real push (confirmed the hard way). The section below ("Verifying the image is not stale...") already covered the *digest-pinned* case; for the `latest`-tag case actually in use here, force the update directly:

```bash
aws lambda update-function-code \
  --function-name webpresa-dev-screenshot-capture \
  --image-uri <account>.dkr.ecr.<region>.amazonaws.com/webpresa-dev-screenshot-capture:latest \
  --profile webpresa --region us-east-1
aws lambda wait function-updated --function-name webpresa-dev-screenshot-capture --profile webpresa --region us-east-1
# Confirm it actually picked up the new image:
aws lambda get-function --function-name webpresa-dev-screenshot-capture --profile webpresa --region us-east-1 \
  --query 'Configuration.CodeSha256' --output text
```

`WEBPRESA_APP_BASE_URL` is read directly from the shell environment by `infra/bin/webpresa.ts` — it is not (and should not be) stored in `.env.local`, since `infra/` is a separate CLI project from `web/`. Omitting it falls back to a synth-only placeholder (`https://REPLACE_WITH_..._APP_BASE_URL.invalid`) so `cdk synth`/`cdk diff` never hard-fail — but that placeholder must never actually be deployed, since the Lambda would construct unreachable preview URLs.

### Vercel Deployment Protection bypass (hit during the first real browser-based test, 2026-07-23)

The first `generated_preview` capture run from the actual admin UI (not a script-driven direct Lambda invoke) screenshotted Vercel's own login page instead of `/b/[slug]`. Root cause: Vercel's Deployment Protection sits in front of the *entire* `dev` preview deployment at the edge, before any Next.js request handler runs — including the capture-token cookie logic, which never gets a chance to run at all. Fixed with Vercel's own "Protection Bypass for Automation":

1. Generated a bypass secret in Vercel project settings → Deployment Protection → "Protection Bypass for Automation."
2. Added a new secret, `webpresa-{env}-vercel-protection-bypass` (`{ bypassSecret }`), to `WebpresaDataStack` — same `WebpresaSecret` pattern as capture-token — and granted the screenshot Lambda's execution role (only) `secretsmanager:GetSecretValue` on it. **Deliberately not granted to `webpresa-vercel-dev`** — the Next.js app never reads this value; only the Lambda does, when navigating for a `generated_preview` capture.
3. `infra/lambda/screenshot-capture/src/browser.ts`'s `newContext()` sends `x-vercel-protection-bypass: <secret>` (plus `x-vercel-set-bypass-cookie: 'true'`) as an `extraHTTPHeaders` context option — applies to the main navigation and every subresource request the page makes, `generated_preview` only.
4. New Lambda env var `VERCEL_PROTECTION_BYPASS_SECRET_NAME`, following the same naming convention as `CAPTURE_TOKEN_SECRET_NAME`.
5. Data stack + screenshot stack redeployed (additive-only diffs, reviewed before each); image rebuilt/pushed and the running Lambda force-updated via `aws lambda update-function-code` (the same `:latest`-tag gap as above).

Verified against [Vercel's own current documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) before implementing — their own Playwright example uses the identical header pair.

### Manual browser testing on the `dev` Preview deployment (hit while testing Stage 17, 2026-07-29)

Same platform-level gate as above, hit again by a *human* this time: an incognito browser navigating straight to `https://webpresa-git-dev-andrew-mudges-projects.vercel.app/claim/<code>` — to test the claim flow as a fresh, unauthenticated customer — was redirected to Vercel's own login page instead of reaching `/claim/[claimToken]` at all. The Stage 14 fix above doesn't transfer here: it delivers the bypass secret as an HTTP request header (`x-vercel-protection-bypass`) sent by Playwright's browser context, and a real browser's address bar has no way to attach a custom header to a plain navigation.

Vercel's "Protection Bypass for Automation" supports a second delivery mode for exactly this case — a query-string parameter on the first request, which sets a cookie for the rest of that browser session. Same secret as Stage 14 (`webpresa-{env}-vercel-protection-bypass`'s value from Vercel's dashboard) — do not generate a second one, or the copy in Secrets Manager the screenshot Lambda reads goes stale.

Confirmed working procedure:

1. Get the bypass secret's value: Vercel dashboard → Project → Settings → Deployment Protection → "Protection Bypass for Automation."
2. In the incognito/test browser, before doing anything else, visit:
   `https://<preview-domain>/?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true`
   — this sets a bypass cookie scoped to that deployment's host.
3. Then navigate normally (e.g. to `/claim/<code>`) in the same window — every subsequent request in that session passes the edge gate like a normal unauthenticated visitor.

Lower-effort alternatives, if handling the raw secret value by hand each time is undesirable:
- Vercel's dashboard **"Share"** link on the specific deployment (Deployments list → the deployment → "..." menu) — one click, sets the same kind of bypass cookie, no secret copy/paste.
- Log into Vercel in the test browser first (any account with project access) — simplest, but no longer simulates a true first-time anonymous visitor, so it's weaker for testing the real customer experience end to end.

### Extending `webpresa-vercel-dev` (manual, outside CDK) — done 2026-07-23

This IAM user is created and managed via AWS CLI commands (see "AWS credentials for Vercel" above), not CDK — it needed two new grants before the Next.js app can invoke the Lambda and verify capture tokens, both applied:

```bash
aws iam put-user-policy \
  --user-name webpresa-vercel-dev \
  --policy-name webpresa-dev-screenshot-lambda-invoke \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:us-east-1:539898341083:function:webpresa-dev-screenshot-capture"
    }]
  }' --profile webpresa
```

The existing `webpresa-dev-secrets` inline policy (not a new one) was extended to add the capture-token secret's ARN pattern (`arn:aws:secretsmanager:us-east-1:539898341083:secret:webpresa-dev-capture-token-*`) alongside the other five — see "Adding a new secret" below. Both grants verified via `aws iam get-user-policy`.

### Vercel environment variables

Add `CAPTURE_TOKEN_SECRET_NAME` (`webpresa-dev-capture-token`) and `SCREENSHOT_LAMBDA_FUNCTION_NAME` (the CloudFormation output from step 3 above, or read directly: `webpresa-dev-screenshot-capture`) to Vercel's environment variables, alongside the existing table/bucket/secret-name variables.

### Verifying the image is not stale after a code change

Unlike every other stage in this app (plain Vercel Server Actions — pushing to `main`/`dev` redeploys automatically), a change to `infra/lambda/screenshot-capture/src/**` requires **both** re-running `build-and-push-screenshot-lambda.sh` **and** a `cdk deploy` of the screenshot stack if the image is referenced by a specific digest rather than a mutable tag — `cdk deploy` alone does not know the underlying `:latest` image content changed unless the referenced tag/digest itself changes. Confirm the deployed Lambda's `LastModified`/image digest in the AWS Console (or `aws lambda get-function`) matches the just-pushed image before considering a fix live.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `SCREENSHOT_LAMBDA_FUNCTION_NAME` unset or wrong | `InvokeCommand` throws synchronously in the Server Action; the `ScanEvent` is marked `failed` (`unknown` category) immediately rather than left `queued` forever — see `lib/screenshots/capture.ts` |
| `webpresa-vercel-dev` missing `lambda:InvokeFunction` | Same as above — an `AccessDeniedException` from the invoke call itself, caught the same way |
| No image pushed to ECR yet | The Lambda function exists (post step 3) but every invocation fails at the platform level; failures land in the DLQ, and the ScanEvent goes stale after 10 minutes — visible via the admin "Mark as failed" prompt |
| Business has no website, `existing_site` requested | Never invokes the Lambda at all — `not_eligible`, no `ScanEvent` created |
| Capture-token secret missing/misconfigured | The Lambda cannot mint a token for a `generated_preview` capture of a draft preview; that specific capture fails (`unknown` or a more specific category depending on where the Secrets Manager call fails), `existing_site` captures are unaffected |

---

## Stage 16 — Step Functions Scan Workflow deployment guidance

**Deployed to dev 2026-07-24.** Added one new table (`scan-executions`), one new secret (`internal-api`, real shared secret populated), and one new stack (`WebpresaDevScanWorkflowStack` — Step Functions Standard state machine + EventBridge Connection, no Lambda, no ECR repo, no container image to build/push — simpler to deploy than Stage 14 for exactly that reason). `webpresa-vercel-dev`'s permissions were extended the same day as part of a larger migration — see "Extending `webpresa-vercel-dev`" below, which now points at a CDK-managed stack rather than the raw CLI commands originally drafted here. Vercel environment variables not yet set (see below).

### Deploy sequence (first time)

```bash
# 1. Data stack — adds the scan-executions table and the internal-api secret. Review first:
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa
npx cdk deploy WebpresaDevDataStack --profile webpresa

# 2. Populate the real shared secret (generated locally, not obtained from a third party —
#    same pattern as capture-token in Stage 14):
openssl rand -base64 48 | tr -d '\n' > /tmp/internal-api-secret.txt
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-internal-api \
  --secret-string "{\"sharedSecret\":\"$(cat /tmp/internal-api-secret.txt)\"}" \
  --profile webpresa
rm /tmp/internal-api-secret.txt

# 3. Scan workflow stack — state machine + EventBridge Connection. Requires
#    WEBPRESA_APP_BASE_URL set to the real deployed app URL (same variable Stage 14 already
#    requires — see "Required environment variables" below):
WEBPRESA_APP_BASE_URL=https://<real-app-domain> npx cdk diff WebpresaDevScanWorkflowStack --profile webpresa
WEBPRESA_APP_BASE_URL=https://<real-app-domain> npx cdk deploy WebpresaDevScanWorkflowStack --profile webpresa
```

### Extending `webpresa-vercel-dev`

This IAM user needs `states:StartExecution` on the scan workflow's ARN and `secretsmanager:GetSecretValue` on the `internal-api` secret before the Next.js admin trigger (`runScanWorkflowAction`) can start an execution. Attempting to add these as two more hand-run `aws iam put-user-policy` inline-policy calls — the approach originally drafted here — hit a hard, non-adjustable 2048-byte aggregate inline-policy-size limit for the user. Both grants now come from `WebpresaVercelAccessStack` (`infra/lib/stacks/vercel-access-stack.ts`) instead — see "AWS credentials for Vercel" above for the full migration record. Deploying that stack (`cdk deploy WebpresaDevVercelAccessStack`) is what actually grants these two permissions; no manual CLI policy edit is needed.

### Vercel environment variables

Add `INTERNAL_API_SECRET_NAME` (`webpresa-dev-internal-api`), `SCAN_EXECUTIONS_TABLE_NAME` (`webpresa-dev-scan-executions`), and `SCAN_WORKFLOW_STATE_MACHINE_ARN` (the `StateMachineArn` CloudFormation output from step 3 above) to Vercel's environment variables.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `SCAN_WORKFLOW_STATE_MACHINE_ARN` unset or wrong | `StartExecutionCommand` throws synchronously in `startScanWorkflow`; the `ScanExecution` is marked `failed` immediately rather than left `queued` forever |
| `webpresa-vercel-dev` missing `states:StartExecution` | Same as above — an `AccessDeniedException` from the `StartExecutionCommand` call itself, caught the same way |
| `internal-api` secret missing/wrong on either side | Every `HttpInvoke` task gets a `401` from `verifyInternalRequest()`, retries three times, then routes to `RecordFailure` — the whole execution ends `failed` quickly rather than silently hanging |
| A business has no website | Never calls Firecrawl — the same `crawl` route serves the no-website branch too (see `enrichBusinessWebsite`'s existing `handleMissingWebsite` path), just reached via a different state name in execution history |

---

## Stage 17 — Website Claim Flow deployment guidance

**Deployed to dev 2026-07-28.** Adds one new table (`claims` — carries both claim records and, as a distinct item shape, rate-limit counters), one new GSI on the existing `businesses` table (`owner-user-id-index`), one new secret (`claim-token`), and one new Cognito User Pool + Client (`customerUserPool`/`customerUserPoolClient`) — all inside the existing `WebpresaDataStack`, no new stack. `WebpresaVercelAccessStack` gains the corresponding grants (Claims table ARN, claim-token secret ARN, a minimal explicit `cognito-idp:*` action set on the User Pool ARN). `cdk diff WebpresaDevDataStack` for this stage is purely additive — one new table, one new User Pool/Client, one new secret, and an in-place (non-replacing) GSI addition to the existing Businesses table. `WebpresaDevDataStack` and `WebpresaDevVercelAccessStack` are both live (verified directly via `aws dynamodb list-tables`, `aws cognito-idp list-user-pools`, `aws secretsmanager describe-secret`, and `aws iam get-policy-version` — the data-access policy's `v4`, dated 2026-07-28, includes the claims table, claim-token secret, and Cognito grants).

### Deploy sequence (first time)

```bash
# 1. Data stack — adds the claims table, the owner-user-id-index GSI on
#    businesses, the claim-token secret, and the customer User Pool. Review first:
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa
npx cdk deploy WebpresaDevDataStack --profile webpresa

# 2. Populate the real HMAC pepper (generated locally, not obtained from a
#    third party — same pattern as capture-token/internal-api in Stages 14/16):
openssl rand -base64 48 | tr -d '\n' > /tmp/claim-token-secret.txt
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-claim-token \
  --secret-string "{\"hmacSecret\":\"$(cat /tmp/claim-token-secret.txt)\"}" \
  --profile webpresa
rm /tmp/claim-token-secret.txt

# 3. Vercel access stack — grants Claims table access, claim-token secret
#    access, and the Cognito actions:
npx cdk diff WebpresaDevVercelAccessStack --profile webpresa
npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa
```

No Lambda, no ECR repo, no container image — unlike Stage 14, this stage adds no compute at all; every new capability is either a DynamoDB table/GSI, a Secrets Manager secret, or a Cognito User Pool called directly from Next.js Server Actions/Route Handlers.

### Vercel environment variables

Add all six new Stage 17 variables from "Required environment variables" above: `CLAIMS_TABLE_NAME` (`webpresa-dev-claims`), `CLAIM_TOKEN_SECRET_NAME` (`webpresa-dev-claim-token`), `COGNITO_USER_POOL_ID`/`COGNITO_USER_POOL_CLIENT_ID` (the `UserPoolId`/`UserPoolClientId` CloudFormation outputs from step 1 above), and freshly generated `CUSTOMER_SESSION_SECRET`/`CLAIM_ATTEMPT_SECRET` values (`openssl rand -base64 32` each — do not reuse `SESSION_SECRET` or each other).

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `CLAIM_TOKEN_SECRET_NAME` missing/wrong | Every claim-token hash/verify call throws before any DynamoDB read — `/claim/[claimToken]` and the manual entry form both fail closed with the generic invalid-token page, never a raw error |
| `COGNITO_USER_POOL_ID`/`COGNITO_USER_POOL_CLIENT_ID` missing/wrong | Every sign-up/sign-in call throws; `/claim/continue` and `/account/sign-in` both fail rather than silently succeeding — there is no fallback authentication path |
| `webpresa-vercel-dev` missing the Cognito grant | `AccessDeniedException` from the Cognito SDK call itself, mapped to the generic `'unknown'` reason code — no Cognito-specific error text reaches the client |
| `CUSTOMER_SESSION_SECRET`/`CLAIM_ATTEMPT_SECRET` missing | The relevant cookie module throws immediately (`"... environment variable is not set"`) rather than signing with an empty/undefined key |
| Real signup volume exceeds Cognito's default ~50 emails/day | Confirmation/reset emails silently stop sending past the cap — deferred fix is configuring the User Pool for SES-backed email (see `architecture.md`, "Authentication → Customer") |

---

## Stage 18 — Stripe Subscriptions deployment guidance

**Deployed to dev 2026-07-29 — including a real Stripe test-mode account.** Adds one new table (`customer-billing-profiles` — PK `userId`, no GSI), one new GSI on the existing `businesses` table (`stripe-subscription-id-index`) — both inside the existing `WebpresaDataStack`, no new stack, no new compute. Both are live in `webpresa-dev-*`; `WebpresaDevVercelAccessStack` was redeployed alongside it (`DataAccessPolicy` gained the new table's ARN + `/index/*`). The `webpresa-dev-stripe` secret now holds real test-mode `secretKey`/`webhookSecret` values, two real test-mode Products/Prices exist, and a real webhook endpoint is registered and delivering successfully. Remaining: add the Vercel environment variables below (no Vercel CLI/token available in the environment that ran this setup).

### Deploy sequence (first time)

```bash
# 1. Data stack — adds the customer-billing-profiles table and the
#    stripe-subscription-id-index GSI on businesses. Review first:
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa
npx cdk deploy WebpresaDevDataStack --profile webpresa

# 2. Vercel access stack — grants the new table and GSI ARNs (the Stripe
#    secret is already granted from Stage 10):
npx cdk diff WebpresaDevVercelAccessStack --profile webpresa
npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa
```

### Stripe setup via CLI (not the Dashboard) — the actual recipe used for dev, and the recipe for prod later

Stripe Products/Prices/webhook endpoints are never created from CDK — this is entirely a Stripe-side, one-time setup, done here via `npx --yes @stripe/cli` (no global install, no `stripe login`/browser device-auth needed — every command takes `--api-key` directly). The exact same sequence below, run again with a live secret key and `--live`, is the literal recipe for production — not a Dashboard "copy to live mode" click, so there's no manual re-derivation or drift risk between environments.

```bash
export STRIPE_SECRET_KEY='sk_test_...'   # or sk_live_... for prod, with --live added below

# Products + monthly recurring Prices — check for an existing Product by
# name first (stripe products list --api-key "$STRIPE_SECRET_KEY") before
# creating, so reruns don't duplicate.
npx --yes @stripe/cli products create --name="Webpresa Basic" \
  --description="Single-page professionally designed website with city-specific SEO for your primary city." \
  --api-key "$STRIPE_SECRET_KEY"
npx --yes @stripe/cli prices create --product=<prod_id_basic> --unit-amount=3900 --currency=usd \
  -d "recurring[interval]=month" --api-key "$STRIPE_SECRET_KEY"

npx --yes @stripe/cli products create --name="Webpresa Growth" \
  --description="Expanded website with multiple city-specific SEO pages and Growth-tier lead forms." \
  --api-key "$STRIPE_SECRET_KEY"
npx --yes @stripe/cli prices create --product=<prod_id_growth> --unit-amount=7900 --currency=usd \
  -d "recurring[interval]=month" --api-key "$STRIPE_SECRET_KEY"

# Webhook endpoint — no dedicated `stripe webhook_endpoints create` resource
# command exists; the CLI's generic REST passthrough works and returns the
# same JSON the API would, including the one-time-only `secret` field
# (capture it immediately — Stripe never shows it again):
npx --yes @stripe/cli post /v1/webhook_endpoints \
  -d url="https://<real-app-domain>/api/webhooks/stripe?x-vercel-protection-bypass=<bypass-secret>" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=invoice.payment_failed" \
  --api-key "$STRIPE_SECRET_KEY"

# Populate the real secret:
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-stripe \
  --secret-string '{"secretKey":"sk_test_...","webhookSecret":"whsec_..."}' \
  --profile webpresa
```

**Why the webhook URL carries a `?x-vercel-protection-bypass=` query parameter**: this `dev` deployment has Vercel Deployment Protection enabled, which redirects *every* unauthenticated request — including Stripe's webhook POSTs — to Vercel's own SSO login page at the edge, before Next.js ever runs (confirmed directly: a `curl -X POST` to `/api/webhooks/stripe` returned a `302` to `vercel.com/sso-api`). Stripe (like Slack, GitHub, and any third-party webhook sender) can't attach the `x-vercel-protection-bypass` HTTP header Playwright uses (Stage 14) — there's no custom-header support in Stripe's webhook delivery config, and no persistent cookie jar between deliveries anyway. Vercel's own docs name this exact scenario and document the fix: append the bypass secret as a **query parameter** on the registered URL instead — this is checked per-request, statelessly, with no cookie needed, so every individual Stripe delivery independently passes. Reuses the existing `webpresa-{env}-vercel-protection-bypass` secret (Stage 14) — do not generate a second one, or the copy the screenshot Lambda reads goes stale. This query parameter has zero effect on this app's own webhook signature verification, which is based only on the raw POST body + `Stripe-Signature` header, never the URL.

**Verified working (2026-07-29)**: `stripe trigger checkout.session.completed --api-key "$STRIPE_SECRET_KEY"` produced a real event whose `pending_webhooks` count dropped to `0` (`stripe events list --api-key ... -d "types[]=checkout.session.completed"`) — confirming Stripe successfully delivered it through the Vercel bypass to the real deployed handler and received a `200` back end-to-end.

### Stripe API version

The Stripe SDK client (`web/lib/stripe/client.ts`) pins an explicit `apiVersion` at construction rather than drifting with Stripe's account-level default. Document the pinned version here once the implementation lands, and bump it deliberately (reviewing Stripe's changelog for the affected API surface — Checkout Sessions, Subscriptions, Billing Portal, webhooks) rather than upgrading the `stripe` npm package and the pinned version separately.

### Vercel environment variables

**Added 2026-07-29** via `npx vercel env add <name> production,preview --value "..." --yes` (see "Vercel CLI — managing environment variables" above), matching every existing var's `Production, Preview` scoping:

```
CUSTOMER_BILLING_PROFILES_TABLE_NAME=webpresa-dev-customer-billing-profiles
STRIPE_PRICE_ID_BASIC=price_1TyjryHTxTryrfUCNCT4A9Yn
STRIPE_PRICE_ID_GROWTH=price_1TyjsnHTxTryrfUCMeAT0q3K
WEBPRESA_APP_BASE_URL=https://webpresa-git-dev-andrew-mudges-projects.vercel.app
TERMS_VERSION=draft-2026-07
```

Price IDs are not secrets — server-only (never `NEXT_PUBLIC_`) purely so the browser can never submit or influence which Price a Checkout Session charges.

Newly added/changed env vars only take effect on a new deployment — the already-running preview does not pick them up live. Redeployed via `npx vercel redeploy <deployment-url> --target preview` (rebuilds the same commit, re-points the `webpresa-git-dev-...` alias); re-verified with `stripe trigger checkout.session.completed` afterward (`pending_webhooks: 0` again).

**`WEBPRESA_APP_BASE_URL`'s `Production` value is a placeholder, not yet correct for real production.** This project already has a real domain connected (`webpresa.com`, confirmed via `vercel domains ls`; `vercel redeploy`'s own output references `www.webpresa.com` as the production target) — every Stage 18 env var was set identically across `Production`/`Preview` only because that already matches how every earlier var in this table is configured (no separate production AWS account/Stripe live keys exist yet either). Before actually promoting Stage 18 to production, update `WEBPRESA_APP_BASE_URL`'s `Production` value to the real `https://www.webpresa.com` (or equivalent) — using the dev preview URL there would send live-mode Checkout redirects and Portal return URLs to the wrong host.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `STRIPE_SECRET_NAME` secret still holds its placeholder value | Every Stripe API call (Checkout Session creation, Portal Session creation, webhook signature verification) fails closed with a generic error — no fallback, no silent success |
| `STRIPE_PRICE_ID_BASIC`/`STRIPE_PRICE_ID_GROWTH` missing/wrong | `resolvePriceId()` throws before any Stripe call — Checkout creation fails with a generic `plan_unavailable` reason, never a raw Stripe error |
| Stripe webhook signing secret mismatched | Every webhook delivery fails signature verification (`400`) — Stripe's dashboard shows persistent delivery failures, a clear signal to re-check the registered endpoint's secret against the stored `webhookSecret` |
| `webpresa-vercel-dev` missing the new table/GSI grant | `AccessDeniedException` from the DynamoDB call — Checkout/webhook processing fails closed rather than silently skipping the entitlement write |

---

## Stage 19 — Customer Website Dashboard deployment guidance

**Application code implemented; not yet manually verified against a real dev customer session.** Unlike every prior stage, Stage 19 needs **no infrastructure deployment step at all** — no new DynamoDB table, no new GSI, no new Secrets Manager secret, no new Vercel environment variable, no new IAM grant. It's pure Next.js application code (new routes under `web/app/app/`, new `web/lib/customer-editing/` functions) sitting entirely on top of infrastructure Stage 17 (Cognito User Pool, customer session secrets) and Stage 18 (Stripe subscription fields, `webpresa-dev-customer-billing-profiles`) already deployed. Pushing to `dev`/`main` redeploys it exactly like every other plain-Server-Action stage (Stage 12/13/15, etc.).

### Deploy sequence

None beyond a normal `git push` to the branch Vercel tracks. If Stage 17/18 aren't already deployed and their environment variables aren't already set in Vercel, do those first — Stage 19 has nothing to add to that list.

### Manual verification procedure (not yet run)

1. Using a real claimed-and-subscribed dev Business (Stage 17 claim flow → Stage 18 test-mode Checkout with a Stripe test card), sign in at `/account/sign-in` and navigate to `/app`.
2. Confirm a single-business account redirects straight to `/app/businesses/{id}`; a multi-business account (claim a second postcard-code business with the same account) shows the portfolio grid.
3. Edit a field on the Website or Design tab, confirm the business home page shows "Draft changes" and the embedded preview iframe reflects the edit without needing a fresh publish.
4. Click "Publish changes," confirm the live `/b/[slug]` page updates and the status flips back to "Live."
5. In the Stripe test-mode Dashboard, mark the test Subscription `past_due` (or use `stripe trigger invoice.payment_failed`), confirm `/app/businesses/{id}` renders read-only with the payment banner and that submitting any edit form is rejected server-side (check the network response, not just that the button was disabled).
6. Cancel the test Subscription, confirm `/app/businesses/{id}` shows the minimal reactivation card and links back to `/account/claim-status`.
7. Confirm a second, unrelated dev customer account cannot reach the first customer's `/app/businesses/{id}` by pasting the URL directly (expect a 404, not a 403 that would confirm the business exists).

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| Customer session cookie missing/expired while on `/app/*` | `proxy.ts`'s new `/app/:path*` branch redirects to `/account/sign-in?next=/app/...` before the page ever renders |
| A signed-in customer requests a `businessId` they don't own | `requireBusinessOwnership()` calls `notFound()` (404), never a 403 that would confirm the business exists |
| A `billing_recovery` customer submits an edit form (e.g. via a replayed request, bypassing the disabled UI) | The Server Action's `requireActiveSubscription()` redirects before any write — client-side `disabled` attributes are a UX convenience only, never the real gate |
| `ensureDraftPreview` is called for a business with zero previews | Returns `null`; every caller in `lib/customer-editing/` surfaces this as "No website exists yet to edit" rather than throwing |
| A customer publishes a `previewId` that doesn't belong to their `businessId` (crafted form payload) | `publishCustomerDraft()` re-fetches the preview and compares `preview.businessId` before calling `publishSitePreview()` — rejects with a generic message, never publishes |

---

## Stage 19.x, Parts 1–2 — Customer Onboarding and Domain Connection deployment guidance

**Deployed to dev 2026-07-31 (including a real Vercel API token and a live domain-routing fix).** Two new DynamoDB tables (`webpresa-dev-customer-onboarding`, `webpresa-dev-domain-connections`) and one new secret (`webpresa-dev-vercel-api`) via `WebpresaDevDataStack` — all purely additive (`cdk diff` confirmed no deletions/replacements before deploying, per the standing gate in `AGENTS.md`). `WebpresaDevVercelAccessStack` redeployed alongside it (`DataAccessPolicy` gained both tables + the new secret ARN). Four new Vercel environment variables added: `CUSTOMER_ONBOARDING_TABLE_NAME`, `DOMAIN_CONNECTIONS_TABLE_NAME`, `VERCEL_API_SECRET_NAME`, `WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH` (Preview only — see below).

### Deploy sequence

```
1. cdk diff WebpresaDevDataStack WebpresaDevVercelAccessStack --profile webpresa   (review, purely additive)
2. cdk deploy WebpresaDevDataStack WebpresaDevVercelAccessStack --profile webpresa
3. npx vercel env add CUSTOMER_ONBOARDING_TABLE_NAME / DOMAIN_CONNECTIONS_TABLE_NAME /
   VERCEL_API_SECRET_NAME  production,preview  (values are the CFN output table/secret names)
4. npx vercel env add WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH  preview   (value: dev — Production left unset)
5. aws secretsmanager put-secret-value --secret-id webpresa-dev-vercel-api \
     --secret-string '{"accessToken":"...","teamId":"...","projectId":"..."}' --profile webpresa
   (teamId/projectId sourced from web/.vercel/project.json; accessToken is a personal access
   token scoped to the andrew-mudges-projects team — expires 2026-10-29, see the env var table
   above for the rotation command)
6. git push origin dev   (rebuilds the app with the new env vars already in place — order matters:
   env vars must be added *before* the triggering push, since a running deployment doesn't pick up
   newly-added Vercel env vars without a fresh build)
```

### Domain-to-branch targeting — the incident and the fix

A real domain (`fitreppro.com`) was connected through the live onboarding flow, its DNS records updated correctly, and it still served the plain marketing homepage instead of the business's site. Root cause: Vercel's plain "add domain to project" call (`POST /v10/projects/{id}/domains` with just `{ name }`) attaches a domain to serve **Production** by default — and `main` (Production) predates Stage 17 entirely (confirmed via `git show main:web/proxy.ts` — only an `/admin` branch exists there, no `/account`, `/app`, or host routing). Every commit implementing Stage 17 through Stage 19.x has so far only ever been pushed to `dev`.

Fix, verified live against the real Vercel API before shipping:

```
# Confirmed gitBranch is a real, settable field:
curl -X PATCH "https://api.vercel.com/v9/projects/{projectId}/domains/fitreppro.com?teamId={teamId}" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"gitBranch":"dev"}'
# → response echoed back "gitBranch": "dev" — fitreppro.com then started redirecting to
#   Vercel's SSO protection page (same as the dev branch alias), confirming it now resolves
#   against the dev deployment instead of Production.
```

`addProjectDomain()` (`web/lib/vercel/domains.ts`) now passes `gitBranch` through on every call, sourced from `WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH` (`web/lib/domains/connect.ts`). **This environment variable must be removed (Production left unset is already correct; nothing to do there) once this pipeline is genuinely promoted to the `main`/Production branch** — at that point every newly connected domain should go back to Vercel's normal Production-by-default behavior.

### Manual verification procedure (partially run — see below)

1. ✅ CDK deploy completed, both stacks `UPDATE_COMPLETE`/purely additive (no manual review flags).
2. ✅ Vercel env vars added and a fresh `dev` build succeeded (`vercel inspect` → `Ready`).
3. ✅ `webpresa-dev-vercel-api` populated with a real token; confirmed live via the `gitBranch` PATCH call above.
4. ✅ A real domain (`fitreppro.com`) was connected end-to-end through the onboarding UI, its DNS updated at the registrar, and verification progressed through to `active` — the domain-to-branch fix above was required to get this far.
5. ⬜ Not yet done: a full fresh walkthrough (claim → Cognito sign-up → Stripe test-mode Checkout → onboarding → domain connection) run start-to-finish in one session against the current build, to confirm the UI-polish changes (real-time verification, inline services editor, backward navigation) all work together.

---

## Deployment order

Infrastructure must be deployed before application code that depends on it.

```
1. CDK bootstrap (once per account/region)
2. WebpresaDevDataStack                 ← DynamoDB tables, S3 bucket, secrets, and the Stage 17
                                            customer Cognito User Pool (incl. Stage 14's
                                            capture-token and Stage 16's internal-api, deployed,
                                            real values populated; Stage 17's claims table,
                                            owner-user-id-index GSI, claim-token secret, and
                                            User Pool — deployed)
3. Create webpresa-vercel-dev IAM user and add keys to Vercel (manual, one-time — see "AWS
                                            credentials for Vercel" above)
4. WebpresaDevScreenshotRepositoryStack ← Stage 14 — ECR repo (deployed)
5. Build/push the screenshot-capture image (scripts/build-and-push-screenshot-lambda.sh) (done)
6. WebpresaDevScreenshotStack           ← Stage 14 — container-image Lambda, DLQ (depends on #2, #4;
                                            deployed — see "Stage 14" above)
7. WebpresaDevScanWorkflowStack         ← Stage 16 — Step Functions state machine + EventBridge
                                            Connection (depends on #2's internal-api secret) —
                                            deployed, see "Stage 16" above
8. WebpresaDevVercelAccessStack         ← every webpresa-vercel-dev permission (data access +
                                            compute invoke + Stage 17's Cognito actions), depends
                                            on #2, #6, #7 — replaces the old manual
                                            `aws iam put-user-policy` steps entirely, see "AWS
                                            credentials for Vercel" above; Stage 17's grants
                                            deployed, see "Stage 17" above
9. (future) Admin multi-user auth       ← Cognito for the *admin* app specifically (still deferred —
                                            not the same Cognito User Pool as Stage 17's customer
                                            accounts, which is deployed as part of #2 above)
10. Web application      ← Vercel deployment (automatic on push)
```

The web application reads table names from environment variables (set in Vercel). If the tables do not exist when the application deploys, DynamoDB calls will fail at runtime.

---

## Vercel deployment

### Project setup (one-time)

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `web` (or rely on `vercel.json` at the repo root)
3. Framework is auto-detected as Next.js
4. Add all environment variables from the table above
5. Connect your production domain under **Settings → Domains**

### Branch → environment mapping

| Branch | Vercel environment |
|---|---|
| `main` | Production |
| `dev` | Preview (auto-deployed on push) |
| All other branches | Preview |

### Triggering a deployment

Every push to a connected branch triggers a deployment automatically. To trigger manually:
```bash
npx vercel --prod   # production deployment
npx vercel          # preview deployment
```

---

## How outputs reach the application

CloudFormation outputs are exported under these names:

```
webpresa-dev-businesses-name
webpresa-dev-businesses-arn
webpresa-dev-site-previews-name
webpresa-dev-site-previews-arn
webpresa-dev-scan-events-name
webpresa-dev-scan-events-arn
webpresa-dev-postcards-name
webpresa-dev-postcards-arn
```

Read a specific output value:

```bash
aws cloudformation describe-stacks \
  --stack-name WebpresaDevDataStack \
  --profile webpresa \
  --query "Stacks[0].Outputs[?ExportName=='webpresa-dev-businesses-name'].OutputValue" \
  --output text
```

For local development, set the corresponding environment variable manually or via a `.env.local` file (gitignored).

For Vercel deployments, add the variable in the Vercel dashboard under **Settings → Environment Variables**.

---

## Deployment commands — what is safe, what requires approval

### Safe to run without approval

These commands make no changes to AWS:

```bash
# Authenticate / verify session
aws sso login --profile webpresa
aws sts get-caller-identity --profile webpresa

# Synthesise CloudFormation template (local only)
cd infra && npx cdk synth --profile webpresa

# Preview changes
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa

# Run tests (no AWS required)
cd infra && npm test
cd web && npm test
```

### Requires explicit approval

These commands make real changes to the AWS account:

```bash
# Bootstrap (one-time, but creates real AWS resources)
npx cdk bootstrap --profile webpresa

# Deploy
npx cdk deploy WebpresaDevDataStack --profile webpresa

# Destroy (IRREVERSIBLE for prod — DeletionPolicy is RETAIN)
npx cdk destroy WebpresaDevDataStack --profile webpresa
```

**Before running `cdk deploy`**, always show the output of `cdk diff` and wait for explicit confirmation. The deployment gate in `AGENTS.md` applies to all agents.

---

## Rollback

### CDK stack rollback

If a deployment fails mid-way, CloudFormation automatically rolls back to the previous stable state. No manual action is needed.

To manually roll back to the previous template:

```bash
# Redeploy the last known-good commit
git checkout <good-commit>
cd infra && npx cdk deploy WebpresaDevDataStack --profile webpresa
```

### DynamoDB tables

- **Dev:** `removalPolicy: DESTROY` — tables are deleted with the stack. No data protection. Safe for development.
- **Prod:** `removalPolicy: RETAIN` + `deletionProtection: true` — tables survive stack deletion and cannot be dropped accidentally. Manual deletion via the AWS Console is required if intentional removal is needed.

Point-in-time recovery (PITR) is enabled for production tables, allowing restore to any second within the 35-day window:

```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name webpresa-prod-businesses \
  --target-table-name webpresa-prod-businesses-restored \
  --restore-date-time "2026-07-10T12:00:00Z" \
  --profile webpresa-prod
```

---

## Adding a new environment variable

1. Add the variable to the relevant section in this file.
2. If it comes from a CloudFormation output, add a `CfnOutput` to the appropriate stack in `infra/`.
3. For local development, add to `.env.local` (gitignored) and update `.env.local.example`.
4. For Vercel, add in the Vercel dashboard under **Settings → Environment Variables**.
5. Update `web/docs/architecture.md`.

---

## Adding a new table

1. Add a `WebpresaTable` instance in `infra/lib/stacks/data-stack.ts`.
2. Add the model interface in `web/domain/models/`.
3. Add the Zod schema in `web/domain/schemas/`.
4. Add the factory in `web/domain/factories/`.
5. Add the corresponding `CfnOutput` export name to this document.
6. Run `cd infra && npx cdk diff --profile webpresa` and confirm before deploying.

## Adding a new S3 prefix (existing assets bucket)

Stage 9 provisions one bucket (`webpresa-{env}-assets`) shared across scan, preview, and postcard artifacts via key prefixes — most future work adds a prefix, not a new bucket:

1. Document the new key pattern under the "S3 asset storage" section of `architecture.md`.
2. Add the prefix to `ALLOWED_PREFIXES` in `web/lib/s3/assets.ts` if application code will write to it directly.
3. If a new runtime (e.g. a Stage 13/14/22 Lambda) needs access, grant it a least-privilege policy scoped to that prefix only — do not reuse the broad `webpresa-vercel-dev` policy.
4. Run `cd infra && npx cdk diff --profile webpresa` and confirm before deploying if the IAM policy or bucket construct itself changed.

A genuinely new bucket (rather than a prefix) would instead follow the `WebpresaBucket` construct pattern in `infra/lib/constructs/webpresa-bucket.ts`, mirroring the steps above.

## Adding a new secret

1. Add a `WebpresaSecret` instance in `infra/lib/stacks/data-stack.ts` with the short name, description, and `jsonKeys` shape.
2. Document the secret name, JSON shape, and owning stage in the "Secrets Manager" section of `architecture.md`.
3. Add the corresponding `*_SECRET_NAME` env var to `.env.local.example` and this document's env var table.
4. Add a typed wrapper in `web/lib/secrets/index.ts` if application code will read it.
5. Extend the `webpresa-dev-secrets` IAM policy above with the new secret's ARN.
6. Run `cd infra && npx cdk diff --profile webpresa` and confirm before deploying.
7. After deploy, populate the real value with `aws secretsmanager put-secret-value` (see above) once the owning stage actually needs it — not before.
