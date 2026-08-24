import 'server-only';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';

/**
 * Cognito Hosted UI's OAuth Authorization Code flow — "Sign in with
 * Google" (see `infra/lib/constructs/webpresa-user-pool.ts` for the
 * Cognito-side federation config this depends on). Plain HTTPS calls to
 * Cognito's own Hosted UI domain, not the AWS SDK — the App Client has no
 * client secret (`generateSecret: false`), so no Basic-auth/`client_secret`
 * is needed for the token exchange, the same reasoning `customer-cognito.ts`
 * already documents for why `InitiateAuth` needs no `SECRET_HASH`.
 */

function getHostedUiDomain(): string {
  const domain = process.env.COGNITO_HOSTED_UI_DOMAIN;
  if (!domain) throw new Error('COGNITO_HOSTED_UI_DOMAIN environment variable is not set');
  return domain.replace(/\/$/, '');
}

function getClientId(): string {
  const id = process.env.COGNITO_USER_POOL_CLIENT_ID;
  if (!id) throw new Error('COGNITO_USER_POOL_CLIENT_ID environment variable is not set');
  return id;
}

/** Must exactly match the App Client's `callbackUrls` entry set at deploy time. */
function getRedirectUri(): string {
  return `${resolveAppBaseUrl()}/api/auth/google/callback`;
}

export function buildGoogleAuthorizeUrl(state: string): string {
  const url = new URL(`${getHostedUiDomain()}/oauth2/authorize`);
  url.searchParams.set('client_id', getClientId());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('redirect_uri', getRedirectUri());
  url.searchParams.set('identity_provider', 'Google');
  url.searchParams.set('state', state);
  return url.toString();
}

/**
 * Exchanges an OAuth authorization code for tokens at Cognito Hosted UI's
 * `/oauth2/token` endpoint. Returns `null` on any failure — callers treat
 * that uniformly as "sign-in failed," never surfacing Cognito-specific
 * detail to the client (same convention as every function in
 * `customer-cognito.ts`).
 */
export async function exchangeGoogleOAuthCode(code: string): Promise<{ idToken: string } | null> {
  try {
    const response = await fetch(`${getHostedUiDomain()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: getClientId(),
        code,
        redirect_uri: getRedirectUri(),
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { id_token?: string };
    if (!data.id_token) return null;
    return { idToken: data.id_token };
  } catch {
    return null;
  }
}
