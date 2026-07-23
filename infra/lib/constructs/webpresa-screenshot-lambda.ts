import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as destinations from 'aws-cdk-lib/aws-lambda-destinations';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaScreenshotLambdaProps {
  readonly config: EnvironmentConfig;
  /**
   * The pre-existing ECR repository (from `WebpresaScreenshotRepositoryStack`,
   * deployed separately and first) this Lambda's image is pulled from. Never
   * created here — see `webpresa-screenshot-repository.ts`'s doc comment for
   * why the repository and the Lambda that references it can't share a stack.
   */
  readonly repository: ecr.IRepository;
  /** Least-privilege GetItem access — see "Infrastructure and IAM" below. */
  readonly businessesTable: dynamodb.ITable;
  readonly sitePreviewsTable: dynamodb.ITable;
  /** GetItem + UpdateItem access — the only table this Lambda ever writes. */
  readonly scanEventsTable: dynamodb.ITable;
  /** PutObject access, scoped to the existing_site/preview screenshot prefixes only. */
  readonly assetsBucket: s3.IBucket;
  /** GetSecretValue access — signs the Stage 14 preview capture token. */
  readonly captureTokenSecret: secretsmanager.ISecret;
  /**
   * Webpresa's public app origin, e.g. `https://app.webpresa.com` — the
   * Lambda has no other way to learn this, since `SitePreview` stores only
   * a slug, never an absolute URL (see implementation.md, Stage 14,
   * "Lambda payload").
   */
  readonly appBaseUrl: string;
  /**
   * Tag or digest of the pre-built, pre-pushed screenshot-capture container
   * image. There is deliberately no `fromImageAsset` auto-build here — see
   * `infra/scripts/build-and-push-screenshot-lambda.sh`. Defaults to
   * `'latest'`; pin to a specific digest for a production deployment once
   * this stage is actually promoted to prod.
   */
  readonly imageTag?: string;
}

// ---------------------------------------------------------------------------
// Reusable construct
// ---------------------------------------------------------------------------

/**
 * WebpresaScreenshotLambda — Stage 14 (Playwright Screenshots) compute
 * infrastructure. The project's first Lambda: an ECR-hosted container image
 * (headless Chromium doesn't fit a standard zip bundle), invoked
 * asynchronously from a Vercel Server Action (`lib/screenshots/capture.ts`),
 * with automatic retries disabled and a dead-letter queue as the sole
 * failure path — see `implementation.md`, Stage 14, "Architectural
 * commitment", "Idempotency and status transitions", and "Failure
 * destination and stale-scan recovery" for the full rationale.
 *
 * Deliberately **not** attached to a VPC — it only ever calls public
 * websites/the public preview URL plus AWS APIs that don't require VPC
 * placement; a VPC would need a NAT Gateway just to reach the public
 * internet, an ongoing cost this stage has no reason to take on.
 */
export class WebpresaScreenshotLambda extends Construct {
  public readonly function: lambda.DockerImageFunction;
  public readonly deadLetterQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: WebpresaScreenshotLambdaProps) {
    super(scope, id);

    const fullName = `webpresa-${props.config.suffix}-screenshot-capture`;

    // ── Dead-letter queue — the sole failure path, since automatic async
    // retries are disabled below (see class doc). ──────────────────────
    this.deadLetterQueue = new sqs.Queue(this, 'FailureQueue', {
      queueName: `${fullName}-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: props.config.removalPolicy,
    });

    // ── Explicit log group with bounded retention (CDK's default is
    // "never expire," unbounded cost for a Lambda running a real browser
    // that can log verbosely). ──────────────────────────────────────────
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${fullName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: props.config.removalPolicy,
    });

    // ── The Lambda itself. No `vpc` prop — see class doc. ───────────────
    this.function = new lambda.DockerImageFunction(this, 'Function', {
      functionName: fullName,
      code: lambda.DockerImageCode.fromEcr(props.repository, {
        tagOrDigest: props.imageTag ?? 'latest',
      }),
      memorySize: 3072,
      timeout: cdk.Duration.seconds(180),
      reservedConcurrentExecutions: 5,
      logGroup,
      environment: {
        BUSINESSES_TABLE_NAME: props.businessesTable.tableName,
        SITE_PREVIEWS_TABLE_NAME: props.sitePreviewsTable.tableName,
        SCAN_EVENTS_TABLE_NAME: props.scanEventsTable.tableName,
        ASSETS_BUCKET_NAME: props.assetsBucket.bucketName,
        CAPTURE_TOKEN_SECRET_NAME: props.captureTokenSecret.secretName,
        WEBPRESA_APP_BASE_URL: props.appBaseUrl,
        // AWS_REGION is a Lambda-reserved env var — the runtime already
        // provides it; setting it explicitly here would fail CFN deploy.
      },
    });

    // ── Asynchronous invocation configuration — see "Idempotency and
    // status transitions": AWS never automatically re-invokes on failure,
    // so a `running` ScanEvent is never silently retried into a lease
    // conflict; every failure instead goes to the DLQ above. ────────────
    new lambda.EventInvokeConfig(this, 'AsyncConfig', {
      function: this.function,
      maxEventAge: cdk.Duration.minutes(10),
      retryAttempts: 0,
      onFailure: new destinations.SqsDestination(this.deadLetterQueue),
      // SqsDestination.bind() grants this function's role sqs:SendMessage
      // on the queue automatically — no separate IAM statement needed.
    });

    // ── Least-privilege IAM — exactly the actions implementation.md,
    // Stage 14, "Infrastructure and IAM" specifies, never the broader
    // `grantReadData()`/`grantReadWriteData()` helpers (which include
    // Query/Scan/BatchGetItem — this Lambda only ever does GetItem by
    // partition key on all three tables, since businessId/previewId/scanId
    // are each the table's own PK; no GSI access is needed). ────────────
    props.businessesTable.grant(this.function, 'dynamodb:GetItem');
    props.sitePreviewsTable.grant(this.function, 'dynamodb:GetItem');
    props.scanEventsTable.grant(this.function, 'dynamodb:GetItem', 'dynamodb:UpdateItem');

    // S3 PutObject ONLY, scoped to exactly the two screenshot prefixes —
    // never the whole bucket, not even the whole scans/ prefix. Written as
    // an explicit PolicyStatement rather than `bucket.grantPut()`, which
    // actually grants a broader action set by default (PutObjectTagging,
    // PutObjectLegalHold, PutObjectRetention, PutObjectVersionTagging, and
    // an `s3:Abort*` wildcard covering AbortMultipartUpload) — confirmed via
    // `cdk diff` against the real account, not assumed. Screenshots are
    // single small PNGs via standard PutObject; no multipart upload is
    // used, so none of that broader set is needed.
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [props.assetsBucket.arnForObjects('scans/*/*/existing/*'), props.assetsBucket.arnForObjects('scans/*/*/preview/*')],
      }),
    );

    // Mints the preview capture token — GetSecretValue only.
    props.captureTokenSecret.grantRead(this.function);
  }
}
