import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface WebpresaVercelAccessStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly businessesTable: dynamodb.ITable;
  readonly sitePreviewsTable: dynamodb.ITable;
  readonly scanEventsTable: dynamodb.ITable;
  readonly scanExecutionsTable: dynamodb.ITable;
  readonly postcardsTable: dynamodb.ITable;
  readonly postcardWebhookEventsTable: dynamodb.ITable;
  readonly claimsTable: dynamodb.ITable;
  readonly leadsTable: dynamodb.ITable;
  readonly customerBillingProfilesTable: dynamodb.ITable;
  readonly customerOnboardingTable: dynamodb.ITable;
  readonly domainConnectionsTable: dynamodb.ITable;
  readonly campaignsTable: dynamodb.ITable;
  readonly campaignRecipientsTable: dynamodb.ITable;
  readonly scanHitsTable: dynamodb.ITable;
  readonly stockImagesTable: dynamodb.ITable;
  readonly assetsBucket: s3.IBucket;
  readonly stockImagesBucket: s3.IBucket;
  readonly openAiSecret: secretsmanager.ISecret;
  readonly firecrawlSecret: secretsmanager.ISecret;
  readonly googlePlacesSecret: secretsmanager.ISecret;
  readonly stripeSecret: secretsmanager.ISecret;
  readonly lobSecret: secretsmanager.ISecret;
  readonly claimTokenSecret: secretsmanager.ISecret;
  readonly vercelApiSecret: secretsmanager.ISecret;
  readonly captureTokenSecret: secretsmanager.ISecret;
  readonly vercelProtectionBypassSecret: secretsmanager.ISecret;
  readonly internalApiSecret: secretsmanager.ISecret;
  readonly screenshotLambdaFunction: lambda.IFunction;
  readonly scanWorkflowStateMachine: sfn.IStateMachine;
  readonly customerUserPool: cognito.IUserPool;
}

/**
 * WebpresaVercelAccessStack — CDK-managed permissions for the Vercel-hosted
 * Next.js app's IAM identity (`webpresa-vercel-{env}` — note this one
 * resource predates, and doesn't follow, the `webpresa-{env}-{resource}`
 * naming convention everything else in this project uses).
 *
 * Replaces five hand-run `aws iam put-user-policy` inline policies
 * (`webpresa-dev-dynamodb`, `webpresa-dev-s3-assets`, `webpresa-dev-secrets`,
 * `webpresa-dev-screenshot-lambda-invoke`, `webpresa-dev-scan-workflow-start-execution`)
 * that were never reviewed via `cdk diff` and hit a hard, non-adjustable
 * 2048-byte aggregate inline-policy-size limit while adding Stage 16's
 * grants. Customer-managed policies allow 6,144 characters *each*, and a
 * user can have up to 10 attached — comfortably enough for every grant this
 * project needs for years, reviewed the same way as every other resource
 * here from now on.
 *
 * Deliberately does NOT create or manage the IAM user itself, or its access
 * keys — a long-lived secret access key should never flow through a
 * CloudFormation template or output. The user continues to be created and
 * its keys rotated manually (see deployment.md, "AWS credentials for
 * Vercel") — this stack only imports it by name to attach policies.
 *
 * Split into two policies by concern, mirroring this project's existing
 * preference for small, focused resources over one do-everything object:
 * data access (DynamoDB/S3/Secrets Manager) and compute invocation (Lambda/
 * Step Functions) — the same split Stage 14 and Stage 16 already used across
 * five separate inline policies, just consolidated into two managed ones.
 */
