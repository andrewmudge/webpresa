'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signInCustomer } from './customer-cognito';
import { createCustomerSession, deleteCustomerSession } from './customer-session';

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

const ALLOWED_REDIRECT_PREFIX = '/account';
const DEFAULT_REDIRECT = '/account/claim-status';

/** No open redirect — only an internal `/account/*` path is ever honored. */
function safeNextPath(next: FormDataEntryValue | null): string {
  const value = typeof next === 'string' ? next : '';
  return value.startsWith(ALLOWED_REDIRECT_PREFIX) ? value : DEFAULT_REDIRECT;
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
    return { error: 'Invalid email or password.' };
  }

  await createCustomerSession({ sub: result.sub, email: result.email });
  redirect(safeNextPath(formData.get('next')));
}

export async function customerSignOutAction(): Promise<void> {
  await deleteCustomerSession();
  redirect('/account/sign-in');
}
