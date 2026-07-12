import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// GSI definition
// ---------------------------------------------------------------------------

export interface WebpresaGsiDefinition {
  /** Index name as it will appear in DynamoDB, e.g. `'business-id-index'`. */
  readonly indexName: string;
  readonly partitionKey: dynamodb.Attribute;
  /**
   * Optional sort key.
   *
   * Add `createdAt` (STRING) here on `businessId` GSIs to support
   * chronological queries and newest-first pagination for records
   * belonging to a single business.
   */
  readonly sortKey?: dynamodb.Attribute;
}

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaTableProps {
  readonly config: EnvironmentConfig;
  /**
   * Short table name without prefix or environment suffix.
   *
   * The full DynamoDB table name is constructed as:
   *   `webpresa-{config.suffix}-{tableName}`
   *
   * Examples:
   *   'businesses'   →  'webpresa-dev-businesses'
   *   'site-previews' →  'webpresa-dev-site-previews'
   */
  readonly tableName: string;
  readonly partitionKey: dynamodb.Attribute;
  readonly sortKey?: dynamodb.Attribute;
  readonly globalSecondaryIndexes?: WebpresaGsiDefinition[];
}

// ---------------------------------------------------------------------------
// Reusable table construct
// ---------------------------------------------------------------------------

/**
 * WebpresaTable — standard DynamoDB table for the Webpresa platform.
 *
 * All platform-standard configuration is applied automatically from the
 * EnvironmentConfig, so every table in every environment is consistent
 * without duplicating settings.
 *
 * Automatically configured per environment:
 *   - Explicit table name:   webpresa-{suffix}-{tableName}
 *   - Billing mode:          PAY_PER_REQUEST (both envs at this stage)
 *   - Encryption:            AWS_MANAGED (SSE enabled on all tables)
 *   - Removal policy:        DESTROY (dev) | RETAIN (prod)
 *   - Point-in-time recovery: disabled (dev) | enabled (prod)
 *   - Deletion protection:   disabled (dev) | enabled (prod)
 *   - All GSIs:              ProjectionType.ALL
 *   - CloudFormation outputs: TableName and TableArn for each table
 *
 * Adding a future table (e.g. Claims, Campaigns, QRScans) requires only:
 *
 *   new WebpresaTable(this, 'Claims', {
 *     config,
 *     tableName: 'claims',
 *     partitionKey: { name: 'claimId', type: STRING },
 *     globalSecondaryIndexes: [ ... ],
 *   });
 *
 * Everything else is inherited from the shared EnvironmentConfig.
 */
export class WebpresaTable extends Construct {
  /** The underlying CDK DynamoDB Table — exposed for granting permissions. */
  public readonly table: dynamodb.Table;

  /** Full DynamoDB table name as deployed, e.g. `webpresa-dev-businesses`. */
  public readonly fullTableName: string;

  constructor(scope: Construct, id: string, props: WebpresaTableProps) {
    super(scope, id);

    this.fullTableName = `webpresa-${props.config.suffix}-${props.tableName}`;

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: this.fullTableName,
      partitionKey: props.partitionKey,
      sortKey: props.sortKey,
      billingMode: props.config.billingMode,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: props.config.removalPolicy,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: props.config.pointInTimeRecovery,
      },
      deletionProtection: props.config.deletionProtection,
    });

    for (const gsi of props.globalSecondaryIndexes ?? []) {
      this.table.addGlobalSecondaryIndex({
        indexName: gsi.indexName,
        partitionKey: gsi.partitionKey,
        sortKey: gsi.sortKey,
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }

    // ── CloudFormation outputs ───────────────────────────────────────────
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      exportName: `${this.fullTableName}-name`,
      description: `DynamoDB table name: ${this.fullTableName}`,
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      exportName: `${this.fullTableName}-arn`,
      description: `DynamoDB table ARN: ${this.fullTableName}`,
    });
  }
}
