import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaScreenshotRepositoryStack } from '../lib/stacks/screenshot-repository-stack';
import { WebpresaScreenshotStack } from '../lib/stacks/screenshot-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

// ---------------------------------------------------------------------------
// Synthesise all three stacks (screenshot depends on data + the repository
// stack — see bin/webpresa.ts's real deploy order) once — shared across all
// test groups. No AWS credentials needed: CDK assertion tests work entirely
// in memory. Mirrors data-stack.test.ts's structure. ECR-repository-specific
// assertions live in screenshot-repository-stack.test.ts instead — the
// repository no longer lives in this stack's own template at all (see
// webpresa-screenshot-repository.ts's doc comment for why the two are
// deliberately separate stacks).
// ---------------------------------------------------------------------------

let dev: Template;
let prod: Template;

function buildStacks(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const dataStack = new WebpresaDataStack(app, `${appId}DataStack`, { config, appBaseUrl: 'https://test.webpresa.example' });
  const repositoryStack = new WebpresaScreenshotRepositoryStack(app, `${appId}ScreenshotRepositoryStack`, { config });
  const screenshotStack = new WebpresaScreenshotStack(app, `${appId}ScreenshotStack`, {
    config,
    repository: repositoryStack.screenshotRepository.repository,
    businessesTable: dataStack.businessesTable,
    sitePreviewsTable: dataStack.sitePreviewsTable,
    scanEventsTable: dataStack.scanEventsTable,
    assetsBucket: dataStack.assetsBucket,
    captureTokenSecret: dataStack.captureTokenSecret,
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
    appBaseUrl: 'https://app.example-test.invalid',
  });
  return Template.fromStack(screenshotStack);
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

  it('creates exactly one SQS queue (the DLQ)', () => {
    dev.resourceCountIs('AWS::SQS::Queue', 1);
  });

  it('creates an EventInvokeConfig for the function', () => {
    dev.resourceCountIs('AWS::Lambda::EventInvokeConfig', 1);
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

  it('sets memory, timeout, and reserved concurrency per implementation.md', () => {
    dev.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 3008,
      Timeout: 180,
      ReservedConcurrentExecutions: 5,
    });
  });

  it('passes the table/bucket/secret names and app base URL as environment variables', () => {
    dev.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          BUSINESSES_TABLE_NAME: Match.anyValue(),
          SITE_PREVIEWS_TABLE_NAME: Match.anyValue(),
          SCAN_EVENTS_TABLE_NAME: Match.anyValue(),
          ASSETS_BUCKET_NAME: Match.anyValue(),
          CAPTURE_TOKEN_SECRET_NAME: Match.anyValue(),
          VERCEL_PROTECTION_BYPASS_SECRET_NAME: Match.anyValue(),
          WEBPRESA_APP_BASE_URL: 'https://app.example-test.invalid',
        }),
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Asynchronous invocation configuration — retries disabled, DLQ wired
// ---------------------------------------------------------------------------

describe('asynchronous invocation configuration', () => {
  it('disables automatic retries (MaximumRetryAttempts: 0)', () => {
    dev.hasResourceProperties('AWS::Lambda::EventInvokeConfig', {
      MaximumRetryAttempts: 0,
    });
  });

  it('sets MaximumEventAgeInSeconds to 10 minutes', () => {
    dev.hasResourceProperties('AWS::Lambda::EventInvokeConfig', {
      MaximumEventAgeInSeconds: 600,
    });
  });

  it('routes failures to an SQS destination', () => {
    dev.hasResourceProperties('AWS::Lambda::EventInvokeConfig', {
      DestinationConfig: Match.objectLike({
        OnFailure: Match.objectLike({
          Destination: Match.anyValue(),
        }),
      }),
    });
  });

  it('the DLQ retains messages for 14 days', () => {
    dev.hasResourceProperties('AWS::SQS::Queue', {
      MessageRetentionPeriod: 14 * 24 * 60 * 60,
    });
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

/**
 * CDK's `grant()`/`grantPut()`/`grantRead()` helpers render `Action` as an
 * array even for a single action, and a prefix-scoped S3 resource ARN as an
 * `Fn::Join` intrinsic object, not a plain string — so statements are
 * inspected directly here (actions flattened, resources stringified) rather
 * than pattern-matched with `Match.stringLikeRegexp`, which only works
 * against literal strings.
 */
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
  it('grants only GetItem on Businesses and SitePreviews (no Query/Scan)', () => {
    const dynamoActions = getPolicyStatements(dev)
      .flatMap(actionsOf)
      .filter((a) => a.startsWith('dynamodb:'));

    expect(dynamoActions).toContain('dynamodb:GetItem');
    expect(dynamoActions).toContain('dynamodb:UpdateItem');
    expect(dynamoActions).not.toContain('dynamodb:Query');
    expect(dynamoActions).not.toContain('dynamodb:Scan');
    expect(dynamoActions).not.toContain('dynamodb:BatchGetItem');
  });

  it('grants S3 PutObject scoped to exactly the existing/preview screenshot prefixes, and only PutObject', () => {
    const s3PutStatements = getPolicyStatements(dev).filter((s) => actionsOf(s).includes('s3:PutObject'));
    expect(s3PutStatements.length).toBeGreaterThanOrEqual(1);

    for (const statement of s3PutStatements) {
      // Exactly s3:PutObject on this statement — not bundled with
      // PutObjectTagging/LegalHold/Retention/VersionTagging or an
      // s3:Abort* wildcard, which `bucket.grantPut()` would have included
      // (confirmed via `cdk diff` against the real account before this
      // statement was rewritten as an explicit PolicyStatement).
      expect(actionsOf(statement)).toEqual(['s3:PutObject']);
    }

    const resourceText = s3PutStatements.map((s) => JSON.stringify(s.Resource)).join('\n');
    expect(resourceText).toContain('scans/*/*/existing/*');
    expect(resourceText).toContain('scans/*/*/preview/*');
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

  it('grants sqs:SendMessage on the dead-letter queue (auto-wired by the OnFailure destination)', () => {
    const sqsActions = getPolicyStatements(dev)
      .flatMap(actionsOf)
      .filter((a) => a.startsWith('sqs:'));
    expect(sqsActions).toContain('sqs:SendMessage');
  });
});

// ---------------------------------------------------------------------------
// Removal policy / environment parity
// ---------------------------------------------------------------------------

describe('environment configuration', () => {
  it('function name and tags follow the webpresa-{env}-{resource} convention', () => {
    dev.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'webpresa-dev-screenshot-capture',
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'Webpresa' }]),
    });
    prod.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'webpresa-prod-screenshot-capture',
    });
  });
});
