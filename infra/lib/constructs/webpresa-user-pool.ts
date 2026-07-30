import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaUserPoolProps {
  readonly config: EnvironmentConfig;
}

// ---------------------------------------------------------------------------
// Reusable Cognito construct — customer identity only (Stage 17)
// ---------------------------------------------------------------------------

/**
 * WebpresaUserPool — Amazon Cognito User Pool for customer (not admin)
 * identity, introduced in Stage 17 ("Website Claim Flow").
 *
 * The admin auth system remains completely separate and untouched (a single
 * hardcoded operator credential, scrypt + JWT — see
 * `web/lib/auth/session.ts`). Cognito exists solely for the public,
 * self-service customer accounts Stage 17 introduces: unknown users signing
 * up, choosing passwords, needing password resets, email changes, and
 * account lockout protection — a fundamentally different problem than the
 * admin's single credential, and one this project's own docs already
 * anticipated solving with Cognito (see `architecture.md`'s admin-auth
 * section and `implementation.md`, Stage 11.x, describing the future
 * customer dashboard as "Cognito-authenticated").
 *
 * Cognito's email-verification status is never read as proof of business
 * ownership by any application code — ownership is decided exclusively by
 * `Business.ownerUserId`, set only by the claim-token consumption
 * transaction (`web/lib/db/claims.ts`). This construct only provisions the
 * identity provider itself.
 *
 * The User Pool Client has no client secret (`generateSecret: false`) — the
 * Vercel-hosted app calls Cognito directly, server-side only, via
 * `@aws-sdk/client-cognito-identity-provider`, authenticated the same way
 * every other AWS call in this app is (the Vercel IAM user's credentials,
 * scoped to this User Pool's ARN — see `vercel-access-stack.ts`). No
 * `SECRET_HASH` computation is therefore needed.
 *
 * `authFlows: { userPassword: true }` is required explicitly — CDK's
 * default `authFlows` (when omitted) does not include `USER_PASSWORD_AUTH`,
 * which `InitiateAuth` calls from `web/lib/auth/customer-cognito.ts` depend
 * on.
 *
 * Email sending uses Cognito's built-in sender for the MVP (a documented
 * ~50/day ceiling) rather than SES — a deliberate, deferred-work choice
 * (see implementation.md, Stage 17, "Risks and unresolved implementation
 * details") revisited once real signup volume requires it. No Lambda
 * triggers are configured — none are required for sign-up, confirmation,
 * sign-in, or password reset with this direct-SDK-call pattern.
 */
export class WebpresaUserPool extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: WebpresaUserPoolProps) {
    super(scope, id);

    const { config } = props;

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `webpresa-${config.suffix}-customers`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OFF,
      removalPolicy: config.removalPolicy,
    });

    this.userPoolClient = this.userPool.addClient('Client', {
      userPoolClientName: `webpresa-${config.suffix}-customers-client`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
      },
    });

    // ── CloudFormation outputs ───────────────────────────────────────────
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `webpresa-${config.suffix}-customers-user-pool-id`,
      description: `Cognito User Pool ID: webpresa-${config.suffix}-customers`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `webpresa-${config.suffix}-customers-user-pool-client-id`,
      description: `Cognito User Pool Client ID: webpresa-${config.suffix}-customers-client`,
    });
  }
}
