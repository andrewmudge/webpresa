import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaBucket } from '../constructs/webpresa-bucket';
import { WebpresaTable } from '../constructs/webpresa-table';

export interface WebpresaStockImagesStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * WebpresaStockImagesStack — the curated stock-image repository (Phase 1
 * hero-image fallback tier — see web/docs/build_log.md).
 *
 * Unlike every other bucket in this project, stock photography is never
 * sensitive and is deliberately reused across many businesses' generated
 * previews, so it's served publicly through CloudFront rather than the
 * private-bucket + `/api/assets/...` proxy pattern the rest of the app
 * uses. This is the first CloudFront distribution in the project.
 *
 * The S3 bucket itself stays exactly as private as every other
 * `WebpresaBucket` (`BLOCK_ALL` public access, unchanged) — Origin Access
 * Control is CloudFront's own mechanism for reading a private bucket on the
 * app's behalf, so no fork of the shared bucket construct is needed.
 *
 * Also owns the `stock-images` DynamoDB table (StockImage metadata) —
 * co-located here rather than in WebpresaDataStack since bucket, CDN, and
 * table are all part of this one self-contained feature.
 */
export class WebpresaStockImagesStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly table: dynamodb.Table;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebpresaStockImagesStackProps) {
    super(scope, id, props);

    const { config } = props;
    const S = dynamodb.AttributeType.STRING;

    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // ───────────────────────────────────────────────────────────────────────
    // Bucket — stays fully private (BLOCK_ALL); CloudFront + OAC below is
    // the only public entry point. Curated, long-lived assets — never
    // tagged `retain=false`, so WebpresaBucket's default lifecycle rules are
    // harmless no-ops here.
    // ───────────────────────────────────────────────────────────────────────
    const stockImages = new WebpresaBucket(this, 'StockImages', {
      config,
      bucketName: 'stock-images',
    });
    this.bucket = stockImages.bucket;

    // ───────────────────────────────────────────────────────────────────────
    // CloudFront — Origin Access Control lets CloudFront read the private
    // bucket without making it public; CDK manages the resulting bucket
    // policy automatically. Every object this feature writes gets a fresh,
    // never-reused key (see web/lib/s3/stock-images.ts) with an immutable
    // Cache-Control header set at upload time, so this feature never needs
    // a CreateInvalidation call.
    // ───────────────────────────────────────────────────────────────────────
    const origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `webpresa-${config.suffix}-stock-images-cdn`,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
    });

    // ───────────────────────────────────────────────────────────────────────
    // StockImages table — named 'stock-image-metadata', deliberately
    // distinct from the bucket's 'stock-images' short name above: both
    // constructs derive their CfnOutput exportNames from that shared short
    // name (`{fullName}-name`/`{fullName}-arn`), so reusing the identical
    // name for both a bucket and a table here would produce two resources
    // whose CloudFormation exports collide — caught via `cdk synth` before
    // ever attempting a deploy.
    //   PK: stockImageId
    //   GSIs: industry-kind-index (PK: industryKind = "{industry|'general'}#{kind}#{variant|'none'}",
    //           SK: createdAt — newest-first, gives the auto hero-pick tier
    //           an exact-match query for e.g. "the default desktop hero for
    //           plumbing" fully independent of the mobile equivalent; also
    //           doubles as the Phase 2 browse-by-industry/filter-by-kind
    //           query. Attribute name/type only — DynamoDB doesn't care what
    //           string format the application puts here, so this value
    //           format is free to change without any infra update.)
    //         status-index ⚠ (see WebpresaDataStack's pre-production note —
    //           same low-cardinality caveat applies here)
    // ───────────────────────────────────────────────────────────────────────
    const stockImagesTable = new WebpresaTable(this, 'StockImagesTable', {
      config,
      tableName: 'stock-image-metadata',
      partitionKey: { name: 'stockImageId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'industry-kind-index',
          partitionKey: { name: 'industryKind', type: S },
          sortKey: { name: 'createdAt', type: S },
        },
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.table = stockImagesTable.table;

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      exportName: `webpresa-${config.suffix}-stock-images-cdn-domain`,
      description: `CloudFront domain fronting webpresa-${config.suffix}-stock-images`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      exportName: `webpresa-${config.suffix}-stock-images-cdn-id`,
      description: `CloudFront distribution ID fronting webpresa-${config.suffix}-stock-images`,
    });
  }
}
