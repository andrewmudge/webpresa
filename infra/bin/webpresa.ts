#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { getEnvironmentConfig } from '../lib/config/environments';

const app = new cdk.App();

// Resolve environment from CDK context.
// Default is 'dev'.  Override with: --context env=prod
const envName = (app.node.tryGetContext('env') as string | undefined) ?? 'dev';
const config = getEnvironmentConfig(envName);

// Capitalise first letter for stack and tag names: 'dev' → 'Dev'
const label = envName.charAt(0).toUpperCase() + envName.slice(1);

new WebpresaDataStack(app, `Webpresa${label}DataStack`, {
  config,

  // Resolve account and region from the active CLI profile at synth time.
  // This means `cdk synth --profile webpresa` targets the dev account, and
  // `cdk synth --profile webpresa-prod` targets the production account —
  // without any hard-coded account IDs in application code.
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },

  description: `Webpresa ${label} data layer — DynamoDB tables managed by CDK`,
});
