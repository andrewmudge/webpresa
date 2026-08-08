import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaPostcardRenderRepositoryProps {
  readonly config: EnvironmentConfig;
}

// ---------------------------------------------------------------------------
// Reusable construct
// ---------------------------------------------------------------------------

/**
 * WebpresaPostcardRenderRepository — Stage 22 Phase 2's ECR repository,
 * split into its own construct/stack from the Lambda function itself, for
 * exactly the reason `webpresa-screenshot-repository.ts` documents:
 * `AWS::Lambda::Function` (`PackageType: Image`) validates its referenced
 * image already exists in ECR at `CreateFunction` time, and a failure there
 * on a brand-new stack rolls back everything else the same deployment
 * created — including a freshly-created repository. Keeping the repository
 * in its own stack lets an image be pushed (via
 * `infra/scripts/build-and-push-postcard-render-lambda.sh`) before the
 * Lambda-containing stack is ever deployed.
 */
export class WebpresaPostcardRenderRepository extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: WebpresaPostcardRenderRepositoryProps) {
    super(scope, id);

    const fullName = `webpresa-${props.config.suffix}-postcard-render`;
    const isDestroyable = props.config.removalPolicy === cdk.RemovalPolicy.DESTROY;

    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: fullName,
      removalPolicy: props.config.removalPolicy,
      emptyOnDelete: isDestroyable,
    });
    this.repository.addLifecycleRule({
      description: 'Keep only the most recent 8 images — unbounded retention is silent storage cost for a repo a new build pushes to constantly.',
      maxImageCount: 8,
    });
  }
}
