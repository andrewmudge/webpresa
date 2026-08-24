import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaDataStack } from '../lib/stacks/data-stack';
import { WebpresaSesStack } from '../lib/stacks/ses-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

let dev: Template;
let prod: Template;

function buildStack(appId: string, config: (typeof ENVIRONMENTS)['dev']) {
  const app = new App();
  const dataStack = new WebpresaDataStack(app, `${appId}DataStack`, { config, appBaseUrl: 'https://test.webpresa.example' });
  const sesStack = new WebpresaSesStack(app, `${appId}SesStack`, {
    config,
    appBaseUrl: 'https://app.example-test.invalid',
    vercelProtectionBypassSecret: dataStack.vercelProtectionBypassSecret,
  });
  return Template.fromStack(sesStack);
}

beforeAll(() => {
  dev = buildStack('WebpresaDevSesTest', ENVIRONMENTS.dev);
  prod = buildStack('WebpresaProdSesTest', ENVIRONMENTS.prod);
});

describe('resource shape', () => {
  it('creates exactly one SNS topic, one SNS subscription, one Configuration Set, and one event destination', () => {
    dev.resourceCountIs('AWS::SNS::Topic', 1);
    dev.resourceCountIs('AWS::SNS::Subscription', 1);
    dev.resourceCountIs('AWS::SES::ConfigurationSet', 1);
    dev.resourceCountIs('AWS::SES::ConfigurationSetEventDestination', 1);
  });

  it('creates no Lambda — this stack is webhook-only, mirroring the Lob/Stripe HTTP webhook pattern', () => {
    dev.resourceCountIs('AWS::Lambda::Function', 0);
  });
});

describe('naming convention', () => {
  it('SNS topic and Configuration Set follow webpresa-{env}-{resource}', () => {
    dev.hasResourceProperties('AWS::SNS::Topic', { TopicName: 'webpresa-dev-ses-events' });
    dev.hasResourceProperties('AWS::SES::ConfigurationSet', { Name: 'webpresa-dev-marketing' });
    prod.hasResourceProperties('AWS::SNS::Topic', { TopicName: 'webpresa-prod-ses-events' });
    prod.hasResourceProperties('AWS::SES::ConfigurationSet', { Name: 'webpresa-prod-marketing' });
  });
});

describe('SNS subscription', () => {
  it('subscribes HTTPS, joined into a single endpoint URL containing the app base URL, the /api/webhooks/ses path, and the bypass query param name', () => {
    const subscriptions = dev.findResources('AWS::SNS::Subscription');
    const subscription = Object.values(subscriptions)[0] as { Properties: { Protocol: string; Endpoint: unknown } };
    expect(subscription.Properties.Protocol).toBe('https');
    const serialized = JSON.stringify(subscription.Properties.Endpoint);
    expect(serialized).toContain('Fn::Join');
    expect(serialized).toContain('https://app.example-test.invalid');
    expect(serialized).toContain('/api/webhooks/ses?x-vercel-protection-bypass=');
  });

  it('embeds the vercel-protection-bypass secret value via a dynamic Secrets Manager reference (an Fn::ImportValue + {{resolve:secretsmanager:...}} token), never a resolved plaintext value — same fix already documented for the Stripe webhook (Vercel Deployment Protection blocks unauthenticated third-party POSTs at the edge)', () => {
    const subscriptions = dev.findResources('AWS::SNS::Subscription');
    const subscription = Object.values(subscriptions)[0] as { Properties: { Endpoint: unknown } };
    const serialized = JSON.stringify(subscription.Properties.Endpoint);
    expect(serialized).toContain('resolve:secretsmanager');
    expect(serialized).toContain(':SecretString:bypassSecret::}}');
    expect(serialized).toContain('Fn::ImportValue');
    expect(serialized).toContain('VercelProtectionBypassSecret');
  });
});

describe('Configuration Set event destination', () => {
  it('matches send/delivery/bounce/complaint/reject only — never open or click (this feature does its own click attribution, and open-rate is de-emphasized)', () => {
    dev.hasResourceProperties('AWS::SES::ConfigurationSetEventDestination', {
      EventDestination: Match.objectLike({
        Enabled: true,
        MatchingEventTypes: ['send', 'delivery', 'bounce', 'complaint', 'reject'],
      }),
    });
  });

  it('routes to the SNS topic created in this stack', () => {
    const topics = dev.findResources('AWS::SNS::Topic');
    const topicLogicalId = Object.keys(topics)[0];
    dev.hasResourceProperties('AWS::SES::ConfigurationSetEventDestination', {
      EventDestination: Match.objectLike({
        // SES's own CloudFormation resource spells this TopicARN
        // (all-caps ARN), unlike most AWS resources' TopicArn.
        SnsDestination: Match.objectLike({
          TopicARN: { Ref: topicLogicalId },
        }),
      }),
    });
  });
});

describe('outputs', () => {
  it('exposes the Configuration Set name and event topic ARN', () => {
    const outputs = dev.findOutputs('*');
    expect(Object.keys(outputs)).toContain('ConfigurationSetName');
    expect(Object.keys(outputs)).toContain('EventTopicArn');
  });
});
