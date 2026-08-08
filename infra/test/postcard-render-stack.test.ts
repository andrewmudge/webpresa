import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaPostcardRenderRepositoryStack } from '../lib/stacks/postcard-render-repository-stack';
import { WebpresaPostcardRenderStack } from '../lib/stacks/postcard-render-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

// ---------------------------------------------------------------------------
// Synthesise all three stacks (postcard-render depends on data + the
// repository stack — see bin/webpresa.ts's real deploy order) once, mirrors
// screenshot-stack.test.ts's structure.
// ---------------------------------------------------------------------------

let dev: Template;
let prod: Template;

function buildStacks(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const dataStack = new WebpresaDataStack(app, `${appId}DataStack`, { config });
  const repositoryStack = new WebpresaPostcardRenderRepositoryStack(app, `${appId}PostcardRenderRepositoryStack`, { config });
  const postcardRenderStack = new WebpresaPostcardRenderStack(app, `${appId}PostcardRenderStack`, {
    config,
    repository: repositoryStack.postcardRenderRepository.repository,
    assetsBucket: dataStack.assetsBucket,
    captureTokenSecret: dataStack.captureTokenSecret,
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
    appBaseUrl: 'https://app.example-test.invalid',
  });
  return Template.fromStack(postcardRenderStack);
}

beforeAll(() => {
  dev = buildStacks('WebpresaDevTest', ENVIRONMENTS.dev);
  prod = buildStacks('WebpresaProdTest', ENVIRONMENTS.prod);
});

// ---------------------------------------------------------------------------
// Resource shape
// ---------------------------------------------------------------------------

describe('resource shape', () => {
  it('creates exactly one Lambda function', () => {
    dev.resourceCountIs('AWS::Lambda::Function', 1);
  });

  it('creates no ECR repository in this stack (lives in the repository stack instead)', () => {
    dev.resourceCountIs('AWS::ECR::Repository', 0);
  });

  it('creates no SQS queue — this Lambda is invoked synchronously, so there is no async-retry DLQ (unlike the screenshot Lambda)', () => {
    dev.resourceCountIs('AWS::SQS::Queue', 0);
  });

  it('creates no EventInvokeConfig — no asynchronous invocation configuration applies to a synchronous caller', () => {
    dev.resourceCountIs('AWS::Lambda::EventInvokeConfig', 0);
  });
});

// ---------------------------------------------------------------------------
// Runtime / packaging
// ---------------------------------------------------------------------------

describe('Lambda packaging', () => {
  it('is a container-image (PackageType Image) function, not a zip bundle', () => {
    dev.hasResourceProperties('AWS::Lambda::Function', {
      PackageType: 'Image',
    });
  });

  it('is not attached to a VPC', () => {
    const fns = dev.findResources('AWS::Lambda::Function');
    for (const fn of Object.values(fns) as Array<{ Properties: Record<string, unknown> }>) {
      expect(fn.Properties.VpcConfig).toBeUndefined();
    }
  });

  it('sets memory and timeout, with no reserved concurrency (no async-duplicate race to guard against)', () => {
    dev.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 3008,
      Timeout: 180,
    });
    const fns = dev.findResources('AWS::Lambda::Function');
    for (const fn of Object.values(fns) as Array<{ Properties: Record<string, unknown> }>) {
      expect(fn.Properties.ReservedConcurrentExecutions).toBeUndefined();
    }
  });

  it('passes the bucket/secret names and app base URL as environment variables, and no table-name variables at all', () => {
    dev.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          ASSETS_BUCKET_NAME: Match.anyValue(),
          CAPTURE_TOKEN_SECRET_NAME: Match.anyValue(),
          VERCEL_PROTECTION_BYPASS_SECRET_NAME: Match.anyValue(),
          WEBPRESA_APP_BASE_URL: 'https://app.example-test.invalid',
        }),
      },
    });
    const fns = dev.findResources('AWS::Lambda::Function');
    const envVars = Object.values(fns).flatMap(
      (fn) => Object.keys((fn as { Properties: { Environment?: { Variables?: Record<string, unknown> } } }).Properties.Environment?.Variables ?? {}),
    );
    expect(envVars.some((name) => name.includes('TABLE_NAME'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Log group retention
// ---------------------------------------------------------------------------

describe('CloudWatch log group', () => {
  it('sets a bounded retention period (14 days), not CDK\'s unbounded default', () => {
    dev.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 14,
    });
  });
});

// ---------------------------------------------------------------------------
// IAM — least privilege
// ---------------------------------------------------------------------------

interface PolicyStatement {
  Action: string | string[];
  Resource?: unknown;
  Effect: string;
}

function getPolicyStatements(template: Template): PolicyStatement[] {
  const policies = template.findResources('AWS::IAM::Policy');
  return Object.values(policies as Record<string, { Properties: { PolicyDocument: { Statement: PolicyStatement[] } } }>).flatMap(
    (p) => p.Properties.PolicyDocument.Statement,
  );
}

function actionsOf(statement: PolicyStatement): string[] {
  return Array.isArray(statement.Action) ? statement.Action : [statement.Action];
}

describe('IAM least privilege', () => {
  it('grants no DynamoDB access at all — this Lambda never touches a table', () => {
    const dynamoActions = getPolicyStatements(dev)
      .flatMap(actionsOf)
      .filter((a) => a.startsWith('dynamodb:'));
    expect(dynamoActions).toHaveLength(0);
  });

  it('grants S3 PutObject scoped to exactly the postcards/*/*/* prefix, and only PutObject', () => {
    const s3PutStatements = getPolicyStatements(dev).filter((s) => actionsOf(s).includes('s3:PutObject'));
    expect(s3PutStatements.length).toBeGreaterThanOrEqual(1);

    for (const statement of s3PutStatements) {
      expect(actionsOf(statement)).toEqual(['s3:PutObject']);
    }

    const resourceText = s3PutStatements.map((s) => JSON.stringify(s.Resource)).join('\n');
    expect(resourceText).toContain('postcards/*/*/*');
  });

  it('never grants s3:AbortMultipartUpload (no multipart upload is used)', () => {
    const s3Actions = getPolicyStatements(dev)
      .flatMap(actionsOf)
      .filter((a) => a.startsWith('s3:'));
    expect(s3Actions).not.toContain('s3:AbortMultipartUpload');
  });

  it('grants secretsmanager:GetSecretValue on both the capture-token secret and the Vercel protection-bypass secret', () => {
    const secretsStatements = getPolicyStatements(dev).filter((s) => actionsOf(s).some((a) => a.startsWith('secretsmanager:')));
    expect(secretsStatements).toHaveLength(2);
    for (const statement of secretsStatements) {
      expect(actionsOf(statement)).toContain('secretsmanager:GetSecretValue');
    }
  });

  it('grants no sqs:SendMessage — there is no dead-letter queue to send to', () => {
    const sqsActions = getPolicyStatements(dev)
      .flatMap(actionsOf)
      .filter((a) => a.startsWith('sqs:'));
    expect(sqsActions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Removal policy / environment parity
// ---------------------------------------------------------------------------

describe('environment configuration', () => {
  it('function name and tags follow the webpresa-{env}-{resource} convention', () => {
    dev.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'webpresa-dev-postcard-render',
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'Webpresa' }]),
    });
    prod.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'webpresa-prod-postcard-render',
    });
  });
});
