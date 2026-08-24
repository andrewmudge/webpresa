import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaScreenshotRepositoryStack } from '../lib/stacks/screenshot-repository-stack';
import { WebpresaScreenshotStack } from '../lib/stacks/screenshot-stack';
import { WebpresaPostcardRenderRepositoryStack } from '../lib/stacks/postcard-render-repository-stack';
import { WebpresaPostcardRenderStack } from '../lib/stacks/postcard-render-stack';
import { WebpresaScanWorkflowStack } from '../lib/stacks/scan-workflow-stack';
import { WebpresaStockImagesStack } from '../lib/stacks/stock-images-stack';
import { WebpresaVercelAccessStack } from '../lib/stacks/vercel-access-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

let dev: Template;
let prod: Template;

function buildStacks(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const dataStack = new WebpresaDataStack(app, `${appId}DataStack`, { config, appBaseUrl: 'https://test.webpresa.example' });
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
  const postcardRenderRepositoryStack = new WebpresaPostcardRenderRepositoryStack(app, `${appId}PostcardRenderRepositoryStack`, { config });
  const postcardRenderStack = new WebpresaPostcardRenderStack(app, `${appId}PostcardRenderStack`, {
    config,
    repository: postcardRenderRepositoryStack.postcardRenderRepository.repository,
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
    operationsDismissalsTable: dataStack.operationsDismissalsTable,
    marketingCampaignsTable: dataStack.marketingCampaignsTable,
    marketingEmailTemplatesTable: dataStack.marketingEmailTemplatesTable,
    marketingOutreachTable: dataStack.marketingOutreachTable,
    marketingSuppressionsTable: dataStack.marketingSuppressionsTable,
    marketingMessagesTable: dataStack.marketingMessagesTable,
    marketingClicksTable: dataStack.marketingClicksTable,
    marketingSesEventsTable: dataStack.marketingSesEventsTable,
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
    marketingClickTokenSecret: dataStack.marketingClickTokenSecret,
    screenshotLambdaFunction: screenshotStack.screenshotLambda.function,
    postcardRenderLambdaFunction: postcardRenderStack.postcardRenderLambda.function,
    scanWorkflowStateMachine: scanWorkflowStack.stateMachine,
    customerUserPool: dataStack.customerUserPool,
    screenshotDlqQueue: screenshotStack.screenshotLambda.deadLetterQueue,
  });
  return Template.fromStack(vercelAccessStack);
}

beforeAll(() => {
  dev = buildStacks('WebpresaDevTest', ENVIRONMENTS.dev);
  prod = buildStacks('WebpresaProdTest', ENVIRONMENTS.prod);
});

describe('resource shape', () => {
  it('creates exactly three managed policies (Marketing stage split its grants into a dedicated third policy — see below)', () => {
    dev.resourceCountIs('AWS::IAM::ManagedPolicy', 3);
  });

  it('creates no IAM user or access keys — the user is imported, not created', () => {
    dev.resourceCountIs('AWS::IAM::User', 0);
    dev.resourceCountIs('AWS::IAM::AccessKey', 0);
  });
});

describe('naming convention', () => {
  it('policy names follow webpresa-{env}-{resource}', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-dev-vercel-data-access' });
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-dev-vercel-marketing-data-access' });
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-dev-vercel-compute-invoke' });
    prod.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-prod-vercel-data-access' });
    prod.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-prod-vercel-marketing-data-access' });
    prod.hasResourceProperties('AWS::IAM::ManagedPolicy', { ManagedPolicyName: 'webpresa-prod-vercel-compute-invoke' });
  });
});

