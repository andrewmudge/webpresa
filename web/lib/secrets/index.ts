import 'server-only';
import {
  getSecretJson,
  SECRET_OPENAI,
  SECRET_FIRECRAWL,
  SECRET_GOOGLE_PLACES,
  SECRET_STRIPE,
  SECRET_LOB,
  SECRET_CAPTURE_TOKEN,
  SECRET_INTERNAL_API,
  SECRET_CLAIM_TOKEN,
  SECRET_VERCEL_API,
  SECRET_MARKETING_CLICK_TOKEN,
  SECRET_OPENSRS_STOREFRONT,
} from './client';

/**
 * Typed accessors for each third-party integration secret.
 *
 * Each secret is created empty (placeholder values only) by
 * infra/lib/constructs/webpresa-secret.ts — real values are populated
 * out-of-band by the stage that actually needs them (see architecture.md).
 */

export interface OpenAiSecret {
  apiKey: string;
}

export interface FirecrawlSecret {
  apiKey: string;
}

export interface GooglePlacesSecret {
  apiKey: string;
}

export interface StripeSecret {
  secretKey: string;
  webhookSecret: string;
}

export interface LobSecret {
  apiKey: string;
  /**
   * Stage 22 Phase 5 — signs Lob's webhook payloads, one value per
   * registered webhook (Lob generates it when a webhook is created in
   * their dashboard — there is no API to create webhooks or fetch this
   * value programmatically). Populated out-of-band via
   * `aws secretsmanager put-secret-value`, same as `apiKey` — deliberately
   * NOT added to this secret's `jsonKeys` in
   * `infra/lib/stacks/data-stack.ts`: that construct regenerates the
   * secret's `GenerateSecretString` template on any `jsonKeys` change,
   * which would reset the already-populated real `apiKey` to a random
   * placeholder on the next `cdk deploy` touching that stack (see
   * `infra/lib/constructs/webpresa-secret.ts`'s own doc comment). The
   * runtime secret value simply has more keys than what CDK's one-time
   * creation template described, which Secrets Manager has no problem
   * with.
   */
  webhookSecret: string;
}

/** Stage 14 — HMAC signing key shared with the screenshot Lambda (mints tokens this app only verifies). */
export interface CaptureTokenSecret {
  signingKey: string;
}

/** Stage 16 — shared secret; also sourced by the EventBridge Connection that authenticates Step Functions' HttpInvoke calls into `/api/internal/scan/*`. */
export interface InternalApiSecret {
  sharedSecret: string;
}

/** Stage 17 — HMAC pepper for hashing claim tokens (see lib/claim/token.ts). */
export interface ClaimTokenSecret {
  hmacSecret: string;
}

/** Stage 19.x, Part 2 — Vercel Project Domains API credentials. `teamId`/`projectId` are only included when the project belongs to a Vercel team and the API requires that scope. */
export interface VercelApiSecret {
  accessToken: string;
  teamId?: string;
  projectId: string;
}

/** Marketing stage — symmetric key encrypting click-tracking redirect tokens (see lib/marketing/click-token.ts). */
export interface MarketingClickTokenSecret {
  encryptionKey: string;
}

/**
 * OpenSRS Storefront integration — `apiKey` authenticates
 * `lib/opensrs/client.ts`'s calls (customer creation, SSO URL minting);
 * `webhookKey` verifies `POST /api/webhooks/opensrs` deliveries. Both are
 * per-environment (PTE/test in dev, live store in prod) — see this
 * interface's resolver, `SECRET_OPENSRS_STOREFRONT`, for why this is a
 * distinct secret from the reserved `opensrs-api` name.
 */
export interface OpenSrsStorefrontSecret {
  apiKey: string;
  webhookKey: string;
}

export async function getOpenAiSecret(): Promise<OpenAiSecret> {
  return (await getSecretJson(SECRET_OPENAI())) as unknown as OpenAiSecret;
}

export async function getFirecrawlSecret(): Promise<FirecrawlSecret> {
  return (await getSecretJson(SECRET_FIRECRAWL())) as unknown as FirecrawlSecret;
}

export async function getGooglePlacesSecret(): Promise<GooglePlacesSecret> {
  return (await getSecretJson(SECRET_GOOGLE_PLACES())) as unknown as GooglePlacesSecret;
}

export async function getStripeSecret(): Promise<StripeSecret> {
  return (await getSecretJson(SECRET_STRIPE())) as unknown as StripeSecret;
}

export async function getLobSecret(): Promise<LobSecret> {
  return (await getSecretJson(SECRET_LOB())) as unknown as LobSecret;
}

export async function getCaptureTokenSecret(): Promise<CaptureTokenSecret> {
  return (await getSecretJson(SECRET_CAPTURE_TOKEN())) as unknown as CaptureTokenSecret;
}

export async function getInternalApiSecret(): Promise<InternalApiSecret> {
  return (await getSecretJson(SECRET_INTERNAL_API())) as unknown as InternalApiSecret;
}

export async function getClaimTokenSecret(): Promise<ClaimTokenSecret> {
  return (await getSecretJson(SECRET_CLAIM_TOKEN())) as unknown as ClaimTokenSecret;
}

export async function getVercelApiSecret(): Promise<VercelApiSecret> {
  return (await getSecretJson(SECRET_VERCEL_API())) as unknown as VercelApiSecret;
}

export async function getMarketingClickTokenSecret(): Promise<MarketingClickTokenSecret> {
  return (await getSecretJson(SECRET_MARKETING_CLICK_TOKEN())) as unknown as MarketingClickTokenSecret;
}

export async function getOpenSrsStorefrontSecret(): Promise<OpenSrsStorefrontSecret> {
  return (await getSecretJson(SECRET_OPENSRS_STOREFRONT())) as unknown as OpenSrsStorefrontSecret;
}
