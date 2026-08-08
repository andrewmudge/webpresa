import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaPostcardRenderLambdaProps {
  readonly config: EnvironmentConfig;
  /**
   * The pre-existing ECR repository (from
   * `WebpresaPostcardRenderRepositoryStack`, deployed separately and first)
   * this Lambda's image is pulled from — see that stack's doc comment.
   */
  readonly repository: ecr.IRepository;
  /**
   * PutObject access, scoped to exactly the `postcards/*​/*​/...` prefix —
   * never the whole bucket, never even the whole `postcards/` prefix as a
   * single wildcard segment (see the IAM statement below for the precise
   * shape). No DynamoDB table props exist on this construct at all: unlike
   * the Stage 14 screenshot Lambda (which re-reads `ScanEvent`/`Business`/
   * `SitePreview` directly), this Lambda never touches a table — the
   * internal `/internal/postcards/[postcardId]/render/[side]` page it
   * navigates to does its own server-side data lookups, and the caller
   * (`web/lib/postcards/render.ts`) owns writing `Postcard.frontArtifactKey`/
   * `backArtifactKey` once this Lambda's synchronous response comes back.
   */
  readonly assetsBucket: s3.IBucket;
  /** GetSecretValue access — signs the Stage 22 `postcard_render` capture token. */
  readonly captureTokenSecret: secretsmanager.ISecret;
  /**
   * GetSecretValue access — Vercel's "Protection Bypass for Automation"
   * secret, needed to reach the protected internal render page exactly as
   * Stage 14's Lambda needs it for `generated_preview` navigations.
   */
  readonly vercelProtectionBypassSecret: secretsmanager.ISecret;
  /** Webpresa's public app origin — see `WebpresaScreenshotLambdaProps.appBaseUrl`'s identical doc comment for why this must be passed in rather than derived. */
  readonly appBaseUrl: string;
  /**
   * Tag or digest of the pre-built, pre-pushed postcard-render container
   * image — see `infra/scripts/build-and-push-postcard-render-lambda.sh`.
   * Defaults to `'latest'`.
   */
  readonly imageTag?: string;
}

// ---------------------------------------------------------------------------
// Reusable construct
// ---------------------------------------------------------------------------

/**
 * WebpresaPostcardRenderLambda — Stage 22 Phase 2 (Postcard Rendering
 * Pipeline) compute infrastructure. An ECR-hosted container image, exactly
 * like Stage 14's screenshot Lambda (headless Chromium doesn't fit a
 * standard zip bundle) — but invoked **synchronously**
 * (`InvocationType: 'RequestResponse'`) from
 * `web/lib/postcards/render.ts`, not fire-and-forget. That's why this
 * construct has no `EventInvokeConfig`/dead-letter queue at all: automatic
 * async retry configuration only applies to asynchronous invocations, and a
 * synchronous caller already gets the failure directly as a rejected
 * invocation to handle itself (see `handler.ts`'s doc comment).
 *
 * Deliberately **not** attached to a VPC — same rationale as the screenshot
 * Lambda: it only ever calls the app's own internal render page plus AWS
 * APIs that don't require VPC placement.
 */
export class WebpresaPostcardRenderLambda extends Construct {
  public readonly function: lambda.DockerImageFunction;

  constructor(scope: Construct, id: string, props: WebpresaPostcardRenderLambdaProps) {
    super(scope, id);

    const fullName = `webpresa-${props.config.suffix}-postcard-render`;

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${fullName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: props.config.removalPolicy,
    });

    this.function = new lambda.DockerImageFunction(this, 'Function', {
      functionName: fullName,
      code: lambda.DockerImageCode.fromEcr(props.repository, {
        tagOrDigest: props.imageTag ?? 'latest',
      }),
      // Same 3008 MB ceiling as the screenshot Lambda — this account's
      // Lambda service quota caps container-image functions there; see
      // webpresa-screenshot-lambda.ts's identical comment.
      memorySize: 3008,
      timeout: cdk.Duration.seconds(180),
      // No reservedConcurrentExecutions — this Lambda is only ever invoked
      // synchronously, one at a time, from a single admin action; the
      // screenshot Lambda's reservation exists as a backstop against a
      // duplicate-*async*-delivery race that has no equivalent here.
      logGroup,
      environment: {
        ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
        CAPTURE_TOKEN_SECRET_NAME: props.captureTokenSecret.secretName,
        VERCEL_PROTECTION_BYPASS_SECRET_NAME: props.vercelProtectionBypassSecret.secretName,
        WEBPRESA_APP_BASE_URL: props.appBaseUrl,
        // AWS_REGION is Lambda-reserved — see webpresa-screenshot-lambda.ts.
      },
    });

    // S3 PutObject ONLY, scoped to exactly the postcard artifact prefix —
    // never the whole bucket. Written as an explicit PolicyStatement, not
    // `bucket.grantPut()` — see webpresa-screenshot-lambda.ts's identical
    // comment for why that helper grants a broader action set than needed.
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [props.assetsBucket.arnForObjects('postcards/*/*/*')],
      }),
    );

    // Mints the postcard_render capture token — GetSecretValue only.
    props.captureTokenSecret.grantRead(this.function);

    // Vercel Protection Bypass for Automation secret — GetSecretValue only.
    props.vercelProtectionBypassSecret.grantRead(this.function);
  }
}
