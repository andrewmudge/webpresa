import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

/**
 * Must match `INTERNAL_API_SECRET_HEADER` in `web/lib/internal-auth.ts`
 * exactly. Cannot be a shared import — `infra/` and `web/` are separate npm
 * projects with no workspace tooling (see `infra/lambda/screenshot-capture`'s
 * package.json for the same constraint on that deployable).
 */
const INTERNAL_API_SECRET_HEADER = 'x-webpresa-internal-secret';

/**
 * Vercel's own Deployment Protection sits in front of the *entire* deployment
 * at the edge, before any Next.js request handler runs — including our own
 * `verifyInternalRequest()` check, which never gets a chance to run at all
 * without this. Same header Stage 14's screenshot Lambda already sends (see
 * `infra/lambda/screenshot-capture/src/browser.ts`) — discovered missing
 * here the same way it was discovered missing there: a real end-to-end call
 * returning 401 before reaching the app. Unlike the browser-based Lambda,
 * there's no session to persist a bypass cookie for, so only this one header
 * is needed per request — no `x-vercel-set-bypass-cookie`.
 */
const VERCEL_PROTECTION_BYPASS_HEADER = 'x-vercel-protection-bypass';

/** Firecrawl failure categories that make `scoreBusinessWebsite` fall back to its website-unavailable shortcut instead of requiring a successful crawl — see `web/lib/scoring/score-business.ts`'s `WEBSITE_UNAVAILABLE_FAILURE_CATEGORIES`. */
const WEBSITE_UNAVAILABLE_CATEGORIES = ['website_unreachable', 'blocked_url', 'invalid_url'];

/** Matches Stage 14's own 10-minute staleness threshold (`STALE_SCAN_THRESHOLD_MS` in `web/lib/screenshots/capture.ts`) — 15s × 40 ≈ 10 minutes. */
const SCREENSHOT_POLL_INTERVAL = cdk.Duration.seconds(15);
const SCREENSHOT_POLL_MAX_ATTEMPTS = 40;

export interface WebpresaScanWorkflowStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  /** Cross-stack reference from WebpresaDataStack — see bin/webpresa.ts. */
  readonly internalApiSecret: secretsmanager.ISecret;
  /** Cross-stack reference from WebpresaDataStack — lets the Connection get past Vercel's Deployment Protection, same secret Stage 14's screenshot Lambda already uses. */
  readonly vercelProtectionBypassSecret: secretsmanager.ISecret;
  /** The Next.js app's public base URL — Step Functions calls `{appBaseUrl}/api/internal/scan/*` directly, no Lambda in between. */
  readonly appBaseUrl: string;
}

/**
 * WebpresaScanWorkflowStack — Stage 16 (Step Functions Scan and Preview
 * Workflow) orchestration layer.
 *
 * Every task in this state machine is a `tasks.HttpInvoke` call straight into
 * the Next.js app's `/api/internal/scan/*` routes, authenticated via an
 * EventBridge Connection (API_KEY auth) — there is no Lambda anywhere in
 * this stack. All the actual business logic (Firecrawl enrichment, AI
 * scoring, screenshot capture, preview generation) already lives in, and is
 * already tested in, `web/lib/*` — this stack only sequences calls into it.
 * See implementation.md, Stage 16, "Architecture decision".
 *
 * Because every task is an outbound HTTPS call rather than a direct AWS
 * service integration, this stack holds no DynamoDB/S3/other-secret
 * permissions at all — it cannot reach the Postcards table or any other
 * resource beyond the one Connection, satisfying Stage 16's "must not have
 * permission to send postcards" acceptance criterion trivially.
 */
export class WebpresaScanWorkflowStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: WebpresaScanWorkflowStackProps) {
    super(scope, id, props);

