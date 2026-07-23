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
| `POSTCARDS_TABLE_NAME` | CloudFormation export `webpresa-dev-postcards-name` | |
| `ASSETS_BUCKET_NAME` | CloudFormation export `webpresa-dev-assets-name` | S3 assets bucket (Stage 9) |
| `OPENAI_SECRET_NAME` | Deterministic name — `webpresa-dev-openai` | Secrets Manager (Stage 10) |
| `FIRECRAWL_SECRET_NAME` | Deterministic name — `webpresa-dev-firecrawl` | Secrets Manager (Stage 10) |
| `GOOGLE_PLACES_SECRET_NAME` | Deterministic name — `webpresa-dev-google-places` | Secrets Manager (Stage 10) |
| `STRIPE_SECRET_NAME` | Deterministic name — `webpresa-dev-stripe` | Secrets Manager (Stage 10) |
| `LOB_SECRET_NAME` | Deterministic name — `webpresa-dev-lob` | Secrets Manager (Stage 10) |
| `CAPTURE_TOKEN_SECRET_NAME` | Deterministic name — `webpresa-dev-capture-token` | Secrets Manager (Stage 14) — deployed, real signing key populated; **not yet added to Vercel**, see "Stage 14" below |
| `SCREENSHOT_LAMBDA_FUNCTION_NAME` | CloudFormation export `webpresa-dev-screenshot-capture-name` | Stage 14 — deployed (`webpresa-dev-screenshot-capture`); **not yet added to Vercel**, see "Stage 14" below |
| `ADMIN_USERNAME` | Set manually | Admin sign-in username |
| `ADMIN_PASSWORD_HASH` | scrypt hash — see `.env.local.example` for generation command | No quoting needed; pure hex output |
| `SESSION_SECRET` | `openssl rand -base64 32` | Signs JWT session cookies |

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

### Create the IAM user (AWS Console or CLI)

```bash
# Create user (no console access)
aws iam create-user --user-name webpresa-vercel-dev --profile webpresa

# Attach an inline policy scoped to the four dev tables
aws iam put-user-policy \
  --user-name webpresa-vercel-dev \
  --policy-name webpresa-dev-dynamodb \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-businesses",
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-businesses/index/*",
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-site-previews",
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-site-previews/index/*",
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-scan-events",
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-scan-events/index/*",
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-postcards",
        "arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-postcards/index/*"
      ]
    }]
  }' --profile webpresa

# Attach an inline policy scoped to the assets bucket (Stage 9)
aws iam put-user-policy \
  --user-name webpresa-vercel-dev \
  --policy-name webpresa-dev-s3-assets \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::webpresa-dev-assets",
        "arn:aws:s3:::webpresa-dev-assets/*"
      ]
    }]
  }' --profile webpresa

# Attach an inline policy scoped to the 5 Stage 10 secrets
aws iam put-user-policy \
  --user-name webpresa-vercel-dev \
  --policy-name webpresa-dev-secrets \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:539898341083:secret:webpresa-dev-openai-*",
        "arn:aws:secretsmanager:us-east-1:539898341083:secret:webpresa-dev-firecrawl-*",
        "arn:aws:secretsmanager:us-east-1:539898341083:secret:webpresa-dev-google-places-*",
        "arn:aws:secretsmanager:us-east-1:539898341083:secret:webpresa-dev-stripe-*",
        "arn:aws:secretsmanager:us-east-1:539898341083:secret:webpresa-dev-lob-*"
      ]
    }]
  }' --profile webpresa

# Generate access keys
aws iam create-access-key --user-name webpresa-vercel-dev --profile webpresa
```

The `create-access-key` response contains `AccessKeyId` and `SecretAccessKey`. Add both to Vercel immediately and do not store them anywhere else.

