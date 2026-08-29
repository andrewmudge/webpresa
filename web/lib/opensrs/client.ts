import 'server-only';
import { createHash } from 'node:crypto';
import { getOpenSrsStorefrontSecret } from '@/lib/secrets';

/**
 * OpenSRS Storefront integration — thin REST client. Deliberately a
 * hand-written `fetch` wrapper, not a raw-XML/MD5-signed client like the
 * (superseded) raw-reseller-API design in implementation.md's old Part 3 —
 * Storefront is a distinct OpenSRS product with its own JSON REST API,
 * matching this repo's existing "hand-written adapter isolated in one
 * module" pattern for Firecrawl/Lob (see `lib/lob/client.ts`).
 *
 * Endpoints and payload shapes below are confirmed (2026-08-28/29) against
 * OpenSRS's real public support docs ("API: Managing Customers"):
 * `POST /v1/customer` (singular) takes `first_name`/`last_name`/`email`/
 * `username`/`address1`/`city`/`state`/`postal_code`/`country`/`phone` as
 * required fields plus optional `external_user_id`, and returns the new
 * customer's UUID as a bare JSON string (not an object) — both corrected
 * here from an earlier best-effort guess. `POST /v1/customer/{customer_id}/sso_url`
 * (`{ url, expires_at }`) matches what `web/docs/open_srs.md` already
 * documented.
 *
 * Authentication is OAuth 2.0 client-credentials (confirmed 2026-08-29,
 * against a real `401 invalid authentication token` response — an earlier
 * version of this client sent the raw API key directly as the Bearer
 * token, which OpenSRS correctly rejects): `clientId`/`apiKey` (the latter
 * functioning as the OAuth Client Secret) are exchanged via HTTP Basic Auth
 * for a short-lived access token at `POST {authHost}/oauth2/token`
 * (`grant_type=client_credentials`), and *that* token — not the raw
 * credential — is what goes in `Authorization: Bearer`. The auth host is
 * derived from `OPENSRS_STOREFRONT_API_BASE_URL` by swapping its `api.`
 * prefix for `auth.` (confirmed for the live host, `auth.shopco.com`;
 * `auth.test.shopco.com` for PTE follows the same naming convention every
 * other environment-specific Storefront host uses but isn't independently
 * confirmed — adjust here if PTE's real auth host differs).
 *
 * Environment isolation: `OPENSRS_STOREFRONT_SECRET_NAME` (dev → PTE
 * credentials, prod → live-store credentials) already resolves through
 * `getSecretName()` → `assertResourceEnvironmentConsistency()`
 * (`lib/env/resource-consistency.ts`), which fails loudly if this process
 * ever resolves a `webpresa-dev-*` and a `webpresa-prod-*` resource name
 * together — the same cross-environment guard every other secret/table in
 * this app already relies on. Unlike Lob/Stripe, OpenSRS key strings have
 * no documented `test_`/`live_` prefix convention this client can check, so
 * there's no `assertLiveModeAllowed`-style liveness check here — the
 * resource-name consistency guard above is the isolation boundary instead.
 */

const CREATE_CUSTOMER_PATH = '/v1/customer';

function resolveApiBaseUrl(): string {
  const baseUrl = process.env.OPENSRS_STOREFRONT_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('OPENSRS_STOREFRONT_API_BASE_URL environment variable is not set');
  }
  return baseUrl;
}

function resolveTokenEndpoint(): string {
  const url = new URL(resolveApiBaseUrl());
  url.hostname = url.hostname.replace(/^api\./, 'auth.');
  url.pathname = '/oauth2/token';
  url.search = '';
  return url.toString();
}

export class OpenSrsStorefrontApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * Cached per-process, like every other credential in this app — refreshed
 * proactively (30s safety margin) rather than reactively on a 401, since
 * OpenSRS's documented `expires_in` (~3600s) is trustworthy and a reactive
 * retry-after-401 would add a second round trip to every token expiry.
 * Deliberately no lock around a concurrent double-fetch on cold start — an
 * extra token request is harmless, unlike a double domain purchase.
 */
let cachedToken: { accessToken: string; expiresAt: number } | undefined;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.accessToken;
  }

  const { clientId, apiKey: clientSecret } = await getOpenSrsStorefrontSecret();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(resolveTokenEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const detail = body && typeof body === 'object' ? JSON.stringify(body) : `HTTP ${response.status}`;
    throw new OpenSrsStorefrontApiError(`OpenSRS Storefront token request failed: ${detail}`, response.status, body);
  }

  const token = body as OAuthTokenResponse;
  cachedToken = { accessToken: token.access_token, expiresAt: now + token.expires_in * 1000 };
  return cachedToken.accessToken;
}

async function openSrsRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const detail = body && typeof body === 'object' ? JSON.stringify(body) : `HTTP ${response.status}`;
    throw new OpenSrsStorefrontApiError(`OpenSRS Storefront request to ${path} failed: ${detail}`, response.status, body);
  }
  return body as T;
}

/**
 * OpenSRS caps `username` at 20 chars — too short for `webpresa_<sub>`
 * (a Cognito `sub` is a 36-char UUID). Deterministic per customer (so a
 * retried `createStorefrontCustomer` call after a transient failure
 * produces the same username, not a new random one) via a short hash
 * rather than the sub itself, prefixed to stay obviously Webpresa-sourced
 * within Storefront's own customer list.
 */
function deriveStorefrontUsername(externalUserId: string): string {
  return `wp${createHash('sha256').update(externalUserId).digest('hex').slice(0, 18)}`;
}

interface CreateStorefrontCustomerParams {
  email: string;
  firstName: string;
  lastName: string;
  /** Required by OpenSRS; sourced from the business's own address/phone, since this app never
   *  collects a customer's personal address — see `resolveOpenSrsCustomerId`'s doc comment.
   *  `phone` is passed through as-is; NOT verified to be E.164 as OpenSRS requires — a real
   *  gap flagged here rather than silently assumed correct, since this app doesn't normalize
   *  phone numbers anywhere today. */
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  /** 2-letter ISO 3166-1 alpha-2 country code. */
  country: string;
  phone: string;
  /** Cognito `sub` — the durable Webpresa customer identity. */
  externalUserId: string;
}

/** Creates a new Storefront customer, tagged with this person's Cognito `sub` via `external_user_id` — see `web/docs/open_srs.md`, "Link your own customer ID to Storefront." Returns the bare customer-id UUID string OpenSRS responds with. */
export async function createStorefrontCustomer(params: CreateStorefrontCustomerParams): Promise<string> {
  return openSrsRequest<string>(CREATE_CUSTOMER_PATH, {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      username: deriveStorefrontUsername(params.externalUserId),
      address1: params.addressLine1,
      city: params.city,
      state: params.state,
      postal_code: params.postalCode,
      country: params.country,
      phone: params.phone,
      external_user_id: params.externalUserId,
    }),
  });
}

interface SsoUrlResponse {
  url: string;
  expires_at: string;
}

/**
 * Mints a one-time, single-use SSO login URL for an existing Storefront
 * customer — confirmed endpoint shape from `web/docs/open_srs.md`,
 * "Redirect a customer into their Storefront account": expires 15 minutes
 * after generation, usable once. Generate immediately before redirecting;
 * never store or reuse.
 */
export async function getStorefrontSsoUrl(customerId: string): Promise<SsoUrlResponse> {
  return openSrsRequest<SsoUrlResponse>(`/v1/customer/${encodeURIComponent(customerId)}/sso_url`, {
    method: 'POST',
  });
}
