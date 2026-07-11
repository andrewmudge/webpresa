/**
 * Shared factory utilities.
 *
 * `crypto.randomUUID()` is available globally in Node.js 14.17+,
 * modern browsers, and Cloudflare Workers — no polyfill required.
 */

/**
 * Generate a prefixed, globally unique identifier.
 *
 * @example
 *   generateId('biz_')      // "biz_550e8400-e29b-41d4-a716-446655440000"
 *   generateId('preview_')  // "preview_6ba7b810-9dad-11d1-80b4-00c04fd430c8"
 */
export function generateId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}

/**
 * Return the current UTC time as an ISO 8601 string.
 * Always ends in `Z` — compatible with `z.string().datetime()`.
 */
export function nowIso(): string {
  return new Date().toISOString();
}
