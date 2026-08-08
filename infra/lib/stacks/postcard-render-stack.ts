import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaPostcardRenderLambda } from '../constructs/webpresa-postcard-render-lambda';

export interface WebpresaPostcardRenderStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  /** Cross-stack references from WebpresaDataStack — see bin/webpresa.ts. */
  readonly assetsBucket: s3.IBucket;
  readonly captureTokenSecret: secretsmanager.ISecret;
  readonly vercelProtectionBypassSecret: secretsmanager.ISecret;
  readonly appBaseUrl: string;
  /** Cross-stack reference from WebpresaPostcardRenderRepositoryStack, deployed separately and first — see that stack's doc comment. */
  readonly repository: ecr.IRepository;
}

/**
 * WebpresaPostcardRenderStack — Stage 22 Phase 2 (Postcard Rendering
 * Pipeline) compute layer. Mirrors `WebpresaScreenshotStack`'s structure and
 * split-from-the-ECR-repository rationale exactly (see that stack's doc
 * comment) — this stack owns only the Lambda function and its IAM role, not
 * the repository its image lives in.
 *
 * No image has been pushed yet as of this stage's initial implementation —
 * see `infra/scripts/build-and-push-postcard-render-lambda.sh`. `cdk
 * deploy` for this stack will fail at Lambda creation until that script has
 * been run at least once for the target environment, against the
 * already-deployed repository stack; `cdk synth`/`cdk diff` do not require
 * the image to already exist.
 */
export class WebpresaPostcardRenderStack extends cdk.Stack {
  public readonly postcardRenderLambda: WebpresaPostcardRenderLambda;

  constructor(scope: Construct, id: string, props: WebpresaPostcardRenderStackProps) {
    super(scope, id, props);

    const { config } = props;
    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    this.postcardRenderLambda = new WebpresaPostcardRenderLambda(this, 'PostcardRender', {
      config,
      repository: props.repository,
      assetsBucket: props.assetsBucket,
      captureTokenSecret: props.captureTokenSecret,
      vercelProtectionBypassSecret: props.vercelProtectionBypassSecret,
      appBaseUrl: props.appBaseUrl,
    });

    new cdk.CfnOutput(this, 'FunctionName', {
      value: this.postcardRenderLambda.function.functionName,
      exportName: `webpresa-${config.suffix}-postcard-render-name`,
      description: 'Postcard-render Lambda function name',
    });

    new cdk.CfnOutput(this, 'FunctionArn', {
      value: this.postcardRenderLambda.function.functionArn,
      exportName: `webpresa-${config.suffix}-postcard-render-arn`,
      description: 'Postcard-render Lambda function ARN',
    });
  }
}
