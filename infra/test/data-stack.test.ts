import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

// ---------------------------------------------------------------------------
// Synthesise templates once — shared across all test groups.
// No AWS credentials are needed: CDK assertion tests work entirely in memory.
// ---------------------------------------------------------------------------

let dev: Template;
let prod: Template;

beforeAll(() => {
  const devApp = new App();
  dev = Template.fromStack(
    new WebpresaDataStack(devApp, 'WebpresaDevDataStack', {
      config: ENVIRONMENTS.dev,
    }),
  );

  const prodApp = new App();
  prod = Template.fromStack(
    new WebpresaDataStack(prodApp, 'WebpresaProdDataStack', {
      config: ENVIRONMENTS.prod,
    }),
  );
});

// ---------------------------------------------------------------------------
// Table count
// ---------------------------------------------------------------------------

describe('table count', () => {
  it('creates exactly five DynamoDB tables', () => {
    dev.resourceCountIs('AWS::DynamoDB::Table', 5);
  });
});

// ---------------------------------------------------------------------------
// Billing mode
// ---------------------------------------------------------------------------

describe('billing mode', () => {
  it('all dev tables use PAY_PER_REQUEST', () => {
    dev.allResourcesProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  it('all prod tables use PAY_PER_REQUEST', () => {
    prod.allResourcesProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
    });
  });
});

// ---------------------------------------------------------------------------
// Partition keys
// ---------------------------------------------------------------------------

describe('partition keys', () => {
  it('Businesses table has businessId as partition key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-businesses',
      KeySchema: Match.arrayWith([
        { AttributeName: 'businessId', KeyType: 'HASH' },
      ]),
    });
  });

  it('SitePreviews table has previewId as partition key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-site-previews',
      KeySchema: Match.arrayWith([
        { AttributeName: 'previewId', KeyType: 'HASH' },
      ]),
    });
  });

  it('ScanEvents table has scanId as partition key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-scan-events',
      KeySchema: Match.arrayWith([
        { AttributeName: 'scanId', KeyType: 'HASH' },
      ]),
    });
  });

  it('Postcards table has postcardId as partition key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-postcards',
      KeySchema: Match.arrayWith([
        { AttributeName: 'postcardId', KeyType: 'HASH' },
      ]),
    });
  });

  it('ScanExecutions table has scanExecutionId as partition key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-scan-executions',
      KeySchema: Match.arrayWith([
        { AttributeName: 'scanExecutionId', KeyType: 'HASH' },
      ]),
    });
  });
});

// ---------------------------------------------------------------------------
// GSI names
// ---------------------------------------------------------------------------

describe('GSI names', () => {
  it('Businesses table has slug-index, google-place-id-index, status-index', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-businesses',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'slug-index' }),
        Match.objectLike({ IndexName: 'google-place-id-index' }),
        Match.objectLike({ IndexName: 'status-index' }),
      ]),
    });
  });

  it('SitePreviews table has slug-index, business-id-index, status-index', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-site-previews',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'slug-index' }),
        Match.objectLike({ IndexName: 'business-id-index' }),
        Match.objectLike({ IndexName: 'status-index' }),
      ]),
    });
  });

  it('ScanEvents table has business-id-index and status-index', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-scan-events',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'business-id-index' }),
        Match.objectLike({ IndexName: 'status-index' }),
      ]),
    });
  });

  it('Postcards table has business-id-index, campaign-code-index, provider-postcard-id-index, status-index', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-postcards',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'business-id-index' }),
        Match.objectLike({ IndexName: 'campaign-code-index' }),
        Match.objectLike({ IndexName: 'provider-postcard-id-index' }),
        Match.objectLike({ IndexName: 'status-index' }),
      ]),
    });
  });

  it('ScanExecutions table has business-id-index and status-index', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-scan-executions',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'business-id-index' }),
        Match.objectLike({ IndexName: 'status-index' }),
      ]),
    });
  });
});

// ---------------------------------------------------------------------------
// createdAt sort key on businessId indexes
// Three tables (SitePreviews, ScanEvents, Postcards) have a businessId GSI
// with createdAt as the sort key for chronological, newest-first pagination.
// Businesses has no businessId GSI (it IS the business record).
// ---------------------------------------------------------------------------

