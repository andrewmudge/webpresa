import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaTable } from '../constructs/webpresa-table';
import { WebpresaBucket } from '../constructs/webpresa-bucket';
import { WebpresaSecret } from '../constructs/webpresa-secret';

export interface WebpresaDataStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * WebpresaDataStack — DynamoDB, S3, and Secrets Manager data layer for the
 * Webpresa platform.
 *
 * Instantiated with an environment-aware ID from bin/webpresa.ts:
 *   dev  →  WebpresaDevDataStack
 *   prod →  WebpresaProdDataStack
 *
 * All four tables share the WebpresaTable construct, which applies
 * consistent encryption, billing, removal policy, and PITR settings
 * derived from the EnvironmentConfig.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠  PRE-PRODUCTION ARCHITECTURE NOTE — Status GSIs
 * ═══════════════════════════════════════════════════════════════════════════
 * Each table includes a `status-index` GSI with `status` as the partition
 * key.  This is appropriate for the development MVP where volumes are low
 * and query patterns are exploratory.
 *
 * THESE INDEXES MUST BE REASSESSED BEFORE PRODUCTION DEPLOYMENT because:
 *
 *   • `status` is a low-cardinality attribute (typically 4–6 values).
 *   • A GSI with a low-cardinality partition key concentrates all writes
 *     and reads onto a small number of DynamoDB internal partitions.
 *   • At production write volumes this creates hot partitions, leading to
 *     throttling even when the table has spare capacity.
 *
 * Recommended alternatives to evaluate before going to production:
 *   1. Replace status-only GSI queries with filter expressions on a
 *      higher-cardinality index (e.g. businessId-index) — no infra change.
 *   2. Composite partition key: `status#YYYY-MM` distributes writes across
 *      monthly partitions while preserving the status filter.
 *   3. DynamoDB Streams → secondary projection if global status scans are
 *      genuinely latency-critical at scale.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export class WebpresaDataStack extends cdk.Stack {
  // Exposed for cross-stack references — Stage 14's WebpresaScreenshotStack
  // grants its Lambda least-privilege access to exactly these resources
  // rather than reusing the broad webpresa-vercel-dev IAM policy. Only the
  // resources a later stack actually needs are exposed; everything else
  // stays a local constant inside this constructor as before.
  public readonly businessesTable: dynamodb.Table;
  public readonly sitePreviewsTable: dynamodb.Table;
  public readonly scanEventsTable: dynamodb.Table;
  public readonly assetsBucket: s3.Bucket;
  public readonly captureTokenSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: WebpresaDataStackProps) {
    super(scope, id, props);

    const { config } = props;
    const S = dynamodb.AttributeType.STRING;

    // Apply mandatory stack-level tags here so they are present during both
    // test synthesis and real deployment.  Tags propagate to all resources.
    const envLabel =
      config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    /**
     * Shared createdAt sort-key attribute definition.
     * Used on businessId GSIs to enable chronological queries and
     * newest-first pagination for all records belonging to one business.
     */
    const createdAtSortKey: dynamodb.Attribute = {
      name: 'createdAt',
      type: S,
    };

    // ───────────────────────────────────────────────────────────────────────
    // Businesses
    //   PK: businessId
    //   GSIs: slug-index, google-place-id-index, status-index
    // ───────────────────────────────────────────────────────────────────────
    const businesses = new WebpresaTable(this, 'Businesses', {
      config,
      tableName: 'businesses',
      partitionKey: { name: 'businessId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'slug-index',
          partitionKey: { name: 'slug', type: S },
        },
        {
          indexName: 'google-place-id-index',
          partitionKey: { name: 'googlePlaceId', type: S },
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.businessesTable = businesses.table;

    // ───────────────────────────────────────────────────────────────────────
    // SitePreviews
    //   PK: previewId
    //   GSIs: slug-index
    //         business-id-index (SK: createdAt — newest-first pagination)
    //         status-index ⚠
    // ───────────────────────────────────────────────────────────────────────
    const sitePreviews = new WebpresaTable(this, 'SitePreviews', {
      config,
      tableName: 'site-previews',
      partitionKey: { name: 'previewId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'slug-index',
          partitionKey: { name: 'slug', type: S },
        },
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.sitePreviewsTable = sitePreviews.table;

    // ───────────────────────────────────────────────────────────────────────
    // ScanEvents
    //   PK: scanId
    //   GSIs: business-id-index (SK: createdAt — chronological history)
    //         status-index ⚠
    // ───────────────────────────────────────────────────────────────────────
    const scanEvents = new WebpresaTable(this, 'ScanEvents', {
      config,
      tableName: 'scan-events',
      partitionKey: { name: 'scanId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.scanEventsTable = scanEvents.table;

    // ───────────────────────────────────────────────────────────────────────
    // Postcards
    //   PK: postcardId
    //   GSIs: business-id-index (SK: createdAt — chronological history)
    //         campaign-code-index
    //         provider-postcard-id-index (sparse — only set after submission)
    //         status-index ⚠
    // ───────────────────────────────────────────────────────────────────────
    new WebpresaTable(this, 'Postcards', {
      config,
      tableName: 'postcards',
      partitionKey: { name: 'postcardId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
        {
          indexName: 'campaign-code-index',
          partitionKey: { name: 'campaignCode', type: S },
        },
        {
          // Sparse index — only Postcard items that have been submitted to a
          // provider (and received a providerPostcardId) appear in this index.
          indexName: 'provider-postcard-id-index',
          partitionKey: { name: 'providerPostcardId', type: S },
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });

    // ───────────────────────────────────────────────────────────────────────
    // Assets bucket — private object storage for scan artifacts, preview
    // assets, and postcard files. Single bucket, prefix-scoped:
    //   scans/{businessId}/{scanId}/...
    //   previews/{businessId}/{previewId}/...
    //   postcards/{businessId}/{postcardId}/...
    // ───────────────────────────────────────────────────────────────────────
    const assets = new WebpresaBucket(this, 'Assets', {
      config,
      bucketName: 'assets',
    });
    this.assetsBucket = assets.bucket;

    // ───────────────────────────────────────────────────────────────────────
    // Secrets — third-party API credentials. Created with a random
    // placeholder value only; real values are populated out-of-band once
    // each integration stage (11 OpenAI, 12 Google Places, 13 Firecrawl,
    // 18 Stripe, 22 Lob) actually needs them. See architecture.md for the
    // documented JSON shape and owner of each secret.
    // ───────────────────────────────────────────────────────────────────────
    new WebpresaSecret(this, 'OpenAiSecret', {
      config,
      secretName: 'openai',
      description: 'OpenAI API credentials (Stage 11 — AI preview generation)',
      jsonKeys: ['apiKey'],
    });

    new WebpresaSecret(this, 'FirecrawlSecret', {
      config,
      secretName: 'firecrawl',
      description: 'Firecrawl API credentials (Stage 13 — website capture)',
      jsonKeys: ['apiKey'],
    });

    new WebpresaSecret(this, 'GooglePlacesSecret', {
      config,
      secretName: 'google-places',
      description: 'Google Places API credentials (Stage 12 — business discovery)',
      jsonKeys: ['apiKey'],
    });

    new WebpresaSecret(this, 'StripeSecret', {
      config,
      secretName: 'stripe',
      description: 'Stripe API credentials (Stage 18 — subscriptions)',
      jsonKeys: ['secretKey', 'webhookSecret'],
    });

    new WebpresaSecret(this, 'LobSecret', {
      config,
      secretName: 'lob',
      description: 'Lob API credentials (Stage 22 — postcard integration)',
      jsonKeys: ['apiKey'],
    });

    // Stage 14 — HMAC signing key for the screenshot Lambda's preview
    // capture token (see architecture.md, "Draft preview visibility"). Not
    // a third-party credential like the five above — generated and held
    // entirely within this platform — but provisioned the same way: a
    // random placeholder at creation, a real value populated out-of-band.
    // Read by both this Next.js app (verify only) and the screenshot Lambda
    // (mint only) — see infra/lib/stacks/screenshot-stack.ts for the
    // Lambda's own grant.
    const captureToken = new WebpresaSecret(this, 'CaptureTokenSecret', {
      config,
      secretName: 'capture-token',
      description: 'Preview capture-token HMAC signing key (Stage 14 — Playwright screenshots)',
      jsonKeys: ['signingKey'],
    });
    this.captureTokenSecret = captureToken.secret;
  }
}
