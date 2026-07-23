import { promises as dns } from 'node:dns';
import { isIPv4 } from 'node:net';

/**
 * SSRF guard for the `existing_site` capture target (`Business.websiteUrl`
 * — a genuinely untrusted, admin-supplied external URL). The
 * `generated_preview` target does **not** use this — see `same-origin.ts`.
 *
 * DELIBERATE DUPLICATE of `web/lib/security/url-validation.ts`. This repo
 * has no npm workspace tooling — `web/`, `infra/`, and this Lambda package
 * are three fully independent projects — so true code sharing across them
 * isn't available without introducing monorepo tooling, which is out of
 * scope for this stage. Kept byte-for-byte behaviorally identical to the
 * canonical copy; if either changes, update both (see
 * `web/lib/security/url-validation.ts`'s own doc comment, which names this
 * exact tradeoff).
 */

export const URL_REJECTION_REASONS = [
  'unsupported_protocol',
  'embedded_credentials',
  'invalid_hostname',
  'unresolvable_hostname',
  'private_or_blocked_address',
] as const;
export type UrlRejectionReason = (typeof URL_REJECTION_REASONS)[number];

export interface UrlValidationResult {
  ok: boolean;
  normalizedUrl?: string;
  reason?: UrlRejectionReason;
}

const BLOCKED_HOSTNAMES = new Set(['localhost']);

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  const int = ipv4ToInt(ip);
  const inRange = (base: string, maskBits: number) => {
    const baseInt = ipv4ToInt(base);
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (int & mask) === (baseInt & mask);
  };
  return (
    inRange('0.0.0.0', 8) ||
    inRange('10.0.0.0', 8) ||
    inRange('100.64.0.0', 10) ||
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.0.0.0', 24) ||
    inRange('192.0.2.0', 24) ||
    inRange('192.168.0.0', 16) ||
    inRange('198.18.0.0', 15) ||
    inRange('198.51.100.0', 24) ||
    inRange('203.0.113.0', 24) ||
    inRange('224.0.0.0', 4) ||
    inRange('240.0.0.0', 4)
  );
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true;
  }
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateOrReservedIPv4(mapped[1]);
  return false;
}

function isBlockedAddress(address: string): boolean {
  return isIPv4(address) ? isPrivateOrReservedIPv4(address) : isPrivateOrReservedIPv6(address);
}

export async function validateOutboundUrl(rawUrl: string): Promise<UrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid_hostname' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'unsupported_protocol' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'embedded_credentials' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local')) {
    return { ok: false, reason: 'invalid_hostname' };
  }

  if (isIPv4(hostname) || hostname.includes(':')) {
    if (isBlockedAddress(hostname)) return { ok: false, reason: 'private_or_blocked_address' };
    return { ok: true, normalizedUrl: parsed.toString() };
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, reason: 'unresolvable_hostname' };
  }

  if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
    return { ok: false, reason: 'private_or_blocked_address' };
  }

  return { ok: true, normalizedUrl: parsed.toString() };
}
