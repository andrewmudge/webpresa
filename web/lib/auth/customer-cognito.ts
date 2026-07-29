import 'server-only';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

/**
 * Cognito-backed customer identity (Stage 17). Amazon Cognito is the
 * customer directory — this app never stores customer credentials itself.
 * Every function here maps Cognito's specific exceptions to a small,
 * generic reason code; callers must never surface a Cognito-specific error
 * string to the client (see implementation.md, Stage 17, "Security
 * requirements").
 *
 * Hard rule: nothing here is ever read as proof of business ownership.
 * Ownership is decided exclusively by `Business.ownerUserId`, set only by
 * the claim-token consumption transaction (`lib/db/claims.ts`).
 *
 * Direct server-side SDK calls, authenticated the same way every other AWS
 * call in this app is — the Vercel IAM user's credentials, scoped to the
 * User Pool ARN via `cognito-idp:*` actions in
 * `infra/lib/stacks/vercel-access-stack.ts`. The User Pool Client has no
 * client secret (`generateSecret: false`), so no `SECRET_HASH` computation
 * is needed for these calls.
 */

let client: CognitoIdentityProviderClient | undefined;

function getCognitoClient(): CognitoIdentityProviderClient {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  client = new CognitoIdentityProviderClient({
    region,
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });

  return client;
}

function getUserPoolId(): string {
  const id = process.env.COGNITO_USER_POOL_ID;
  if (!id) throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
  return id;
}

function getClientId(): string {
  const id = process.env.COGNITO_USER_POOL_CLIENT_ID;
  if (!id) throw new Error('COGNITO_USER_POOL_CLIENT_ID environment variable is not set');
  return id;
}

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : '';
}

// ---------------------------------------------------------------------------
// Sign-up
// ---------------------------------------------------------------------------

export type SignUpFailureReason = 'email_taken' | 'weak_password' | 'rate_limited' | 'unknown';

function mapSignUpError(err: unknown): SignUpFailureReason {
  switch (errorName(err)) {
    case 'UsernameExistsException':
      return 'email_taken';
    case 'InvalidPasswordException':
    case 'InvalidParameterException':
      return 'weak_password';
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return 'rate_limited';
    default:
      return 'unknown';
  }
}

/**
 * Normalizes a US phone number to E.164 (`+1XXXXXXXXXX`) — the format Cognito
 * requires for its `phone_number` standard attribute, or `SignUpCommand`
 * throws `InvalidParameterException`. Callers are expected to have already
 * validated the input is a 10-digit US number (see `SignUpSchema` in
 * `app/claim/actions.ts`); this just reformats it.
 */
export function toE164UsPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const tenDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return `+1${tenDigits}`;
}

export interface CustomerProfileInput {
  firstName: string;
  lastName: string;
  /** 10-digit US number — normalized to E.164 before reaching Cognito. */
  phone: string;
}

/**
 * Create a new Cognito account. Cognito enforces email uniqueness natively
 * — no app-level uniqueness transaction is needed (contrast the removed
 * `CustomerAccount` email-lock-item design this replaced). Self-service
 * sign-up leaves the account `UNCONFIRMED` until `confirmCustomerSignUp`
 * succeeds with the emailed code.
 *
 * `given_name`/`family_name`/`phone_number` are sent as plain standard
 * attributes — deliberately not added to the User Pool's CDK-managed
 * `standardAttributes` schema (see `infra/lib/constructs/webpresa-user-pool.ts`),
 * since changing that schema after pool creation forces a destructive
 * CloudFormation replacement of the whole pool. "Required" for these three
 * is enforced only at the application layer (`SignUpSchema`), not by Cognito.
 */
export async function signUpCustomer(
  email: string,
  password: string,
  profile: CustomerProfileInput,
): Promise<{ ok: true } | { ok: false; reason: SignUpFailureReason }> {
  try {
    await getCognitoClient().send(
      new SignUpCommand({
        ClientId: getClientId(),
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'given_name', Value: profile.firstName },
          { Name: 'family_name', Value: profile.lastName },
          { Name: 'phone_number', Value: toE164UsPhone(profile.phone) },
        ],
      }),
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: mapSignUpError(err) };
  }
}

