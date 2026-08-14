import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Operation } from 'aws-cdk-lib/aws-dynamodb';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface WebpresaMonitoringStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly screenshotFunction: lambda.IFunction;
  readonly screenshotDlq: sqs.IQueue;
  readonly postcardRenderFunction: lambda.IFunction;
  readonly scanWorkflowStateMachine: sfn.IStateMachine;
  /** Highest-traffic tables only — not all 15 tables, to keep the dashboard/alarms operationally useful rather than exhaustive (see implementation.md, Stage 24). */
  readonly scanEventsTable: dynamodb.ITable;
  readonly scanExecutionsTable: dynamodb.ITable;
  readonly postcardsTable: dynamodb.ITable;
  readonly businessesTable: dynamodb.ITable;
}

/**
 * WebpresaMonitoringStack — Stage 24 (Operational Monitoring, Failure
 * Recovery, and Operations Center). The first CloudWatch dashboard/alarm
 * resources anywhere in this project — every prior stage relied on the raw
 * AWS Console/CLI for this.
 *
 * Deliberately scoped to metrics that are genuinely AWS-native and require
 * no new infrastructure to populate: Lambda (Errors/Throttles/Duration),
 * Step Functions execution outcomes, the screenshot Lambda's existing DLQ
 * depth, and DynamoDB throttling on the highest-traffic tables. Provider
 * usage counts and Stripe/Lob webhook-failure-category alarms were
 * originally planned as CloudWatch Logs metric filters over the new
 * structured logs (`web/lib/logging/log.ts`), but those logs are emitted by
 * Vercel-hosted Next.js code — this repo has no Vercel→CloudWatch log
 * drain, and setting one up is a real, separate infrastructure integration,
 * not something to build opportunistically inside this stage. That
 * visibility instead comes from `/admin/operations` (reads durable
 * DynamoDB records directly) and Vercel's own log viewer — see
 * implementation.md, Stage 24, "CloudWatch dashboards" for the full
 * correction.
 *
 * No SNS/Slack/PagerDuty target exists — alarms fire and are visible in the
 * CloudWatch console/dashboard only, matching this stage's explicit
 * deferral of pager/chat integration. The same alarm set is created in both
 * dev and prod: with no notification target in either environment, a
 * stricter/looser split has no real operational effect yet.
 *
 * Depends only on already-instantiated resources from other stacks, passed
 * in via typed props from `bin/webpresa.ts` — no `WEBPRESA_APP_BASE_URL`
 * dependency, so (like `WebpresaVercelAccessStack`/`WebpresaStockImagesStack`)
 * this stack has no dedicated npm script and is deployed via a plain
 * `cdk diff/deploy WebpresaDevMonitoringStack --profile webpresa-dev`.
 */
export class WebpresaMonitoringStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: WebpresaMonitoringStackProps) {
    super(scope, id, props);

    const { config } = props;
    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    const period = cdk.Duration.minutes(5);

    // ── Metrics ──────────────────────────────────────────────────────────
    const screenshotErrors = props.screenshotFunction.metricErrors({ period });
    const screenshotThrottles = props.screenshotFunction.metricThrottles({ period });
    const screenshotDuration = props.screenshotFunction.metricDuration({ period });

    const postcardRenderErrors = props.postcardRenderFunction.metricErrors({ period });
    const postcardRenderDuration = props.postcardRenderFunction.metricDuration({ period });

    const dlqDepth = props.screenshotDlq.metricApproximateNumberOfMessagesVisible({ period });

    const workflowFailed = props.scanWorkflowStateMachine.metricFailed({ period });
    const workflowSucceeded = props.scanWorkflowStateMachine.metricSucceeded({ period });

    const highTrafficTables: Array<{ label: string; table: dynamodb.ITable }> = [
      { label: 'scan-events', table: props.scanEventsTable },
      { label: 'scan-executions', table: props.scanExecutionsTable },
      { label: 'postcards', table: props.postcardsTable },
      { label: 'businesses', table: props.businessesTable },
    ];
    // Scoped to exactly the six operations webpresa-vercel-{env} is actually
    // granted (see vercel-access-stack.ts's DynamoDbTables statement) —
    // the default (all 14 DynamoDB::Operation values) exceeds CloudWatch's
    // 10-metric-per-alarm math-expression limit.
    const monitoredOperations = [Operation.GET_ITEM, Operation.PUT_ITEM, Operation.UPDATE_ITEM, Operation.DELETE_ITEM, Operation.QUERY, Operation.SCAN];
    const throttleMetrics = highTrafficTables.map(({ label, table }) =>
      table.metricThrottledRequestsForOperations({ period, label, operations: monitoredOperations }),
    );