    const { config, internalApiSecret, vercelProtectionBypassSecret, appBaseUrl } = props;
    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // ─────────────────────────────────────────────────────────────────────
    // Auth — EventBridge Connection sourcing the same secret
    // `lib/internal-auth.ts` verifies against, so there is nothing to keep
    // in sync by hand between the two sides. `headerParameters` adds the
    // Vercel bypass header on top — EventBridge treats it as a secret
    // (redacted from the console/logs) exactly like the primary auth
    // credential, so it never appears in plaintext in the state machine
    // definition or execution history.
    // ─────────────────────────────────────────────────────────────────────
    const connection = new events.Connection(this, 'InternalApiConnection', {
      connectionName: `webpresa-${config.suffix}-internal-api`,
      description: "Authenticates Step Functions' HttpInvoke calls into the Next.js app's /api/internal/scan/* routes (Stage 16)",
      authorization: events.Authorization.apiKey(
        INTERNAL_API_SECRET_HEADER,
        cdk.SecretValue.secretsManager(internalApiSecret.secretArn, { jsonField: 'sharedSecret' }),
      ),
      headerParameters: {
        [VERCEL_PROTECTION_BYPASS_HEADER]: events.HttpParameter.fromSecret(
          cdk.SecretValue.secretsManager(vercelProtectionBypassSecret.secretArn, { jsonField: 'bypassSecret' }),
        ),
      },
    });

    const logGroup = new logs.LogGroup(this, 'ScanWorkflowLogGroup', {
      logGroupName: `/aws/vendedlogs/states/webpresa-${config.suffix}-scan-workflow`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: config.removalPolicy,
    });

    // ─────────────────────────────────────────────────────────────────────
    // HttpInvoke helper — every task in this workflow is one of these.
    // ─────────────────────────────────────────────────────────────────────
    const httpTask = (
      id: string,
      opts: {
        path: string;
        method?: 'GET' | 'POST';
        body?: Record<string, unknown>;
        queryStringParameters?: Record<string, unknown>;
        resultPath: string;
        timeout?: cdk.Duration;
      },
    ): tasks.HttpInvoke => {
      const task = new tasks.HttpInvoke(this, id, {
        apiRoot: appBaseUrl,
        apiEndpoint: sfn.TaskInput.fromText(opts.path),
        method: sfn.TaskInput.fromText(opts.method ?? 'POST'),
        connection,
        ...(opts.body ? { body: sfn.TaskInput.fromObject(opts.body) } : {}),
        ...(opts.queryStringParameters
          ? { queryStringParameters: sfn.TaskInput.fromObject(opts.queryStringParameters) }
          : {}),
        resultPath: opts.resultPath,
        taskTimeout: sfn.Timeout.duration(opts.timeout ?? cdk.Duration.seconds(120)),
      });
      // Transient transport-level failures (network blips, Vercel 5xx/cold
      // start, connection issues) — never invalid input or auth, which fail
      // identically on every retry. Business-outcome branching (not_eligible,
      // conflict, a JSON `status` of 'failed', etc.) is a 200 response
      // inspected via Choice states below, not a Retry/Catch case.
      task.addRetry({ errors: [sfn.Errors.ALL], maxAttempts: 3, interval: cdk.Duration.seconds(3), backoffRate: 2 });
      return task;
    };

    // ─────────────────────────────────────────────────────────────────────
    // Shared terminal states
    // ─────────────────────────────────────────────────────────────────────
    const workflowFailed = new sfn.Fail(this, 'WorkflowFailed', {
      error: 'ScanWorkflowFailed',
      causePath: sfn.JsonPath.stringAt('$.recordFailureResult.ResponseBody'),
    });

    const recordFailure = httpTask('RecordFailure', {
      path: '/api/internal/scan/update-execution',
      body: {
        scanExecutionId: sfn.JsonPath.stringAt('$.scanExecutionId'),
        expectedCurrentStatus: 'running',
        updates: {
          status: 'failed',
          completedAt: sfn.JsonPath.stringAt('$$.State.EnteredTime'),
          failure: {
            'step.$': '$.failureStep',
            category: 'internal',
            'safeMessage.$': "States.Format('Workflow step {} failed after retries were exhausted.', $.failureStep)",
            occurredAt: sfn.JsonPath.stringAt('$$.State.EnteredTime'),
            attemptCount: 1,
            retryEligible: true,
          },
        },
      },
      resultPath: '$.recordFailureResult',
    }).next(workflowFailed);

