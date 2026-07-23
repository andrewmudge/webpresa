import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebpresaScreenshotRepositoryStack } from '../lib/stacks/screenshot-repository-stack';
import { ENVIRONMENTS } from '../lib/config/environments';

// ---------------------------------------------------------------------------
// Stage 14's ECR repository, split into its own stack from the Lambda that
// references it — see webpresa-screenshot-repository.ts's doc comment for
// why (a container-image Lambda's CreateFunction call fails immediately if
// its image doesn't already exist, and on a brand-new stack that failure
// rolls back everything else created in the same deployment, including a
// freshly-created repository).
// ---------------------------------------------------------------------------

let dev: Template;
let prod: Template;

beforeAll(() => {
  const devApp = new App();
  dev = Template.fromStack(
    new WebpresaScreenshotRepositoryStack(devApp, 'WebpresaDevScreenshotRepositoryStack', { config: ENVIRONMENTS.dev }),
  );

  const prodApp = new App();
  prod = Template.fromStack(
    new WebpresaScreenshotRepositoryStack(prodApp, 'WebpresaProdScreenshotRepositoryStack', { config: ENVIRONMENTS.prod }),
  );
});

describe('resource shape', () => {
  it('creates exactly one ECR repository and nothing else compute-related', () => {
    dev.resourceCountIs('AWS::ECR::Repository', 1);
    dev.resourceCountIs('AWS::Lambda::Function', 0);
  });

  it('names the repository following the webpresa-{env}-{resource} convention', () => {
    dev.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'webpresa-dev-screenshot-capture',
    });
    prod.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'webpresa-prod-screenshot-capture',
    });
  });
});

describe('lifecycle policy', () => {
  it('caps stored images at 8', () => {
    dev.hasResourceProperties('AWS::ECR::Repository', {
      LifecyclePolicy: Match.objectLike({
        LifecyclePolicyText: Match.stringLikeRegexp('"countNumber":8'),
      }),
    });
  });
});

describe('environment configuration', () => {
  it('dev repository is destroyable', () => {
    dev.hasResource('AWS::ECR::Repository', { DeletionPolicy: 'Delete' });
  });

  it('prod repository is retained', () => {
    prod.hasResource('AWS::ECR::Repository', { DeletionPolicy: 'Retain' });
  });

  it('is tagged Project=Webpresa', () => {
    dev.hasResourceProperties('AWS::ECR::Repository', {
      Tags: Match.arrayWith([{ Key: 'Project', Value: 'Webpresa' }]),
    });
  });

  it('is tagged ManagedBy=CDK', () => {
    dev.hasResourceProperties('AWS::ECR::Repository', {
      Tags: Match.arrayWith([{ Key: 'ManagedBy', Value: 'CDK' }]),
    });
  });
});

describe('CloudFormation outputs', () => {
  it('exports the repository URI and name', () => {
    const outputs = dev.findOutputs('*');
    expect(Object.keys(outputs)).toEqual(expect.arrayContaining(['RepositoryUri', 'RepositoryName']));
  });
});
