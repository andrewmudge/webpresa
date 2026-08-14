#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaScreenshotRepositoryStack } from '../lib/stacks/screenshot-repository-stack';
import { WebpresaScreenshotStack } from '../lib/stacks/screenshot-stack';
import { WebpresaPostcardRenderRepositoryStack } from '../lib/stacks/postcard-render-repository-stack';
import { WebpresaPostcardRenderStack } from '../lib/stacks/postcard-render-stack';
import { WebpresaScanWorkflowStack } from '../lib/stacks/scan-workflow-stack';
import { WebpresaStockImagesStack } from '../lib/stacks/stock-images-stack';
import { WebpresaVercelAccessStack } from '../lib/stacks/vercel-access-stack';
import { WebpresaMonitoringStack } from '../lib/stacks/monitoring-stack';
import { assertAccountMatchesEnvironment, getEnvironmentConfig } from '../lib/config/environments';

const app = new cdk.App();

// Resolve environment from CDK context.
// Default is 'dev'.  Override with: --context env=prod
const envName = (app.node.tryGetContext('env') as string | undefined) ?? 'dev';
const config = getEnvironmentConfig(envName);

// Capitalise first letter for stack and tag names: 'dev' → 'Dev'
const label = envName.charAt(0).toUpperCase() + envName.slice(1);

// Resolve account and region from the active CLI profile at synth time.
// This means `cdk synth --profile webpresa-dev` targets the dev account, and
// `cdk synth --profile webpresa-prod` targets the production account —
// without any hard-coded account IDs in application code.
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Stage 22.5 — refuse to proceed if the resolved account doesn't match what
// this environment expects. Without this, `--context env=prod` combined with
// the wrong `--profile` would silently deploy prod-named, RemovalPolicy.RETAIN
// resources into the dev account (or vice versa) — see environments.ts for
// why the expected account IDs live there rather than being resolved at
// runtime (they can't be: that's the whole point of checking them).
assertAccountMatchesEnvironment(envName, config, env.account);

const dataStack = new WebpresaDataStack(app, `Webpresa${label}DataStack`, {
  config,
  env,
  description: `Webpresa ${label} data layer — DynamoDB tables managed by CDK`,
});

// Stage 14 — the public app origin the screenshot Lambda constructs
// generated-preview URLs from (SitePreview stores only a slug, never an
// absolute URL — see implementation.md, Stage 14, "Lambda payload"). Also
// feeds the Stage 16 scan workflow's HttpInvoke endpoints. Read from the
// environment, with no placeholder fallback: a prior version of this file
// silently fell back to a fake ".invalid" URL when this var was unset,
// which CloudFormation deployed without complaint on 2026-07-28, breaking
// the screenshot Lambda and scan workflow state machine at runtime for
// days before anyone noticed. Hard-failing here means that class of bug
// can't happen again — see deployment.md before deploying either stack.
const appBaseUrl = process.env.WEBPRESA_APP_BASE_URL;
if (!appBaseUrl) {
  throw new Error(
    'WEBPRESA_APP_BASE_URL must be set for any cdk command in this app (synth/diff/deploy) — ' +
      'see web/docs/deployment.md. There is no placeholder fallback: an unset value used to ' +
      'silently deploy a fake ".invalid" URL into the screenshot Lambda and scan workflow state ' +
      'machine, breaking both at runtime without CloudFormation ever failing (2026-07-28 incident).',
  );
}

// Second layer of the same guard: being *set* isn't enough — the 2026-07-28
// incident's actual fallback value (`https://REPLACE_WITH_..._URL.invalid`)
// was itself a syntactically well-formed URL, so "non-empty" alone wouldn't
// have caught a copy-pasted placeholder either. Reject anything that isn't a
// real https:// URL, and anything whose hostname still carries an obvious
// placeholder marker — catches both "forgot to set it" (guard above) and
// "set it to a leftover placeholder/example value" (this guard) before
// either can reach `cdk deploy`.
let parsedAppBaseUrl: URL;
try {
  parsedAppBaseUrl = new URL(appBaseUrl);
} catch {
  throw new Error(
    `WEBPRESA_APP_BASE_URL is not a valid absolute URL: "${appBaseUrl}". ` +
      'Expected something like https://webpresa-git-dev-andrew-mudges-projects.vercel.app — see web/docs/deployment.md.',
  );
}