    /** Every task's Catch routes here after a Pass sets `$.failureStep`. */
    const catchTarget = (stepName: string): sfn.IChainable =>
      new sfn.Pass(this, `RecordFailureStep_${stepName}`, {
        parameters: { 'failureStep.$': '$$.State.Name', 'scanExecutionId.$': '$.scanExecutionId', 'businessId.$': '$.businessId' },
        resultPath: '$',
      }).next(recordFailure);

    const withFailureCatch = <T extends sfn.TaskStateBase>(task: T, stepName: string): T => {
      task.addCatch(catchTarget(stepName), { errors: [sfn.Errors.ALL], resultPath: '$.error' });
      return task;
    };

    const finalize = (
      id: string,
      updates: Record<string, unknown>,
    ): tasks.HttpInvoke =>
      withFailureCatch(
        httpTask(id, {
          path: '/api/internal/scan/update-execution',
          body: {
            scanExecutionId: sfn.JsonPath.stringAt('$.scanExecutionId'),
            expectedCurrentStatus: 'running',
            updates: { completedAt: sfn.JsonPath.stringAt('$$.State.EnteredTime'), ...updates },
          },
          resultPath: '$.finalizeResult',
        }),
        id,
      );

    const succeed = new sfn.Succeed(this, 'WorkflowComplete');

    // ─────────────────────────────────────────────────────────────────────
    // Initialize → LoadBusiness
    // ─────────────────────────────────────────────────────────────────────
    const initialize = withFailureCatch(
      httpTask('InitializeScanExecution', {
        path: '/api/internal/scan/update-execution',
        body: {
          scanExecutionId: sfn.JsonPath.stringAt('$.scanExecutionId'),
          expectedCurrentStatus: 'queued',
          updates: { status: 'running', currentStep: 'initializing', startedAt: sfn.JsonPath.stringAt('$$.State.EnteredTime') },
        },
        resultPath: '$.initializeResult',
      }),
      'InitializeScanExecution',
    );

    const loadBusiness = withFailureCatch(
      httpTask('LoadBusiness', {
        path: '/api/internal/scan/load-business',
        body: { businessId: sfn.JsonPath.stringAt('$.businessId') },
        resultPath: '$.loadBusinessResult',
      }),
      'LoadBusiness',
    );

    const businessNotFound = finalize('FinalizeBusinessNotFound', {
      status: 'failed',
      failure: {
        step: 'loading_business',
        category: 'not_found',
        safeMessage: 'Business record not found.',
        occurredAt: sfn.JsonPath.stringAt('$$.State.EnteredTime'),
        attemptCount: 1,
        retryEligible: false,
      },
    }).next(workflowFailed);