export class WebpresaVercelAccessStack extends cdk.Stack {
  public readonly dataAccessPolicy: iam.ManagedPolicy;
  public readonly computeInvokePolicy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string, props: WebpresaVercelAccessStackProps) {
    super(scope, id, props);

    const { config } = props;

    // No `cdk.Tags.of(this)` here, unlike every other stack — `AWS::IAM::ManagedPolicy`
    // is the only resource type in this stack and it has no CloudFormation-level
    // `Tags` property at all (confirmed against `CfnManagedPolicyProps`), so a tag
    // aspect would silently apply to nothing.

    const vercelUser = iam.User.fromUserName(this, 'VercelUser', `webpresa-vercel-${config.suffix}`);

    const tablesWithIndexes = [
      props.businessesTable,
      props.sitePreviewsTable,
      props.scanEventsTable,
      props.scanExecutionsTable,
      props.postcardsTable,
      props.postcardWebhookEventsTable,
      props.claimsTable,
      props.customerBillingProfilesTable,
      props.customerOnboardingTable,
      props.domainConnectionsTable,
      props.stockImagesTable,
      props.leadsTable,
      props.campaignsTable,
      props.campaignRecipientsTable,
      props.scanHitsTable,
    ];

    this.dataAccessPolicy = new iam.ManagedPolicy(this, 'DataAccessPolicy', {
      managedPolicyName: `webpresa-${config.suffix}-vercel-data-access`,
      description: 'DynamoDB, S3 assets, and Secrets Manager access for the Vercel-hosted app',
      statements: [
        new iam.PolicyStatement({
          sid: 'DynamoDbTables',
          actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
          resources: tablesWithIndexes.flatMap((table) => [table.tableArn, `${table.tableArn}/index/*`]),
        }),
        new iam.PolicyStatement({
          sid: 'S3Assets',
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
          resources: [props.assetsBucket.bucketArn, `${props.assetsBucket.bucketArn}/*`],
        }),
        // Deliberately no s3:GetObject — stock images are read publicly via
        // CloudFront (see WebpresaStockImagesStack), never through this
        // app's IAM identity. The app only ever writes/manages objects here
        // (admin upload/archive/delete — see web/lib/s3/stock-images.ts).
        new iam.PolicyStatement({
          sid: 'S3StockImages',
          actions: ['s3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
          resources: [props.stockImagesBucket.bucketArn, `${props.stockImagesBucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          sid: 'SecretsManager',
          actions: ['secretsmanager:GetSecretValue'],
          resources: [
            props.openAiSecret.secretArn,
            props.firecrawlSecret.secretArn,
            props.googlePlacesSecret.secretArn,
            props.stripeSecret.secretArn,
            props.lobSecret.secretArn,
            props.claimTokenSecret.secretArn,
            props.vercelApiSecret.secretArn,
            props.captureTokenSecret.secretArn,
            props.vercelProtectionBypassSecret.secretArn,
            props.internalApiSecret.secretArn,
          ],
        }),
        // Stage 17 — customer identity. Minimal, explicit action list rather
        // than a wildcard; extend here only when a feature actually needs
        // it. AdminUpdateUserAttributes added for the Settings redesign's
        // Account card (name/phone editing); AdminDeleteUser added for the
        // same redesign's Delete Account action — VerifyUserAttribute
        // remains deferred until email-change support is a real feature.
        new iam.PolicyStatement({
          sid: 'CognitoCustomerAuth',
          actions: [
            'cognito-idp:SignUp',
            'cognito-idp:ConfirmSignUp',
            'cognito-idp:ResendConfirmationCode',
            'cognito-idp:InitiateAuth',
            'cognito-idp:ForgotPassword',
            'cognito-idp:ConfirmForgotPassword',
            'cognito-idp:ListUsers',
            'cognito-idp:AdminUpdateUserAttributes',
            'cognito-idp:AdminDeleteUser',
          ],
          resources: [props.customerUserPool.userPoolArn],
        }),
        // Stage 20 — lead-notification email. SES authenticates via IAM,
        // not an API key, so (unlike every other third-party integration
        // above) there is deliberately no corresponding Secrets Manager
        // entry — this grant is the entire credential path.
        //
        // Bare `Resource: '*'`, not a scoped identity ARN — two narrower
        // attempts were tried and both proved unreliable in real-world
        // testing (2026-08-03): a single sending-domain identity ARN, then
        // an `identity/*` pattern. Both intermittently produced
        // AccessDeniedException on real calls even though
        // `iam simulate-principal-policy` said they should be allowed, and
        // even after confirming (via other calls that got past IAM to a
        // genuine SES-side MessageRejected) that the pattern-matched
        // resource *does* work sometimes — a known real-world SES rough
        // edge with pattern-matched resource ARNs for `ses:SendEmail`,
        // apparently evaluated inconsistently server-side. A bare `'*'`
        // routes through IAM's simpler "any resource" path instead of
        // pattern matching. This does not widen what can actually be sent —
        // SES itself is still the real boundary, and only ever lets this
        // account send from identities it has independently verified
        // (currently just the `webpresa.com` domain).
        new iam.PolicyStatement({
          sid: 'SesSendLeadNotifications',
          actions: ['ses:SendEmail'],
          resources: ['*'],
        }),
      ],
    });
    this.dataAccessPolicy.attachToUser(vercelUser);

    this.computeInvokePolicy = new iam.ManagedPolicy(this, 'ComputeInvokePolicy', {
      managedPolicyName: `webpresa-${config.suffix}-vercel-compute-invoke`,
      description: 'Lambda invoke (Stage 14 screenshots) and Step Functions StartExecution (Stage 16 scan workflow) for the Vercel-hosted app',
      statements: [
        new iam.PolicyStatement({
          sid: 'ScreenshotLambdaInvoke',
          actions: ['lambda:InvokeFunction'],
          resources: [props.screenshotLambdaFunction.functionArn],
        }),
        new iam.PolicyStatement({
          sid: 'ScanWorkflowStartExecution',
          actions: ['states:StartExecution'],
          resources: [props.scanWorkflowStateMachine.stateMachineArn],
        }),
      ],
    });
    this.computeInvokePolicy.attachToUser(vercelUser);
  }
}
