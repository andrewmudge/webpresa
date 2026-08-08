import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaPostcardRenderRepository } from '../constructs/webpresa-postcard-render-repository';

export interface WebpresaPostcardRenderRepositoryStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * WebpresaPostcardRenderRepositoryStack — Stage 22 Phase 2's ECR repository,
 * deployed independently and *before* `WebpresaPostcardRenderStack` (the
 * Lambda function). See `webpresa-postcard-render-repository.ts`'s doc
 * comment for why this can't live in the same stack as the Lambda function,
 * mirroring `WebpresaScreenshotRepositoryStack`'s identical split for
 * Stage 14.
 */
export class WebpresaPostcardRenderRepositoryStack extends cdk.Stack {
  public readonly postcardRenderRepository: WebpresaPostcardRenderRepository;

  constructor(scope: Construct, id: string, props: WebpresaPostcardRenderRepositoryStackProps) {
    super(scope, id, props);

    const { config } = props;
    const envLabel = config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    this.postcardRenderRepository = new WebpresaPostcardRenderRepository(this, 'PostcardRenderRepository', { config });

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.postcardRenderRepository.repository.repositoryUri,
      exportName: `webpresa-${config.suffix}-postcard-render-repo-uri`,
      description: 'ECR repository URI for the postcard-render container image',
    });

    new cdk.CfnOutput(this, 'RepositoryName', {
      value: this.postcardRenderRepository.repository.repositoryName,
      exportName: `webpresa-${config.suffix}-postcard-render-repo-name`,
      description: 'ECR repository name for the postcard-render container image',
    });
  }
}
