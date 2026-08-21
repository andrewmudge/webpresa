import 'server-only';
import { resolveRuntimeEnvironment } from '@/lib/env/runtime-environment';

/**
 * Outside production, a marketing email may only go to an allowlisted test
 * recipient — prevents dev/preview environments from ever emailing a real
 * prospect (see `implementation.md`, Marketing stage, "Dev/prod safety").
 * Configured via `MARKETING_TEST_RECIPIENT_ALLOWLIST`, a comma-separated
 * list of exact addresses and/or `@domain` suffixes. Always allowed in
 * production — no gate there; SES's own domain verification and
 * account-level sending are the production boundary.
 */
export function isNonProdRecipientAllowed(email: string): boolean {
  if (resolveRuntimeEnvironment() === 'production') return true;

  const raw = process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST;
  if (!raw) return false;

  const normalized = email.trim().toLowerCase();
  const entries = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return entries.some((entry) => (entry.startsWith('@') ? normalized.endsWith(entry) : normalized === entry));
}
