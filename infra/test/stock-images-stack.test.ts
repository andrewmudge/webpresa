import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaStockImagesStack } from '../lib/stacks/stock-images-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

let dev: Template;
let prod: Template;

beforeAll(() => {
  const devApp = new App();
  dev = Template.fromStack(
    new WebpresaStockImagesStack(devApp, 'WebpresaDevStockImagesStack', {
      config: ENVIRONMENTS.dev,
    }),
  );

  const prodApp = new App();
  prod = Template.fromStack(
    new WebpresaStockImagesStack(prodApp, 'WebpresaProdStockImagesStack', {
      config: ENVIRONMENTS.prod,
    }),
  );
});

describe('resource shape', () => {
  it('creates exactly one CloudFront distribution and one Origin Access Control', () => {
    dev.resourceCountIs('AWS::CloudFront::Distribution', 1);
    dev.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  it('creates exactly one S3 bucket and one DynamoDB table', () => {
    dev.resourceCountIs('AWS::S3::Bucket', 1);
    dev.resourceCountIs('AWS::DynamoDB::Table', 1);
  });
});

describe('bucket stays private — CloudFront/OAC is the only public entry point', () => {
  it('fully blocks public access on the bucket', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('grants CloudFront (not the world) read access via a bucket policy scoped to this distribution', () => {
    dev.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Condition: Match.objectLike({
              StringEquals: Match.objectLike({ 'AWS:SourceArn': Match.anyValue() }),
            }),
          }),
        ]),
      },
    });
  });
});

describe('naming convention', () => {
  it('bucket name follows webpresa-{env}-stock-images', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', { BucketName: 'webpresa-dev-stock-images' });
    prod.hasResourceProperties('AWS::S3::Bucket', { BucketName: 'webpresa-prod-stock-images' });
  });

  it('table name follows webpresa-{env}-stock-image-metadata (deliberately distinct from the bucket\'s short name — see stock-images-stack.ts)', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', { TableName: 'webpresa-dev-stock-image-metadata' });
    prod.hasResourceProperties('AWS::DynamoDB::Table', { TableName: 'webpresa-prod-stock-image-metadata' });
  });

  it('never produces two CloudFormation exports with the same name — WebpresaBucket and WebpresaTable both derive their CfnOutput exportNames from their own short name, so reusing a short name across resource types in the same stack would collide at deploy time', () => {
    for (const template of [dev, prod]) {
      const outputs = template.toJSON().Outputs ?? {};
      const exportNames = Object.values(outputs)
        .map((output) => (output as { Export?: { Name?: string } }).Export?.Name)
        .filter((name): name is string => !!name);
      expect(new Set(exportNames).size).toBe(exportNames.length);
    }
  });
});

describe('table shape', () => {
  it('has stockImageId as partition key', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: Match.arrayWith([{ AttributeName: 'stockImageId', KeyType: 'HASH' }]),
    });
  });

  it('has industry-kind-index (industryKind PK, createdAt SK) and status-index GSIs', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'industry-kind-index',
          KeySchema: [
            { AttributeName: 'industryKind', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' },
          ],
        }),
        Match.objectLike({
          IndexName: 'status-index',
          KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
        }),
      ]),
    });
  });

  it('uses PAY_PER_REQUEST billing', () => {
    dev.hasResourceProperties('AWS::DynamoDB::Table', { BillingMode: 'PAY_PER_REQUEST' });
  });
});

describe('tags', () => {
  it('applies standard project tags', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        { Key: 'Environment', Value: 'Dev' },
        { Key: 'ManagedBy', Value: 'CDK' },
        { Key: 'Project', Value: 'Webpresa' },
      ]),
    });
  });
});
