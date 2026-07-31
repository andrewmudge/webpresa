#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaScreenshotRepositoryStack } from '../lib/stacks/screenshot-repository-stack';
import { WebpresaScreenshotStack } from '../lib/stacks/screenshot-stack';
import { WebpresaScanWorkflowStack } from '../lib/stacks/scan-workflow-stack';
import { WebpresaStockImagesStack } from '../lib/stacks/stock-images-stack';
import { WebpresaVercelAccessStack } from '../lib/stacks/vercel-access-stack';
import { getEnvironmentConfig } from '../lib/config/environments';

const app = new cdk.App();

// Resolve environment from CDK context.
// Default is 'dev'.  Override with: --context env=prod
const envName = (app.node.tryGetContext('env') as string | undefined) ?? 'dev';
const config = getEnvironmentConfig(envName);

// Capitalise first letter for stack and tag names: 'dev' → 'Dev'
const label = envName.charAt(0).toUpperCase() + envName.slice(1);

// Resolve account and region from the active CLI profile at synth time.
// This means `cdk synth --profile webpresa` targets the dev account, and
// `cdk synth --profile webpresa-prod` targets the production account —
// without any hard-coded account IDs in application code.
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const dataStack = new WebpresaDataStack(app, `Webpresa${label}DataStack`, {
  config,
  env,
  description: `Webpresa ${label} data layer — DynamoDB tables managed by CDK`,
});

// Stage 14 — the public app origin the screenshot Lambda constructs
// generated-preview URLs from (SitePreview stores only a slug, never an
// absolute URL — see implementation.md, Stage 14, "Lambda payload"). Read
// from the environment rather than hard-coded so deploying to a real
// account requires deliberately setting it; the fallback below is a
// synth-only placeholder so `cdk synth`/`cdk diff` don't hard-fail with no
// override — see deployment.md before ever deploying this stack for real.
const appBaseUrl =
  process.env.WEBPRESA_APP_BASE_URL ?? `https://REPLACE_WITH_${label.toUpperCase()}_APP_BASE_URL.invalid`;

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
  claimsTable: dataStack.claimsTable,
  customerBillingProfilesTable: dataStack.customerBillingProfilesTable,
  customerOnboardingTable: dataStack.customerOnboardingTable,
  domainConnectionsTable: dataStack.domainConnectionsTable,
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
  scanWorkflowStateMachine: scanWorkflowStack.stateMachine,
  customerUserPool: dataStack.customerUserPool,
});
