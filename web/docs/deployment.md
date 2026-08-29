# Webpresa — Deployment

**Last updated:** 2026-07-18

> **Hosting:** Vercel (migrated from AWS Amplify in Stage 7). CDK/DynamoDB infrastructure remains on AWS.

---

## Quick reference

```bash
# 1. Authenticate
aws sso login --profile webpresa-dev

# 2. Preview changes (safe — no AWS writes)
cd infra
npx cdk diff WebpresaDevDataStack --profile webpresa-dev

# 3. Deploy (requires explicit approval — see below)
npx cdk deploy WebpresaDevDataStack --profile webpresa-dev --require-approval never
```

---

## AWS CLI profiles

| Profile | Account | Purpose |
|---|---|---|
| `webpresa-dev` | `539898341083` | Development — renamed from the original bare `webpresa` profile in Stage 22.5 |
| `webpresa-prod` | `994748688217` | Production — account created and CDK-bootstrapped (Stage 22.5); no application stacks deployed yet |

Both profiles use AWS SSO. Sessions expire; re-authenticate when you see `Token has expired and refresh failed`.

```bash
aws sso login --profile webpresa-dev
```

Verify the active session at any time:

```bash
aws sts get-caller-identity --profile webpresa-dev
```

---

## CDK bootstrap

Bootstrap is a one-time operation per account/region that creates the `CDKToolkit` CloudFormation stack (S3 staging bucket, ECR repo, IAM roles).

**Development account:** Already bootstrapped (`539898341083 / us-east-1`).

**Production account:** Already bootstrapped (`994748688217 / us-east-1`, Stage 22.5). The command used:

```bash
WEBPRESA_APP_BASE_URL=https://webpresa.com npx cdk bootstrap --profile webpresa-prod
```

Note the `WEBPRESA_APP_BASE_URL` prefix — `cdk bootstrap` still loads the whole CDK app to discover environments, which trips `bin/webpresa.ts`'s hard-fail guard even though bootstrap itself never uses the value. Any `cdk` command in this app, not just `synth`/`diff`/`deploy`, needs it set.

To verify whether an account is already bootstrapped:

```bash
aws cloudformation describe-stacks --stack-name CDKToolkit --profile webpresa-dev \
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
| `STRIPE_SECRET_NAME` | Deterministic name — `webpresa-dev-stripe` (Preview) / `webpresa-prod-stripe` (Production) | Secrets Manager (Stage 10). Production's secret holds real **live-mode** `secretKey`/`webhookSecret` as of 2026-08-19 — see "Stripe live mode setup" below |
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
| `COGNITO_HOSTED_UI_DOMAIN` | CloudFormation export `webpresa-dev-customers-hosted-ui-domain` | "Sign in with Google" — Cognito Hosted UI base URL (e.g. `https://webpresa-dev-customers.auth.us-east-1.amazoncognito.com`), read by `lib/auth/google-oauth.ts`. See "Google federation ('Sign in with Google') deployment guidance" below |
| `GOOGLE_OAUTH_STATE_SECRET` | `openssl rand -base64 32` | "Sign in with Google" — signs the short-lived OAuth `state` token (`lib/auth/google-oauth-state.ts`); its own dedicated secret, separate from `CLAIM_ATTEMPT_SECRET`/`CUSTOMER_SESSION_SECRET` |
| `CUSTOMER_BILLING_PROFILES_TABLE_NAME` | CloudFormation export `webpresa-dev-customer-billing-profiles-name` | Stage 18 — deployed (`webpresa-dev-customer-billing-profiles`); not yet added to Vercel |
| `STRIPE_PRICE_ID_BASIC` | Stripe Price ID (Preview: test-mode; Production: **live-mode**, see "Stripe live mode setup" below) | Stage 18 — Preview holds the test-mode Price (`price_1TyjryHTxTryrfUCNCT4A9Yn`); Production updated 2026-08-19 to the live-mode Price (`price_1U66jNHTxTryrfUCnt0mOcSp`, $39.00/month). Not a secret, but server-only (never `NEXT_PUBLIC_`) |
| `STRIPE_PRICE_ID_GROWTH` | Stripe test-mode Price ID (created via CLI, see below) | Stage 18 — created (`price_1TyjsnHTxTryrfUCMeAT0q3K`); added to Vercel Production + Preview. Not a secret, but server-only (never `NEXT_PUBLIC_`). Still test-mode on Production too — Growth has no live Price yet since it isn't customer-purchasable |
| `STRIPE_PRICE_ID_BASIC_ANNUAL` | Stripe Price ID for the $375/year Basic option (Preview: test-mode; Production: **live-mode**) | Stage 18 — Preview holds the test-mode Price (`price_1U4mSHHTxTryrfUCE3Y9PaKr`, on Product `prod_V4wKBDvjHO3E3N`); Production updated 2026-08-19 to the live-mode Price (`price_1U66k3HTxTryrfUCZwDdq1Iv`). Same non-secret, server-only handling as the monthly Price IDs above |
| `STRIPE_PRICE_ID_GROWTH_ANNUAL` | Stripe test-mode Price ID for annual Growth billing | Reserved for when Growth becomes purchasable — not created, not required today since Growth isn't offered in `PlanSelectionForm` |
| `WEBPRESA_APP_BASE_URL` | Real deployed app URL | Stage 18 — Production updated 2026-08-19 to the real `https://www.webpresa.com` (previously a placeholder — see "Stripe live mode setup" below); server-only, used to build Checkout success/cancel URLs and the Customer Portal return URL. Same variable name as the existing infra-side (Stage 14/16) shell variable, added here as a `web/` runtime variable |
| `CUSTOMER_ONBOARDING_TABLE_NAME` | CloudFormation export `webpresa-dev-customer-onboarding-name` | Stage 19.x, Part 1 — deployed via `cdk synth`/tests only, not yet a real `cdk deploy`; not yet added to Vercel |
| `DOMAIN_CONNECTIONS_TABLE_NAME` | CloudFormation export `webpresa-dev-domain-connections-name` | Stage 19.x, Part 2 — deployed via `cdk synth`/tests only, not yet a real `cdk deploy`; not yet added to Vercel |
| `VERCEL_API_SECRET_NAME` | Deterministic name — `webpresa-dev-vercel-api` | Secrets Manager (Stage 19.x, Part 2) — deployed 2026-07-31, real `{ accessToken, teamId, projectId }` populated (`teamId`/`projectId` sourced from `web/.vercel/project.json`). **The `accessToken` is a personal access token scoped to the `andrew-mudges-projects` team and expires 2026-10-29** — rotate it before then (generate a new token at vercel.com/account/tokens, then `aws secretsmanager put-secret-value --secret-id webpresa-dev-vercel-api --secret-string '{"accessToken":"...","teamId":"...","projectId":"..."}' --profile webpresa-dev`) or domain-connection calls in `lib/vercel/client.ts` will start failing with `VercelApiError('auth', ...)`. |
| `WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH` | `dev` | Stage 19.x, Part 2 (added 2026-07-31) — added to Vercel's **Preview environment only** (left unset in Production). Passed as `gitBranch` on every `addProjectDomain()` call so a newly connected customer domain serves this app's `dev` branch instead of silently falling through to Vercel's Production default — see "Domain-to-branch targeting" below. Must be removed (or the whole mechanism revisited) once Stage 17+ is genuinely deployed to Production. |
| `BUILD_SESSION_SECRET` | `openssl rand -base64 32` | Self-service build funnel (`/build`) — signs the short-lived build-session cookie (`lib/auth/build-session.ts`); its own dedicated secret, separate from `CLAIM_ATTEMPT_SECRET`/`CUSTOMER_SESSION_SECRET`/`GOOGLE_OAUTH_STATE_SECRET`. **Not yet added to Vercel** — until it is, `submitBuildAction` throws immediately after a successful business-create/photo-upload/scan-trigger (right when it tries to sign the cookie), surfacing to the visitor as a generic 500/"Server Components render" error on the final step. Same missing-secret failure mode as `CUSTOMER_SESSION_SECRET`/`CLAIM_ATTEMPT_SECRET` below. |

Never put these in client-side code or commit `.env` files that contain real values.

---

## Local vs deployed AWS credentials

### Local development

The CDK CLI and AWS CLI use the `webpresa-dev` SSO profile (or `webpresa-prod` for production), which resolves to temporary credentials from the SSO token. These credentials are never embedded in code.

```bash
# All infra commands pass the profile explicitly:
npx cdk synth --profile webpresa-dev
npx cdk diff  --profile webpresa-dev
npx cdk deploy WebpresaDevDataStack --profile webpresa-dev
```

When running the Next.js application locally against real DynamoDB tables, set `AWS_PROFILE=webpresa-dev` in `.env.local`. The AWS SDK resolves SSO credentials automatically from the active session.

### Deployed (Vercel)

Vercel has no IAM role concept, so a dedicated **IAM user** (`webpresa-vercel-dev`) provides the credentials. Store the user's access keys as Vercel environment variables. See "AWS credentials for Vercel" below.

---

## AWS credentials for Vercel

Create a least-privilege IAM user once and store its keys in Vercel. Do not use root credentials or the personal `webpresa-dev`/`webpresa-prod` SSO user.

### Create the IAM user (one-time, manual — not CDK)

```bash
# Create user (no console access)
aws iam create-user --user-name webpresa-vercel-dev --profile webpresa-dev

# Generate access keys
aws iam create-access-key --user-name webpresa-vercel-dev --profile webpresa-dev
```

The `create-access-key` response contains `AccessKeyId` and `SecretAccessKey`. Add both to Vercel immediately and do not store them anywhere else.

The user and its access keys are deliberately **not** managed by CDK — a long-lived secret access key should never flow through a CloudFormation template or output. CDK only attaches permission policies to this already-existing user (see below).

### Creating the production user (`webpresa-vercel-prod`)

**Stage 25 (Security Hardening)**: this repeatable procedure was undocumented until now — `WebpresaProdVercelAccessStack` has been deployed since Stage 22.5 (see `architecture.md`'s stack table), but the steps that actually created the `webpresa-vercel-prod` IAM user and its keys were never recorded here, only the dev flow was. Identical to the dev procedure above, against the prod account and profile:

```bash
# Create user (no console access) — in the prod AWS account (994748688217)
aws iam create-user --user-name webpresa-vercel-prod --profile webpresa-prod

# Generate access keys
aws iam create-access-key --user-name webpresa-vercel-prod --profile webpresa-prod
```

Add the resulting `AccessKeyId`/`SecretAccessKey` to Vercel's **Production** environment only (`npx vercel env add AWS_ACCESS_KEY_ID production` / `npx vercel env add AWS_SECRET_ACCESS_KEY production` — see "Vercel CLI" below) — never to Preview, and never reuse the dev user's keys here. `WebpresaProdVercelAccessStack` attaches the same two managed policies described below to this user, scoped to prod's own tables/secrets/buckets/compute by construction (same CDK source as dev, different `config.suffix`).

**Verifying Production is actually using the prod user's keys** (do this after any credential change, and periodically): compare the `AccessKeyId` prefix Vercel has stored (`npx vercel env ls` shows metadata but masks values — see "Vercel CLI" below for why the value itself can't be read back) against `aws iam list-access-keys --user-name webpresa-vercel-prod --profile webpresa-prod`. If Production's requests are ever seen touching `webpresa-dev-*` resources (or vice versa), treat that as a credential-binding mismatch, not an application bug — see the Stage 25 runtime consistency guard (`web/lib/env/resource-consistency.ts`), which fails loudly the first time a deployment resolves a table/secret/bucket name from a different environment than one it already resolved.

