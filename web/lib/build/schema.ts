import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { UrlOrPathSchema } from '@/domain/schemas/common.schema';

/**
 * Validated shape of one self-service `/build` intake submission — the
 * external-input counterpart to `Business` (see `lib/build/start-self-service-build.ts`).
 * Deliberately looser than `BusinessSchema`: this is transient form input,
 * not a persisted record, so constraints here are about what a visitor can
 * type, not the full set of fields a `Business` can eventually carry.
 *
 * `logoUrl`/`photoUrls` are already-uploaded `/api/assets/...` proxy paths
 * by the time the full schema runs — the actual file upload happens inside
 * the `/build` Server Action, using the businessId `createOrAttachSelfServiceBusiness`
 * just returned, never a raw file in this payload (see that module's doc
 * comment for why upload has to happen in between the two orchestration
 * steps rather than before either of them) — which is also why a separate
 * `SelfServiceBuildCreateInputSchema` (no logo/photo fields at all) exists
 * for that first step.
 */
export const SelfServiceBuildAddressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
});

const SelfServiceBuildCreateFields = z.object({
  // Step 1 — Business
  name: z.string().trim().min(1).max(200),
  industry: z.enum(INDUSTRIES),

  // Step 2 — Contact
  phone: z.string().trim().min(1).max(30).optional(),
  email: z.string().trim().email().optional(),
  address: SelfServiceBuildAddressSchema.optional(),

  // Step 3 — Current website
  hasExistingWebsite: z.boolean(),
  websiteUrl: z.string().trim().url().optional(),

  // Step 4 — Business details (only collected by the wizard when Step 3 is "no")
  servicesOffered: z.string().trim().max(2000).optional(),
  serviceAreas: z.string().trim().max(2000).optional(),
  description: z.string().trim().max(2000).optional(),
  differentiators: z.string().trim().max(2000).optional(),

  // Step 5 — Online presence
  socialLinks: z.array(z.string().trim().url()).max(6).optional(),
});

function refineBuildInput<T extends { hasExistingWebsite: boolean; websiteUrl?: string; phone?: string; email?: string }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (data.hasExistingWebsite && !data.websiteUrl) {
    ctx.addIssue({ code: 'custom', path: ['websiteUrl'], message: 'Enter your website address.' });
  }
  if (!data.phone && !data.email) {
    ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a phone number or email so customers (and we) can reach you.' });
  }
}

/** Everything `createOrAttachSelfServiceBusiness` needs — no logo/photo fields, since those upload after this step returns a businessId. */
export const SelfServiceBuildCreateInputSchema = SelfServiceBuildCreateFields.superRefine(refineBuildInput);
export type SelfServiceBuildCreateInput = z.infer<typeof SelfServiceBuildCreateInputSchema>;

/** The full submission shape, `logoUrl`/`photoUrls` included — for a caller with nothing fresh to upload (see `startSelfServiceBuild`). */
export const SelfServiceBuildInputSchema = SelfServiceBuildCreateFields.extend({
  // Step 6 — Photos
  logoUrl: UrlOrPathSchema.optional(),
  photoUrls: z.array(UrlOrPathSchema).max(6).optional(),
}).superRefine(refineBuildInput);
export type SelfServiceBuildInput = z.infer<typeof SelfServiceBuildInputSchema>;