    // ─────────────────────────────────────────────────────────────────────
    // Screenshot capture + poll-until-terminal loop (shared shape, two
    // instances — source-site and preview — since Step Functions requires
    // unique state names per instance).
    // ─────────────────────────────────────────────────────────────────────
    const buildScreenshotChain = (
      namePrefix: string,
      target: 'existing_site' | 'generated_preview',
      scanIdResultPath: string,
    ): { entry: sfn.IChainable; exit: sfn.Pass } => {
      const capture = withFailureCatch(
        httpTask(`${namePrefix}_Capture`, {
          path: '/api/internal/scan/capture-screenshot',
          body: { businessId: sfn.JsonPath.stringAt('$.businessId'), target },
          resultPath: scanIdResultPath,
        }),
        `${namePrefix}_Capture`,
      );

      const statusResultPath = `$.${namePrefix}_statusResult`;
      const attemptsPath = `$.${namePrefix}_attempts`;

      const wait = new sfn.Wait(this, `${namePrefix}_Wait`, { time: sfn.WaitTime.duration(SCREENSHOT_POLL_INTERVAL) });

      const checkStatus = withFailureCatch(
        httpTask(`${namePrefix}_CheckStatus`, {
          path: '/api/internal/scan/scan-status',
          method: 'GET',
          queryStringParameters: { scanId: sfn.JsonPath.stringAt(`${scanIdResultPath}.ResponseBody.scanId`) },
          resultPath: statusResultPath,
        }),
        `${namePrefix}_CheckStatus`,
      );

      // ASL's Pass state can only dynamically compute an object (`Parameters`),
      // never a bare scalar — the counter is nested under `.value` from the
      // start so init and increment share one consistent shape.
      const initAttempts = new sfn.Pass(this, `${namePrefix}_InitAttempts`, {
        parameters: { value: 0 },
        resultPath: attemptsPath,
      });

      const incrementAttempts = new sfn.Pass(this, `${namePrefix}_IncrementAttempts`, {
        parameters: { 'value.$': `States.MathAdd(${attemptsPath}.value, 1)` },
        resultPath: attemptsPath,
      });

      const proceed = new sfn.Pass(this, `${namePrefix}_Proceed`);

      const pollChoice = new sfn.Choice(this, `${namePrefix}_PollChoice`)
        .when(
          sfn.Condition.or(
            sfn.Condition.stringEquals(`${statusResultPath}.ResponseBody.status`, 'completed'),
            sfn.Condition.stringEquals(`${statusResultPath}.ResponseBody.status`, 'partial'),
            sfn.Condition.stringEquals(`${statusResultPath}.ResponseBody.status`, 'failed'),
          ),
          proceed,
        )
        .when(sfn.Condition.numberGreaterThanEquals(`${attemptsPath}.value`, SCREENSHOT_POLL_MAX_ATTEMPTS), proceed)
        .otherwise(incrementAttempts);

      incrementAttempts.next(wait);
      wait.next(checkStatus);
      checkStatus.next(pollChoice);

      return { entry: sfn.Chain.start(capture).next(initAttempts).next(wait), exit: proceed };
    };

    // ─────────────────────────────────────────────────────────────────────
    // Score + qualify (shared by both website-exists and no-website paths —
    // scoreBusinessWebsite already self-branches on business.websiteUrl).
    // ─────────────────────────────────────────────────────────────────────
    const score = withFailureCatch(
      httpTask('ScoreWebsite', {
        path: '/api/internal/scan/score',
        body: { businessId: sfn.JsonPath.stringAt('$.businessId') },
        resultPath: '$.scoreResult',
      }),
      'ScoreWebsite',
    );

    const finalizeReject = finalize('FinalizeReject', {
      status: 'reject',
      qualification: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.qualification'),
      leadPriority: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.leadPriority'),
    }).next(succeed);

    const finalizeManualReviewFromScore = finalize('FinalizeManualReviewFromScore', {
      status: 'manual_review',
      qualification: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.qualification'),
      leadPriority: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.leadPriority'),
      manualReviewReason: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.message'),
    }).next(succeed);

    // Qualified + has a preview already (has-website path — the crawl step
    // already generated one) → capture preview screenshots → ready for review.
    const previewScreenshotFromCrawl = buildScreenshotChain('PreviewFromCrawl', 'generated_preview', '$.previewScreenshotResult');
    const finalizeQualifiedFromCrawl = finalize('FinalizeQualifiedFromCrawl', {
      status: 'preview_ready',
      qualification: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.qualification'),
      leadPriority: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.leadPriority'),
      previewId: sfn.JsonPath.stringAt('$.crawlResult.ResponseBody.previewId'),
    }).next(succeed);
    previewScreenshotFromCrawl.exit.next(finalizeQualifiedFromCrawl);

