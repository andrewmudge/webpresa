import 'server-only';
import { getOpenSrsStorefrontSecret } from '@/lib/secrets';

/**
 * OpenSRS Storefront integration — thin REST client. Deliberately a
 * hand-written `fetch` wrapper, not a raw-XML/MD5-signed client like the
 * (superseded) raw-reseller-API design in implementation.md's old Part 3 —
 * Storefront is a distinct OpenSRS product with its own JSON REST API,
 * matching this repo's existing "hand-written adapter isolated in one
 * module" pattern for Firecrawl/Lob (see `lib/lob/client.ts`).
 *
 * **Endpoint paths below are best-effort, not confirmed against real
 * OpenSRS Storefront API documentation** — `open_srs.md`'s pasted docs only
 * explicitly document the SSO URL endpoint's path
 * (`POST /v1/customer/{customer_id}/sso_url`) and the JSON body shape for
 * customer creation (`external_user_id` alongside `first_name`/`last_name`/
 * `email`/`username`), not the create-customer endpoint's own path/method.
 * Confirm `CREATE_CUSTOMER_PATH` (and the response field actually named
 * `customer_id` vs. something else) against Storefront Manager's own
 * Developers/API section before relying on this in the PTE environment —
 * see `web/docs/open_srs.md`'s noted documentation gap.
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

const CREATE_CUSTOMER_PATH = '/v1/customers';

function resolveApiBaseUrl(): string {
  const baseUrl = process.env.OPENSRS_STOREFRONT_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('OPENSRS_STOREFRONT_API_BASE_URL environment variable is not set');
  }
  return baseUrl;
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

async function openSrsRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = await getOpenSrsStorefrontSecret();

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${apiKey}`,
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

interface CreateStorefrontCustomerParams {
  email: string;
  firstName: string;
  lastName: string;
  /** Cognito `sub` — the durable Webpresa customer identity. */
  externalUserId: string;
}

interface CreateStorefrontCustomerResponse {
  customer_id: string;
}

/** Creates a new Storefront customer, tagged with this person's Cognito `sub` via `external_user_id` — see `web/docs/open_srs.md`, "Link your own customer ID to Storefront." */
export async function createStorefrontCustomer(params: CreateStorefrontCustomerParams): Promise<string> {
  const response = await openSrsRequest<CreateStorefrontCustomerResponse>(CREATE_CUSTOMER_PATH, {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      username: `webpresa_${params.externalUserId}`,
      external_user_id: params.externalUserId,
    }),
  });
  return response.customer_id;
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
