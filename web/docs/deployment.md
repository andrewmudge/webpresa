# Webpresa — Deployment

**Last updated:** 2026-07-12

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

# Generate access keys
aws iam create-access-key --user-name webpresa-vercel-dev --profile webpresa
```

The `create-access-key` response contains `AccessKeyId` and `SecretAccessKey`. Add both to Vercel immediately and do not store them anywhere else.

> Future Lambda execution roles (Stage 13 crawler, Stage 14 screenshot capture, Stage 22 postcard service) should NOT reuse this broad `webpresa-dev-s3-assets` policy — each should get its own prefix-scoped policy (e.g. `s3:PutObject` on `arn:aws:s3:::webpresa-dev-assets/scans/*` only) once those roles are created.

---

## Deployment order

Infrastructure must be deployed before application code that depends on it.

```
1. CDK bootstrap (once per account/region)
2. WebpresaDevDataStack  ← DynamoDB tables
3. Create webpresa-vercel-dev IAM user and add keys to Vercel
4. (future) Auth stack   ← Cognito (when multi-user admin is needed)
5. (future) API stack    ← Lambda / API Gateway
6. Web application       ← Vercel deployment (automatic on push)
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
