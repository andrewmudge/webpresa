import 'server-only';
import { resolveRuntimeEnvironment } from '@/lib/env/runtime-environment';

/**
 * Stage 24 — shared structured logging. Before this, every workflow logged
 * ad hoc `console.log`/`console.error` calls, and the only precedent for
 * "structured, safe logging" was a small private `logSafely()` helper
 * duplicated in both `app/api/webhooks/{stripe,lob}/route.ts`. This
 * generalizes that precedent into one function used across the highest-value
 * workflows (see `implementation.md`, Stage 24).
 *
 * `LogFields` is a closed, explicit set of keys — the redaction boundary is
 * the type itself, not a denylist scan. There is no field to put a raw
 * secret, provider payload, or Authorization header into in the first
 * place. `serializeLogFields` additionally strips anything at runtime that
 * isn't one of these keys, so even a caller that bypasses the type (e.g. a
 * spread of an untyped object cast `as LogFields`) can't leak an unexpected
 * field through.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  level?: LogLevel;
  /** Stable, machine-readable event name, e.g. "scan.enrichment.failed". */
  event: string;
  /** Human-readable summary — never a raw provider error or stack trace. */
  message?: string;
  service?: string;
  component?: string;
  requestId?: string;
  businessId?: string;
  scanId?: string;
  scanExecutionId?: string;
  previewId?: string;
  postcardId?: string;
  campaignId?: string;
  campaignRecipientId?: string;
  claimId?: string;
  leadId?: string;
  provider?: string;
  operation?: string;
  status?: string;
  errorCategory?: string;
  retryable?: boolean;
  attempt?: number;
  durationMs?: number;
}

const ALLOWED_KEYS: readonly (keyof LogFields)[] = [
  'level',
  'event',
  'message',
  'service',
  'component',
  'requestId',
  'businessId',
  'scanId',
  'scanExecutionId',
  'previewId',
  'postcardId',
  'campaignId',
  'campaignRecipientId',
  'claimId',
  'leadId',
  'provider',
  'operation',
  'status',
  'errorCategory',
  'retryable',
  'attempt',
  'durationMs',
];

const DEFAULT_SERVICE = 'webpresa';

/**
 * Runtime allowlist filter — picks only `ALLOWED_KEYS` off the input object,
 * ignoring anything else present at runtime regardless of what the static
 * type claims. This is what makes redaction a real guarantee rather than a
 * compile-time-only one.
 */
export function serializeLogFields(fields: LogFields): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    const value = (fields as unknown as Record<string, unknown>)[key];
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}

/**
 * Emit one structured, single-line JSON log entry to stdout/stderr — Vercel
 * and CloudWatch both capture process stdout/stderr directly, so no log
 * shipping is added here. `level: 'error'` routes to `console.error` (also
 * what Stage 24's CloudWatch Logs metric filters key off of for alarms).
 */
export function log(fields: LogFields): void {
  const picked = serializeLogFields(fields);
  const level = fields.level ?? 'info';

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: DEFAULT_SERVICE,
    environment: resolveRuntimeEnvironment(),
    ...picked,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
