/**
 * Open-redirect protection shared by every customer sign-in completion path
 * (password sign-in, Google sign-in) — only an internal `/account/*` or
 * `/app/*` path is ever honored as a post-sign-in destination. Extracted
 * from `customer-actions.ts`'s `customerSignInAction`, which had its own
 * private copy, so this logic lives in exactly one place.
 */

const ALLOWED_CUSTOMER_REDIRECT_PREFIXES = ['/account', '/app'];
const DEFAULT_CUSTOMER_REDIRECT = '/app';

export function safeCustomerRedirectPath(next: string | null | undefined): string {
  return next && ALLOWED_CUSTOMER_REDIRECT_PREFIXES.some((prefix) => next.startsWith(prefix)) ? next : DEFAULT_CUSTOMER_REDIRECT;
}
