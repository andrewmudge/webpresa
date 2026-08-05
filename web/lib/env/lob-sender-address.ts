import 'server-only';
import type { Address } from '@/domain/models/common';

/**
 * Webpresa's own return/sender address (Stage 22) — printed on every
 * postcard, required by Lob on every submission. Not a Secrets Manager
 * value: it's printed on physical mail, not confidential, so it follows
 * `resolveAppBaseUrl`'s plain-env-var pattern rather than
 * `web/lib/secrets/index.ts`'s secret-backed one. Distinct from
 * `Business.address`, which is the *recipient* address for a given postcard.
 */
export interface LobSenderAddress extends Address {
  name: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

export function getLobSenderAddress(): LobSenderAddress {
  return {
    name: requireEnv('WEBPRESA_LOB_SENDER_NAME'),
    line1: requireEnv('WEBPRESA_LOB_SENDER_ADDRESS_LINE1'),
    line2: process.env.WEBPRESA_LOB_SENDER_ADDRESS_LINE2 || undefined,
    city: requireEnv('WEBPRESA_LOB_SENDER_CITY'),
    state: requireEnv('WEBPRESA_LOB_SENDER_STATE'),
    postalCode: requireEnv('WEBPRESA_LOB_SENDER_POSTAL_CODE'),
    country: requireEnv('WEBPRESA_LOB_SENDER_COUNTRY'),
  };
}