const PLACEHOLDER_HOSTNAME_MARKERS = ['invalid', 'example', 'replace_with', 'placeholder', 'localhost'];
const lowerHostname = parsedAppBaseUrl.hostname.toLowerCase();

if (parsedAppBaseUrl.protocol !== 'https:') {
  throw new Error(
    `WEBPRESA_APP_BASE_URL must be an https:// URL, got "${appBaseUrl}" (protocol "${parsedAppBaseUrl.protocol}") — ` +
      'see web/docs/deployment.md.',
  );
}

const matchedMarker = PLACEHOLDER_HOSTNAME_MARKERS.find((marker) => lowerHostname.includes(marker));
if (matchedMarker) {
  throw new Error(
    `WEBPRESA_APP_BASE_URL ("${appBaseUrl}") looks like a placeholder value (hostname contains "${matchedMarker}"), ` +
      'not a real deployed app URL — this is exactly the class of value the 2026-07-28 incident silently deployed. ' +
      'Set it to the real dev/prod app origin — see web/docs/deployment.md.',
  );
}

// Deployed independently and BEFORE the screenshot stack — see
// WebpresaScreenshotRepositoryStack's doc comment for why a container-image
// Lambda can't share a stack with the ECR repository its image lives in.
const screenshotRepositoryStack = new WebpresaScreenshotRepositoryStack(app, `Webpresa${label}ScreenshotRepositoryStack`, {
  config,
  env,
  description: `Webpresa ${label} screenshot-capture ECR repository — deployed before the Lambda that references it (Stage 14)`,
});

const screenshotStack = new WebpresaScreenshotStack(app, `Webpresa${label}ScreenshotStack`, {
  config,
  env,
  description: `Webpresa ${label} screenshot-capture compute layer — Playwright Lambda managed by CDK (Stage 14)`,
  repository: screenshotRepositoryStack.screenshotRepository.repository,
  businessesTable: dataStack.businessesTable,
  sitePreviewsTable: dataStack.sitePreviewsTable,
  scanEventsTable: dataStack.scanEventsTable,
  assetsBucket: dataStack.assetsBucket,
  captureTokenSecret: dataStack.captureTokenSecret,
  vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
  appBaseUrl,
});

// Stage 22 Phase 2 — the postcard-render Lambda's ECR repository, deployed
// independently and BEFORE the Lambda stack, for the same reason the
// screenshot repository is split out — see
// WebpresaPostcardRenderRepositoryStack's doc comment.
const postcardRenderRepositoryStack = new WebpresaPostcardRenderRepositoryStack(app, `Webpresa${label}PostcardRenderRepositoryStack`, {
  config,
  env,
  description: `Webpresa ${label} postcard-render ECR repository — deployed before the Lambda that references it (Stage 22 Phase 2)`,
});

const postcardRenderStack = new WebpresaPostcardRenderStack(app, `Webpresa${label}PostcardRenderStack`, {
  config,
  env,
  description: `Webpresa ${label} postcard-render compute layer — Playwright PDF-rendering Lambda managed by CDK (Stage 22 Phase 2)`,
  repository: postcardRenderRepositoryStack.postcardRenderRepository.repository,
  assetsBucket: dataStack.assetsBucket,
  captureTokenSecret: dataStack.captureTokenSecret,
  vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
  appBaseUrl,
});

const scanWorkflowStack = new WebpresaScanWorkflowStack(app, `Webpresa${label}ScanWorkflowStack`, {
  config,
  env,
  description: `Webpresa ${label} scan workflow orchestration — Step Functions state machine calling into the app's internal API routes, no Lambda (Stage 16)`,
  internalApiSecret: dataStack.internalApiSecret,
  vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
  appBaseUrl,
});

