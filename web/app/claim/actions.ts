'use server';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { validateClaimToken, hashIp } from '@/lib/claim/validate-token';
import { getClaimById, consumeClaim } from '@/lib/db/claims';
import { getCustomerSession, createCustomerSession } from '@/lib/auth/customer-session';
import {
  CLAIM_INTENT_COOKIE_NAME,
  CLAIM_INTENT_MAX_AGE_SECONDS,
  signClaimIntent,
  verifyClaimIntent,
} from '@/lib/auth/claim-intent';
import { signUpCustomer, confirmCustomerSignUp, resendCustomerConfirmationCode, signInCustomer } from '@/lib/auth/customer-cognito';
import { recordCustomerSubmittedBusinessInfo } from '@/lib/db/claims';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function resolveIpHash(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

async function setClaimIntentCookie(params: { claimId: string; businessId: string; previewId?: string }): Promise<void> {
  const token = await signClaimIntent(params);
  const cookieStore = await cookies();
  cookieStore.set(CLAIM_INTENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CLAIM_INTENT_MAX_AGE_SECONDS,
    path: '/',
  });
}

/**
 * Runs the ownership-reservation transaction for the claim referenced by the
 * current `claim_intent` cookie, then establishes the customer session and
 * redirects — the single completion path shared by the sign-up-then-confirm
 * flow and the direct sign-in flow (see implementation.md, Stage 17,
 * "Detailed workflow", steps 7-9). Always ends in a redirect (never returns).
 *
 * Cross-checks the cookie's `businessId` against the freshly-loaded `Claim`'s
 * own `businessId` — defense in depth only; a `Claim`'s `businessId` never
 * changes after creation, so these should never actually diverge, but the
 * cookie is client-held and every claim carried in it must be re-verified
 * against the database regardless.
 */
async function completeClaimIntent(sub: string, email: string): Promise<never> {
  const cookieStore = await cookies();
  const intent = await verifyClaimIntent(cookieStore.get(CLAIM_INTENT_COOKIE_NAME)?.value);
  if (!intent) redirect('/claim?error=1');

  const claim = await getClaimById(intent.claimId);
  if (!claim || claim.businessId !== intent.businessId) redirect('/claim?error=1');

  const result = await consumeClaim({ claimId: claim.claimId, businessId: claim.businessId, userId: sub });
  if (result.outcome === 'conflict') redirect('/claim?error=1');

  await createCustomerSession({ sub, email });
  cookieStore.delete(CLAIM_INTENT_COOKIE_NAME);
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

  await setClaimIntentCookie({ claimId: result.claimId, businessId: result.businessId, previewId: result.previewId });
  redirect(`/b/${result.slug}`);
}

// ---------------------------------------------------------------------------
// Sign-up (`/claim/continue`)
// ---------------------------------------------------------------------------

/** 10-digit US phone number, loosely formatted (digits, spaces, dashes, dots, parens all accepted). */
const US_PHONE_REGEX = /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

const SignUpSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(100),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(100),
  email: z.string().email(),
  phone: z.string().trim().regex(US_PHONE_REGEX, 'Enter a valid 10-digit US phone number.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  businessName: z.string().trim().min(1, 'Enter the business name.').max(200),
  addressLine1: z.string().trim().min(1, 'Enter the street address.').max(200),
  addressCity: z.string().trim().min(1, 'Enter the city.').max(100),
  addressState: z.string().trim().min(1, 'Enter the state.').max(50),
  addressPostalCode: z.string().trim().min(1, 'Enter the postal code.').max(20),
});

export type ClaimSignUpState = { step: 'signup'; error: string } | { step: 'confirm'; email: string } | undefined;

export async function signUpForClaimAction(
  _prevState: ClaimSignUpState,
  formData: FormData,
): Promise<ClaimSignUpState> {
  const parsed = SignUpSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    businessName: formData.get('businessName'),
    addressLine1: formData.get('addressLine1'),
    addressCity: formData.get('addressCity'),
    addressState: formData.get('addressState'),
    addressPostalCode: formData.get('addressPostalCode'),
  });
  if (!parsed.success) {
    return { step: 'signup', error: parsed.error.issues[0]?.message ?? 'Fill in all required fields.' };
  }

  const cookieStore = await cookies();
  const intent = await verifyClaimIntent(cookieStore.get(CLAIM_INTENT_COOKIE_NAME)?.value);
  if (!intent) redirect('/claim?error=1');

  const result = await signUpCustomer(parsed.data.email, parsed.data.password, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
  });
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

  // Informational only (see Claim.customerSubmittedBusinessName/Address) — must never
  // block a successful sign-up, so failures here are swallowed.
  try {
    await recordCustomerSubmittedBusinessInfo(intent.claimId, {
      businessName: parsed.data.businessName,
      businessAddress: {
        line1: parsed.data.addressLine1,
        city: parsed.data.addressCity,
        state: parsed.data.addressState,
        postalCode: parsed.data.addressPostalCode,
        country: 'US',
      },
    });
  } catch {
    // Intentionally ignored — see comment above.
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

  await completeClaimIntent(signedIn.sub, signedIn.email);
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
  const intent = await verifyClaimIntent(cookieStore.get(CLAIM_INTENT_COOKIE_NAME)?.value);
  if (!intent) redirect('/claim?error=1');

  const result = await signInCustomer(email, password);
  if (!result.ok) {
    if (result.reason === 'needs_confirmation') return { needsConfirmation: true, email };
    return { error: 'Invalid email or password.' };
  }

  await completeClaimIntent(result.sub, result.email);
}
