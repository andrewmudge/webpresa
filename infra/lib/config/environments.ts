import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

export interface EnvironmentConfig {
  /**
   * Short suffix appended to every resource and stack name.
   * Used to produce names like `webpresa-dev-businesses` or
   * `webpresa-prod-businesses` from the same construct code.
   */
  readonly suffix: string;
  readonly billingMode: dynamodb.BillingMode;
  /**
   * Whether to enable DynamoDB Point-in-Time Recovery (PITR).
   * Disabled in dev to reduce cost; required in production.
   */
  readonly pointInTimeRecovery: boolean;
  /**
   * Whether to enable DynamoDB table deletion protection.
   * Disabled in dev to allow tear-down; required in production.
   */
  readonly deletionProtection: boolean;
  /**
   * CDK removal policy controls what happens to the table when the
   * CloudFormation stack is deleted.
   * Dev: DESTROY (tables are deleted with the stack — safe for ephemeral
   *   environments and development tear-downs).
   * Prod: RETAIN (tables survive stack deletion — prevents accidental
   *   data loss; manual cleanup required).
   */
  readonly removalPolicy: cdk.RemovalPolicy;
}

// ---------------------------------------------------------------------------
// Environment definitions
// ---------------------------------------------------------------------------

/**
 * All known environments.
 *
 * IMPORTANT: Both `dev` and `prod` are defined here so the production
 * configuration can be reviewed and tested without deploying it.
 * Only the `dev` environment is deployed in Stage 6.
 *
 * To deploy production:
 *   cdk deploy WebpresaProdDataStack --context env=prod --profile webpresa-prod
 */
export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    suffix: 'dev',
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    pointInTimeRecovery: false,
    deletionProtection: false,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  },

  // ── Production config: NOT deployed in Stage 6 ─────────────────────────
  prod: {
    suffix: 'prod',
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    pointInTimeRecovery: true,
    deletionProtection: true,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  },
};

// ---------------------------------------------------------------------------
// Config accessor
// ---------------------------------------------------------------------------

/**
 * Return the configuration for the named environment.
 * Throws explicitly on unknown names rather than silently falling back,
 * so a mistyped `--context env=` value fails loudly at synth time.
 */
export function getEnvironmentConfig(name: string): EnvironmentConfig {
  const config = ENVIRONMENTS[name];
  if (!config) {
    const valid = Object.keys(ENVIRONMENTS).join(', ');
    throw new Error(
      `Unknown environment "${name}". Valid values: ${valid}`,
    );
  }
  return config;
}
