import 'server-only';
import { promises as dns } from 'node:dns';
import { isIPv4 } from 'node:net';

/**
 * Server-side SSRF guard for any *genuinely untrusted* URL this app hands
 * to a provider or fetches directly — website source URLs, Firecrawl's
 * reported final redirect URL, discovered image URLs (see
 * `lib/firecrawl/images.ts`), and Stage 14 Playwright's `existing_site`
 * capture target (see `lib/screenshots/`). Never rely on client-side
 * validation alone.
 *
 * Relocated here from `lib/firecrawl/` in Stage 14 — this was already a
 * cross-cutting concern (see `implementation.md`, Stage 25, "Security
 * Hardening"), not a Firecrawl-only one; Stage 14 needed the identical
 * guard for a second untrusted-URL source. Stage 14's own `generated_preview`
 * capture target does **not** use this guard — that destination is always
 * Webpresa's own configured origin, so it enforces a strict same-origin
 * policy instead (see `implementation.md`, Stage 14, "URL validation").
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
  /** Normalized URL string — only present when `ok` is true. */
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
    inRange('0.0.0.0', 8) || // "this" network
    inRange('10.0.0.0', 8) || // RFC1918
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) || // loopback
    inRange('169.254.0.0', 16) || // link-local (includes 169.254.169.254 metadata endpoint)
    inRange('172.16.0.0', 12) || // RFC1918
    inRange('192.0.0.0', 24) || // IETF protocol assignments
    inRange('192.0.2.0', 24) || // TEST-NET-1
    inRange('192.168.0.0', 16) || // RFC1918
    inRange('198.18.0.0', 15) || // benchmarking
    inRange('198.51.100.0', 24) || // TEST-NET-2
    inRange('203.0.113.0', 24) || // TEST-NET-3
    inRange('224.0.0.0', 4) || // multicast
    inRange('240.0.0.0', 4) // reserved
  );
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true; // link-local fe80::/10
  }
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — validate the embedded IPv4 address.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateOrReservedIPv4(mapped[1]);
  return false;
}

function isBlockedAddress(address: string): boolean {
  return isIPv4(address) ? isPrivateOrReservedIPv4(address) : isPrivateOrReservedIPv6(address);
}

/**
 * Validates and normalizes a URL before it is ever passed to Firecrawl or
 * fetched directly. Requires http(s), no embedded credentials, a resolvable
 * hostname, and every resolved address to be public (rejects loopback,
 * RFC1918 private ranges, link-local, the AWS metadata endpoint, and other
 * reserved ranges).
 */
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

  // A bare IP literal in the URL — validate it directly without a DNS lookup.
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
