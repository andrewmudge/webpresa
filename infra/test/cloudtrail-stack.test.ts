import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaCloudTrailStack } from '../lib/stacks/cloudtrail-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

// ---------------------------------------------------------------------------
// Stage 25 — CloudTrail was confirmed absent from both AWS accounts during
// this stage's planning research (security-findings.md, SEC-04). This stack
// is self-contained (no dependency on any other stack), matching
// stock-images-stack.test.ts's simpler single-stack pattern rather than
// monitoring-stack.test.ts's multi-stack buildStack chain.
// ---------------------------------------------------------------------------

let dev: Template;
let prod: Template;

function buildStack(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const stack = new WebpresaCloudTrailStack(app, `${appId}CloudTrailStack`, { config });
  return Template.fromStack(stack);
}

beforeAll(() => {
  dev = buildStack('WebpresaDevTest', ENVIRONMENTS.dev);
  prod = buildStack('WebpresaProdTest', ENVIRONMENTS.prod);
});

describe('resource shape', () => {
  it('creates exactly one trail, one log bucket, one log group, two alarms', () => {
    dev.resourceCountIs('AWS::CloudTrail::Trail', 1);
    dev.resourceCountIs('AWS::S3::Bucket', 1);
    dev.resourceCountIs('AWS::Logs::LogGroup', 1);
    dev.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    dev.resourceCountIs('AWS::Logs::MetricFilter', 2);
  });

  it('creates no application compute resources (DynamoDB, Step Functions, SQS)', () => {
    // Dev's log bucket does carry CDK's own auto-delete-objects custom-resource
    // Lambda (autoDeleteObjects: true, from RemovalPolicy.DESTROY) — the same
    // CDK-provided helper every dev-environment WebpresaBucket gets, not
    // application compute.
    dev.resourceCountIs('AWS::DynamoDB::Table', 0);
    dev.resourceCountIs('AWS::StepFunctions::StateMachine', 0);
    dev.resourceCountIs('AWS::SQS::Queue', 0);
  });
});

describe('trail configuration', () => {
  it('is multi-region, logs all management events, and has file validation enabled', () => {
    dev.hasResourceProperties('AWS::CloudTrail::Trail', {
      IsMultiRegionTrail: true,
      IsLogging: true,
      EnableLogFileValidation: true,
      EventSelectors: Match.arrayWith([Match.objectLike({ IncludeManagementEvents: true, ReadWriteType: 'All' })]),
    });
  });

  it('follows the webpresa-{env}-trail naming convention', () => {
    dev.hasResourceProperties('AWS::CloudTrail::Trail', { TrailName: 'webpresa-dev-trail' });
    prod.hasResourceProperties('AWS::CloudTrail::Trail', { TrailName: 'webpresa-prod-trail' });
  });

  it('ships to a CloudWatch Logs group, not only S3', () => {
    dev.hasResourceProperties('AWS::CloudTrail::Trail', {
      CloudWatchLogsLogGroupArn: Match.anyValue(),
      CloudWatchLogsRoleArn: Match.anyValue(),
    });
  });
});

describe('log bucket security', () => {
  it('blocks all public access and enforces SSL, matching every other bucket in this project', () => {
    dev.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
    dev.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([Match.objectLike({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } })]),
      }),
    });
  });

  it('grants the CloudTrail service principal exactly GetBucketAcl and PutObject, nothing broader', () => {
    const policies = dev.findResources('AWS::S3::BucketPolicy');
    const statements = Object.values(policies).flatMap(
      (p) => (p as { Properties: { PolicyDocument: { Statement: Array<{ Principal?: { Service?: string }; Action?: string | string[] }> } } })
        .Properties.PolicyDocument.Statement,
    );
    const cloudTrailStatements = statements.filter((s) => s.Principal?.Service === 'cloudtrail.amazonaws.com');
    expect(cloudTrailStatements.length).toBeGreaterThan(0);
    const actions = cloudTrailStatements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action]));
    expect(new Set(actions)).toEqual(new Set(['s3:GetBucketAcl', 's3:PutObject']));
  });

  it('dev is destroyable, prod is retained — the same policy every other bucket in this project follows', () => {
    dev.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Delete' });
    prod.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Retain' });
  });
});

describe('security alarms', () => {
  it('creates an IAM-changes alarm and a CloudTrail-configuration-changes alarm', () => {
    dev.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'webpresa-dev-iam-changes' });
    dev.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'webpresa-dev-cloudtrail-changes' });
    prod.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'webpresa-prod-iam-changes' });
  });

  it('every alarm treats missing data as not breaching and fires on threshold 1', () => {
    dev.allResourcesProperties('AWS::CloudWatch::Alarm', {
      TreatMissingData: 'notBreaching',
      Threshold: 1,
      EvaluationPeriods: 1,
    });
  });

  it('creates no SNS topics — console/CloudWatch-visible only, matching WebpresaMonitoringStack', () => {
    dev.resourceCountIs('AWS::SNS::Topic', 0);
  });
});

describe('CloudFormation outputs', () => {
  it('exports the trail ARN', () => {
    const outputs = dev.findOutputs('*');
    expect(Object.keys(outputs)).toEqual(expect.arrayContaining(['TrailArn']));
  });
});