describe('all three policies attach to the imported webpresa-vercel-{env} user', () => {
  it('data-access policy is attached to webpresa-vercel-dev', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-dev-vercel-data-access',
      Users: ['webpresa-vercel-dev'],
    });
  });

  it('marketing-data-access policy is attached to webpresa-vercel-dev', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-dev-vercel-marketing-data-access',
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
  it('grants the seven DynamoDB actions on every non-Marketing table and its indexes, including scan-executions (Stage 16), claims (Stage 17), customer-billing-profiles (Stage 18), customer-onboarding/domain-connections (Stage 19.x), leads (Stage 20), campaigns/campaign-recipients/scan-hits (Stage 21), postcard-webhook-events (Stage 22), stripe-webhook-failures/operations-dismissals (Stage 24), and BatchGetItem (Stage 29, for listCampaignRecipientsByIds) — Marketing-stage tables live in their own policy below', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string[]; Resource: unknown[] }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'DynamoDbTables')!;

    expect(statement.Action).toEqual(
      expect.arrayContaining([
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'dynamodb:BatchGetItem',
      ]),
    );
    expect(statement.Action).toHaveLength(7);
    // 17 tables × (table + index/*) = 34 resource entries.
    expect(statement.Resource).toHaveLength(34);
  });

  it('grants ses:SendEmail with an unscoped resource (Stage 20) — no Secrets Manager entry, since SES authenticates via IAM only', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string | string[]; Resource: unknown }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'SesSendLeadNotifications')!;

    // Bare '*', not a scoped identity ARN — see the PolicyStatement's own comment in
    // vercel-access-stack.ts for why: two narrower attempts (a single sending-domain identity,
    // then identity/*) both proved unreliable in real-world testing (2026-08-03), a known SES
    // rough edge with pattern-matched SendEmail resource ARNs. SES's own identity verification
    // remains the real boundary regardless of how wide this IAM resource is.
    expect(statement.Action).toEqual('ses:SendEmail');
    expect(statement.Resource).toEqual('*');
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

  it('grants secretsmanager:GetSecretValue on all 10 non-Marketing secrets, including claim-token (Stage 17) and vercel-api (Stage 19.x) — marketing-click-token lives in its own policy below', () => {
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

describe('marketing-data-access policy statements (Marketing stage — split from DataAccessPolicy after it exceeded IAM\'s 6,144-byte managed-policy size limit on first deploy attempt)', () => {
  it('grants the seven DynamoDB actions on all 7 marketing-* tables and their indexes', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-marketing-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string[]; Resource: unknown[] }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'DynamoDbMarketingTables')!;

    expect(statement.Action).toEqual(
      expect.arrayContaining(['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan', 'dynamodb:BatchGetItem']),
    );
    // 7 marketing tables × (table + index/*) = 14 resource entries.
    expect(statement.Resource).toHaveLength(14);
  });

  it('grants secretsmanager:GetSecretValue scoped to only the marketing-click-token secret', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-marketing-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Resource: unknown }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'SecretsManagerMarketing')!;
    // A single-resource PolicyStatement synthesizes as one Fn::ImportValue
    // object, not a 1-element array — unlike the multi-secret SecretsManager
    // statement above.
    expect(statement.Resource).toEqual(expect.objectContaining({ 'Fn::ImportValue': expect.any(String) }));
  });

  it('grants ses:SendEmail with an unscoped resource for marketing drip-campaign email, as a separate Sid from lead notifications', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-marketing-data-access' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string | string[]; Resource: unknown }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'SesSendMarketingEmails')!;
    expect(statement.Action).toEqual('ses:SendEmail');
    expect(statement.Resource).toEqual('*');
  });
});

describe('compute-invoke policy statements', () => {
  it('grants lambda:InvokeFunction on the screenshot Lambda, the postcard-render Lambda, states:StartExecution on the scan workflow, and read-only sqs:GetQueueAttributes on the screenshot DLQ (Stage 24)', () => {
    dev.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      ManagedPolicyName: 'webpresa-dev-vercel-compute-invoke',
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'ScreenshotLambdaInvoke', Action: 'lambda:InvokeFunction' }),
          Match.objectLike({ Sid: 'PostcardRenderLambdaInvoke', Action: 'lambda:InvokeFunction' }),
          Match.objectLike({ Sid: 'ScanWorkflowStartExecution', Action: 'states:StartExecution' }),
          Match.objectLike({ Sid: 'ScreenshotDlqDepthRead', Action: 'sqs:GetQueueAttributes' }),
        ]),
      },
    });
  });

  it('never grants sqs:ReceiveMessage/DeleteMessage on the DLQ — the app only reports depth, never drains it', () => {
    const policies = dev.findResources('AWS::IAM::ManagedPolicy', {
      Properties: { ManagedPolicyName: 'webpresa-dev-vercel-compute-invoke' },
    });
    const policy = Object.values(policies)[0] as { Properties: { PolicyDocument: { Statement: Array<{ Sid: string; Action: string | string[] }> } } };
    const statement = policy.Properties.PolicyDocument.Statement.find((s) => s.Sid === 'ScreenshotDlqDepthRead')!;
    expect(statement.Action).toEqual('sqs:GetQueueAttributes');
  });
});

