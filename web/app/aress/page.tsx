import { redirect } from 'next/navigation';

/**
 * Common misspelling of `/access` (double "cc" swapped for "r") — same
 * fallback-redirect purpose, see `app/access/page.tsx` for the full
 * rationale. Redirects straight to `/r` rather than chaining through
 * `/access`.
 */
export default function AressRedirectPage() {
  redirect('/r');
}
