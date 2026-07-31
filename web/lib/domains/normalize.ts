/**
 * Domain input normalization and validation (Stage 19.x, Part 2). Pure, no
 * I/O — deliberately importable from both server and client code.
 */

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

const RESERVED_HOSTS = new Set(['webpresa.com', 'www.webpresa.com', 'localhost']);

/**
 * Normalizes a customer-entered domain: lowercase, strip protocol/path/
 * query/trailing dot, convert Unicode (IDN) to punycode via the platform's
 * own `URL` implementation, and treat `www.` as an alias choice rather than
 * a separate record — the apex is always the canonical, normalized form.
 */
export function normalizeDomainInput(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.split(/[/?#]/)[0] ?? value;
  value = value.replace(/\.$/, '');
  value = value.replace(/^www\./, '');

  try {
    value = new URL(`http://${value}`).hostname;
  } catch {
    // Leave as-is — isValidDomain rejects anything genuinely malformed.
  }

  return value;
}

/** A domain-specific parser, not a generic URL regex — rejects a bare label, a path fragment, or an obviously malformed string. */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  return DOMAIN_REGEX.test(domain);
}

export function isReservedHost(domain: string): boolean {
  return RESERVED_HOSTS.has(domain) || domain.endsWith('.vercel.app');
}
