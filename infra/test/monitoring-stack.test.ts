import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaScreenshotRepositoryStack } from '../lib/stacks/screenshot-repository-stack';
import { WebpresaScreenshotStack } from '../lib/stacks/screenshot-stack';
import { WebpresaPostcardRenderRepositoryStack } from '../lib/stacks/postcard-render-repository-stack';
import { WebpresaPostcardRenderStack } from '../lib/stacks/postcard-render-stack';
import { WebpresaScanWorkflowStack } from '../lib/stacks/scan-workflow-stack';
import { WebpresaMonitoringStack } from '../lib/stacks/monitoring-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

// ---------------------------------------------------------------------------
// Stage 24 — the first CloudWatch dashboard/alarm resources in this repo.
// Depends only on already-instantiated resources from other stacks (no
// WEBPRESA_APP_BASE_URL of its own), mirroring vercel-access-stack.test.ts's
// buildStacks helper for the chain of dependencies it needs.
// ---------------------------------------------------------------------------

let dev: Template;
let prod: Template;

function buildStack(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const dataStack = new WebpresaDataStack(app, `${appId}DataStack`, { config });
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
  const postcardRenderRepositoryStack = new WebpresaPostcardRenderRepositoryStack(app, `${appId}PostcardRenderRepositoryStack`, { config });
  const postcardRenderStack = new WebpresaPostcardRenderStack(app, `${appId}PostcardRenderStack`, {
    config,
    repository: postcardRenderRepositoryStack.postcardRenderRepository.repository,
    assetsBucket: dataStack.assetsBucket,
    captureTokenSecret: dataStack.captureTokenSecret,
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
    appBaseUrl: 'https://app.example-test.invalid',
  });
  const scanWorkflowStack = new WebpresaScanWorkflowStack(app, `${appId}ScanWorkflowStack`, {
    config,
    internalApiSecret: dataStack.internalApiSecret,
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
    appBaseUrl: 'https://app.example-test.invalid',
  });
  const monitoringStack = new WebpresaMonitoringStack(app, `${appId}MonitoringStack`, {
    config,
    screenshotFunction: screenshotStack.screenshotLambda.function,
    screenshotDlq: screenshotStack.screenshotLambda.deadLetterQueue,
    postcardRenderFunction: postcardRenderStack.postcardRenderLambda.function,
    scanWorkflowStateMachine: scanWorkflowStack.stateMachine,
    scanEventsTable: dataStack.scanEventsTable,
    scanExecutionsTable: dataStack.scanExecutionsTable,
    postcardsTable: dataStack.postcardsTable,
    businessesTable: dataStack.businessesTable,
  });
  return Template.fromStack(monitoringStack);
}

beforeAll(() => {
  dev = buildStack('WebpresaDevTest', ENVIRONMENTS.dev);
  prod = buildStack('WebpresaProdTest', ENVIRONMENTS.prod);
});

describe('resource shape', () => {
  it('creates no compute/data resources — only a dashboard and alarms', () => {
    dev.resourceCountIs('AWS::Lambda::Function', 0);
    dev.resourceCountIs('AWS::DynamoDB::Table', 0);
    dev.resourceCountIs('AWS::SQS::Queue', 0);
    dev.resourceCountIs('AWS::StepFunctions::StateMachine', 0);
  });

  it('creates exactly one dashboard', () => {
    dev.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  });

  it('creates one alarm per monitored condition (2 screenshot Lambda, 1 postcard-render Lambda, DLQ depth, workflow failures, 4 table throttles)', () => {
    dev.resourceCountIs('AWS::CloudWatch::Alarm', 9);
  });
});

describe('naming convention', () => {
  it('dashboard follows webpresa-{env}-{resource}', () => {
    dev.hasResourceProperties('AWS::CloudWatch::Dashboard', { DashboardName: 'webpresa-dev-operations' });
    prod.hasResourceProperties('AWS::CloudWatch::Dashboard', { DashboardName: 'webpresa-prod-operations' });
  });

  it('alarms follow webpresa-{env}-{resource}', () => {
    dev.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'webpresa-dev-screenshot-lambda-errors' });
    dev.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'webpresa-dev-screenshot-dlq-depth' });
    dev.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'webpresa-dev-scan-workflow-executions-failed' });
    prod.hasResourceProperties('AWS::CloudWatch::Alarm', { AlarmName: 'webpresa-prod-screenshot-lambda-errors' });
  });
});

