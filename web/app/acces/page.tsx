import { redirect } from 'next/navigation';

/**
 * Common misspelling of `/access` (missing the final "s") — same
 * fallback-redirect purpose, see `app/access/page.tsx` for the full
 * rationale. Redirects straight to `/r` rather than chaining through
 * `/access`.
 */
export default function AccesRedirectPage() {
  redirect('/r');
}
