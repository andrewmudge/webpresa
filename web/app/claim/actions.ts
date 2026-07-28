'use server';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { validateClaimToken, hashIp } from '@/lib/claim/validate-token';
import { getClaimById, consumeClaim } from '@/lib/db/claims';
import { getCustomerSession, createCustomerSession } from '@/lib/auth/customer-session';
import {
  CLAIM_ATTEMPT_COOKIE_NAME,
  CLAIM_ATTEMPT_MAX_AGE_SECONDS,
  signClaimAttempt,
  verifyClaimAttempt,
} from '@/lib/auth/claim-attempt';
import { signUpCustomer, confirmCustomerSignUp, resendCustomerConfirmationCode, signInCustomer } from '@/lib/auth/customer-cognito';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function resolveIpHash(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

async function setClaimAttemptCookie(claimId: string): Promise<void> {
  const token = await signClaimAttempt(claimId);
  const cookieStore = await cookies();
  cookieStore.set(CLAIM_ATTEMPT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CLAIM_ATTEMPT_MAX_AGE_SECONDS,
    path: '/',
  });
}

/**
 * Runs the ownership-reservation transaction for the claim referenced by the
 * current `claim_attempt` cookie, then establishes the customer session and
 * redirects — the single completion path shared by the sign-up-then-confirm
 * flow and the direct sign-in flow (see implementation.md, Stage 17,
 * "Detailed workflow", steps 7-9). Always ends in a redirect (never returns).
 */
async function completeClaimAttempt(sub: string, email: string): Promise<never> {
  const cookieStore = await cookies();
  const attempt = await verifyClaimAttempt(cookieStore.get(CLAIM_ATTEMPT_COOKIE_NAME)?.value);
  if (!attempt) redirect('/claim?error=1');

  const claim = await getClaimById(attempt.claimId);
  if (!claim) redirect('/claim?error=1');

  const result = await consumeClaim({ claimId: claim.claimId, businessId: claim.businessId, userId: sub });
  if (result.outcome === 'conflict') redirect('/claim?error=1');

  await createCustomerSession({ sub, email });
  cookieStore.delete(CLAIM_ATTEMPT_COOKIE_NAME);
  redirect('/account/claim-status');
}

// ---------------------------------------------------------------------------
// Manual token entry (`/claim`)
// ---------------------------------------------------------------------------

export type ClaimTokenFormState = { error?: string } | undefined;

export async function submitClaimTokenAction(
  _prevState: ClaimTokenFormState,
  formData: FormData,
): Promise<ClaimTokenFormState> {
  const rawToken = String(formData.get('token') ?? '').trim();
  if (!rawToken) return { error: 'Enter your claim code.' };

  const session = await getCustomerSession();
  const result = await validateClaimToken({
    rawToken,
    ipHash: await resolveIpHash(),
    currentSessionUserId: session?.sub,
  });

  if (result.outcome === 'invalid') {
    return { error: 'This claim link is invalid or has expired.' };
  }
  if (result.outcome === 'resume') {
    redirect('/account/claim-status');
  }

  await setClaimAttemptCookie(result.claimId);
  redirect('/claim/continue');
}

// ---------------------------------------------------------------------------
// Sign-up (`/claim/continue`)
// ---------------------------------------------------------------------------

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type ClaimSignUpState = { step: 'signup'; error: string } | { step: 'confirm'; email: string } | undefined;

export async function signUpForClaimAction(
  _prevState: ClaimSignUpState,
  formData: FormData,
): Promise<ClaimSignUpState> {
  const parsed = SignUpSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) {
    return { step: 'signup', error: parsed.error.issues[0]?.message ?? 'Enter a valid email and password.' };
  }

  const cookieStore = await cookies();
  const attempt = await verifyClaimAttempt(cookieStore.get(CLAIM_ATTEMPT_COOKIE_NAME)?.value);
  if (!attempt) redirect('/claim?error=1');

  const result = await signUpCustomer(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    const message =
      result.reason === 'email_taken'
        ? 'An account with this email already exists. Sign in instead.'
        : result.reason === 'weak_password'
          ? 'Password does not meet requirements — use at least 8 characters, including a number.'
          : result.reason === 'rate_limited'
            ? 'Too many attempts. Please try again shortly.'
            : 'Something went wrong. Please try again.';
    return { step: 'signup', error: message };
  }

  return { step: 'confirm', email: parsed.data.email };
}

export type ClaimConfirmState = { error?: string } | undefined;

export async function confirmSignUpForClaimAction(
  _prevState: ClaimConfirmState,
  formData: FormData,
): Promise<ClaimConfirmState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const code = String(formData.get('code') ?? '').trim();
  if (!email || !password || !code) {
    return { error: 'Enter the confirmation code sent to your email.' };
  }

  const confirmed = await confirmCustomerSignUp(email, code);
  if (!confirmed) return { error: 'That code is incorrect or has expired.' };

  const signedIn = await signInCustomer(email, password);
  if (!signedIn.ok) return { error: 'Something went wrong. Please sign in from /claim again.' };

  await completeClaimAttempt(signedIn.sub, signedIn.email);
}

export async function resendConfirmationCodeAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  if (email) await resendCustomerConfirmationCode(email);
}

// ---------------------------------------------------------------------------
// Sign-in (`/claim/continue`) — an existing account claiming this business
// ---------------------------------------------------------------------------

export type ClaimSignInState = { error?: string; needsConfirmation?: boolean; email?: string } | undefined;

export async function signInForClaimAction(
  _prevState: ClaimSignInState,
  formData: FormData,
): Promise<ClaimSignInState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const cookieStore = await cookies();
  const attempt = await verifyClaimAttempt(cookieStore.get(CLAIM_ATTEMPT_COOKIE_NAME)?.value);
  if (!attempt) redirect('/claim?error=1');

  const result = await signInCustomer(email, password);
  if (!result.ok) {
    if (result.reason === 'needs_confirmation') return { needsConfirmation: true, email };
    return { error: 'Invalid email or password.' };
  }

  await completeClaimAttempt(result.sub, result.email);
}
