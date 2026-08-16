import * as cdk from 'aws-cdk-lib';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaBucket } from '../constructs/webpresa-bucket';

export interface WebpresaCloudTrailStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * WebpresaCloudTrailStack — Stage 25 (Security Hardening). CloudTrail was
 * confirmed absent from both AWS accounts during this stage's planning
 * research (`web/docs/security-findings.md`, SEC-04) — this closes that
 * gap. Deliberately proportional to this MVP's scale, per
 * `implementation.md`'s own "do not over-engineer" guidance for Stage 25:
 * one multi-region trail covering management events only (no S3/Lambda
 * data-event logging — real cost for a small MVP with no immediate
 * investigative need), a private log bucket, and two narrow CloudWatch
 * alarms for IAM and CloudTrail-configuration changes specifically. No AWS
 * Config, no Security Hub, no SIEM.
 *
 * Self-contained — no dependency on any other stack's resources, so it
 * carries no risk to already-deployed infrastructure. Not wired into the
 * existing `WebpresaMonitoringStack` dashboard (Stage 24) to avoid coupling
 * a new stack's first deploy to a change on an already-deployed one in the
 * same pass; folding these alarms into that dashboard is a reasonable
 * follow-up once this stack itself is reviewed and deployed.
 */
export class WebpresaCloudTrailStack extends cdk.Stack {
  public readonly trail: cloudtrail.Trail;
  public readonly logBucket: WebpresaBucket;

  constructor(scope: Construct, id: string, props: WebpresaCloudTrailStackProps) {
    super(scope, id, props);

    const { config } = props;

    cdk.Tags.of(this).add('Project', 'webpresa');
    cdk.Tags.of(this).add('Environment', config.suffix);

    // Reuses the same private-bucket construct every other bucket in this
    // project uses (BLOCK_ALL, SSE, SSL-enforced, RETAIN in prod) — Trail's
    // own constructor adds the CloudTrail-specific bucket-policy statements
    // (`s3:GetBucketAcl`/`s3:PutObject` for the CloudTrail service
    // principal) to whatever bucket it's given, so no hand-written bucket
    // policy is needed here.
    this.logBucket = new WebpresaBucket(this, 'CloudTrailLogs', {
      config,
      bucketName: 'cloudtrail-logs',
    });

    // Transition to a cheaper storage class well before typical audit-log
    // retention windows close, rather than keeping everything on S3
    // Standard indefinitely — proportional to this MVP's scale, not
    // indefinite/enterprise-grade retention. Added directly on the
    // underlying bucket (not a new WebpresaBucket construct prop) so this
    // stays a local decision for this one bucket's actual use case.
    this.logBucket.bucket.addLifecycleRule({
      id: 'transition-cloudtrail-logs-to-ia',
      transitions: [{ storageClass: cdk.aws_s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(90) }],
    });

    const logGroup = new logs.LogGroup(this, 'CloudTrailLogGroup', {
      logGroupName: `/webpresa/${config.suffix}/cloudtrail`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: config.removalPolicy,
    });

    this.trail = new cloudtrail.Trail(this, 'Trail', {
      trailName: `webpresa-${config.suffix}-trail`,
      bucket: this.logBucket.bucket,
      isMultiRegionTrail: true,
      includeGlobalServiceEvents: true,
      enableFileValidation: true,
      managementEvents: cloudtrail.ReadWriteType.ALL,
      sendToCloudWatchLogs: true,
      cloudWatchLogGroup: logGroup,
      cloudWatchLogsRetention: logs.RetentionDays.ONE_YEAR,
    });

    // ── Two narrow, standard (CIS AWS Foundations-style) alarms ─────────
    // No SNS/Slack/PagerDuty target exists yet in either environment (see
    // WebpresaMonitoringStack's own identical note) — these alarms are
    // console/CloudWatch-visible only, same posture as every other alarm
    // in this project until a notification target exists.

    const iamChangesFilter = new logs.MetricFilter(this, 'IamChangesFilter', {
      logGroup,
      filterPattern: logs.FilterPattern.literal(
        '{ ($.eventSource = "iam.amazonaws.com") && ' +
          '(($.eventName = "DeleteUserPolicy") || ($.eventName = "DeleteGroupPolicy") || ($.eventName = "DeleteRolePolicy") || ' +
          '($.eventName = "AttachUserPolicy") || ($.eventName = "AttachGroupPolicy") || ($.eventName = "AttachRolePolicy") || ' +
          '($.eventName = "DetachUserPolicy") || ($.eventName = "DetachGroupPolicy") || ($.eventName = "DetachRolePolicy") || ' +
          '($.eventName = "CreatePolicy") || ($.eventName = "DeletePolicy") || ($.eventName = "CreatePolicyVersion") || ($.eventName = "DeletePolicyVersion") || ' +
          '($.eventName = "PutUserPolicy") || ($.eventName = "PutGroupPolicy") || ($.eventName = "PutRolePolicy") || ' +
          '($.eventName = "CreateAccessKey") || ($.eventName = "DeleteAccessKey") || ($.eventName = "CreateUser") || ($.eventName = "DeleteUser")) }',
      ),
      metricNamespace: 'Webpresa/Security',
      metricName: `IamChanges-${config.suffix}`,
      metricValue: '1',
    });

    new cloudwatch.Alarm(this, 'IamChangesAlarm', {
      alarmName: `webpresa-${config.suffix}-iam-changes`,
      alarmDescription: 'One or more IAM policy/user/access-key changes were made — verify these were expected.',
      metric: iamChangesFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const cloudTrailChangesFilter = new logs.MetricFilter(this, 'CloudTrailChangesFilter', {
      logGroup,
      filterPattern: logs.FilterPattern.literal(
        '{ ($.eventName = "CreateTrail") || ($.eventName = "UpdateTrail") || ($.eventName = "DeleteTrail") || ' +
          '($.eventName = "StartLogging") || ($.eventName = "StopLogging") || ($.eventName = "PutEventSelectors") }',
      ),
      metricNamespace: 'Webpresa/Security',
      metricName: `CloudTrailConfigChanges-${config.suffix}`,
      metricValue: '1',
    });

    new cloudwatch.Alarm(this, 'CloudTrailChangesAlarm', {
      alarmName: `webpresa-${config.suffix}-cloudtrail-changes`,
      alarmDescription: 'CloudTrail configuration or logging state was changed — verify this was expected (a real attacker\'s first move is often disabling the trail that would record them).',
      metric: cloudTrailChangesFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cdk.CfnOutput(this, 'TrailArn', {
      value: this.trail.trailArn,
      exportName: `webpresa-${config.suffix}-cloudtrail-arn`,
      description: `CloudTrail trail ARN: webpresa-${config.suffix}-trail`,
    });
  }
}
