import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaScreenshotRepositoryProps {
  readonly config: EnvironmentConfig;
}

// ---------------------------------------------------------------------------
// Reusable construct
// ---------------------------------------------------------------------------

/**
 * WebpresaScreenshotRepository — the Stage 14 screenshot-capture Lambda's
 * ECR repository, deliberately split into its own construct/stack from the
 * Lambda function itself (`webpresa-screenshot-lambda.ts` /
 * `WebpresaScreenshotStack`).
 *
 * Why split: `AWS::Lambda::Function` (`PackageType: Image`) validates that
 * its referenced image already exists in ECR at `CreateFunction` time — if
 * it doesn't, creation fails immediately. On a brand-new stack, that
 * failure triggers a full stack rollback, which would delete the ECR
 * repository the *same* deployment just created, along with everything
 * else. Keeping the repository in its own stack lets it be created (and an
 * image pushed via `infra/scripts/build-and-push-screenshot-lambda.sh`)
 * *before* the Lambda-containing stack is ever deployed — see
 * `deployment.md`, "Stage 14" for the corrected deploy sequence.
 */
export class WebpresaScreenshotRepository extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: WebpresaScreenshotRepositoryProps) {
    super(scope, id);

    const fullName = `webpresa-${props.config.suffix}-screenshot-capture`;
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
