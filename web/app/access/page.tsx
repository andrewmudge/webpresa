import { redirect } from 'next/navigation';

/**
 * Friendly public alias for `/r` (Stage 21 manual campaign-code entry) —
 * "webpresa.com/r" reads as meaningless shorthand to a customer, even
 * though it stands for "redirect" internally. "webpresa.com/access" is
 * what actually gets printed on postcards and told to people; `/r` remains
 * the real implementation underneath, unchanged.
 *
 * A temporary redirect (Next's default `redirect()`, 307) rather than
 * `permanentRedirect()` (308) — 308s get aggressively cached by browsers,
 * which would make this alias harder to adjust later if needed.
 */
export default function AccessRedirectPage() {
  redirect('/r');
}
