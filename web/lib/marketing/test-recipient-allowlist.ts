import 'server-only';
import { resolveRuntimeEnvironment } from '@/lib/env/runtime-environment';

/**
 * Outside production, a marketing email may only go to an allowlisted test
 * recipient — an app-level guard against a dev/preview environment
 * choosing to email a real prospect (e.g. a stray "Send Test Email" or
 * manual admin click), independent of and in addition to whatever SES's
 * own sandbox/production-access status happens to be (see
 * `implementation.md`, Marketing stage, "Dev/prod safety"). Configured via
 * `MARKETING_TEST_RECIPIENT_ALLOWLIST`, a comma-separated list of exact
 * addresses and/or `@domain` suffixes — or the literal `*`, which disables
 * this gate entirely (every recipient allowed), a deliberate opt-out for an
 * environment where SES production access is already granted and the team
 * accepts the wider risk surface. Always allowed in production regardless
 * of this env var — SES's own domain verification and account-level
 * sending are the production boundary there.
 */
export function isNonProdRecipientAllowed(email: string): boolean {
  if (resolveRuntimeEnvironment() === 'production') return true;

  const raw = process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST;
  if (!raw) return false;
  if (raw.trim() === '*') return true;

  const normalized = email.trim().toLowerCase();
  const entries = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return entries.some((entry) => (entry.startsWith('@') ? normalized.endsWith(entry) : normalized === entry));
}
