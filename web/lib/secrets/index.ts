import 'server-only';
import {
  getSecretJson,
  SECRET_OPENAI,
  SECRET_FIRECRAWL,
  SECRET_GOOGLE_PLACES,
  SECRET_STRIPE,
  SECRET_LOB,
  SECRET_CAPTURE_TOKEN,
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
}

/** Stage 14 — HMAC signing key shared with the screenshot Lambda (mints tokens this app only verifies). */
export interface CaptureTokenSecret {
  signingKey: string;
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