> Future Lambda execution roles (Stage 13 crawler, Stage 14 screenshot capture, Stage 22 postcard service) should NOT reuse the broad `webpresa-dev-s3-assets` or `webpresa-dev-secrets` policies — each should get its own prefix/secret-scoped policy (e.g. `s3:PutObject` on `arn:aws:s3:::webpresa-dev-assets/scans/*` only, or `secretsmanager:GetSecretValue` on just its one secret) once those roles are created.

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
- Configure a Google Cloud Billing budget alert (a modest monthly threshold) that notifies before real spend becomes significant. Places API (New) bills per request, and `rating`/`userRatingCount`/`regularOpeningHours` sit in a higher-cost tier than basic identity/location fields — see `implementation.md`, Stage 12, "Economical field-mask requirements."
- No Google Places Photos API access, quota, or S3 storage permission is required for Stage 12. Stage 12 does not download or store Google Places photos (see `implementation.md` and `architecture.md`) — do not enable that capability or grant any photo-storage IAM permission as part of this stage's setup.

### Secret name, JSON shape, and environment variable

Already provisioned in Stage 10 — no new secret is created for Stage 12:

| | |
|---|---|
| Secret name | `webpresa-{env}-google-places` (dev: `webpresa-dev-google-places`) |
| JSON shape | `{ "apiKey": "..." }` |
| Environment variable (the secret's *name*, never the key value) | `GOOGLE_PLACES_SECRET_NAME` — already set to `webpresa-dev-google-places` in `.env.local.example` and in the environment-variable table above |
| IAM | Already granted via the `webpresa-dev-secrets` inline policy on `webpresa-vercel-dev` (see "AWS credentials for Vercel" above) |

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

**Infrastructure deployed to dev and live-verified on 2026-07-23; `webpresa-vercel-dev`'s IAM extended the same day. Only the two Vercel environment variables remain.** `WebpresaDevDataStack` (capture-token secret, real signing key populated), `WebpresaDevScreenshotRepositoryStack` (ECR repo), and `WebpresaDevScreenshotStack` (Lambda/DLQ, `reservedConcurrentExecutions: 5` per spec) are all deployed; the container image is built and pushed; a real `existing_site` capture was invoked directly against the deployed Lambda and both viewports completed successfully (real screenshots verified in S3), the DLQ path was confirmed working, and capture-token rejection-after-terminal was confirmed. `webpresa-vercel-dev` now has `lambda:InvokeFunction` on the screenshot Lambda and `secretsmanager:GetSecretValue` on the capture-token secret (see "Extending `webpresa-vercel-dev`" below). Still pending: adding `SCREENSHOT_LAMBDA_FUNCTION_NAME`/`CAPTURE_TOKEN_SECRET_NAME` to Vercel's environment variables (manual, via the Vercel dashboard — no Vercel CLI credentials available in this environment) — see `build_log.md`, "Stage 14 — Playwright Screenshots", for the full record, including five real bugs hit and fixed getting here: two AWS account-quota issues (see "Account-quota fixes" below) and three Chromium/Lambda-runtime issues only reproducible on the real deployed Lambda, never in local Docker/RIE testing (see "Chromium-on-real-Lambda fixes" below). The steps below are the actual sequence used — three separate stacks, not two, since the ECR repository was split into its own stack (`WebpresaScreenshotRepositoryStack`) deployed before the Lambda stack that references it, to avoid a first-deploy rollback deleting a freshly-created repo. Any remaining/future-environment deploys (e.g. prod) still require explicit approval per this project's deployment gate (`AGENTS.md`).

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

## Deployment order

Infrastructure must be deployed before application code that depends on it.

```
1. CDK bootstrap (once per account/region)
2. WebpresaDevDataStack                 ← DynamoDB tables, S3 bucket, secrets (incl. Stage 14's
                                            capture-token, deployed, real signing key populated)
3. Create webpresa-vercel-dev IAM user and add keys to Vercel
4. WebpresaDevScreenshotRepositoryStack ← Stage 14 — ECR repo (deployed)
5. Build/push the screenshot-capture image (scripts/build-and-push-screenshot-lambda.sh) (done)
6. WebpresaDevScreenshotStack           ← Stage 14 — container-image Lambda, DLQ (depends on #2, #4;
                                            deployed — see "Stage 14" above)
7. Extend webpresa-vercel-dev with Lambda invoke + capture-token secret access (see "Stage 14"
                                            above) — not yet done
8. (future) Auth stack   ← Cognito (when multi-user admin is needed)
9. Web application       ← Vercel deployment (automatic on push)
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
