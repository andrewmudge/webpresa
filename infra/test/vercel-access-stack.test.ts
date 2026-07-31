import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaScreenshotRepositoryStack } from '../lib/stacks/screenshot-repository-stack';
import { WebpresaScreenshotStack } from '../lib/stacks/screenshot-stack';
import { WebpresaScanWorkflowStack } from '../lib/stacks/scan-workflow-stack';
import { WebpresaStockImagesStack } from '../lib/stacks/stock-images-stack';
import { WebpresaVercelAccessStack } from '../lib/stacks/vercel-access-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

let dev: Template;
let prod: Template;

function buildStacks(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const dataStack = new WebpresaDataStack(app, `${appId}DataStack`, { config });
  const repositoryStack = new WebpresaScreenshotRepositoryStack(app, `${appId}ScreenshotRepositoryStack`, { config });
  const screenshotStack = new WebpresaScreenshotStack(app, `${appId}ScreenshotStack`, {
    config,
    repository: repositoryStack.screenshotRepository.repository,
    businessesTable: dataStack.businessesTable,
    sitePreviewsTable: dataStack.sitePreviewsTable,
    scanEventsTable: dataStack.scanEventsTable,
    assetsBucket: dataStack.assetsBucket,
    captureTokenSecret: dataStack.captureTokenSecret,
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
    appBaseUrl: 'https://app.example-test.invalid',
  });
  const scanWorkflowStack = new WebpresaScanWorkflowStack(app, `${appId}ScanWorkflowStack`, {
    config,
    internalApiSecret: dataStack.internalApiSecret,
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
    appBaseUrl: 'https://app.example-test.invalid',
  });
  const stockImagesStack = new WebpresaStockImagesStack(app, `${appId}StockImagesStack`, { config });
  const vercelAccessStack = new WebpresaVercelAccessStack(app, `${appId}VercelAccessStack`, {
    config,
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
  return Template.fromStack(vercelAccessStack);
}

beforeAll(() => {
  dev = buildStacks('WebpresaDevTest', ENVIRONMENTS.dev);
  prod = buildStacks('WebpresaProdTest', ENVIRONMENTS.prod);
});

describe('resource shape', () => {
  it('creates exactly two managed policies', () => {
    dev.resourceCountIs('AWS::IAM::ManagedPolicy', 2);
  });

  it('creates no IAM user or access keys — the user is imported, not created', () => {
    dev.resourceCountIs('AWS::IAM::User', 0);
    dev.resourceCountIs('AWS::IAM::AccessKey', 0);
  });
});

describe('naming convention', () => {
  it('policy names follow webpresa-{env}-{resource}', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-dev-vercel-data-access' });
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-dev-vercel-compute-invoke' });
    prod.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-prod-vercel-data-access' });
    prod.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-prod-vercel-compute-invoke' });
  });
});

describe('both policies attach to the imported webpresa-vercel-{env} user', () => {
  it('data-access policy is attached to webpresa-vercel-dev', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-dev-vercel-data-access',
      Users: ['webpresa-vercel-dev'],
    });
  });

  it('compute-invoke policy is attached to webpresa-vercel-dev', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-dev-vercel-compute-invoke',
      Users: ['webpresa-vercel-dev'],
    });
  });

  it('prod policies attach to webpresa-vercel-prod', () => {
    prod.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-prod-vercel-data-access',
      Users: ['webpresa-vercel-prod'],
    });
  });
});

describe('data-access policy statements', () => {
  it('grants the six DynamoDB actions on every table and its indexes, including scan-executions (Stage 16), claims (Stage 17), customer-billing-profiles (Stage 18), and customer-onboarding/domain-connections (Stage 19.x)', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string[]; Resource: unknown[] }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'DynamoDbTables')!;

    expect(statement.Action).toEqual(
      expect.arrayContaining(['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan']),
    );
    // 10 tables × (table + index/*) = 20 resource entries.
    expect(statement.Resource).toHaveLength(20);
  });

  it('grants S3 GetObject/PutObject/DeleteObject/ListBucket scoped to the assets bucket', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-dev-vercel-data-access',
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'S3Assets',
            Action: Match.arrayWith(['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket']),
          }),
        ]),
      },
    });
  });

  it('grants S3 PutObject/DeleteObject/ListBucket (never GetObject) scoped to the stock-images bucket — reads happen publicly via CloudFront', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string[] }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'S3StockImages')!;

    expect(statement.Action).toEqual(expect.arrayContaining(['s3:PutObject', 's3:DeleteObject', 's3:ListBucket']));
    expect(statement.Action).not.toContain('s3:GetObject');
  });

  it('grants secretsmanager:GetSecretValue on all 10 secrets, including claim-token (Stage 17) and vercel-api (Stage 19.x)', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Resource: unknown[] }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'SecretsManager')!;
    expect(statement.Resource).toHaveLength(10);
  });

  it('grants a minimal, explicit set of Cognito actions scoped to the customer User Pool (Stage 17)', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string[]; Resource: unknown }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'CognitoCustomerAuth')!;

    expect(statement.Action).toEqual(
      expect.arrayContaining([
        'cognito-idp:SignUp',
        'cognito-idp:ConfirmSignUp',
        'cognito-idp:ResendConfirmationCode',
        'cognito-idp:InitiateAuth',
        'cognito-idp:ForgotPassword',
        'cognito-idp:ConfirmForgotPassword',
        'cognito-idp:ListUsers',
      ]),
    );
    // No wildcard admin/global actions — least privilege.
    expect(statement.Action).not.toContain('cognito-idp:*');
  });
});

describe('compute-invoke policy statements', () => {
  it('grants lambda:InvokeFunction on the screenshot Lambda and states:StartExecution on the scan workflow', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-dev-vercel-compute-invoke',
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'ScreenshotLambdaInvoke', Action: 'lambda:InvokeFunction' }),
          Match.objectLike({ Sid: 'ScanWorkflowStartExecution', Action: 'states:StartExecution' }),
        ]),
      },
    });
  });
});