describe('createdAt sort key on businessId indexes', () => {
  it('SitePreviews business-id-index has createdAt as sort key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-site-previews',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'business-id-index',
          KeySchema: Match.arrayWith([
            { AttributeName: 'businessId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ]),
        }),
      ]),
    });
  });

  it('ScanEvents business-id-index has createdAt as sort key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-scan-events',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'business-id-index',
          KeySchema: Match.arrayWith([
            { AttributeName: 'businessId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ]),
        }),
      ]),
    });
  });

  it('Postcards business-id-index has createdAt as sort key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-postcards',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'business-id-index',
          KeySchema: Match.arrayWith([
            { AttributeName: 'businessId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ]),
        }),
      ]),
    });
  });

  it('ScanExecutions business-id-index has createdAt as sort key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-dev-scan-executions',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'business-id-index',
          KeySchema: Match.arrayWith([
            { AttributeName: 'businessId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ]),
        }),
      ]),
    });
  });

  it('Businesses table does not have a business-id-index (no self-referencing GSI)', () => {
    const resources = dev.findResources('AWS::DynamoDB::Table', {
      Properties: { TableName: 'webpresa-dev-businesses' },
    });
    const table = Object.values(resources)[0] as {
      Properties: { GlobalSecondaryIndexes: Array<{ IndexName: string }> };
    };
    const indexNames = table.Properties.GlobalSecondaryIndexes.map(
      (g) => g.IndexName,
    );
    expect(indexNames).not.toContain('business-id-index');
  });
});

// ---------------------------------------------------------------------------
// Dev removal policy
// ---------------------------------------------------------------------------

describe('dev removal policy', () => {
  it('all dev tables have DeletionPolicy: Delete', () => {
    dev.allResources('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Delete',
    });
  });

  it('all dev tables have UpdateReplacePolicy: Delete', () => {
    dev.allResources('AWS::DynamoDB::Table', {
      UpdateReplacePolicy: 'Delete',
    });
  });
});

// ---------------------------------------------------------------------------
// CloudFormation outputs
// ---------------------------------------------------------------------------

describe('CloudFormation outputs', () => {
  it('creates 20 outputs — 10 table outputs, 2 bucket outputs, 8 secret ARN outputs', () => {
    const outputs = dev.findOutputs('*');
    expect(Object.keys(outputs)).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

describe('stack-level tags', () => {
  it('all tables are tagged Project=Webpresa', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'Webpresa' }]),
    });
  });

  it('all tables are tagged Environment=Dev', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      Tags: Match.arrayWith([{ Key: 'Environment', Value: 'Dev' }]),
    });
  });

  it('all tables are tagged ManagedBy=CDK', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      Tags: Match.arrayWith([{ Key: 'ManagedBy', Value: 'CDK' }]),
    });
  });
});

// ---------------------------------------------------------------------------
// Production config (not deployed in Stage 6 — verified in-memory only)
// ---------------------------------------------------------------------------

describe('prod config (in-memory only — not deployed)', () => {
  it('prod tables have DeletionPolicy: Retain', () => {
    prod.allResources('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('prod tables have point-in-time recovery enabled', () => {
    prod.allResourcesProperties('AWS::DynamoDB::Table', {
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
    });
  });

  it('prod table names carry the prod suffix', () => {
    prod.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-prod-businesses',
    });
    prod.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-prod-site-previews',
    });
    prod.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-prod-scan-events',
    });
    prod.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-prod-postcards',
    });
    prod.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'webpresa-prod-scan-executions',
    });
  });

  it('prod tables carry the Environment=Prod tag', () => {
    prod.hasResourceProperties('AWS::DynamoDB::Table', {
      Tags: Match.arrayWith([{ Key: 'Environment', Value: 'Prod' }]),
    });
  });
});

// ---------------------------------------------------------------------------
// GSI projection type
// ---------------------------------------------------------------------------

describe('GSI projection', () => {
  it('all GSIs use ProjectionType.ALL', () => {
    dev.allResourcesProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          Projection: { ProjectionType: 'ALL' },
        }),
      ]),
    });
  });
});

// ---------------------------------------------------------------------------
// Assets bucket (Stage 9)
// ---------------------------------------------------------------------------

