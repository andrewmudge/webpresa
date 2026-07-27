import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaScanWorkflowStack } from '../lib/stacks/scan-workflow-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

let dev: Template;
let prod: Template;

function buildStacks(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const dataStack = new WebpresaDataStack(app, `${appId}DataStack`, { config });
  const workflowStack = new WebpresaScanWorkflowStack(app, `${appId}ScanWorkflowStack`, {
    config,
    internalApiSecret: dataStack.internalApiSecret,
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
    appBaseUrl: 'https://app.example-test.invalid',
  });
  return Template.fromStack(workflowStack);
}

beforeAll(() => {
  dev = buildStacks('WebpresaDevTest', ENVIRONMENTS.dev);
  prod = buildStacks('WebpresaProdTest', ENVIRONMENTS.prod);
});

describe('resource shape', () => {
  it('creates exactly one state machine', () => {
    dev.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
  });

  it('creates exactly one EventBridge connection', () => {
    dev.resourceCountIs('AWS::Events::Connection', 1);
  });

  it('creates exactly one log group', () => {
    dev.resourceCountIs('AWS::Logs::LogGroup', 1);
  });
});

describe('state machine configuration', () => {
  it('is a STANDARD workflow, not EXPRESS', () => {
    dev.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      StateMachineType: 'STANDARD',
    });
  });

  it('is named following the webpresa-{env}-{resource} convention', () => {
    dev.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      StateMachineName: 'webpresa-dev-scan-workflow',
    });
    prod.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      StateMachineName: 'webpresa-prod-scan-workflow',
    });
  });

  it('has logging configured with ALL level and execution data included', () => {
    dev.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      LoggingConfiguration: Match.objectLike({
        Level: 'ALL',
        IncludeExecutionData: true,
      }),
    });
  });

  it('the log group has a bounded retention period (14 days), not unbounded', () => {
    dev.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 14,
    });
  });
});

describe('definition contains every documented workflow state', () => {
  const expectedStateNames = [
    'InitializeScanExecution',
    'LoadBusiness',
    'BusinessFoundChoice',
    'WebsiteExistsChoice',
    'CrawlWebsite',
    'CrawlOutcomeChoice',
    'RecordNoWebsiteSignals',
    'ScoreWebsite',
    'ScoreNoWebsite',
    'GeneratePreviewNoWebsite',
    'QualificationChoiceFromCrawl',
    'NoWebsiteQualificationChoice',
    'SourceScreenshot_Capture',
    'PreviewFromCrawl_Capture',
    'PreviewFromGeneration_Capture',
    'RecordFailure',
    'WorkflowFailed',
    'WorkflowComplete',
  ];

  interface DefinitionStringJoin {
    Properties: { DefinitionString: { 'Fn::Join': [string, unknown[]] } };
  }

  /** The `Fn::Join` fragments include literal string pieces alongside `Ref`/`Fn::GetAtt` objects (for the interpolated connection ARN) — join just the string fragments back into one searchable blob. */
  function renderedDefinition(): string {
    const resources = dev.findResources('AWS::StepFunctions::StateMachine');
    const machine = Object.values(resources)[0] as DefinitionStringJoin;
    const [, fragments] = machine.Properties.DefinitionString['Fn::Join'];
    return fragments.filter((f): f is string => typeof f === 'string').join('');
  }

  it.each(expectedStateNames)('includes the %s state', (name) => {
    expect(renderedDefinition()).toContain(`"${name}"`);
  });
});

describe('EventBridge connection auth', () => {
  it('uses API_KEY authorization', () => {
    dev.hasResourceProperties('AWS::Events::Connection', {
      AuthorizationType: 'API_KEY',
    });
  });

  it('is named following the webpresa-{env}-{resource} convention', () => {
    dev.hasResourceProperties('AWS::Events::Connection', {
      Name: 'webpresa-dev-internal-api',
    });
  });

  it('sends the Vercel protection-bypass header as a secret-valued invocation parameter, so Deployment Protection never blocks the calls before they reach the app', () => {
    dev.hasResourceProperties('AWS::Events::Connection', {
      AuthParameters: Match.objectLike({
        InvocationHttpParameters: Match.objectLike({
          HeaderParameters: Match.arrayWith([
            Match.objectLike({ Key: 'x-vercel-protection-bypass', IsValueSecret: true }),
          ]),
        }),
      }),
    });
  });
});

describe('no direct AWS resource permissions beyond the connection', () => {
  it('the state machine role has no DynamoDB, S3, or SQS permissions', () => {
    const policies = dev.findResources('AWS::IAM::Policy');
    const statements = Object.values(policies as Record<string, { Properties: { PolicyDocument: { Statement: Array<{ Action: string | string[] }> } } }>).flatMap(
      (p) => p.Properties.PolicyDocument.Statement,
    );
    const actions = statements.flatMap((s) => (Array.isArray(s.Action) ? s.Action : [s.Action]));
    expect(actions.some((a) => a.startsWith('dynamodb:'))).toBe(false);
    expect(actions.some((a) => a.startsWith('s3:'))).toBe(false);
    expect(actions.some((a) => a.startsWith('sqs:'))).toBe(false);
  });
});

describe('tags', () => {
  it('the state machine is tagged Project=Webpresa', () => {
    dev.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'Webpresa' }]),
    });
  });

  it('the state machine is tagged Environment=Dev', () => {
    dev.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      Tags: Match.arrayWith([{ Key: 'Environment', Value: 'Dev' }]),
    });
  });

  it('the state machine is tagged ManagedBy=CDK', () => {
    dev.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      Tags: Match.arrayWith([{ Key: 'ManagedBy', Value: 'CDK' }]),
    });
  });
});
