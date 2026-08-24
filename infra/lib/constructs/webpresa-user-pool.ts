import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

// ---------------------------------------------------------------------------
// Construct props
// ---------------------------------------------------------------------------

export interface WebpresaUserPoolProps {
  readonly config: EnvironmentConfig;
  /** The Next.js app's public base URL — becomes the Google OAuth `callbackUrls`/`logoutUrls` entries. */
  readonly appBaseUrl: string;
  /**
   * Holds the Google OAuth Client Secret (`clientSecret` JSON key), read by
   * `UserPoolIdentityProviderGoogle` at deploy time. Only actually
   * referenced once `config.googleOAuthClientId` is non-empty — see that
   * field's doc comment for the two-phase deploy this gates.
   */
  readonly googleOAuthSecret: secretsmanager.Secret;
}

// ---------------------------------------------------------------------------
// Reusable Cognito construct — customer identity only (Stage 17)
// ---------------------------------------------------------------------------

/**
 * WebpresaUserPool — Amazon Cognito User Pool for customer (not admin)
 * identity, introduced in Stage 17 ("Website Claim Flow"), extended for
 * Google federation ("Sign in with Google").
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
 * `SECRET_HASH` computation is therefore needed for password auth. The new
 * Google OAuth flow below is a separate, public Hosted-UI redirect flow —
 * it doesn't use the AWS SDK or this client secret setting at all.
 *
 * `authFlows: { userPassword: true }` is required explicitly — CDK's
 * default `authFlows` (when omitted) does not include `USER_PASSWORD_AUTH`,
 * which `InitiateAuth` calls from `web/lib/auth/customer-cognito.ts` depend
 * on.
 *
 * Email sending uses Cognito's built-in sender for the MVP (a documented
 * ~50/day ceiling) rather than SES — a deliberate, deferred-work choice
 * (see implementation.md, Stage 17, "Risks and unresolved implementation
 * details") revisited once real signup volume requires it.
 *
 * ── Google federation ("Sign in with Google") ───────────────────────────
 *
 * Two-phase deploy, because Google's OAuth client needs Cognito's Hosted UI
 * domain as its redirect URI, but that domain only exists once deployed:
 *   Phase A (`config.googleOAuthClientId === ''`): only the Hosted UI
 *     domain and the Pre Sign-up linking Lambda are provisioned. No
 *     `UserPoolIdentityProviderGoogle`, no OAuth app-client config — Google
 *     sign-in isn't actually reachable yet.
 *   Manual: create the Google Cloud OAuth client using the domain from
 *     Phase A's `HostedUiDomain` output as the redirect URI
 *     (`{domain}/oauth2/idpresponse`), then populate
 *     `webpresa-{env}-google-oauth`'s `clientId`/`clientSecret`, then set
 *     `googleOAuthClientId` in `environments.ts` to the real value.
 *   Phase B: redeploy — the identity provider and OAuth app-client config
 *     now get created.
 *
 * Account linking (no duplicate accounts when the same email later signs in
 * via Google) is handled by a Pre Sign-up Lambda trigger
 * (`infra/lambda/pre-signup-link`), not by Cognito automatically — Cognito
 * does not merge federated and native users by matching email alone. The
 * trigger looks up an existing native (password) user by email on every
 * `PreSignUp_ExternalProvider` event and, if found, calls
 * `AdminLinkProviderForUser` to link the incoming Google identity to that
 * existing user *before* Cognito would otherwise create a new one — so the
 * resulting sign-in resolves to the original `sub`, and
 * `Business.ownerUserId` needs no changes at all.
 */
export class WebpresaUserPool extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  /** `https://{prefix}.auth.{region}.amazoncognito.com` — the Hosted UI base URL, becomes the app's `COGNITO_HOSTED_UI_DOMAIN`. */
  public readonly hostedUiBaseUrl: string;

  constructor(scope: Construct, id: string, props: WebpresaUserPoolProps) {
    super(scope, id);

    const { config, appBaseUrl, googleOAuthSecret } = props;

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

    this.userPoolDomain = this.userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: `webpresa-${config.suffix}-customers` },
    });
    const region = cdk.Stack.of(this).region;
    this.hostedUiBaseUrl = `https://${this.userPoolDomain.domainName}.auth.${region}.amazoncognito.com`;

    const googleIdp = config.googleOAuthClientId
      ? new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdp', {
          userPool: this.userPool,
          clientId: config.googleOAuthClientId,
          clientSecretValue: googleOAuthSecret.secretValueFromJson('clientSecret'),
          scopes: ['profile', 'email', 'openid'],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
            familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          },
        })
      : undefined;

    this.userPoolClient = this.userPool.addClient('Client', {
      userPoolClientName: `webpresa-${config.suffix}-customers-client`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
      },
      ...(googleIdp
        ? {
            oAuth: {
              flows: { authorizationCodeGrant: true },
              scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
              callbackUrls: [`${appBaseUrl}/api/auth/google/callback`],
              logoutUrls: [appBaseUrl],
            },
            supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO, cognito.UserPoolClientIdentityProvider.GOOGLE],
          }
        : {}),
    });
    if (googleIdp) {
      this.userPoolClient.node.addDependency(googleIdp);
    }

    // Pre Sign-up trigger — wired unconditionally (harmless before Google
    // federation exists: `PreSignUp_ExternalProvider` can't fire without an
    // external identity provider configured, so this is a no-op until
    // Phase B). Wiring it now avoids a second trigger-config deploy later.
    const preSignUpLinkFn = new lambda.Function(this, 'PreSignUpLinkFunction', {
      functionName: `webpresa-${config.suffix}-customers-pre-signup-link`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/pre-signup-link/src')),
      timeout: cdk.Duration.seconds(10),
      description: 'Cognito Pre Sign-up trigger — links a new Google-federated sign-in to an existing native (password) user by email, so no duplicate account is created.',
    });
    preSignUpLinkFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminLinkProviderForUser'],
        // Deliberately `resources: ['*']` rather than `this.userPool.userPoolArn`:
        // referencing the pool's ARN here creates a genuine circular CDK
        // dependency — UserPool depends on this function (LambdaConfig),
        // this function depends on its role's policy (CDK's own auto-added
        // DependsOn), and the policy would depend on UserPool right back
        // (confirmed at synth time — "cyclic dependency" error). Scoped
        // down instead via the aws:ResourceAccount condition key, which
        // every resource this account owns (including this pool) satisfies
        // without naming it directly.
        resources: ['*'],
        conditions: {
          StringEquals: { 'aws:ResourceAccount': cdk.Stack.of(this).account },
        },
      }),
    );
    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpLinkFn);

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

    new cdk.CfnOutput(this, 'HostedUiDomain', {
      value: this.hostedUiBaseUrl,
      exportName: `webpresa-${config.suffix}-customers-hosted-ui-domain`,
      description: `Cognito Hosted UI base URL for webpresa-${config.suffix}-customers (becomes the app's COGNITO_HOSTED_UI_DOMAIN; also the base for the Google OAuth client's redirect URI, {this value}/oauth2/idpresponse)`,
    });
  }
}