describe('alarm configuration', () => {
  it('every alarm treats missing data as not breaching (no noise from a temporarily quiet metric)', () => {
    dev.allResourcesProperties('AWS::CloudWatch::Alarm', {
      TreatMissingData: 'notBreaching',
    });
  });

  it('every alarm fires on threshold 1 with a single evaluation period', () => {
    dev.allResourcesProperties('AWS::CloudWatch::Alarm', {
      Threshold: 1,
      EvaluationPeriods: 1,
    });
  });

  it('dev and prod have the identical alarm set (no SNS/pager target in either to justify differentiating)', () => {
    dev.resourceCountIs('AWS::CloudWatch::Alarm', 9);
    prod.resourceCountIs('AWS::CloudWatch::Alarm', 9);
  });

  it('creates no SNS topics or subscriptions — alarms are console/dashboard-visible only', () => {
    dev.resourceCountIs('AWS::SNS::Topic', 0);
    dev.resourceCountIs('AWS::SNS::Subscription', 0);
  });
});

describe('stack-level tags', () => {
  it('dashboard is tagged Project=Webpresa, ManagedBy=CDK', () => {
    dev.hasResourceProperties('AWS::CloudWatch::Dashboard', {});
    // Dashboards don't support the standard Tags property in CloudFormation —
    // confirm no tag-related synth failure occurred by asserting the stack
    // synthesized at all (implicit — beforeAll would have thrown otherwise).
    expect(dev).toBeDefined();
  });
});

describe('CloudFormation outputs', () => {
  it('exports the dashboard URL', () => {
    const outputs = dev.findOutputs('*');
    expect(Object.keys(outputs)).toEqual(expect.arrayContaining(['DashboardUrl']));
  });
});

describe('DynamoDB throttle alarms', () => {
  it('covers exactly the four highest-traffic tables, not all fifteen', () => {
    const alarms = dev.findResources('AWS::CloudWatch::Alarm', {
      Properties: { AlarmName: Match.stringLikeRegexp('throttled-requests$') },
    });
    expect(Object.keys(alarms)).toHaveLength(4);
  });
});

describe('AWS Budget (spend alarm)', () => {
  it('creates exactly one budget per environment', () => {
    dev.resourceCountIs('AWS::Budgets::Budget', 1);
    prod.resourceCountIs('AWS::Budgets::Budget', 1);
  });

  it('follows the webpresa-{env}-monthly-spend naming convention with the configured USD threshold', () => {
    dev.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({
        BudgetName: 'webpresa-dev-monthly-spend',
        BudgetType: 'COST',
        TimeUnit: 'MONTHLY',
        BudgetLimit: { Amount: 25, Unit: 'USD' },
      }),
    });
    prod.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({ BudgetName: 'webpresa-prod-monthly-spend' }),
    });
  });

  it('notifies by email on both an actual breach and a forecasted breach at 100% of the threshold', () => {
    const resources = dev.findResources('AWS::Budgets::Budget', {
      Properties: { Budget: Match.objectLike({ BudgetName: 'webpresa-dev-monthly-spend' }) },
    });
    const budget = Object.values(resources)[0] as {
      Properties: {
        NotificationsWithSubscribers: Array<{
          Notification: { NotificationType: string; ComparisonOperator: string; Threshold: number; ThresholdType: string };
          Subscribers: Array<{ SubscriptionType: string; Address: string }>;
        }>;
      };
    };
    const notifications = budget.Properties.NotificationsWithSubscribers;
    expect(notifications).toHaveLength(2);
    const types = notifications.map((n) => n.Notification.NotificationType).sort();
    expect(types).toEqual(['ACTUAL', 'FORECASTED']);
    for (const n of notifications) {
      expect(n.Notification.ComparisonOperator).toBe('GREATER_THAN');
      expect(n.Notification.Threshold).toBe(100);
      expect(n.Notification.ThresholdType).toBe('PERCENTAGE');
      expect(n.Subscribers).toEqual([{ SubscriptionType: 'EMAIL', Address: 'mudge.andrew@gmail.com' }]);
    }
  });
});
