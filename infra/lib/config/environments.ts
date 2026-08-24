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
  /**
   * The AWS account this environment must deploy into. Used only as a
   * synth-time safety check (see `assertAccountMatchesEnvironment` below) —
   * never referenced by application code or embedded in a resource name.
   * Deliberately the one intentional exception to AGENTS.md's "never
   * hard-code AWS account IDs in source" rule: account IDs aren't secrets,
   * this is the standard CDK multi-account config pattern, and this file's
   * entire purpose is holding exactly this kind of per-environment value.
   */
  readonly expectedAccountId: string;
  /**
   * `reservedConcurrentExecutions` for the screenshot-capture Lambda
   * (Stage 14). `undefined` omits the reservation entirely — AWS requires
   * >=10 unreserved concurrency to remain account-wide after any
   * reservation, so a brand-new account's default quota of 10 total makes
   * any reservation above 0 impossible until the account's quota is raised.
   * Dev hit this 2026-07-23 (quota raised to 1000 same day); prod hit it
   * identically in Stage 22.5, 2026-08-11 (request id
   * defa8ae9b43d4ddb9dffa2d80a886705hv0E8mKc, quota raised to 1000,
   * approved 2026-08-12) — both environments now reserve `5`, matching
   * implementation.md's spec. If this is ever hit again in a new
   * environment, temporarily set that environment's value to `undefined`,
   * deploy, then restore it to `5` once the account's quota is raised.
   */
  readonly screenshotLambdaReservedConcurrency: number | undefined;
  /**
   * Monthly AWS spend threshold (USD) for this account's CloudWatch/Budgets
   * cost alarm (Stage 24) — `WebpresaMonitoringStack`'s `CfnBudget`. Not a
   * secret or account identifier, just a per-environment operational
   * threshold, so it lives alongside every other per-environment value here
   * rather than as a separate config source.
   */
  readonly monthlyBudgetUsd: number;
  /** Email address notified when `monthlyBudgetUsd` is forecasted/actually exceeded (Stage 24). */
  readonly budgetAlertEmail: string;
  /**
   * Google OAuth 2.0 Web application Client ID for Cognito "Sign in with
   * Google" federation, or `''` if not yet configured. Not sensitive (OAuth
   * client IDs are routinely public/client-embedded), so it's committed here
   * like `expectedAccountId` rather than living in Secrets Manager — the
   * paired client *secret* does live in Secrets Manager
   * (`webpresa-{env}-google-oauth`, see `data-stack.ts`).
   *
   * Deliberately gates whether `webpresa-user-pool.ts` provisions the actual
   * `UserPoolIdentityProviderGoogle`/OAuth app-client config at all — empty
   * string here means "domain + Lambda trigger only, no Google IdP yet"
   * (Phase A of the two-phase deploy this feature requires, since the real
   * Client ID can only be created in Google Cloud Console *after* the
   * Hosted UI domain exists to register as the redirect URI). Set to the
   * real value once that manual step is done, then redeploy (Phase B).
   */
  readonly googleOAuthClientId: string;
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
    expectedAccountId: '539898341083',
    screenshotLambdaReservedConcurrency: 5,
    monthlyBudgetUsd: 25,
    budgetAlertEmail: 'mudge.andrew@gmail.com',
    // Real Google Cloud OAuth Client ID (Phase B of the two-phase deploy —
    // see this field's doc comment and deployment.md's "Google federation
    // deployment guidance"). Its redirect URI is registered as
    // https://webpresa-dev-customers.auth.us-east-1.amazoncognito.com/oauth2/idpresponse.
    googleOAuthClientId: '671031439561-d0tlff811su81on3t9lbh151me124laj.apps.googleusercontent.com',
  },

  // ── Production config: base infra deployed in Stage 22.5; application
  // features remain dev-only until a later, separate cutover decision ────
  prod: {
    suffix: 'prod',
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    pointInTimeRecovery: true,
    deletionProtection: true,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    expectedAccountId: '994748688217',
    // Restored 2026-08-12 — the account's Lambda concurrency quota was
    // raised to 1000 (request id defa8ae9b43d4ddb9dffa2d80a886705hv0E8mKc,
    // CASE_CLOSED), matching dev. See the field's doc comment above for
    // the incident history.
    screenshotLambdaReservedConcurrency: 5,
    monthlyBudgetUsd: 25,
    budgetAlertEmail: 'mudge.andrew@gmail.com',
    googleOAuthClientId: '',
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

// ---------------------------------------------------------------------------
// Account safety check (Stage 22.5)
// ---------------------------------------------------------------------------

/**
 * Guards against deploying one environment's resources into the wrong AWS
 * account — e.g. `--context env=prod` run with a `--profile` that still
 * resolves to the dev account (or vice versa). Called once at synth time
 * from `bin/webpresa.ts`, before any stack is constructed.
 *
 * `resolvedAccountId` is intentionally optional: when no profile/credentials
 * are available at all (e.g. a bare `cdk synth` with no default account),
 * CDK's own "account-required" errors surface later for any stack that
 * actually needs an account — this function only rejects a *mismatched*
 * account, not a *missing* one.
 */
export function assertAccountMatchesEnvironment(
  envName: string,
  config: EnvironmentConfig,
  resolvedAccountId: string | undefined,
): void {
  if (!resolvedAccountId) return;
  if (resolvedAccountId !== config.expectedAccountId) {
    throw new Error(
      `Account mismatch: --context env=${envName} expects AWS account ${config.expectedAccountId}, ` +
        `but the active profile resolved to account ${resolvedAccountId}. ` +
        `Check that --profile matches the intended environment ` +
        `(webpresa-dev for dev, webpresa-prod for prod) before deploying.`,
    );
  }
}