    // ── Alarms ───────────────────────────────────────────────────────────
    new cloudwatch.Alarm(this, 'ScreenshotLambdaErrorsAlarm', {
      alarmName: `webpresa-${config.suffix}-screenshot-lambda-errors`,
      metric: screenshotErrors,
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'The screenshot-capture Lambda reported one or more errors — see CloudWatch Logs for this function.',
    });

    new cloudwatch.Alarm(this, 'ScreenshotLambdaThrottlesAlarm', {
      alarmName: `webpresa-${config.suffix}-screenshot-lambda-throttles`,
      metric: screenshotThrottles,
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'The screenshot-capture Lambda is being throttled — captures may be silently failing to start.',
    });

    new cloudwatch.Alarm(this, 'PostcardRenderLambdaErrorsAlarm', {
      alarmName: `webpresa-${config.suffix}-postcard-render-lambda-errors`,
      metric: postcardRenderErrors,
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'The postcard-render Lambda reported one or more errors — see CloudWatch Logs for this function.',
    });

    new cloudwatch.Alarm(this, 'ScreenshotDlqDepthAlarm', {
      alarmName: `webpresa-${config.suffix}-screenshot-dlq-depth`,
      metric: dlqDepth,
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'The screenshot Lambda dead-letter queue has messages — one or more captures failed at the platform level. See /admin/operations and web/docs/operations.md.',
    });

    new cloudwatch.Alarm(this, 'ScanWorkflowExecutionsFailedAlarm', {
      alarmName: `webpresa-${config.suffix}-scan-workflow-executions-failed`,
      metric: workflowFailed,
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'A scan workflow (Step Functions) execution failed — see /admin/operations for the affected business.',
    });

    for (const { label, table } of highTrafficTables) {
      new cloudwatch.Alarm(this, `${label.replace(/-/g, '')}ThrottleAlarm`, {
        alarmName: `webpresa-${config.suffix}-${label}-throttled-requests`,
        metric: table.metricThrottledRequestsForOperations({ period, operations: monitoredOperations }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `The ${label} DynamoDB table reported throttled requests.`,
      });
    }

    // ── AWS Budget — account-wide spend alarm ───────────────────────────
    // A plain AWS Budgets cost budget (CfnBudget, the only construct level
    // this module offers — no L2 exists), not a CloudWatch billing-metric
    // alarm: Budgets natively understands "monthly spend" and forecasting,
    // which CloudWatch's own AWS/Billing metrics do not do as cleanly.
    // Account-wide (not scoped to Webpresa's own resources specifically —
    // AWS Budgets has no resource-tag-based cost budget granular enough for
    // that without Cost Allocation Tags being separately activated, out of
    // scope here). Two notifications: an ACTUAL-spend breach (the real
    // alarm) and a FORECASTED heads-up before it happens.
    new budgets.CfnBudget(this, 'MonthlySpendBudget', {
      budget: {
        budgetName: `webpresa-${config.suffix}-monthly-spend`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: config.monthlyBudgetUsd,
          unit: 'USD',
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: config.budgetAlertEmail }],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: config.budgetAlertEmail }],
        },
      ],
    });

    // ── Dashboard ────────────────────────────────────────────────────────
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `webpresa-${config.suffix}-operations`,
    });

    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({ markdown: `# Webpresa ${envLabel} — Operations`, width: 24, height: 1 }),
      new cloudwatch.GraphWidget({
        title: 'Scan Workflow Executions (Step Functions)',
        left: [workflowSucceeded, workflowFailed],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Screenshot Lambda',
        left: [screenshotErrors, screenshotThrottles],
        right: [screenshotDuration],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Postcard-Render Lambda',
        left: [postcardRenderErrors],
        right: [postcardRenderDuration],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Screenshot Dead-Letter Queue Depth',
        left: [dlqDepth],
        width: 12,
      }),
      // One widget per table, not one combined widget — each
      // metricThrottledRequestsForOperations() result is itself a math
      // expression over the same default per-operation sub-metric ids
      // (e.g. "getitem"), which collide if graphed together in one widget.
      ...highTrafficTables.map(
        ({ label }, i) =>
          new cloudwatch.GraphWidget({
            title: `DynamoDB Throttled Requests — ${label}`,
            left: [throttleMetrics[i]],
            width: 6,
          }),
      ),
    );

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      exportName: `webpresa-${config.suffix}-operations-dashboard-url`,
      description: 'CloudWatch dashboard URL',
    });
  }
}
