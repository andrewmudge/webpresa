import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaScreenshotRepository } from '../constructs/webpresa-screenshot-repository';

export interface WebpresaScreenshotRepositoryStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * WebpresaScreenshotRepositoryStack — Stage 14's ECR repository, deployed
 * independently and *before* `WebpresaScreenshotStack` (the Lambda, DLQ,
 * IAM role). See `webpresa-screenshot-repository.ts`'s doc comment for why
 * this can't live in the same stack as the Lambda function.
 */
export class WebpresaScreenshotRepositoryStack extends cdk.Stack {
  public readonly screenshotRepository: WebpresaScreenshotRepository;

  constructor(scope: Construct, id: string, props: WebpresaScreenshotRepositoryStackProps) {
    super(scope, id, props);

    const { config } = props;
    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    this.screenshotRepository = new WebpresaScreenshotRepository(this, 'ScreenshotRepository', { config });

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.screenshotRepository.repository.repositoryUri,
      exportName: `webpresa-${config.suffix}-screenshot-capture-repo-uri`,
      description: 'ECR repository URI for the screenshot-capture container image',
    });

    new cdk.CfnOutput(this, 'RepositoryName', {
      value: this.screenshotRepository.repository.repositoryName,
      exportName: `webpresa-${config.suffix}-screenshot-capture-repo-name`,
      description: 'ECR repository name for the screenshot-capture container image',
    });
  }
}
