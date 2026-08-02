'use server';
import { z } from 'zod';
import { confirmCustomerPasswordReset } from '@/lib/auth/customer-cognito';

/**
 * Confirms a Cognito password reset with the emailed code — the second
 * half of the "Send password reset email" flow started from Settings'
 * Account card (`sendPasswordResetEmailAction`,
 * `businesses/[businessId]/actions.ts`). Public page, same as sign-in —
 * the code itself is the proof of email ownership; no session is required
 * or created here.
 */
const ConfirmResetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1, 'Enter the code from your email.'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type ConfirmPasswordResetState = { error?: string; success?: boolean } | undefined;

export async function confirmPasswordResetAction(
  _prevState: ConfirmPasswordResetState,
  formData: FormData,
): Promise<ConfirmPasswordResetState> {
  const parsed = ConfirmResetSchema.safeParse({
    email: formData.get('email'),
    code: formData.get('code'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your entries.' };
  }

  const result = await confirmCustomerPasswordReset(parsed.data.email, parsed.data.code, parsed.data.newPassword);
  if (!result.ok) {
    return {
      error:
        result.reason === 'weak_password'
          ? 'Choose a stronger password.'
          : result.reason === 'invalid_code'
            ? 'That code is invalid or expired. Request a new one and try again.'
            : 'Something went wrong. Please try again.',
    };
  }

  return { success: true };
}