    const qualificationChoiceFromCrawl = new sfn.Choice(this, 'QualificationChoiceFromCrawl')
      .when(sfn.Condition.stringEquals('$.scoreResult.ResponseBody.qualification', 'qualified'), previewScreenshotFromCrawl.entry)
      .when(sfn.Condition.stringEquals('$.scoreResult.ResponseBody.qualification', 'reject'), finalizeReject)
      .otherwise(finalizeManualReviewFromScore);

    // ─────────────────────────────────────────────────────────────────────
    // Has-website path: CrawlWebsite → branch on outcome
    // ─────────────────────────────────────────────────────────────────────
    const crawl = withFailureCatch(
      httpTask('CrawlWebsite', {
        path: '/api/internal/scan/crawl',
        body: { businessId: sfn.JsonPath.stringAt('$.businessId') },
        resultPath: '$.crawlResult',
        timeout: cdk.Duration.minutes(3),
      }),
      'CrawlWebsite',
    );

    // `score`'s own outbound transition is set exactly once, here — every
    // branch below that wants to "score, then qualify" transitions INTO
    // `score` (many incoming transitions are fine in Step Functions; a
    // state's own `.next()` may only be called once).
    score.next(qualificationChoiceFromCrawl);

    const sourceScreenshot = buildScreenshotChain('SourceScreenshot', 'existing_site', '$.sourceScreenshotResult');
    sourceScreenshot.exit.next(score);

    const finalizeCrawlFailedManualReview = finalize('FinalizeCrawlFailedManualReview', {
      status: 'manual_review',
      manualReviewReason: sfn.JsonPath.stringAt('$.crawlResult.ResponseBody.message'),
    }).next(succeed);

