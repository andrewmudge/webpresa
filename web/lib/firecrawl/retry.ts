import 'server-only';
import type { ScanFailureCategory } from '@/domain/models/scan-event';

/**
 * Which failure categories are eligible for the pipeline's own bounded
 * automatic retry (distinct from the admin-triggered manual retry, which
 * accepts any category the UI marks eligible). Only transient
 * provider/network conditions qualify — never input/configuration errors,
 * which will fail identically on every retry.
 */
const RETRYABLE_CATEGORIES: ReadonlySet<ScanFailureCategory> = new Set([
  'firecrawl_rate_limit',
  'firecrawl_timeout',
  'firecrawl_provider_error',
]);

export function isRetryableFailureCategory(category: ScanFailureCategory): boolean {
  return RETRYABLE_CATEGORIES.has(category);
}

const MAX_AUTOMATIC_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15_000;

/**
 * Bounded exponential backoff with jitter, honoring a provider-supplied
 * `Retry-After` when present. `attempt` is 1-based (the attempt number that
 * just failed). Returns `undefined` once the automatic retry budget is
 * exhausted — the caller should stop and leave the scan `failed` for a
 * manual admin retry instead.
 */
export function computeAutomaticRetryDelayMs(
  attempt: number,
  retryAfterSeconds?: number,
): number | undefined {
  if (attempt > MAX_AUTOMATIC_RETRIES) return undefined;
  if (retryAfterSeconds !== undefined) {
    return Math.min(retryAfterSeconds * 1000, MAX_DELAY_MS * 4);
  }
  const exponential = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  const jitter = Math.random() * exponential * 0.25;
  return Math.round(exponential + jitter);
}

export { MAX_AUTOMATIC_RETRIES };