export async function confirmCustomerSignUp(email: string, code: string): Promise<boolean> {
  try {
    await getCognitoClient().send(
      new ConfirmSignUpCommand({ ClientId: getClientId(), Username: email, ConfirmationCode: code }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Never discloses whether the account exists — errors are swallowed. */
export async function resendCustomerConfirmationCode(email: string): Promise<void> {
  try {
    await getCognitoClient().send(new ResendConfirmationCodeCommand({ ClientId: getClientId(), Username: email }));
  } catch {
    // Intentionally ignored.
  }
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export type SignInFailureReason = 'needs_confirmation' | 'invalid_credentials' | 'rate_limited' | 'unknown';

function mapSignInError(err: unknown): SignInFailureReason {
  switch (errorName(err)) {
    case 'UserNotConfirmedException':
      return 'needs_confirmation';
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return 'invalid_credentials';
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return 'rate_limited';
    default:
      return 'unknown';
  }
}

/**
 * The ID token returned by `InitiateAuth` comes directly from a trusted,
 * server-to-server AWS SDK call over TLS — not from client input — so its
 * claims are decoded without a second signature-verification pass (the same
 * trust level as any other AWS API response).
 */
function decodeIdTokenClaims(idToken: string): { sub: string; email: string } | null {
  try {
    const payloadSegment = idToken.split('.')[1];
    if (!payloadSegment) return null;
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as { sub?: string; email?: string };
    if (!claims.sub || !claims.email) return null;
    return { sub: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}

export async function signInCustomer(
  email: string,
  password: string,
): Promise<{ ok: true; sub: string; email: string } | { ok: false; reason: SignInFailureReason }> {
  try {
    const result = await getCognitoClient().send(
      new InitiateAuthCommand({
        ClientId: getClientId(),
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    );
    const idToken = result.AuthenticationResult?.IdToken;
    if (!idToken) return { ok: false, reason: 'unknown' };
    const claims = decodeIdTokenClaims(idToken);
    if (!claims) return { ok: false, reason: 'unknown' };
    return { ok: true, sub: claims.sub, email: claims.email };
  } catch (err) {
    return { ok: false, reason: mapSignInError(err) };
  }
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** Never discloses whether the account exists — errors are swallowed. */
export async function requestCustomerPasswordReset(email: string): Promise<void> {
  try {
    await getCognitoClient().send(new ForgotPasswordCommand({ ClientId: getClientId(), Username: email }));
  } catch {
    // Intentionally ignored.
  }
}

export type ConfirmPasswordResetFailureReason = 'invalid_code' | 'weak_password' | 'unknown';

export async function confirmCustomerPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: ConfirmPasswordResetFailureReason }> {
  try {
    await getCognitoClient().send(
      new ConfirmForgotPasswordCommand({
        ClientId: getClientId(),
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      }),
    );
    return { ok: true };
  } catch (err) {
    const name = errorName(err);
    if (name === 'InvalidPasswordException') return { ok: false, reason: 'weak_password' };
    if (name === 'CodeMismatchException' || name === 'ExpiredCodeException') {
      return { ok: false, reason: 'invalid_code' };
    }
    return { ok: false, reason: 'unknown' };
  }
}

// ---------------------------------------------------------------------------
// Admin lookup (ownership-release UI — Stage 17, "Ownership recovery")
// ---------------------------------------------------------------------------

const SUB_SHAPE = /^[0-9a-f-]{10,64}$/i;

export interface CustomerProfile {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Resolve a customer's profile from their Cognito `sub` (the value stored in
 * `Business.ownerUserId`) — used so an admin can see who currently owns a
 * business (e.g. before releasing ownership, or just displayed on the
 * business detail page). Uses `ListUsers` with a `sub` filter rather than
 * `AdminGetUser`, since the Username Cognito assigns internally is not
 * necessarily the `sub` itself.
 */
export async function adminGetCustomerProfileBySub(sub: string): Promise<CustomerProfile | null> {
  if (!SUB_SHAPE.test(sub)) return null;
  try {
    const result = await getCognitoClient().send(
      new ListUsersCommand({
        UserPoolId: getUserPoolId(),
        Filter: `sub = "${sub}"`,
        Limit: 1,
      }),
    );
    const user = result.Users?.[0];
    if (!user) return null;
    const attr = (name: string) => user.Attributes?.find((a) => a.Name === name)?.Value;
    const email = attr('email');
    if (!email) return null;
    return {
      email,
      firstName: attr('given_name'),
      lastName: attr('family_name'),
      phone: attr('phone_number'),
    };
  } catch {
    return null;
  }
}