    // Crawl succeeded → capture the source-site screenshot, then score.
    // Crawl resulted in a website-unavailable/no-website shortcut →
    // `scoreBusinessWebsite` already tolerates this (its own shortcut runs
    // instead of requiring a completed crawl) — skip screenshot capture,
    // score directly. Any other crawl failure has no good fallback: route
    // straight to manual review rather than call scoring, which would only
    // return `not_eligible`.
    const crawlOutcomeChoice = new sfn.Choice(this, 'CrawlOutcomeChoice')
      .when(sfn.Condition.stringEquals('$.crawlResult.ResponseBody.status', 'completed'), sourceScreenshot.entry)
      .when(sfn.Condition.stringEquals('$.crawlResult.ResponseBody.status', 'manual_approval_required'), score)
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.crawlResult.ResponseBody.status', 'failed'),
          sfn.Condition.or(
            ...WEBSITE_UNAVAILABLE_CATEGORIES.map((category) =>
              sfn.Condition.stringEquals('$.crawlResult.ResponseBody.failureCategory', category),
            ),
          ),
        ),
        score,
      )
      .otherwise(finalizeCrawlFailedManualReview);

    crawl.next(crawlOutcomeChoice);

    // ─────────────────────────────────────────────────────────────────────
    // No-website path: RecordNoWebsiteSignals (same underlying endpoint as
    // CrawlWebsite — enrichBusinessWebsite already self-branches on a
    // missing websiteUrl and never calls Firecrawl — separate state name
    // here purely so execution history shows this business skipped
    // crawling, not because the logic differs) → score directly (its own
    // no-website shortcut) → qualified? generate a preview.
    // ─────────────────────────────────────────────────────────────────────
    const recordNoWebsiteSignals = withFailureCatch(
      httpTask('RecordNoWebsiteSignals', {
        path: '/api/internal/scan/crawl',
        body: { businessId: sfn.JsonPath.stringAt('$.businessId') },
        resultPath: '$.crawlResult',
      }),
      'RecordNoWebsiteSignals',
    );

    const scoreNoWebsite = withFailureCatch(
      httpTask('ScoreNoWebsite', {
        path: '/api/internal/scan/score',
        body: { businessId: sfn.JsonPath.stringAt('$.businessId') },
        resultPath: '$.scoreResult',
      }),
      'ScoreNoWebsite',
    );

    const generatePreview = withFailureCatch(
      httpTask('GeneratePreviewNoWebsite', {
        path: '/api/internal/scan/generate-preview',
        body: { businessId: sfn.JsonPath.stringAt('$.businessId') },
        resultPath: '$.generatePreviewResult',
      }),
      'GeneratePreviewNoWebsite',
    );

    const previewScreenshotFromGeneration = buildScreenshotChain('PreviewFromGeneration', 'generated_preview', '$.previewScreenshotResult');
    const finalizeQualifiedFromGeneration = finalize('FinalizeQualifiedFromGeneration', {
      status: 'preview_ready',
      qualification: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.qualification'),
      leadPriority: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.leadPriority'),
      previewId: sfn.JsonPath.stringAt('$.generatePreviewResult.ResponseBody.previewId'),
    }).next(succeed);
    previewScreenshotFromGeneration.exit.next(finalizeQualifiedFromGeneration);

    const finalizeNotEligibleForGeneration = finalize('FinalizeNotEligibleForGeneration', {
      status: 'manual_review',
      qualification: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.qualification'),
      manualReviewReason: sfn.JsonPath.stringAt('$.generatePreviewResult.ResponseBody.message'),
    }).next(succeed);

    const generatePreviewOutcomeChoice = new sfn.Choice(this, 'GeneratePreviewOutcomeChoice')
      .when(sfn.Condition.stringEquals('$.generatePreviewResult.ResponseBody.status', 'completed'), previewScreenshotFromGeneration.entry)
      .otherwise(finalizeNotEligibleForGeneration);

    const finalizeManualReviewNoWebsite = finalize('FinalizeManualReviewNoWebsite', {
      status: 'manual_review',
      qualification: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.qualification'),
      manualReviewReason: sfn.JsonPath.stringAt('$.scoreResult.ResponseBody.message'),
    }).next(succeed);

    const noWebsiteQualificationChoice = new sfn.Choice(this, 'NoWebsiteQualificationChoice')
      .when(sfn.Condition.stringEquals('$.scoreResult.ResponseBody.qualification', 'qualified'), generatePreview.next(generatePreviewOutcomeChoice))
      .otherwise(finalizeManualReviewNoWebsite);

    recordNoWebsiteSignals.next(scoreNoWebsite).next(noWebsiteQualificationChoice);

    // ─────────────────────────────────────────────────────────────────────
    // Top-level assembly
    // ─────────────────────────────────────────────────────────────────────
    const websiteExistsChoice = new sfn.Choice(this, 'WebsiteExistsChoice')
      .when(sfn.Condition.booleanEquals('$.loadBusinessResult.ResponseBody.hasWebsite', false), recordNoWebsiteSignals)
      .otherwise(crawl);

    const foundChoice = new sfn.Choice(this, 'BusinessFoundChoice')
      .when(sfn.Condition.booleanEquals('$.loadBusinessResult.ResponseBody.found', false), businessNotFound)
      .otherwise(websiteExistsChoice);

    const definition = initialize.next(loadBusiness).next(foundChoice);

    this.stateMachine = new sfn.StateMachine(this, 'ScanWorkflow', {
      stateMachineName: `webpresa-${config.suffix}-scan-workflow`,
      stateMachineType: sfn.StateMachineType.STANDARD,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(30),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      exportName: `webpresa-${config.suffix}-scan-workflow-arn`,
      description: 'Stage 16 scan workflow Step Functions state machine ARN',
    });

    new cdk.CfnOutput(this, 'StateMachineName', {
      value: this.stateMachine.stateMachineName,
      exportName: `webpresa-${config.suffix}-scan-workflow-name`,
      description: 'Stage 16 scan workflow Step Functions state machine name',
    });
  }
}
