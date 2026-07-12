import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaBucketProps {
  readonly config: EnvironmentConfig;
  /**
   * Short bucket name without prefix or environment suffix.
   *
   * The full S3 bucket name is constructed as:
   *   `webpresa-{config.suffix}-{bucketName}`
   *
   * Example:
   *   'assets'  →  'webpresa-dev-assets'
   */
  readonly bucketName: string;
}

// ---------------------------------------------------------------------------
// Reusable bucket construct
// ---------------------------------------------------------------------------

/**
 * WebpresaBucket — standard private S3 bucket for the Webpresa platform.
 *
 * All platform-standard configuration is applied automatically so every
 * bucket in every environment is consistent without duplicating settings.
 *
 * Automatically configured per environment:
 *   - Explicit bucket name:   webpresa-{suffix}-{bucketName}
 *   - Encryption:             S3-managed (SSE-S3) on all buckets
 *   - Public access:          fully blocked on all buckets
 *   - Enforce SSL:            required on all buckets
 *   - Versioning:             disabled (dev) | enabled (prod)
 *   - Removal policy:         DESTROY (dev) | RETAIN (prod)
 *   - Auto-delete objects:    only when removalPolicy is DESTROY (dev)
 *   - Lifecycle rules:        abort incomplete multipart uploads after 7 days;
 *                             expire objects tagged `retain=false` after 90
 *                             days (later stages set this tag when a scan or
 *                             postcard artifact is marked failed/obsolete)
 *   - CloudFormation outputs: BucketName and BucketArn
 *
 * Adding a future bucket requires only:
 *
 *   new WebpresaBucket(this, 'Assets', {
 *     config,
 *     bucketName: 'assets',
 *   });
 *
 * Everything else is inherited from the shared EnvironmentConfig.
 */
export class WebpresaBucket extends Construct {
  /** The underlying CDK S3 Bucket — exposed for granting permissions. */
  public readonly bucket: s3.Bucket;

  /** Full S3 bucket name as deployed, e.g. `webpresa-dev-assets`. */
  public readonly fullBucketName: string;

  constructor(scope: Construct, id: string, props: WebpresaBucketProps) {
    super(scope, id);

    this.fullBucketName = `webpresa-${props.config.suffix}-${props.bucketName}`;

    const isDestroyable =
      props.config.removalPolicy === cdk.RemovalPolicy.DESTROY;

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: this.fullBucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: props.config.suffix === 'prod',
      removalPolicy: props.config.removalPolicy,
      autoDeleteObjects: isDestroyable,
      lifecycleRules: [
        {
          id: 'abort-incomplete-multipart-uploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
        {
          id: 'expire-failed-and-obsolete-artifacts',
          expiration: cdk.Duration.days(90),
          tagFilters: { retain: 'false' },
        },
      ],
    });

    // ── CloudFormation outputs ───────────────────────────────────────────
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      exportName: `${this.fullBucketName}-name`,
      description: `S3 bucket name: ${this.fullBucketName}`,
    });

    new cdk.CfnOutput(this, 'BucketArn', {
      value: this.bucket.bucketArn,
      exportName: `${this.fullBucketName}-arn`,
      description: `S3 bucket ARN: ${this.fullBucketName}`,
    });
  }
}