describe('assets bucket', () => {
  it('creates exactly one S3 bucket', () => {
    dev.resourceCountIs('AWS::S3::Bucket', 1);
  });

  it('dev bucket is named webpresa-dev-assets', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'webpresa-dev-assets',
    });
  });

  it('prod bucket is named webpresa-prod-assets', () => {
    prod.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'webpresa-prod-assets',
    });
  });

  it('bucket has S3-managed encryption enabled', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
          }),
        ]),
      },
    });
  });

  it('bucket fully blocks public access', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('bucket policy enforces SSL', () => {
    dev.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Deny',
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          }),
        ]),
      },
    });
  });

  it('bucket has a lifecycle rule to abort incomplete multipart uploads', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
          }),
        ]),
      },
    });
  });

  it('bucket has a lifecycle rule expiring retain=false-tagged objects after 90 days', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            ExpirationInDays: 90,
            TagFilters: Match.arrayWith([
              { Key: 'retain', Value: 'false' },
            ]),
          }),
        ]),
      },
    });
  });

  it('dev bucket has no versioning configured', () => {
    const resources = dev.findResources('AWS::S3::Bucket', {
      Properties: { BucketName: 'webpresa-dev-assets' },
    });
    const bucket = Object.values(resources)[0] as {
      Properties: { VersioningConfiguration?: unknown };
    };
    expect(bucket.Properties.VersioningConfiguration).toBeUndefined();
  });

  it('prod bucket has versioning enabled', () => {
    prod.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'webpresa-prod-assets',
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });

  it('dev bucket has DeletionPolicy: Delete', () => {
    dev.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete',
    });
  });

  it('prod bucket has DeletionPolicy: Retain', () => {
    prod.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('bucket is tagged Project=Webpresa', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'Webpresa' }]),
    });
  });

  it('bucket is tagged Environment=Dev', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'Environment', Value: 'Dev' }]),
    });
  });

  it('bucket is tagged ManagedBy=CDK', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([{ Key: 'ManagedBy', Value: 'CDK' }]),
    });
  });
});

// ---------------------------------------------------------------------------
// Secrets (Stage 10)
// ---------------------------------------------------------------------------

describe('secrets', () => {
  it('creates exactly eight secrets', () => {
    dev.resourceCountIs('AWS::SecretsManager::Secret', 8);
  });

  const devSecretNames = [
    'webpresa-dev-openai',
    'webpresa-dev-firecrawl',
    'webpresa-dev-google-places',
    'webpresa-dev-stripe',
    'webpresa-dev-lob',
    'webpresa-dev-capture-token',
    'webpresa-dev-vercel-protection-bypass',
    'webpresa-dev-internal-api',
  ];

  it.each(devSecretNames)('dev secret %s exists', (name) => {
    dev.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: name,
    });
  });

  it('prod secret names carry the prod suffix', () => {
    prod.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'webpresa-prod-openai',
    });
    prod.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'webpresa-prod-stripe',
    });
  });

  it('single-key secrets generate a random apiKey placeholder', () => {
    dev.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'webpresa-dev-openai',
      GenerateSecretString: Match.objectLike({
        GenerateStringKey: 'apiKey',
        SecretStringTemplate: '{}',
      }),
    });
  });

  it('the Stripe secret generates secretKey and seeds an empty webhookSecret placeholder', () => {
    dev.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'webpresa-dev-stripe',
      GenerateSecretString: Match.objectLike({
        GenerateStringKey: 'secretKey',
        SecretStringTemplate: JSON.stringify({ webhookSecret: '' }),
      }),
    });
  });

  it('no secret has a plaintext SecretString property', () => {
    const secrets = dev.findResources('AWS::SecretsManager::Secret');
    for (const secret of Object.values(secrets) as Array<{
      Properties: Record<string, unknown>;
    }>) {
      expect(secret.Properties.SecretString).toBeUndefined();
    }
  });

  it('dev secrets have DeletionPolicy: Delete', () => {
    dev.allResources('AWS::SecretsManager::Secret', {
      DeletionPolicy: 'Delete',
    });
  });

  it('prod secrets have DeletionPolicy: Retain', () => {
    prod.allResources('AWS::SecretsManager::Secret', {
      DeletionPolicy: 'Retain',
    });
  });

  it('secrets are tagged Project=Webpresa, Environment=Dev, ManagedBy=CDK', () => {
    dev.hasResourceProperties('AWS::SecretsManager::Secret', {
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'Webpresa' }]),
    });
    dev.hasResourceProperties('AWS::SecretsManager::Secret', {
      Tags: Match.arrayWith([{ Key: 'Environment', Value: 'Dev' }]),
    });
    dev.hasResourceProperties('AWS::SecretsManager::Secret', {
      Tags: Match.arrayWith([{ Key: 'ManagedBy', Value: 'CDK' }]),
    });
  });
});