// Stock image repository (Phase 1 curated hero-photo fallback) — public via
// CloudFront, no dependency on any earlier stack.
const stockImagesStack = new WebpresaStockImagesStack(app, `Webpresa${label}StockImagesStack`, {
  config,
  env,
  description: `Webpresa ${label} stock-image library — public-via-CloudFront S3 bucket for curated industry hero images`,
});

// Consolidates every permission the Vercel-hosted app's IAM identity needs
// into CDK-managed policies (see vercel-access-stack.ts) — replaces five
// hand-run `aws iam put-user-policy` inline policies that hit a hard,
// non-adjustable 2048-byte aggregate size limit while adding Stage 16's
// grants.
new WebpresaVercelAccessStack(app, `Webpresa${label}VercelAccessStack`, {
  config,
  env,
  description: `Webpresa ${label} IAM permissions for the Vercel-hosted app`,
  businessesTable: dataStack.businessesTable,
  sitePreviewsTable: dataStack.sitePreviewsTable,
  scanEventsTable: dataStack.scanEventsTable,
  scanExecutionsTable: dataStack.scanExecutionsTable,
  postcardsTable: dataStack.postcardsTable,
  postcardWebhookEventsTable: dataStack.postcardWebhookEventsTable,
  claimsTable: dataStack.claimsTable,
  leadsTable: dataStack.leadsTable,
  customerBillingProfilesTable: dataStack.customerBillingProfilesTable,
  customerOnboardingTable: dataStack.customerOnboardingTable,
  domainConnectionsTable: dataStack.domainConnectionsTable,
  campaignsTable: dataStack.campaignsTable,
  campaignRecipientsTable: dataStack.campaignRecipientsTable,
  scanHitsTable: dataStack.scanHitsTable,
  stripeWebhookFailuresTable: dataStack.stripeWebhookFailuresTable,
  assetsBucket: dataStack.assetsBucket,
  stockImagesBucket: stockImagesStack.bucket,
  stockImagesTable: stockImagesStack.table,
  openAiSecret: dataStack.openAiSecret,
  firecrawlSecret: dataStack.firecrawlSecret,
  googlePlacesSecret: dataStack.googlePlacesSecret,
  stripeSecret: dataStack.stripeSecret,
  lobSecret: dataStack.lobSecret,
  claimTokenSecret: dataStack.claimTokenSecret,
  vercelApiSecret: dataStack.vercelApiSecret,
  captureTokenSecret: dataStack.captureTokenSecret,
  vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
  internalApiSecret: dataStack.internalApiSecret,
  screenshotLambdaFunction: screenshotStack.screenshotLambda.function,
  postcardRenderLambdaFunction: postcardRenderStack.postcardRenderLambda.function,
  scanWorkflowStateMachine: scanWorkflowStack.stateMachine,
  customerUserPool: dataStack.customerUserPool,
  screenshotDlqQueue: screenshotStack.screenshotLambda.deadLetterQueue,
});

// Stage 24 — CloudWatch dashboards/alarms. No WEBPRESA_APP_BASE_URL
// dependency (only references already-instantiated resources above), so no
// dedicated npm script — deployed via a plain `cdk diff/deploy
// WebpresaDevMonitoringStack --profile webpresa-dev`, the same precedent
// VercelAccessStack/StockImagesStack already established.
new WebpresaMonitoringStack(app, `Webpresa${label}MonitoringStack`, {
  config,
  env,
  description: `Webpresa ${label} operational monitoring — CloudWatch dashboards and alarms (Stage 24)`,
  screenshotFunction: screenshotStack.screenshotLambda.function,
  screenshotDlq: screenshotStack.screenshotLambda.deadLetterQueue,
  postcardRenderFunction: postcardRenderStack.postcardRenderLambda.function,
  scanWorkflowStateMachine: scanWorkflowStack.stateMachine,
  scanEventsTable: dataStack.scanEventsTable,
  scanExecutionsTable: dataStack.scanExecutionsTable,
  postcardsTable: dataStack.postcardsTable,
  businessesTable: dataStack.businessesTable,
});
