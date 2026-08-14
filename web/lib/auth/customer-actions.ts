'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signInCustomer } from './customer-cognito';
import { createCustomerSession, deleteCustomerSession } from './customer-session';
import { log } from '@/lib/logging/log';

/**
 * Customer sign-in/sign-out for the resume-checkout path (Stage 17) — a
 * returning owner who abandoned Stripe Checkout and comes back without a
 * claim token. Claiming a *new* business always goes through
 * `/claim/[claimToken]` → `/claim/continue` (`web/app/claim/actions.ts`);
 * this file only ever authenticates an existing account.
 */

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CustomerSignInState = { error?: string } | undefined;

/**
 * Stage 19 adds `/app` as a second allowed prefix — a sign-in-to-continue
 * flow from `/app/*` (proxy.ts) must be able to land the customer back in
 * the dashboard, not just `/account/*`.
 */
const ALLOWED_REDIRECT_PREFIXES = ['/account', '/app'];
const DEFAULT_REDIRECT = '/app';

/** No open redirect — only an internal `/account/*` or `/app/*` path is ever honored. */
function safeNextPath(next: FormDataEntryValue | null): string {
  const value = typeof next === 'string' ? next : '';
  return ALLOWED_REDIRECT_PREFIXES.some((prefix) => value.startsWith(prefix)) ? value : DEFAULT_REDIRECT;
}

export async function customerSignInAction(
  _prevState: CustomerSignInState,
  formData: FormData,
): Promise<CustomerSignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: 'Enter your email and password.' };

  const result = await signInCustomer(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    // Stage 25 — no email/PII in the log line, matching this repo's
    // existing convention (see lib/logging/log.ts's closed LogFields type,
    // which has no field for one anyway).
    log({ level: 'warn', event: 'customer.signin.failed', component: 'customer-auth' });
    return { error: 'Invalid email or password.' };
  }

  log({ event: 'customer.signin.succeeded', component: 'customer-auth', actorId: result.sub });
  await createCustomerSession({ sub: result.sub, email: result.email });
  redirect(safeNextPath(formData.get('next')));
}

export async function customerSignOutAction(): Promise<void> {
  await deleteCustomerSession();
  redirect('/account/sign-in');
}
