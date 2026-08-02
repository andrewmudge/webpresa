import 'server-only';
import { z } from 'zod';
import { updateCustomerProfile } from '@/lib/auth/customer-cognito';

/**
 * Customer-scoped Cognito profile update (Settings, Account card). Mirrors
 * `business-info.ts`'s shape (Zod-validated FormData in, a small
 * `{ message?, errors? }` state out) but writes to Cognito instead of
 * DynamoDB — the only editing surface in `customer-editing/` that does.
 *
 * Deliberately takes the caller's own `sub` (from the verified session),
 * never a client-supplied identity — see `updateCustomerProfile`'s doc
 * comment for why `sub`, not `email`, is the correct Cognito `Username`
 * for an `Admin*` API call.
 */
const US_PHONE_DIGITS = /^\d{10}$/;

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || US_PHONE_DIGITS.test(v.replace(/\D/g, '')), 'Enter a 10-digit US phone number'),
});

export type UpdateAccountProfileState = { message?: string; errors?: Record<string, string[]> } | undefined;

export async function updateCustomerAccountProfile(
  sub: string,
  formData: FormData,
): Promise<UpdateAccountProfileState> {
  const raw = {
    firstName: (formData.get('firstName') as string) ?? '',
    lastName: (formData.get('lastName') as string) ?? '',
    phone: ((formData.get('phone') as string) ?? '').trim() || undefined,
  };

  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await updateCustomerProfile(sub, parsed.data);
  if (!result.ok) {
    return {
      message:
        result.reason === 'invalid_phone'
          ? 'Enter a valid 10-digit US phone number.'
          : 'Failed to save changes. Please try again.',
    };
  }

  return undefined;
}
