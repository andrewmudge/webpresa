import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaScreenshotLambda } from '../constructs/webpresa-screenshot-lambda';

export interface WebpresaScreenshotStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  /** Cross-stack references from WebpresaDataStack — see bin/webpresa.ts. */
  readonly businessesTable: dynamodb.ITable;
  readonly sitePreviewsTable: dynamodb.ITable;
  readonly scanEventsTable: dynamodb.ITable;
  readonly assetsBucket: s3.IBucket;
  readonly captureTokenSecret: secretsmanager.ISecret;
  readonly appBaseUrl: string;
  /** Cross-stack reference from WebpresaScreenshotRepositoryStack, deployed separately and first — see that stack's doc comment. */
  readonly repository: ecr.IRepository;
}

/**
 * WebpresaScreenshotStack — Stage 14 (Playwright Screenshots) compute layer.
 *
 * Separate from WebpresaDataStack deliberately: this stack owns the
 * project's first compute infrastructure (container-image Lambda,
 * dead-letter queue) — a fundamentally different resource category and
 * lifecycle from the DynamoDB/S3/Secrets Manager data layer, and the first
 * stage to introduce it. Also separate from WebpresaScreenshotRepositoryStack
 * (the ECR repository) — see that stack's doc comment for why a container
 * image Lambda can't share a stack with the repository its image lives in on
 * a first deploy. Depends on WebpresaDataStack's tables, bucket, and the
 * Stage-14-specific capture-token secret, plus the repository stack's
 * repository, all passed in via props from `bin/webpresa.ts` rather than
 * this stack re-looking them up — keeps the dependency explicit and typed
 * instead of a string-based cross-stack import.
 *
 * No image has been pushed yet as of this stage's initial implementation —
 * see `infra/scripts/build-and-push-screenshot-lambda.sh`. `cdk deploy` for
 * this stack will fail at Lambda creation until that script has been run at
 * least once for the target environment, against the already-deployed
 * repository stack; `cdk synth`/`cdk diff` do not require the image to
 * already exist.
 */
export class WebpresaScreenshotStack extends cdk.Stack {
  public readonly screenshotLambda: WebpresaScreenshotLambda;

  constructor(scope: Construct, id: string, props: WebpresaScreenshotStackProps) {
    super(scope, id, props);

    const { config } = props;
    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    this.screenshotLambda = new WebpresaScreenshotLambda(this, 'ScreenshotCapture', {
      config,
      repository: props.repository,
      businessesTable: props.businessesTable,
      sitePreviewsTable: props.sitePreviewsTable,
      scanEventsTable: props.scanEventsTable,
      assetsBucket: props.assetsBucket,
      captureTokenSecret: props.captureTokenSecret,
      appBaseUrl: props.appBaseUrl,
    });

    // ── CloudFormation outputs — mirrors the *Name/*Arn output pattern
    // every other WebpresaXxx construct already establishes. Vercel reads
    // SCREENSHOT_LAMBDA_FUNCTION_NAME (see lib/lambda/client.ts).
    new cdk.CfnOutput(this, 'FunctionName', {
      value: this.screenshotLambda.function.functionName,
      exportName: `webpresa-${config.suffix}-screenshot-capture-name`,
      description: 'Screenshot-capture Lambda function name',
    });

    new cdk.CfnOutput(this, 'FunctionArn', {
      value: this.screenshotLambda.function.functionArn,
      exportName: `webpresa-${config.suffix}-screenshot-capture-arn`,
      description: 'Screenshot-capture Lambda function ARN',
    });

    new cdk.CfnOutput(this, 'DeadLetterQueueUrl', {
      value: this.screenshotLambda.deadLetterQueue.queueUrl,
      exportName: `webpresa-${config.suffix}-screenshot-capture-dlq-url`,
      description: 'SQS dead-letter queue for failed asynchronous invocations',
    });
  }
}
