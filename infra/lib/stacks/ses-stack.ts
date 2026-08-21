import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

export interface WebpresaSesStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  /** The Next.js app's public base URL — the SNS topic's HTTPS subscription target is `{appBaseUrl}/api/webhooks/ses`. */
  readonly appBaseUrl: string;
}

/**
 * WebpresaSesStack — Marketing stage SES event pipeline: Configuration Set
 * → SNS topic → HTTPS subscription into the existing Next.js webhook-route
 * pattern (`web/app/api/webhooks/ses/route.ts`), structurally mirroring the
 * Lob/Stripe webhooks already in this app — no new Lambda introduced.
 *
 * Kept as its own stack rather than folded into DataStack/VercelAccessStack,
 * matching this repo's "one stack per distinct integration" precedent
 * (screenshot-stack.ts, scan-workflow-stack.ts, postcard-render-stack.ts).
 *
 * Does NOT create an SES domain identity — `webpresa.com` is already
 * verified (Stage 20, lead-notification email) and reused here under a
 * distinct `MARKETING_SES_FROM_EMAIL` address, for sending-reputation
 * separation from transactional lead-notification mail (see
 * `web/lib/ses/send-marketing-email.ts`).
 *
 * Deliberately excludes SES's own 'open' and 'click' event types from the
 * Configuration Set's matching events — this feature does its own click
 * attribution (`/e/[token]`, `web/lib/marketing/click-token.ts`), and the
 * spec explicitly de-emphasizes open-rate as an unreliable metric.
 *
 * Depends on WEBPRESA_APP_BASE_URL like the three existing URL-dependent
 * stacks — always deploy via `npm run diff:ses`/`deploy:ses`
 * (`infra/package.json`), never a raw `cdk deploy` (see AGENTS.md).
 */
export class WebpresaSesStack extends cdk.Stack {
  public readonly configurationSet: ses.CfnConfigurationSet;
  public readonly eventTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: WebpresaSesStackProps) {
    super(scope, id, props);

    const { config, appBaseUrl } = props;
    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // ── SNS topic + HTTPS subscription ─────────────────────────────────────
    // Auto-confirmed by the webhook route itself on first delivery (the
    // 'SubscriptionConfirmation' notification type — see
    // web/lib/ses/verify-sns-signature.ts) — no manual dashboard step,
    // unlike Lob's webhook registration.
    this.eventTopic = new sns.Topic(this, 'SesEventsTopic', {
      topicName: `webpresa-${config.suffix}-ses-events`,
      displayName: `Webpresa ${envLabel} SES events`,
    });

    this.eventTopic.addSubscription(new subscriptions.UrlSubscription(`${appBaseUrl}/api/webhooks/ses`));

    // ── Configuration Set + SNS event destination ──────────────────────────
    this.configurationSet = new ses.CfnConfigurationSet(this, 'MarketingConfigurationSet', {
      name: `webpresa-${config.suffix}-marketing`,
    });

    new ses.CfnConfigurationSetEventDestination(this, 'SnsEventDestination', {
      configurationSetName: this.configurationSet.ref,
      eventDestination: {
        name: `webpresa-${config.suffix}-ses-events-sns`,
        enabled: true,
        matchingEventTypes: ['send', 'delivery', 'bounce', 'complaint', 'reject'],
        snsDestination: {
          topicArn: this.eventTopic.topicArn,
        },
      },
    });

    // ── CloudFormation outputs ───────────────────────────────────────────
    new cdk.CfnOutput(this, 'ConfigurationSetName', {
      value: `webpresa-${config.suffix}-marketing`,
      exportName: `webpresa-${config.suffix}-ses-configuration-set-name`,
      description: 'SES Configuration Set name for the Marketing drip campaign',
    });

    new cdk.CfnOutput(this, 'EventTopicArn', {
      value: this.eventTopic.topicArn,
      exportName: `webpresa-${config.suffix}-ses-events-topic-arn`,
      description: 'SNS topic ARN receiving SES Configuration Set events',
    });
  }
}
