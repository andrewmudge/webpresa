import 'server-only';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

/**
 * Singleton Secrets Manager client.
 *
 * The AWS region is read from the AWS_REGION environment variable.
 * Credentials are resolved from the default SDK credential chain:
 *   - Local dev:  IAM Identity Center SSO profile (AWS_PROFILE=webpresa)
 *   - Vercel:     AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars
 *                 (dedicated least-privilege IAM user — see deployment.md)
 *
 * Never expose this module or its callers to browser bundles. Never log
 * a secret's parsed value or raw SecretString.
 */

let client: SecretsManagerClient | undefined;

export function getSecretsManagerClient(): SecretsManagerClient {
  if (client) return client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION environment variable is not set');
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  client = new SecretsManagerClient({
    region,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  return client;
}

// ---------------------------------------------------------------------------
// Secret name helpers — read from environment variables
// ---------------------------------------------------------------------------

export function getSecretName(envVar: string): string {
  const name = process.env[envVar];
  if (!name) {
    throw new Error(`${envVar} environment variable is not set`);
  }
  return name;
}

export const SECRET_OPENAI = () => getSecretName('OPENAI_SECRET_NAME');
export const SECRET_FIRECRAWL = () => getSecretName('FIRECRAWL_SECRET_NAME');
export const SECRET_GOOGLE_PLACES = () => getSecretName('GOOGLE_PLACES_SECRET_NAME');
export const SECRET_STRIPE = () => getSecretName('STRIPE_SECRET_NAME');
export const SECRET_LOB = () => getSecretName('LOB_SECRET_NAME');
// Stage 14 — signs/verifies the Playwright Lambda's preview capture token
// (see lib/capture-token.ts). Also readable by the screenshot Lambda itself
// (a separate deployable — see infra/lambda/screenshot-capture/), which
// mints tokens with the same secret; this app only ever verifies.
export const SECRET_CAPTURE_TOKEN = () => getSecretName('CAPTURE_TOKEN_SECRET_NAME');

// ---------------------------------------------------------------------------
// Cached JSON secret retrieval
//
// Cached indefinitely for the lifetime of the process (matches Vercel's
// serverless function instance reuse). Rotation requires a redeploy or cold
// start to pick up a new value — automated rotation is deferred work.
// ---------------------------------------------------------------------------

const cache = new Map<string, Record<string, string>>();

export async function getSecretJson(secretName: string): Promise<Record<string, string>> {
  const cached = cache.get(secretName);
  if (cached) return cached;

  const client = getSecretsManagerClient();
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  if (!result.SecretString) {
    throw new Error(`Secret "${secretName}" has no SecretString value`);
  }

  const parsed = JSON.parse(result.SecretString) as Record<string, string>;
  cache.set(secretName, parsed);
  return parsed;
}
