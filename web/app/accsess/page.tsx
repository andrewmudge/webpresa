import { redirect } from 'next/navigation';

/**
 * Common misspelling of `/access` (extra "s" in the middle) — same
 * fallback-redirect purpose, see `app/access/page.tsx` for the full
 * rationale. Redirects straight to `/r` rather than chaining through
 * `/access`.
 */
export default function AccsessRedirectPage() {
  redirect('/r');
}
