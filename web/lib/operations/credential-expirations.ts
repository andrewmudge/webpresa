/**
 * Stage 24 — a simple, config-driven warning for credentials with a known
 * expiration/rotation requirement, per implementation.md's "a simple
 * configuration-driven warning is sufficient... we do NOT need a
 * general-purpose secrets-management product." No new infrastructure, no
 * dynamic discovery — just a small static list, checked at page-render
 * time.
 *
 * Environment-specific: the Vercel API token behind the `vercel-api` secret
 * is provisioned independently per environment (see deployment.md,
 * "Required environment variables"), so each environment's Operations page
 * only ever warns about its own credentials, resolved via
 * `resolveRuntimeEnvironment()` — never a cross-environment view. Keyed by
 * `resolveRuntimeEnvironment()`'s actual return values (`VERCEL_ENV`:
 * `'production'` | `'preview'` — the dev deployment runs as Vercel
 * "Preview," not literally `'dev'`), with `'preview'`'s list also covering
 * local development (`NODE_ENV=development`/`'test'`), since local dev runs
 * against the same dev-account resources.
 */

export interface CredentialExpiration {
  name: string;
  /** ISO 8601 date (YYYY-MM-DD) — deliberately date-only, not a timestamp; rotation is a day-granularity operational task. */
  expiresAt: string;
  /** Anchor into web/docs/operations.md's credential-rotation runbook section. */
  runbookAnchor: string;
}

// Both dev and prod `vercel-api` secrets share one personal access token
// scoped to the andrew-mudges-projects team (see deployment.md) — same
// expiration on both sides.
const VERCEL_API_TOKEN_EXPIRATION: CredentialExpiration = {
  name: 'Vercel API token',
  expiresAt: '2026-10-29',
  runbookAnchor: '#vercel-api-authentication-fails',
};

const CREDENTIAL_EXPIRATIONS: Record<string, CredentialExpiration[]> = {
  production: [VERCEL_API_TOKEN_EXPIRATION],
  preview: [VERCEL_API_TOKEN_EXPIRATION],
  development: [VERCEL_API_TOKEN_EXPIRATION],
  test: [VERCEL_API_TOKEN_EXPIRATION],
};

const WARNING_WINDOW_DAYS = 30;

export interface CredentialExpirationWarning extends CredentialExpiration {
  daysRemaining: number;
}

/** Only credentials expiring within `WARNING_WINDOW_DAYS` — an empty result is the normal, expected state most of the time. */
export function getUpcomingCredentialExpirations(environment: string, now: Date = new Date()): CredentialExpirationWarning[] {
  const entries = CREDENTIAL_EXPIRATIONS[environment] ?? [];
  const warnings: CredentialExpirationWarning[] = [];

  for (const entry of entries) {
    const daysRemaining = Math.ceil((new Date(entry.expiresAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (daysRemaining <= WARNING_WINDOW_DAYS) {
      warnings.push({ ...entry, daysRemaining });
    }
  }

  return warnings.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
