import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaTable } from '../constructs/webpresa-table';

export interface WebpresaDataStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * WebpresaDataStack — DynamoDB data layer for the Webpresa platform.
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
    new WebpresaTable(this, 'Businesses', {
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

    // ───────────────────────────────────────────────────────────────────────
    // SitePreviews
    //   PK: previewId
    //   GSIs: slug-index
    //         business-id-index (SK: createdAt — newest-first pagination)
    //         status-index ⚠
    // ───────────────────────────────────────────────────────────────────────
    new WebpresaTable(this, 'SitePreviews', {
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

    // ───────────────────────────────────────────────────────────────────────
    // ScanEvents
    //   PK: scanId
    //   GSIs: business-id-index (SK: createdAt — chronological history)
    //         status-index ⚠
    // ───────────────────────────────────────────────────────────────────────
    new WebpresaTable(this, 'ScanEvents', {
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
  }
}
