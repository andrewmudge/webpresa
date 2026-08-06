import { redirect } from 'next/navigation';

/**
 * Common misspelling of `/access` (missing a "c", extra "s" at the end) —
 * same fallback-redirect purpose, see `app/access/page.tsx` for the full
 * rationale. Redirects straight to `/r` rather than chaining through
 * `/access`.
 */
export default function AcesssRedirectPage() {
  redirect('/r');
}