### Rotating either user's keys

No automated rotation exists — Vercel's credential model (plain environment variables, not an assumable IAM role) makes full automation impractical, so this is a documented manual procedure instead:

1. Generate a new access key for the relevant user (`aws iam create-access-key --user-name webpresa-vercel-{dev,prod} --profile webpresa-{dev,prod}`) — IAM allows two active keys per user simultaneously, so the old key keeps working during this process.
2. Update the corresponding Vercel environment (`Preview` for `webpresa-vercel-dev`, `Production` for `webpresa-vercel-prod`) with the new `AccessKeyId`/`SecretAccessKey` (`npx vercel env rm` then `npx vercel env add`, per "Vercel CLI" below — removing and re-adding is required since values can't be updated in place).
3. Trigger a new deployment (or wait for the next one) so the running app picks up the new credential — see `lib/secrets/client.ts`'s doc comment: AWS clients cache credentials for the process lifetime, so an in-flight serverless instance keeps using whatever it started with until it cold-starts again.
4. Confirm the new key works (a real request succeeding against DynamoDB/S3/Secrets Manager — e.g. load any admin page).
5. Deactivate, then delete, the old access key (`aws iam update-access-key --status Inactive ...` first, confirm nothing breaks, then `aws iam delete-access-key ...`) — never delete the key still in active use.

Rotate immediately, out of this normal cadence, if a key is ever suspected exposed (committed to git, printed in a log, shared outside Vercel's own storage).

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

Prompts for the value (or pipe it: `echo -n "value" | npx vercel env add MY_VAR_NAME production`). Through Stage 22, this project set most vars identically on both `production` and `preview`; as of Stage 22.5, every variable that differs between dev and prod AWS resources is a separate, independently-valued binding per environment (see "Required environment variables" above for the full list). `development` is not used; local dev reads `.env.local` directly (see "Local vs deployed AWS credentials" above).

**Gotcha (hit 2026-08-12, Stage 22.5):** `vercel env rm NAME production` on a variable whose value is bound to **both** Production and Preview as one shared entry deletes it from both environments, not just the target one — confirmed on `TERMS_VERSION`, which had to be restored immediately after. Values are also write-only once stored (`vercel env pull` masks everything as `[SENSITIVE]`), so there is no way to read one back before deleting it. When splitting a shared variable into independent per-environment values, know (or be willing to regenerate) both sides' values *before* touching `rm` — once it's gone, it's gone.

**Gotcha (hit 2026-08-12, Stage 22.5):** `npx vercel` (unpinned) intermittently fails to resolve its own "latest" version against the npm registry (`npm error ETARGET`), and the CLI's exit code doesn't reliably reflect the failure even under `set -o pipefail` — a batch of `env add`/`env rm` calls can print "success" while some silently didn't happen. Pin the version explicitly (`npx vercel@58.9.5`, or whatever is currently cached/working) for any scripted batch of env var changes, and always re-verify the end state with `vercel env ls` rather than trusting script output alone. Separately, `vercel env add NAME preview` can hang on an interactive `? Git branch?` prompt when stdin is already consumed by a piped value — add `--yes` to auto-accept it (applies to all Preview branches).

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
  --profile webpresa-dev
```

For the two-key Stripe secret, include both keys:

```bash
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-stripe \
  --secret-string '{"secretKey":"sk_test_...","webhookSecret":"whsec_..."}' \
  --profile webpresa-dev
```

Google Places (Stage 12) follows the same one-key shape as OpenAI, Firecrawl, and Lob:

```bash
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-google-places \
  --secret-string '{"apiKey":"AIza..."}' \
  --profile webpresa-dev
```

The claim-token secret (Stage 17) is generated locally, not obtained from a third party — same pattern as `capture-token`/`internal-api` (see "Stage 17" above for the full command).

Because CloudFormation only touches a secret's value when the CDK construct's `jsonKeys` change, running `cdk deploy` afterward does not overwrite a value set this way. Never paste real secret values into a commit, a CDK construct prop, or this document.

---

## Stage 12 — Google Places Discovery deployment guidance

**Application code is implemented and manually verified** (see `build_log.md`, "Stage 12 — Google Places Discovery"). The `webpresa-dev-google-places` secret now holds a real API key (populated via the standard `aws secretsmanager put-secret-value --profile webpresa-dev` command below — no other AWS resource was created or modified). **No Google Cloud project configuration, IAM key-restriction setup, quota, or budget alert has been performed** — the guidance below (API key restrictions, quota limits, budget alerts) still describes required setup, not completed setup. No Vercel change or deployment was performed.

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
- `AWS_PROFILE=webpresa-dev` so the local Secrets Manager client can resolve the secret via SSO credentials, matching every other integration.
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
  --profile webpresa-dev
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
1. Ensure `.env.local` has `FIRECRAWL_SECRET_NAME`, `AWS_PROFILE=webpresa-dev` (or Vercel's AWS keys), and the other standard variables set (see the environment-variable table above).
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
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa-dev
npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 2. Populate the real signing key (same pattern as every other secret —
#    this one is generated locally, not obtained from a third party):
openssl rand -base64 48 | tr -d '\n' > /tmp/capture-token-key.txt
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-capture-token \
  --secret-string "{\"signingKey\":\"$(cat /tmp/capture-token-key.txt)\"}" \
  --profile webpresa-dev
rm /tmp/capture-token-key.txt

# 3. Screenshot repository stack — creates only the ECR repo. Must be
#    deployed and exist before step 4 can push an image, and before step 5
#    deploys the Lambda that references it as a cross-stack import.
npx cdk diff WebpresaDevScreenshotRepositoryStack --profile webpresa-dev
npx cdk deploy WebpresaDevScreenshotRepositoryStack --profile webpresa-dev

# 4. Build and push the container image (the Lambda in step 5 will fail to
#    find an image if this hasn't run yet):
./scripts/build-and-push-screenshot-lambda.sh dev webpresa

# 5. Screenshot stack — Lambda, DLQ, IAM. Always use these npm scripts
#    (never a raw `cdk diff`/`cdk deploy` for this stack) — they bake in the
#    real WEBPRESA_APP_BASE_URL so it can't be accidentally omitted (see
#    "WEBPRESA_APP_BASE_URL" below for why that matters):
npm run diff:screenshot
npm run deploy:screenshot

# 6. If the Lambda's imageTag prop pins a digest rather than 'latest',
#    redeploy the screenshot stack so it picks up the new image:
npm run deploy:screenshot

# 7. Verify the deploy actually took the real URL, not a placeholder:
aws lambda get-function-configuration --function-name webpresa-dev-screenshot-capture \
  --profile webpresa-dev --query "Environment.Variables.WEBPRESA_APP_BASE_URL"
# Must NOT contain "REPLACE_WITH" or ".invalid" — see the 2026-07-28 incident below.
```

### Redeploy after rotating internal-api/capture-token/vercel-protection-bypass (2026-08-12 prod incident)

`internal-api`, `capture-token`, and `vercel-protection-bypass` are all read once and cached indefinitely by their consumers — `web/lib/secrets.ts` caches for the Next.js process lifetime, and the screenshot Lambda's `getSecretJson()` (`infra/lambda/screenshot-capture/src/aws.ts`) caches per execution environment with no TTL, same "fetch once, cache forever" convention used everywhere in this codebase. **Populating or rotating any of these three secrets does nothing for a resource that already read the old value and hasn't been redeployed since.**

Two real prod incidents on 2026-08-12 came from exactly this: the real secret values were populated (`06:27 CDT`) *after* the scan-workflow EventBridge Connection and the screenshot Lambda had already been created/deployed with the placeholder.

- **EventBridge Connection** (`webpresa-{env}-internal-api`) bakes its credential into its own AWS-managed secret at deploy time — it never re-reads the source secret on its own. A stale credential shows up as `States.Http.StatusCode.401` on the first task, then `Events.ConnectionResource.InvalidConnectionState` on every retry after EventBridge marks itself `DEAUTHORIZED`. Fix: `aws events update-connection` with the current secret values (no CDK change needed — the Connection resource itself doesn't change, just its live credential).
- **Screenshot Lambda** kept minting capture tokens with the stale `capture-token` signing key from whichever warm execution environments predated the rotation — `generated_preview` captures still reported `status: completed` (a screenshot genuinely was taken and uploaded), but the artifact was a screenshot of the app's own 404 page, because the stale token failed `verifyCaptureToken()` and `resolvePreview()` fell through to `notFound()`. Nothing about this is visible from the ScanEvent status alone — the only way to catch it is opening the actual image. Fix: redeploy the screenshot stack (any Lambda config/code change forces new execution environments, which re-fetch the current secret on cold start) — `npm run deploy:screenshot[:prod]`.

**Takeaway:** after populating or rotating any of these three secrets, redeploy every stack that depends on them (`WebpresaScanWorkflowStack` for `internal-api`, `WebpresaScreenshotStack` for `capture-token/vercel-protection-bypass`) even if nothing else about those stacks changed — a no-op `cdk deploy` won't force this since CDK only pushes secret values into new/changed resources, so you may need to bump something trivial (an env var, a description) to force it through, or use the AWS CLI directly against the affected resource (as done for the EventBridge Connection above).

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
  --profile webpresa-dev --region us-east-1
aws lambda wait function-updated --function-name webpresa-dev-screenshot-capture --profile webpresa-dev --region us-east-1
# Confirm it actually picked up the new image:
aws lambda get-function --function-name webpresa-dev-screenshot-capture --profile webpresa-dev --region us-east-1 \
  --query 'Configuration.CodeSha256' --output text
```

`WEBPRESA_APP_BASE_URL` is read directly from the shell environment by `infra/bin/webpresa.ts` — it is not (and should not be) stored in `.env.local`, since `infra/` is a separate CLI project from `web/`. **`bin/webpresa.ts` hard-fails (throws before constructing any stack) if this is unset — there is no placeholder fallback.** This used to fall back silently to a fake `https://REPLACE_WITH_..._APP_BASE_URL.invalid` URL so `cdk synth`/`cdk diff` never hard-failed with no override — but that same silent fallback is exactly what let a `cdk deploy WebpresaDevScreenshotStack` on 2026-07-28 (run without the env var set) actually deploy the placeholder into the live Lambda, breaking every `generated_preview` capture with "Page failed to load" for days before anyone noticed, since CloudFormation has no way to know the URL is fake. Always use `npm run diff:screenshot`/`npm run deploy:screenshot` (or `diff:scan-workflow`/`deploy:scan-workflow` for Stage 16), which bake in the real dev URL, rather than a raw `cdk` command — and confirm with the verification command in step 7 above after every deploy.

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
  }' --profile webpresa-dev
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

**Regression, 2026-07-28 → fixed 2026-08-01:** a `cdk deploy WebpresaDevScanWorkflowStack` run without `WEBPRESA_APP_BASE_URL` set silently re-baked the old placeholder fallback (`https://REPLACE_WITH_DEV_APP_BASE_URL.invalid`) into all 7 `HttpInvoke` endpoints and the IAM role's `states:InvokeHTTPEndpoint` condition — every execution since then failed within ~45s with `States.Http.AccessDenied`, but the failure state itself couldn't call back to the app either, so the `ScanExecution` DynamoDB record stayed stuck at `queued` forever (admin UI showed a permanently "Running…" workflow, nothing populated under Scans). Fixed by redeploying with the real URL and manually correcting the two orphaned `ScanExecution` records to `failed`. `bin/webpresa.ts` no longer has a placeholder fallback at all (see "WEBPRESA_APP_BASE_URL" under Stage 14 above) — this exact failure mode can't recur silently.

### Deploy sequence (first time)

```bash
# 1. Data stack — adds the scan-executions table and the internal-api secret. Review first:
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa-dev
npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 2. Populate the real shared secret (generated locally, not obtained from a third party —
#    same pattern as capture-token in Stage 14):
openssl rand -base64 48 | tr -d '\n' > /tmp/internal-api-secret.txt
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-internal-api \
  --secret-string "{\"sharedSecret\":\"$(cat /tmp/internal-api-secret.txt)\"}" \
  --profile webpresa-dev
rm /tmp/internal-api-secret.txt

# 3. Scan workflow stack — state machine + EventBridge Connection. Always use
#    these npm scripts (never a raw `cdk diff`/`cdk deploy` for this stack) —
#    they bake in the real WEBPRESA_APP_BASE_URL (same variable Stage 14
#    needs — see "WEBPRESA_APP_BASE_URL" under Stage 14 above for why an
#    unset value is dangerous, not just inconvenient):
npm run diff:scan-workflow
npm run deploy:scan-workflow

# 4. Verify the deploy actually took the real URL, not a placeholder — every
#    ApiEndpoint in the state machine definition must show the real host:
aws stepfunctions describe-state-machine \
  --state-machine-arn arn:aws:states:us-east-1:<account-id>:stateMachine:webpresa-dev-scan-workflow \
  --profile webpresa-dev --query definition --output text | grep -o "https://[^']*" | sort -u
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
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa-dev
npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 2. Populate the real HMAC pepper (generated locally, not obtained from a
#    third party — same pattern as capture-token/internal-api in Stages 14/16):
openssl rand -base64 48 | tr -d '\n' > /tmp/claim-token-secret.txt
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-claim-token \
  --secret-string "{\"hmacSecret\":\"$(cat /tmp/claim-token-secret.txt)\"}" \
  --profile webpresa-dev
rm /tmp/claim-token-secret.txt

# 3. Vercel access stack — grants Claims table access, claim-token secret
#    access, and the Cognito actions:
npx cdk diff WebpresaDevVercelAccessStack --profile webpresa-dev
npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev
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
| `BUILD_SESSION_SECRET` missing | Same failure mode — `signBuildSession()` throws immediately, mid-`submitBuildAction`, *after* the business/photos/scan-trigger writes already succeeded (only the final cookie-signing step fails), surfacing as a generic 500 on `/build`'s last step |
| Real signup volume exceeds Cognito's default ~50 emails/day | Confirmation/reset emails silently stop sending past the cap — deferred fix is configuring the User Pool for SES-backed email (see `architecture.md`, "Authentication → Customer") |

---

## Stage 18 — Stripe Subscriptions deployment guidance

**Deployed to dev 2026-07-29 — including a real Stripe test-mode account.** Adds one new table (`customer-billing-profiles` — PK `userId`, no GSI), one new GSI on the existing `businesses` table (`stripe-subscription-id-index`) — both inside the existing `WebpresaDataStack`, no new stack, no new compute. Both are live in `webpresa-dev-*`; `WebpresaDevVercelAccessStack` was redeployed alongside it (`DataAccessPolicy` gained the new table's ARN + `/index/*`). The `webpresa-dev-stripe` secret now holds real test-mode `secretKey`/`webhookSecret` values, two real test-mode Products/Prices exist, and a real webhook endpoint is registered and delivering successfully. Remaining: add the Vercel environment variables below (no Vercel CLI/token available in the environment that ran this setup).

### Deploy sequence (first time)

```bash
# 1. Data stack — adds the customer-billing-profiles table and the
#    stripe-subscription-id-index GSI on businesses. Review first:
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa-dev
npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 2. Vercel access stack — grants the new table and GSI ARNs (the Stripe
#    secret is already granted from Stage 10):
npx cdk diff WebpresaDevVercelAccessStack --profile webpresa-dev
npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev
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
  --profile webpresa-dev
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

**Resolved 2026-08-19 — see "Stripe live mode setup" below.**

### Stripe live mode setup (2026-08-19)

Production is wired for live-mode Stripe, pending the user's own redeploy to activate it (env var changes only take effect on a new deployment — see the "Newly added/changed env vars only take effect on a new deployment" note above).

- `webpresa-prod-stripe` (Secrets Manager, `webpresa-prod` account) overwritten with the real live-mode `secretKey` (`sk_live_...`) and a real `webhookSecret` (`whsec_...`) from a webhook endpoint registered in the Stripe Dashboard (Live mode) at `https://webpresa.com/api/webhooks/stripe`, listening for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` — same allowlist the route handler already enforces. Previously held dev's test-mode `secretKey` copied over by Stage 22.5, with a placeholder `webhookSecret` (no live webhook had ever been registered).
- Confirmed via `curl -X POST https://webpresa.com/api/webhooks/stripe` (`400`, not a `302` to Vercel SSO) that Production, unlike Preview/dev, is **not** behind Vercel Deployment Protection — the live webhook URL needed no `?x-vercel-protection-bypass=` query param.
- Two live-mode Products/Prices created by the user directly in the Stripe Dashboard (not via CLI, unlike dev's setup) — "Webpresa Basic" at $39.00/month (`price_1U66jNHTxTryrfUCnt0mOcSp`) and "Webpresa Basic Annual" at $375/year (`price_1U66k3HTxTryrfUCZwDdq1Iv`), matching the price the app's own Terms of Service and pricing UI already advertise (`domain/constants/plan-catalog.ts`, `app/(legal)/terms/page.tsx`).
- Vercel Production env vars updated: `STRIPE_PRICE_ID_BASIC` and `STRIPE_PRICE_ID_BASIC_ANNUAL` now hold the live Price IDs above; `WEBPRESA_APP_BASE_URL` now holds `https://www.webpresa.com` (previously a placeholder — see note above).
- Decided (user, 2026-08-19): use the classic Secret key (`sk_live_...`), not a Restricted API Key, because `assertLiveModeAllowed()` (`web/lib/env/runtime-environment.ts`) only recognizes live-mode keys by the `sk_live_` prefix — an `rk_live_` key would silently bypass that non-production safety guard without a corresponding code change.
- Growth's live Price IDs were not created — Growth remains not customer-purchasable in the current MVP UI (see `implementation.md`'s Stage 18, "MVP launch update").
- **Not yet done**: the actual Production redeploy that activates these values (user will trigger it), and the end-to-end live smoke test (real Checkout → webhook delivery → `Business.subscriptionStatus` flips to `active`) that should follow it.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `STRIPE_SECRET_NAME` secret still holds its placeholder value | Every Stripe API call (Checkout Session creation, Portal Session creation, webhook signature verification) fails closed with a generic error — no fallback, no silent success |
| `STRIPE_PRICE_ID_BASIC`/`STRIPE_PRICE_ID_GROWTH` missing/wrong | `resolvePriceId()` throws before any Stripe call — Checkout creation fails with a generic `plan_unavailable` reason, never a raw Stripe error |
| `STRIPE_PRICE_ID_BASIC_ANNUAL` missing | Same failure mode, but only when the claim-status Annual toggle is selected — Monthly checkout is unaffected |
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
1. cdk diff WebpresaDevDataStack WebpresaDevVercelAccessStack --profile webpresa-dev   (review, purely additive)
2. cdk deploy WebpresaDevDataStack WebpresaDevVercelAccessStack --profile webpresa-dev
3. npx vercel env add CUSTOMER_ONBOARDING_TABLE_NAME / DOMAIN_CONNECTIONS_TABLE_NAME /
   VERCEL_API_SECRET_NAME  production,preview  (values are the CFN output table/secret names)
4. npx vercel env add WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH  preview   (value: dev — Production left unset)
5. aws secretsmanager put-secret-value --secret-id webpresa-dev-vercel-api \
     --secret-string '{"accessToken":"...","teamId":"...","projectId":"..."}' --profile webpresa-dev
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
  --profile webpresa-dev \
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
aws sso login --profile webpresa-dev
aws sts get-caller-identity --profile webpresa-dev

# Synthesise CloudFormation template (local only)
cd infra && npx cdk synth --profile webpresa-dev

# Preview changes
cd infra && npx cdk diff WebpresaDevDataStack --profile webpresa-dev

# Run tests (no AWS required)
cd infra && npm test
cd web && npm test
```

### Requires explicit approval

These commands make real changes to the AWS account:

```bash
# Bootstrap (one-time, but creates real AWS resources)
npx cdk bootstrap --profile webpresa-dev

# Deploy
npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# Destroy (IRREVERSIBLE for prod — DeletionPolicy is RETAIN)
npx cdk destroy WebpresaDevDataStack --profile webpresa-dev
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
cd infra && npx cdk deploy WebpresaDevDataStack --profile webpresa-dev
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
6. Run `cd infra && npx cdk diff --profile webpresa-dev` and confirm before deploying.

## Adding a new S3 prefix (existing assets bucket)

Stage 9 provisions one bucket (`webpresa-{env}-assets`) shared across scan, preview, and postcard artifacts via key prefixes — most future work adds a prefix, not a new bucket:

1. Document the new key pattern under the "S3 asset storage" section of `architecture.md`.
2. Add the prefix to `ALLOWED_PREFIXES` in `web/lib/s3/assets.ts` if application code will write to it directly.
3. If a new runtime (e.g. a Stage 13/14/22 Lambda) needs access, grant it a least-privilege policy scoped to that prefix only — do not reuse the broad `webpresa-vercel-dev` policy.
4. Run `cd infra && npx cdk diff --profile webpresa-dev` and confirm before deploying if the IAM policy or bucket construct itself changed.

A genuinely new bucket (rather than a prefix) would instead follow the `WebpresaBucket` construct pattern in `infra/lib/constructs/webpresa-bucket.ts`, mirroring the steps above.

## Adding a new secret

1. Add a `WebpresaSecret` instance in `infra/lib/stacks/data-stack.ts` with the short name, description, and `jsonKeys` shape.
2. Document the secret name, JSON shape, and owning stage in the "Secrets Manager" section of `architecture.md`.
3. Add the corresponding `*_SECRET_NAME` env var to `.env.local.example` and this document's env var table.
4. Add a typed wrapper in `web/lib/secrets/index.ts` if application code will read it.
5. Extend the `webpresa-dev-secrets` IAM policy above with the new secret's ARN.
6. Run `cd infra && npx cdk diff --profile webpresa-dev` and confirm before deploying.
7. After deploy, populate the real value with `aws secretsmanager put-secret-value` (see above) once the owning stage actually needs it — not before.

---

## Settings Page Redesign — IAM deploys

### `AdminUpdateUserAttributes` — deployed 2026-08-02

The Settings page's Account card ("Edit Account," name/phone editing) calls Cognito's `AdminUpdateUserAttributes`. `infra/lib/stacks/vercel-access-stack.ts`'s `CognitoCustomerAuth` statement was extended with this action, `cdk diff` reviewed (single additive IAM statement change, no other stack affected), approved, and deployed:

```bash
cd infra
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev --require-approval never
```

Verified live via `aws iam get-policy-version` on `webpresa-dev-vercel-data-access` — the `CognitoCustomerAuth` statement's `Action` list includes `AdminUpdateUserAttributes`. "Edit Account" name/phone editing is fully functional against the real dev pool.

### `AdminDeleteUser` — deployed 2026-08-02

The Delete Account feature (`build_log.md`, "Settings Page Redesign — Delete Account") calls Cognito's `AdminDeleteUser` as its last cascade step. The same `CognitoCustomerAuth` statement now also includes `cognito-idp:AdminDeleteUser`. First deploy attempt hit an expired SSO session (`aws sso login --profile webpresa-dev` needed interactively, `cdk`'s own SDK credential resolution failed with `Unable to resolve AWS account to use` even though `aws sts get-caller-identity` still returned a cached-valid identity) — resolved by re-running `aws sso login --profile webpresa-dev`, after which `cdk diff` showed exactly the expected single additive IAM action (no other changes) and was deployed:

```bash
cd infra
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev --require-approval never
```

Verified live via `aws iam get-policy-version` on `webpresa-dev-vercel-data-access` — the `CognitoCustomerAuth` statement's `Action` list includes both `AdminDeleteUser` and `AdminUpdateUserAttributes`. Delete Account's full cascade, including the final Cognito step, is now fully functional against the real dev pool — no known partial-failure gap remains.

---

## Stage 20 — Contact Forms and Lead Delivery deployment guidance

**Deployed and live in both dev and prod.** Unlike Stage 19, this stage has real infrastructure: one new DynamoDB table, one new IAM statement, several new environment variables, a manually-verified SES sending identity, and — the first time this repo has needed it — a Vercel Cron schedule.

### Deploy sequence

```bash
cd infra

# 1. Data stack — adds the leads table (PK leadId, business-id-index GSI, ttl attribute):
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevDataStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 2. Vercel access stack — grants the leads table + indexes, and the new
#    SesSendLeadNotifications IAM statement (bare Resource: '*' — see
#    architecture.md for why two narrower, pattern-matched scopes both
#    proved unreliable in practice):
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevVercelAccessStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev
```

### SES setup (manual — not CDK-managed)

This repo has no Route53-hosted-zone CDK construct, so unlike every other integration here, the SES sending identity itself is verified entirely through the AWS Console/CLI, not `cdk deploy`:

1. In the SES console (same region as `AWS_REGION`), verify the sending identity — either the `webpresa.com` domain (add the DKIM CNAME records SES provides to wherever `webpresa.com`'s DNS is actually managed) or a single email address (e.g. `leads@webpresa.com`, a simple confirmation-link click).
2. **Production access approved 2026-08-13** (AWS case `178644604200524`) for both the dev and prod accounts — SES now delivers to any recipient, not just individually-verified addresses. `andrew@webpresa.com`/`mudge.andrew+test@gmail.com` remain verified from the sandbox-testing era but are no longer required for a send to succeed. Verify current status any time with `aws sesv2 get-account --profile <dev|prod> --query 'ProductionAccessEnabled'`.
3. Set `SES_FROM_EMAIL` in Vercel to the verified sending address.

### New Vercel environment variables

| Variable | Value |
|---|---|
| `LEADS_TABLE_NAME` | CloudFormation export `webpresa-dev-leads-name` |
| `SES_FROM_EMAIL` | The verified SES sending address (see above) |
| `CRON_SECRET` | The same `sharedSecret` value already populated in the `webpresa-dev-internal-api` secret — Vercel Cron sends this as `Authorization: Bearer <value>` |

### Vercel Cron

`web/vercel.json` (new file — no `vercel.json` existed anywhere in this repo before this stage) schedules `GET /api/internal/leads/retry-notifications` **once daily** (`0 6 * * *` — 06:00 UTC, arbitrary off-peak hour). This was originally every 15 minutes, but the project is on Vercel's Hobby plan, which hard-caps cron jobs at once/day — a `vercel deploy` with a sub-daily schedule fails outright with `Hobby accounts are limited to daily cron jobs`. Daily is the fastest this can run without upgrading to Pro; upgrading later is a one-line schedule change, no code change. Vercel picks the cron up automatically on deploy — no separate `vercel cron` command exists. Confirm it's registered under the project's Cron Jobs dashboard tab after the first deploy that includes this file, and check its invocation history there to confirm `verifyVercelCronRequest` is accepting real requests (a misconfigured `CRON_SECRET` would show every invocation failing with a 401).

### Manual verification procedure

1. Using a real Growth-plan dev Business (Stage 18 test-mode Checkout), open its public `/b/[slug]` page and confirm the "Request Service" CTA renders. Any `Business.email` now works as the notification recipient — no longer restricted to the sandbox-era test addresses.
2. Submit the form with a valid name + phone. Confirm the success state renders and no error appears.
3. In the customer dashboard, sign in as that business's owner and open `/app/businesses/{id}/leads` — confirm the new lead appears with `status: 'new'`.
4. Check the verified inbox for the notification email; confirm it renders the submitted fields and that "Reply-To" is unset (no email was supplied in step 2) or set correctly (if one was).
5. In the admin business-detail page, confirm the Leads section shows `notificationStatus: 'sent'` and 1 attempt.
6. Repeat the submission against a Basic-plan dev Business — confirm the "Request Service" CTA does not render at all, and that a crafted direct POST to `submitLeadAction` (bypassing the UI) still returns the generic success response without creating a `Lead` row (check DynamoDB directly, not just the response).
7. To exercise the failure path now that production access is live (any well-formed address will actually deliver), point a test Business's `email` at a malformed/nonexistent address, submit a lead, confirm `notificationStatus` becomes `'failed'` with a short SES exception name in `lastNotificationError`, and that the admin's manual "Retry notification" button re-attempts it.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `Business.email` is malformed or the domain doesn't exist | The send fails; `notificationStatus` is recorded `'failed'` with the SES exception name; the `Lead` itself remains persisted and visible in both dashboards |
| A Basic-plan business's slug is submitted directly (bypassing the UI, which never renders the CTA) | `submitLeadAction` re-checks `hasPlanCapability` server-side and returns the generic success response without writing a `Lead` |
| Same visitor submits the same form twice within the fingerprint window | The second submission's `reserveLeadFingerprint` conditional write fails; a generic success response is returned, no second `Lead` is created |
| Vercel Cron's `CRON_SECRET` is unset or wrong in the deployed environment | `/api/internal/leads/retry-notifications` returns 401 for every scheduled invocation; failed leads accumulate unretried until fixed — visible via the Cron dashboard's invocation history and the admin Leads section's growing `notificationAttempts` staying flat |

## Stage 21 — Campaign and QR Tracking deployment guidance

**Infrastructure deployed to dev (2026-08-03); app code not yet deployed.** Three new DynamoDB tables and their IAM grants — no new secrets, no new Vercel Cron, no SES-style manual identity setup. `WebpresaDevDataStack` and `WebpresaDevVercelAccessStack` are live; `CAMPAIGNS_TABLE_NAME`/`CAMPAIGN_RECIPIENTS_TABLE_NAME`/`SCAN_HITS_TABLE_NAME` are set in Vercel (Production + Preview) — see `build_log.md`'s Stage 21 deploy log. The manual verification procedure below still needs a real app deployment to run against.

### Deploy sequence

```bash
cd infra

# 1. Data stack — adds campaigns, campaign-recipients, and scan-hits:
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevDataStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 2. Vercel access stack — grants the 3 new tables + their indexes on the
#    existing DynamoDbTables IAM statement (no new statement, no new policy):
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevVercelAccessStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev
```

### New Vercel environment variables

| Variable | Value |
|---|---|
| `CAMPAIGNS_TABLE_NAME` | CloudFormation export `webpresa-dev-campaigns-name` |
| `CAMPAIGN_RECIPIENTS_TABLE_NAME` | CloudFormation export `webpresa-dev-campaign-recipients-name` |
| `SCAN_HITS_TABLE_NAME` | CloudFormation export `webpresa-dev-scan-hits-name` |

### Manual verification procedure (not yet run)

1. In the admin app, open `/admin/campaigns`, create a campaign (name + channel), and confirm it redirects to the new campaign's detail page.
2. Add one recipient: pick a real dev Business, set a destination URL (e.g. its `/b/[slug]` preview), confirm a `campaignCode` and QR image appear immediately.
3. Scan the QR (or open its `/r/{campaignCode}` link directly) from a phone and from a desktop browser — confirm both redirect to the configured destination with `?campaign={code}` appended, and that any other query params on the original link (e.g. `?utm_source=test`) are preserved alongside it.
4. Reload the campaign detail page — confirm `totalScans` incremented by 2 and `estimatedUniqueScans` by 2 (two distinct devices), and that "recent scans" shows both hits with a plausible device class/browser/OS.
5. Scan the same QR again from the same device — confirm `totalScans` increments but `estimatedUniqueScans` does not.
6. Edit the recipient's destination URL and confirm the same QR code (same `campaignCode`, same printed image) now redirects to the new destination without regenerating anything.
7. Toggle the recipient to "disabled" and confirm its `/r/{code}` link now redirects to the homepage instead of the destination, with no new `ScanHit` recorded.
8. Set the parent campaign's status to "paused" and confirm the (still-`active`) recipient's link also now redirects to the homepage — campaign-level status overrides recipient-level status.
9. Delete the test Business from the admin business list and confirm (via DynamoDB, not just the UI) that its `CampaignRecipient` and all of its `ScanHit` rows are gone, but the parent `Campaign` record still exists.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| Unknown or malformed `campaignCode` in `/r/{code}` | Redirects to the homepage; no `ScanHit` is recorded |
| A recipient's `status` is `'disabled'`, or its parent campaign's `status` is not `'active'` | Same homepage-redirect fallback as an unknown code — never distinguished |
| The same IP exceeds the redirect route's rate limit (30 requests/minute) | Same homepage-redirect fallback; the code's 80-bit entropy, not this limit, is the real defense against guessing |
| A request to `/r/{code}` includes its own `?campaign=SOMETHING` query param | Ignored — the server-resolved code always overwrites it in the final redirect URL |
| `GET /api/campaigns/[campaignRecipientId]/qr` requested without an admin session | 401, no image returned |

## Stage 22 — Webpresa Postcard Generation and Lob Fulfillment deployment guidance

**All five phases (0, 1, 2, 4, 5 — Phase 3 admin UI was already built earlier) are now implemented, merged, and fully configured for dev.** Infra Phase 0 (GSI rename + `postcard-webhook-events` table) deployed to dev 2026-08-05. The Phase 2 render Lambda (`webpresa-dev-postcard-render`, its ECR repo, and the Vercel `lambda:InvokeFunction` grant) deployed to dev 2026-08-08. Real Lob test-mode API key populated into the `lob` secret 2026-08-08. The Lob webhook was registered in Lob's Test-environment dashboard 2026-08-08 (event types: `postcard.billed`, `created`, `deleted`, `failed`, `rejected`, `rendered_pdf`, `rendered_thumbnails` — the tracking-related events (`delivered`, `in_transit`, `in_local_area`, `processed_for_delivery`, `returned_to_sender`) were greyed out/unselectable in the dashboard, presumably gated behind a paid plan; the code still handles them correctly whenever that changes), and its `webhookSecret` populated into the `lob` secret the same day. All eight Stage 22 Vercel env vars (table/Lambda names, sender address) added to both Production and Preview 2026-08-08. **Not yet done**: no test postcard has actually been submitted to Lob's live API yet — everything below this point is implemented and unit-tested, but not yet exercised end-to-end against the real Lob account.

### Deploy sequence — GSI rename requires two deploys, not one

DynamoDB rejects creating and deleting a GSI in the same CloudFormation update (`"Cannot perform more than one GSI creation or deletion in a single update"`). The rename was split accordingly — this is a one-time transitional step, not a pattern to repeat for ordinary additive changes:

```bash
cd infra

# Step 1 — additive only: create postcard-webhook-events, add
# campaign-recipient-id-index to postcards (old campaign-code-index index
# temporarily left in place):
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevDataStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# Step 2 — after step 1 succeeds, remove the old campaign-code-index GSI
# (deletion only):
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevDataStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 3. Vercel access stack — grants the new table + its index on the existing
#    DynamoDbTables IAM statement (no new statement, no new policy):
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevVercelAccessStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev
```

The `postcards` table itself was empty in dev at rename time, so this was a clean schema change, not a data migration — no backfill was needed or performed.

### New Vercel environment variables (all added to Production + Preview, 2026-08-08)

| Variable | Value |
|---|---|
| `POSTCARD_WEBHOOK_EVENTS_TABLE_NAME` | `webpresa-dev-postcard-webhook-events` |
| `POSTCARD_RENDER_LAMBDA_FUNCTION_NAME` | `webpresa-dev-postcard-render` — read by `web/lib/lambda/client.ts::getPostcardRenderLambdaFunctionName()` |

**`WEBPRESA_LOB_SENDER_*` (no longer used, 2026-08-24):** these vars (`_NAME`/`_ADDRESS_LINE1`/`_ADDRESS_LINE2`/`_CITY`/`_STATE`/`_POSTAL_CODE`/`_COUNTRY`) used to hold Webpresa's own return-mail address, read by `web/lib/env/lob-sender-address.ts` and sent as the `from` field on every Lob postcard submission. That module and the `from` field were removed — Lob was overlaying `from` onto the physical postcard as a printed return address, which was never intended (see "Postcard Generation and Lob Fulfillment" in `architecture.md`). The vars themselves are unused now but were not deleted from Vercel as part of this change — safe to remove manually.

### Still outstanding before Stage 22 can submit a real postcard end-to-end

Only one item left, everything else above is done:

- **Submit one real test postcard** (Lob test mode — no real mail, no payment method on file) to confirm the actual request/response shapes assumed in `web/lib/lob/submit-postcard.ts` are correct, in particular whether Lob's response includes a `price` field (unconfirmed against their docs).

### Lob live mode setup (2026-08-19)

Production is wired for live-mode Lob, pending the Production redeploy triggered by fast-forwarding `main` to `dev` and pushing (same activation mechanism as the Stripe live-mode cutover — env var/secret changes only take effect on a new deployment).

- `webpresa-prod-lob` (Secrets Manager, `webpresa-prod` account) overwritten with the real live-mode `apiKey` (`live_...`) and a real `webhookSecret`, from a webhook endpoint registered in the Lob Dashboard (Live environment) at `https://webpresa.com/api/webhooks/lob`. Previously held dev's test-mode `apiKey` copied over by Stage 22.5, with a placeholder `webhookSecret` (no live webhook had ever been registered).
- Confirmed via `curl -X POST https://webpresa.com/api/webhooks/lob` (`400`, not a `302` to Vercel SSO) that Production, like the Stripe webhook route, is **not** behind Vercel Deployment Protection — no `?x-vercel-protection-bypass=` query param needed on the live webhook URL (unlike dev's registered endpoint).
- **Event types selected differ from what was expected**: `postcard.mailed` was not offered as a selectable option in the Live-environment webhook's event picker (only `postcard.delivered` was, in addition to the previously-available `created`/`deleted`/`failed`/`rejected`/`rendered_pdf`/`rendered_thumbnails`). This contradicts `status-mapping.ts`'s doc comment, which assumed `mailed` would become selectable once live. Practical effect: since neither `postcard.mailed` nor `postcard.billed` (the test-mode proxy) will fire on this webhook, `Postcard.status` has no path to `'mailed'` in live mode — it stays `'submitted'` until (and unless) `postcard.delivered` fires, then jumps straight to `'delivered'`. Confirmed with the user and accepted as-is: `SubmitButton.tsx`'s success-state check already treats `submitted`/`mailed`/`delivered` as the same "successfully handed to Lob" outcome, so nothing in the UI breaks — there's just no longer a distinct "produced and mailed, in transit" signal. Revisit if this turns out to matter in practice (e.g. re-check Lob's event picker after a live postcard has actually been produced, in case `mailed` becomes selectable then).
- `LOB_SECRET_NAME` and the (since-removed, see above) `WEBPRESA_LOB_SENDER_*` vars were already correctly configured on Vercel Production (confirmed present via `vercel env ls production`) — no Vercel env var changes were needed for this cutover, only the Secrets Manager write above.
- **Code change** (unlike the Stripe cutover, which needed none): `SubmitButton.tsx` previously hardcoded "Uses the Lob test-mode API key currently on file — no real mail is sent," which would have become false and misleading once live. Added `isLobLiveMode()` (`web/lib/lob/client.ts`) — the same `apiKey.startsWith('live_')` check `lobRequest` already does, exposed standalone — threaded through `postcards/[postcardId]/page.tsx` as an `isLiveMode` prop so the button's copy now accurately reflects whichever mode is actually configured, on any environment, without needing a manual edit at cutover time.
- **Not yet done**: the live end-to-end smoke test (one real postcard, real charge, real mail) — deliberately held off per the user's request; do this before trusting live mode for actual customers.

---

## Google federation ("Sign in with Google") deployment guidance

Adds a Cognito Hosted UI domain, an optional Google identity provider, a Pre Sign-up Lambda trigger (account linking), and app-side OAuth routes (`/api/auth/google/start`, `/api/auth/google/callback`). Requires a two-phase deploy per environment, because the Google OAuth client's redirect URI must point at Cognito's real Hosted UI domain, which only exists once deployed — and CDK can't create the identity provider without a real Google Client ID at synth time.

**Phase A** — domain + Pre Sign-up trigger only (no Google IdP yet). With `googleOAuthClientId: ''` in `infra/lib/config/environments.ts` for the target environment, `WebpresaUserPool` (`infra/lib/constructs/webpresa-user-pool.ts`) skips creating `UserPoolIdentityProviderGoogle` and the App Client's `oAuth`/`supportedIdentityProviders` block entirely — only the `UserPoolDomain` and the linking Lambda deploy. Deploy via `npm run diff`/`deploy:dev` (or `:prod`) — the same `WebpresaDevDataStack`/`WebpresaProdDataStack` these already target, since the Google OAuth secret and Cognito changes live inside `WebpresaDataStack`. Note the `HostedUiDomain` CloudFormation output afterward.

**Manual step** (cannot be automated — requires a real Google Cloud account):
1. In Google Cloud Console, create (or reuse) a project, configure the OAuth consent screen if not already done, and create an OAuth 2.0 Client ID of type "Web application".
2. Set its Authorized redirect URI to `{HostedUiDomain output}/oauth2/idpresponse` exactly (Cognito's fixed federation callback path — not the app's own `/api/auth/google/callback`).
3. Copy the Client ID and Client Secret.
4. `aws secretsmanager put-secret-value --secret-id webpresa-{env}-google-oauth --secret-string '{"clientId":"...","clientSecret":"..."}' --profile webpresa-{env}`.
5. Set `googleOAuthClientId` in `infra/lib/config/environments.ts` for that environment to the real Client ID (not sensitive — committed to source like `expectedAccountId`).

**Phase B** — redeploy the same stack (`npm run diff`/`deploy:dev` or `:prod`). This time `UserPoolIdentityProviderGoogle` and the App Client's OAuth config get created, since `googleOAuthClientId` is now non-empty.

**Vercel env vars** — add `COGNITO_HOSTED_UI_DOMAIN` (the `HostedUiDomain` output) and a freshly generated `GOOGLE_OAUTH_STATE_SECRET` (`openssl rand -base64 32`) to the target environment. No other Vercel changes needed — the Vercel IAM role gets no new Cognito permissions for this feature (the app never calls `AdminLinkProviderForUser`; only the Pre Sign-up Lambda does, and the OAuth token exchange is a plain HTTPS call to Cognito's Hosted UI, not an AWS SDK call).

**Account linking** — a Pre Sign-up Lambda trigger (`infra/lambda/pre-signup-link/`, deployed as part of Phase A) links a new Google sign-in to an existing native (password) user with the same verified email via `AdminLinkProviderForUser`, so the resulting session's Cognito `sub` matches the original account rather than minting a duplicate. Verify end-to-end after Phase B: sign up with a password, then sign in with Google using the same email — the CloudWatch logs for `webpresa-{env}-customers-pre-signup-link` should show the link happening, and the resulting session should carry the same `sub`/`Business.ownerUserId` as the password account.

**Repeat for prod** once dev is verified — either a second Google OAuth client (recommended, matches every other per-env credential in this repo) or a second redirect URI added to the same client.

### Cognito Hosted UI custom domain (prod only)

Google's OAuth "Choose an account" screen shows the literal domain of the `redirect_uri` it's sent — for Google federation that's Cognito's own Hosted UI domain, not this app's, so without a custom domain it reads "to continue to `webpresa-{env}-customers.auth.{region}.amazoncognito.com`" instead of anything under `webpresa.com`. Dev deliberately stays on that default domain (not worth the DNS/cert overhead for a dev environment); prod uses `auth.webpresa.com`.

`webpresa.com`'s DNS is managed at **GoDaddy**, not Route 53 (same as the SES DKIM records) — so unlike a typical CDK-managed `DnsValidatedCertificate`, this needs the ACM certificate requested and validated manually, *before* the CDK-managed custom domain is deployed.

**1. Request the certificate** (already done 2026-08-24 for `auth.webpresa.com`, ARN `arn:aws:acm:us-east-1:994748688217:certificate/0b317a19-0c96-418a-9fcc-05562e4a5bd9` — reference for future re-runs or other subdomains):
```
aws acm request-certificate --domain-name auth.webpresa.com --validation-method DNS --region us-east-1 --profile webpresa-prod
```
Always `us-east-1`, regardless of the environment's own region — Cognito Hosted UI custom domains are CloudFront-backed, and CloudFront/ACM integration requires the certificate there.

**2. Get the DNS validation record**:
```
aws acm describe-certificate --certificate-arn <arn> --region us-east-1 --profile webpresa-prod \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' --output json
```
Add the returned `Name`/`Value` as a **CNAME** record in GoDaddy's DNS panel for `webpresa.com` — GoDaddy's "Host" field takes the name with the trailing `.webpresa.com.` (and trailing dot) stripped, e.g. `_817d570998d21a8958ecef83a365d8ee.auth`; the "Value"/"Points to" field similarly drops the trailing dot.

**3. Wait for validation** — poll `aws acm describe-certificate --certificate-arn <arn> --region us-east-1 --profile webpresa-prod --query 'Certificate.Status'` until it reports `ISSUED` (typically minutes once the CNAME propagates, but DNS propagation time varies).

**4. Wire it into CDK** — set both `cognitoHostedUiCustomDomainName` (`'auth.webpresa.com'`) and `cognitoHostedUiCertificateArn` (the validated cert's ARN) on prod's `EnvironmentConfig` in `infra/lib/config/environments.ts`. Leaving `cognitoHostedUiCertificateArn` empty is what keeps prod on the default domain in the meantime — `webpresa-user-pool.ts` only creates the custom domain when *both* fields are set, so this is safe to leave partially configured for as long as needed.

**5. Deploy** (`npm run diff:prod`/`deploy:prod`) — creates the Cognito custom domain (`AWS::Cognito::UserPoolDomain` with `CustomDomainConfig`), backed by a CloudFront distribution Cognito manages. Note the new `HostedUiCloudFrontTarget` output.

**6. Add the second DNS record** — a CNAME/ALIAS at GoDaddy: `auth.webpresa.com` → the `HostedUiCloudFrontTarget` output value. This is separate from the validation CNAME in step 2 (that one only proved domain ownership; this one actually routes traffic).

**7. Update the prod Google OAuth client's redirect URI** to `https://auth.webpresa.com/oauth2/idpresponse` (was the default Amazon domain's equivalent) and `COGNITO_HOSTED_UI_DOMAIN` on Vercel Production to `https://auth.webpresa.com`.

---

## Stage 24 — Operational Monitoring, Failure Recovery, and Operations Center deployment guidance

**Deployed to both dev and prod, 2026-08-14, at the user's explicit request following a reviewed, clean `cdk diff` in each account.** See `architecture.md`, "Operational Monitoring, Failure Recovery, and Operations Center (Stage 24)" for the full architecture record, and `web/docs/operations.md` for the operational runbooks this stage produced.

Note: prod's application stacks (`WebpresaProdDataStack`/`WebpresaProdVercelAccessStack`/etc.) were already live from Stage 22.5 — this stage's prod deploy only added Stage 24's own additions (the new table, the new IAM grants, and the brand-new `WebpresaProdMonitoringStack`) on top of that already-deployed base.

### What `cdk diff` showed (both accounts, reviewed 2026-08-14, before deploying)

```
WebpresaDataStack             [+] AWS::DynamoDB::Table StripeWebhookFailures (+ 3 outputs)
WebpresaScreenshotStack       outputs only — new cross-stack exports for the DLQ ARN/queue name
                               and function ref, now referenced by WebpresaMonitoringStack
WebpresaPostcardRenderStack   outputs only — new cross-stack export for the function ref
WebpresaScanWorkflowStack     no differences
WebpresaVercelAccessStack     [~] DataAccessPolicy: +1 table grant (stripe-webhook-failures)
                               [~] ComputeInvokePolicy: +1 statement (sqs:GetQueueAttributes,
                                   scoped to exactly the screenshot DLQ's ARN)
WebpresaMonitoringStack       new stack — 9 CloudWatch alarms + 1 dashboard + 1 AWS Budget,
                               no compute/data resources of its own
```

No deletions, no replacements, anywhere, in either account. `WebpresaMonitoringStack` has no `WEBPRESA_APP_BASE_URL` dependency (it only references already-instantiated resources from other stacks via typed props), so it has no dedicated npm script — deployed via plain `cdk` commands like `WebpresaVercelAccessStack`/`WebpresaStockImagesStack` already were.

### Deploy sequence actually used (both accounts)

```bash
cd infra

# 1. Data stack — adds the stripe-webhook-failures table. Review first:
WEBPRESA_APP_BASE_URL=<real app URL> npx cdk diff WebpresaDataStack --profile webpresa-{dev,prod} --context env={dev,prod}
WEBPRESA_APP_BASE_URL=<real app URL> npx cdk deploy WebpresaDataStack --profile webpresa-{dev,prod} --context env={dev,prod} --require-approval never

# 2. Vercel access stack — grants the new table + the read-only DLQ-depth
#    permission:
WEBPRESA_APP_BASE_URL=<real app URL> npx cdk diff WebpresaVercelAccessStack --profile webpresa-{dev,prod} --context env={dev,prod}
WEBPRESA_APP_BASE_URL=<real app URL> npx cdk deploy WebpresaVercelAccessStack --profile webpresa-{dev,prod} --context env={dev,prod} --require-approval never

# 3. Monitoring stack — dashboard + alarms + budget. No WEBPRESA_APP_BASE_URL
#    needed, but harmless to leave set:
npx cdk diff WebpresaMonitoringStack --profile webpresa-{dev,prod} --context env={dev,prod}
npx cdk deploy WebpresaMonitoringStack --profile webpresa-{dev,prod} --context env={dev,prod} --require-approval never
```

`--require-approval never` was used since this ran non-interactively after the user's explicit go-ahead on the reviewed diff (per `AGENTS.md`'s deployment gate — approval was obtained first, this flag just avoids the CLI hanging on a y/n prompt with no interactive terminal attached). No secret to populate — `stripe-webhook-failures` carries no credential, only diagnostic records the app itself writes.

### AWS Budget (monthly spend alarm)

Added the same day, at the user's explicit request, as an extra `AWS::Budgets::Budget` resource inside `WebpresaMonitoringStack` (see `architecture.md`'s Stage 24 section). `EnvironmentConfig.monthlyBudgetUsd`/`budgetAlertEmail` (`infra/lib/config/environments.ts`) hold the per-environment threshold ($25/month, both dev and prod) and notification email — both confirmed live:

```bash
aws budgets describe-budgets --account-id 539898341083 --profile webpresa-dev   # webpresa-dev-monthly-spend
aws budgets describe-budgets --account-id 994748688217 --profile webpresa-prod  # webpresa-prod-monthly-spend
```

To change the threshold or email later: edit `ENVIRONMENTS.{dev,prod}` in `environments.ts`, review the diff, redeploy `WebpresaMonitoringStack` for the affected environment.

### New Vercel environment variables — added to Preview and Production, 2026-08-14

| Variable | Preview (dev) value | Production (prod) value |
|---|---|---|
| `STRIPE_WEBHOOK_FAILURES_TABLE_NAME` | `webpresa-dev-stripe-webhook-failures` | `webpresa-prod-stripe-webhook-failures` |
| `SCREENSHOT_DLQ_URL` | `https://sqs.us-east-1.amazonaws.com/539898341083/webpresa-dev-screenshot-capture-dlq` | `https://sqs.us-east-1.amazonaws.com/994748688217/webpresa-prod-screenshot-capture-dlq` |

Added via `npx vercel@58.9.5 env add <NAME> <preview|production> --yes` (values piped in via `echo -n ... |`, per this doc's own Vercel CLI gotchas above — pin the version, verify with `vercel env ls` afterward). **Newly added env vars only take effect on a fresh deployment** — the currently-running Preview/Production deployments won't pick these up until the next push or a manual `vercel redeploy`.

### Verifying the deploy

```bash
# Confirm the table exists:
aws dynamodb describe-table --table-name webpresa-{env}-stripe-webhook-failures --profile webpresa-{dev,prod} --query 'Table.TableStatus'

# Confirm the dashboard exists and view it:
aws cloudformation describe-stacks --stack-name Webpresa{Dev,Prod}MonitoringStack --profile webpresa-{dev,prod} \
  --query "Stacks[0].Outputs[?ExportName=='webpresa-{env}-operations-dashboard-url'].OutputValue" --output text

# Confirm all 9 alarms exist:
aws cloudwatch describe-alarms --alarm-name-prefix webpresa-{env}- --profile webpresa-{dev,prod} --query 'MetricAlarms[].AlarmName'

# Confirm the budget exists:
aws budgets describe-budgets --account-id <account-id> --profile webpresa-{dev,prod}
```

After the next fresh deployment picks up the two Vercel env vars above, visit `/admin/operations` and confirm it loads without the `loadError` banner.

### `operations-dismissals` table (Dismiss button) — added same day, both accounts

Added at the user's request after the initial Stage 24 rollout — the "Dismiss" button on `/admin/operations`' Needs Attention items. Same deploy shape as everything else in this stage: `WebpresaDataStack` (new table) → `WebpresaVercelAccessStack` (new grant), both accounts, both clean/additive. New Vercel env var `OPERATIONS_DISMISSALS_TABLE_NAME` (`webpresa-{env}-operations-dismissals`) added to Preview and Production. No secret — the table carries no credential, only which item ids an admin has snoozed.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `STRIPE_WEBHOOK_FAILURES_TABLE_NAME` unset or wrong | Every `putStripeWebhookFailure`/`listRecentStripeWebhookFailures` call throws; the webhook route's `recordFailure()` wrapper swallows the write error and logs it (never turns a handled webhook failure into an unrelated 500) — the Operations page's own `try/catch` shows a `loadError` banner instead of a partial/broken page if the read side is affected |
| `SCREENSHOT_DLQ_URL` unset or wrong | `getScreenshotDlqDepth()` returns `null` (never throws) — the Operations page simply omits the DLQ item and shows `screenshotDlqDepth: null` rather than failing to load |
| `webpresa-vercel-{env}` missing `sqs:GetQueueAttributes` | Same as above — an `AccessDeniedException` from the SQS call is caught the same way, returns `null` |
| `webpresa-vercel-{env}` missing the new table grant | `AccessDeniedException` from DynamoDB — same `try/catch` behavior as any other missing-permission case elsewhere in this app |

---

## Marketing stage — SES Drip Campaign deployment guidance

**Deployed and live in both dev and prod as of 2026-08-21.** Seven new DynamoDB tables, one new secret, one new CDK stack (`WebpresaSesStack`), a second Vercel Cron schedule. Two real deploy-time issues were hit and fixed on the first dev rollout, both fixed in code before the prod deploy so neither recurred there:

1. **`DataAccessPolicy` exceeded IAM's 6,144-byte managed-policy size limit** the moment the 7 marketing tables' grants were added to it (`ServiceLimitExceeded`, auto-rolled back cleanly by CloudFormation, no broken state). Fixed by splitting Marketing's DynamoDB/Secrets Manager/SES grants into a **second** managed policy, `webpresa-{env}-vercel-marketing-data-access` (`MarketingDataAccessPolicy` in `vercel-access-stack.ts`), attached to the same `webpresa-vercel-{env}` user — the same "split by concern into another attached policy" fix this stack's own class doc already describes for the original five inline policies it replaced.
2. **The SNS subscription confirmation never reached the app** — Vercel Deployment Protection (enabled on Preview/dev) redirects every unauthenticated request, including SNS's own delivery POSTs, to Vercel's SSO gate at the edge before Next.js ever runs (confirmed directly: `curl -X POST .../api/webhooks/ses` 302s to `vercel.com/sso-api`). This is the exact same class of problem already documented below for the Stripe webhook. Fixed the same way: `WebpresaSesStack` now embeds the `vercel-protection-bypass` secret as a `?x-vercel-protection-bypass=` query parameter directly in the CDK-managed subscription URL (`cdk.SecretValue.secretsManager(...).unsafeUnwrap()` joined into the endpoint string) — no manual step, unlike Stripe/Lob's out-of-band dashboard registration, since this subscription is fully CDK-managed. **Production is not behind Vercel Deployment Protection** (confirmed the same way the Stripe/Lob webhook sections below already established), so this fix has no effect there — it's included unconditionally anyway since a harmless extra query param is simpler than branching the CDK code per environment.
3. **A subscription created before the app it points at is actually live will sit at `PendingConfirmation` forever** — SNS only attempts delivery of the confirmation message a few times, shortly after the subscription is created. Hit on both dev (the app didn't have the bypass param yet) and prod (the SES stack was deployed to AWS before `main` was fast-forwarded to include the webhook route, so the very first confirmation attempt 404'd). Fixed the same way both times: re-run `aws sns subscribe --topic-arn <arn> --protocol https --notification-endpoint <the exact subscribed URL> --profile <env>` once the endpoint is genuinely reachable — this resends confirmation against the existing pending subscription rather than creating a duplicate. The orphaned old pending subscription CloudFormation detaches during a stack update doesn't need manual cleanup — SNS auto-expires unconfirmed subscriptions after a few days. **Deploy-order lesson for next time**: deploy infra, populate secrets, and set Vercel env vars *before* merging the app code that makes the corresponding route live, or expect to manually resend the SNS confirmation afterward either way.

### Deploy sequence

```bash
cd infra

# 1. Data stack — adds the 7 marketing-* tables and the marketing-click-token secret:
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevDataStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevDataStack --profile webpresa-dev

# 2. Vercel access stack — grants the 7 new tables + indexes, the new secret,
#    and the new SesSendMarketingEmails IAM statement (same bare Resource: '*'
#    rationale as SesSendLeadNotifications — see architecture.md):
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk diff WebpresaDevVercelAccessStack --profile webpresa-dev
WEBPRESA_APP_BASE_URL=<real dev app URL> npx cdk deploy WebpresaDevVercelAccessStack --profile webpresa-dev

# 3. SES stack — Configuration Set, SNS topic, HTTPS subscription. Always use
#    the dedicated npm script, never a raw `cdk deploy` (see AGENTS.md):
npm run diff:ses
npm run deploy:ses
```

Repeat with `--profile webpresa-prod --context env=prod` (and `npm run diff:ses:prod`/`deploy:ses:prod`) for production, after dev is verified end-to-end.

**Prod deployed 2026-08-21.** All 3 stacks diffed clean (purely additive, matching dev's diffs exactly — no IAM size-limit surprise this time, since the `MarketingDataAccessPolicy` split was already in the code before the prod deploy) and deployed without incident. `webpresa.com`'s SES identity/DKIM and production access were already verified in the prod account from Stage 20 — no new SES domain setup needed. `MARKETING_TEST_RECIPIENT_ALLOWLIST` was deliberately **not** set in production — `isNonProdRecipientAllowed()` always returns `true` when `resolveRuntimeEnvironment() === 'production'`, so the var is inert there and setting it would only risk misleading a future reader into thinking it controls prod behavior. `MARKETING_SES_FROM_EMAIL=andrew@webpresa.com` — the same real address as dev, not environment-specific. The `marketing-click-token` secret was populated with a **fresh**, independently-generated value (never reused across environments, same as every other environment-scoped secret in this app). `MarketingCampaign.status` still defaults `'disabled'` in prod exactly as it does in dev — deploying this infra does not, by itself, cause any real email to send; an admin must explicitly enable the campaign from `/admin/marketing` first.

### SES/SNS setup (mostly CDK-managed — narrower manual step than Stage 20)

1. `webpresa.com`'s SES sending identity, DKIM, and production access are already in place from Stage 20 — no new domain verification needed. Confirm current status any time with `aws sesv2 get-account --profile <dev|prod> --query 'ProductionAccessEnabled'`, and re-check the account isn't back in the sandbox (a new region or a fresh account would default to it).
2. After `npm run deploy:ses`, the SNS topic's HTTPS subscription is created but left `PendingConfirmation` until SNS actually delivers a `SubscriptionConfirmation` message — this happens automatically shortly after deploy; `app/api/webhooks/ses/route.ts` auto-confirms it (fetches `SubscribeURL`) the first time it receives that message. Confirm the subscription reached `Confirmed` via `aws sns list-subscriptions-by-topic --topic-arn <arn> --profile webpresa-dev`.
3. Populate the `marketing-click-token` secret's real value: `aws secretsmanager put-secret-value --secret-id webpresa-dev-marketing-click-token --secret-string '{"encryptionKey":"<32+ random bytes, e.g. openssl rand -base64 32>"}' --profile webpresa-dev`.

### New Vercel environment variables

| Variable | Value |
|---|---|
| `MARKETING_CAMPAIGNS_TABLE_NAME` | CloudFormation export `webpresa-dev-marketing-campaigns-name` |
| `MARKETING_EMAIL_TEMPLATES_TABLE_NAME` | CloudFormation export `webpresa-dev-marketing-email-templates-name` |
| `MARKETING_OUTREACH_TABLE_NAME` | CloudFormation export `webpresa-dev-marketing-outreach-name` |
| `MARKETING_SUPPRESSIONS_TABLE_NAME` | CloudFormation export `webpresa-dev-marketing-suppressions-name` |
| `MARKETING_MESSAGES_TABLE_NAME` | CloudFormation export `webpresa-dev-marketing-messages-name` |
| `MARKETING_CLICKS_TABLE_NAME` | CloudFormation export `webpresa-dev-marketing-clicks-name` |
| `MARKETING_SES_EVENTS_TABLE_NAME` | CloudFormation export `webpresa-dev-marketing-ses-events-name` |
| `MARKETING_CLICK_TOKEN_SECRET_NAME` | `webpresa-dev-marketing-click-token` |
| `MARKETING_SES_FROM_EMAIL` | A branded address under the verified `webpresa.com` domain, e.g. `andrew@webpresa.com` — deliberately distinct from `SES_FROM_EMAIL` |
| `SES_CONFIGURATION_SET_NAME` | CloudFormation export `webpresa-dev-ses-configuration-set-name` (`webpresa-dev-marketing`) |
| `MARKETING_TEST_RECIPIENT_ALLOWLIST` | Comma-separated real inboxes/`@domain` suffixes, or the literal `*` to disable this gate entirely. **Dev is currently set to `*`** — a deliberate choice given SES production access is already granted in this account; the app-level allowlist is a *separate*, additional guard on top of that, not a substitute for it. **Required** (non-`*`) in any non-production environment before any real or test send can succeed at all otherwise. |

### Vercel Cron

`web/vercel.json` gains a second entry: `GET /api/internal/marketing/send-due-emails` at `0 13 * * *` (once daily, an hour offset from the existing lead-retry cron). Same Hobby-plan daily cap already documented above for Stage 20's cron — confirm the current plan's cron limits (both interval AND total job count) before assuming this second entry deploys cleanly; if the account is still on Hobby, verify via the Cron Jobs dashboard tab after deploy rather than assuming.

### Manual verification procedure

1. In DynamoDB, confirm `webpresa-dev-marketing-campaigns` has no row yet — visiting `/admin/marketing` for the first time lazily creates it `'disabled'` and seeds the 3 default templates.
2. Enable the campaign via the Campaign Settings toggle on `/admin/marketing`.
3. On `/admin/marketing/templates`, edit Email 1's body, save, confirm the version increments and the preview pane updates; use "Send Test Email" to an allowlisted address and confirm it arrives clearly marked `[TEST]`.
4. Attempt "Send Test Email" to a non-allowlisted address — confirm it's rejected with a clear error and nothing sends.
5. Trigger a real (or manually-simulated) Lob `postcard.delivered` webhook for a dev-safe test business whose email is on the allowlist; confirm a `MarketingOutreach` row appears with `nextActionSequence: 1` and `nextActionAt` ~24h out.
6. Manually invoke the cron (`curl -H "Authorization: Bearer $CRON_SECRET" https://<dev-url>/api/internal/marketing/send-due-emails`) after temporarily backdating that row's `nextActionAt` in DynamoDB (or wait for the real schedule) — confirm Email 1 arrives, a `MarketingMessage` row is written with `outcome: 'sent'`, and `nextActionSequence` advances to 2.
7. Click the email's preview link — confirm it redirects to `/b/[slug]` and `MarketingMessage.clickCount` increments.
8. Click the unsubscribe link — confirm a `MarketingSuppression` row is written, the outreach transitions to `'suppressed'`, and re-visiting the same link is a harmless no-op.
9. From `/admin/marketing`, exercise Pause/Resume/Suppress/Cancel/"Send Next Email Now" (with its confirm step) on a test row and confirm each transition and its audit log line (`admin.marketing.*` events, structured logs).
10. Simulate a hard bounce and a complaint against the SES webhook (SES's own mailbox simulator addresses, e.g. `bounce@simulator.amazonses.com`) and confirm both suppress the recipient and end the outreach.

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `MarketingCampaign.status` is `'disabled'` | No new enrollments; existing due steps are skipped every cron pass with no state change (never marked terminal) — they resume automatically once re-enabled |
| `MARKETING_TEST_RECIPIENT_ALLOWLIST` unset or the recipient doesn't match, outside production | The send is short-circuited; recorded as `MarketingMessage.outcome: 'skipped'`, `skipReason: 'non_prod_recipient_not_allowlisted'` for a real send, or surfaced as a form error for "Send Test Email" — never a silent pretend-send |
| `MARKETING_SES_FROM_EMAIL` unset | Every send attempt fails fast with `error: 'marketing_ses_from_email_not_configured'`, recorded as a failed `MarketingOutreach.sendAttemptCount` increment, retried up to 3 times with a 6h backoff before the outreach is marked `'failed'` |
| SES send fails (e.g. `MessageRejected`) | No `MarketingMessage` row is written for that attempt (cheap to retry, unlike a paid Lob postcard); `sendAttemptCount` increments; retried up to 3 times, 6h apart, before giving up |
| SNS subscription never reaches `Confirmed` | No SES events ever reach the app — deliveries/bounces/complaints silently never update `MarketingMessage`/`MarketingSuppression`. Check subscription status directly; there is no other symptom until a real bounce should have suppressed someone and didn't |
| `webpresa-vercel-{env}` missing the new table/secret grants | `AccessDeniedException` from DynamoDB/Secrets Manager — same `try/catch`-and-log behavior as any other missing-permission case elsewhere in this app |
| Cron secret unset/wrong | `/api/internal/marketing/send-due-emails` returns 401 for every scheduled invocation; due emails accumulate unsent until fixed |

---

## OpenSRS Storefront (domain purchase) deployment guidance

**Deployed to dev, manually verified end-to-end against a real PTE purchase (2026-08-29).** A real domain (`ctest.info`) was bought through the full flow — SSO into Storefront with no second account, checkout entirely in Storefront, webhook delivery verified/correlated/processed — and reached `DomainConnection.status: 'connected'` (Vercel already reporting it `verified`) on the first real attempt. See `implementation.md`, "Part 3 — Domain purchasing via OpenSRS Storefront," for the full design (supersedes an earlier draft targeting OpenSRS's raw reseller API, which was never built) and its "Documentation gap" section for everything that was corrected against real behavior along the way (OAuth 2.0 client-credentials auth, real webhook payload shape, `username`-based correlation). `WebpresaDataStack` (the `webpresa-{env}-opensrs-storefront` secret, `customer-domain-profiles`/`domain-purchase-intents` tables, the latter's `storefront-username-index` GSI) and `WebpresaVercelAccessStack` (read grants on all three) are both deployed to dev — every `cdk diff` reviewed, approved, and applied. Prod is untouched.

### Reseller-side setup (Storefront Manager — manual, not CDK)

Do this in the **PTE test environment** first (`manage.test.shopco.com`-equivalent), confirm end to end, then repeat on the live store as a separate, later, deliberate step:

1. Connect Stripe (Settings → Payments) — can reuse the existing Webpresa Stripe account; Storefront treats it as its own separate connected integration, distinct from `webpresa-{env}-stripe`'s subscription billing.
2. Review domain pricing (Settings → Pricing).
3. General settings: store name, support email, and a custom Storefront hostname. **Done (2026-08-28):** live store's hostname is `domains.webpresa.com`. PTE deliberately kept on its default hostname (`webpresa.test.shopco.com`) rather than a custom one — the custom hostname is purely cosmetic branding for real customers at checkout and has no effect on the API/SSO/webhook behavior being tested in PTE.
4. Branding — paste Webpresa's brand-color `<style>` block into Settings → Advanced Settings → Custom Code → Header (`#11455E` primary / `#CE9059` accent — see `implementation.md`, Part 3). **Not yet done.**
5. Create one permanent DNS Template (Settings → Advanced Settings → Domain Defaults → DNS Templates): `A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`. **Done (2026-08-28)** in both environments — confirmed the same DNS values apply to both, since environment targeting comes from `gitBranch` at Vercel-attach time, not from the DNS Template itself:
   - **PTE Template ID:** `c74352a0-1c4c-42af-818d-af9de91e346b` (`https://webpresa.test.shopco.com?dnstemplateid=c74352a0-1c4c-42af-818d-af9de91e346b`) — set as `OPENSRS_DNS_TEMPLATE_ID` in Vercel **Preview** and in local `.env.local`.
   - **Live Template ID:** `e518ea9f-42d4-4935-b9ce-7e13e3f77519` (`https://domains.webpresa.com?dnstemplateid=e518ea9f-42d4-4935-b9ce-7e13e3f77519`) — set as `OPENSRS_DNS_TEMPLATE_ID` in Vercel **Production**.
6. Configure a webhook (Settings → Advanced Settings → Add Webhook) for the **Domain Events → "Domain registration"** category pointing at this deployment's `/api/webhooks/opensrs` — PTE's webhook points at the dev/Preview URL (append `?x-vercel-protection-bypass=<secret>`, same requirement as the Stripe dev webhook — see "Stage 18" above, no `x-vercel-set-bypass-cookie` needed since a webhook is a stateless server-to-server POST, not a browser session), the live store's webhook (configured only at go-live) points at Production, no bypass needed. **Done (2026-08-28)** for PTE — registered at `https://webpresa-git-dev-andrew-mudges-projects.vercel.app/api/webhooks/opensrs?x-vercel-protection-bypass=<bypass-secret>` (confirmed reachable and correctly rejecting an unsigned test request with `400` before registering), real webhook key populated into `webpresa-dev-opensrs-storefront`.

### Populating the real secret value

```bash
aws secretsmanager put-secret-value \
  --secret-id webpresa-dev-opensrs-storefront \
  --secret-string '{"clientId":"<PTE OAuth Client ID>","apiKey":"<PTE API key, functions as the OAuth Client Secret>","webhookKey":"<webhook key from step 6>"}' \
  --profile webpresa-dev
```

**Done (2026-08-29)** for dev — `clientId`, `apiKey`, and `webhookKey` are all real PTE values (`clientId` added after discovering auth is OAuth 2.0 client-credentials, not a raw API key — see `implementation.md`'s "Documentation gap"). Never populate `webpresa-prod-opensrs-storefront` with real live-store credentials until deliberately going live — see `implementation.md`'s "Environment isolation" note under Part 3.

**Gotcha (hit 2026-08-29):** re-running an *older* copy of this command from earlier in a chat scrollback (from before `clientId` existed) silently overwrote the secret back down to two keys, breaking auth (`invalid_client`) until caught and re-fixed. Secrets Manager has no merge semantics — `put-secret-value` always replaces the entire JSON blob. Always use the current full command, never a stale one from history.

### New Vercel environment variables

| Variable | Value |
|---|---|
| `CUSTOMER_DOMAIN_PROFILES_TABLE_NAME` | `webpresa-dev-customer-domain-profiles` — **set in Preview (2026-08-28)** |
| `DOMAIN_PURCHASE_INTENTS_TABLE_NAME` | `webpresa-dev-domain-purchase-intents` — **set in Preview (2026-08-28)** |
| `OPENSRS_STOREFRONT_SECRET_NAME` | `webpresa-dev-opensrs-storefront` (dev, **set in Preview 2026-08-28**) / `webpresa-prod-opensrs-storefront` (prod, not yet set) |
| `OPENSRS_STOREFRONT_API_BASE_URL` | Confirmed (2026-08-28) against OpenSRS's real public docs: `https://api.test.shopco.com` (PTE, **set in Preview**) / `https://api.shopco.com` (live, not yet set) |
| `OPENSRS_DNS_TEMPLATE_ID` | **Set (2026-08-28)** — see reseller-side setup step 5 above for the real PTE/live Template IDs, added to Vercel Preview/Production respectively via `vercel env add` |

Adding a Preview env var does not retroactively apply to an already-built deployment — each addition above required a `vercel redeploy` afterward to actually take effect (confirmed the hard way: the webhook route 500'd until redeployed). Always redeploy after adding/changing a Preview env var here before testing against it.

### Manual verification procedure (PTE only)

1. Complete reseller-side setup steps 1–6 above in the PTE environment. **Steps 1, 3, 5, 6 done (2026-08-28)**; step 4 (branding CSS) still outstanding.
2. Populate `webpresa-dev-opensrs-storefront` with the real PTE `clientId`/API key/webhook key. **Done.**
3. `cdk diff`/`cdk deploy` `WebpresaDevDataStack` and `WebpresaDevVercelAccessStack` (after approval), add the new env vars to Vercel Preview, redeploy. **Done.**
4. Create a throwaway dev `Business` (with a real address and phone number — required by OpenSRS's customer API, see `implementation.md`'s "Documentation gap"), complete onboarding through to the Domain step, click "Buy a new domain." **Done.**
5. Confirm the browser lands in the PTE Storefront already signed in (no login/signup screen) with the DNS Template applied. **Confirmed (2026-08-29)** — SSO redirect worked, customer stayed signed in through checkout.
6. Complete a purchase using a Stripe test card (Storefront's sandbox mode). **Done** — `ctest.info` purchased successfully ("Purchase Complete" page).
7. Confirm the webhook fires: check `webpresa-dev-domain-purchase-intents` for the intent transitioning to `'fulfilled'`, and `webpresa-dev-domain-connections` for a new `source: 'webpresa_registered'` record. **Confirmed (2026-08-29)** — real delivery verified/correlated/processed on the first attempt, `DomainConnection` created with `status: 'connected'`, `providerDomains[0].status: 'verified'` (Vercel already sees correct DNS from the template, no manual step needed).
8. Confirm the domain eventually reaches `status: 'active'` (via the existing `/api/domains/status` polling) and serves the business's site. **Not yet confirmed** — `ctest.info` was `'connected'`/Vercel-`'verified'` moments after purchase; certificate issuance and the final `'active'` transition weren't watched through to completion.
9. Confirm `DomainCard.tsx` on that business's dashboard settings shows "Purchased through Webpresa." **Not yet confirmed.**

### Expected failure behavior

| Condition | Expected behavior |
|---|---|
| `OPENSRS_DNS_TEMPLATE_ID` unset | `startDomainPurchaseAction` redirects back with a controlled error before calling OpenSRS at all; no broken mid-flow redirect |
| Invalid/expired OpenSRS Storefront API key | `createStorefrontCustomer`/`getStorefrontSsoUrl` throw `OpenSrsStorefrontApiError`; the Server Action catches it and redirects back with `?error=` rather than a 500 page |
| Webhook signature invalid | `400`, no processing, logged `opensrs.webhook.invalid_signature` — same posture as the Stripe/Lob webhooks |
| Webhook references an unknown/expired `DomainPurchaseIntent` | `200` (acknowledged, never retried forever) — the intent's 7-day TTL means a very late webhook delivery is expected to occasionally miss |
| Vercel domain attach fails inside the webhook | `500` (so a retrying sender can redeliver); the `DomainConnection` is recorded `status: 'failed'`; a redelivery (or any future manual retry) re-attempts the attach rather than treating the connection as already handled |
