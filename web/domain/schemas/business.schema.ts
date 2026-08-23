import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BRAND_TONES } from '@/domain/constants/brand-tone';
import { THEME_NAMES } from '@/domain/constants/themes';
import {
  BUSINESS_STATUSES,
  BUSINESS_SOURCES,
  ENRICHMENT_STATUSES,
  MANUAL_APPROVAL_REASONS,
  TESTIMONIAL_SOURCES,
} from '@/domain/models/business';
import { QUALIFICATION_RESULTS, LEAD_PRIORITIES } from '@/domain/models/website-assessment';
import { POSTCARD_TEMPLATE_VARIANTS } from '@/domain/models/postcard';
import { SCAN_WORKFLOW_STATUSES } from '@/domain/models/scan-execution';
import { WEBPRESA_PLANS, SUBSCRIPTION_STATUSES, BILLING_INTERVALS } from '@/domain/constants/plans';
import { AddressSchema, IsoTimestampSchema, ScoreSchema, UrlOrPathSchema } from './common.schema';
import { WebsiteSectionsConfigSchema } from './website-sections.schema';
import { PreviewCtaConfigSchema } from './site-preview.schema';

export const BusinessScoresSchema = z.object({
  overall: ScoreSchema.optional(),
  design: ScoreSchema.optional(),
  mobile: ScoreSchema.optional(),
  seo: ScoreSchema.optional(),
  performance: ScoreSchema.optional(),
});

/**
 * A photo-slot assignment override: either a URL from `photoUrls`, or the
 * reserved literal `'none'` forcing that slot's non-photo fallback.
 */
const PhotoSlotOverrideSchema = z.union([UrlOrPathSchema, z.literal('none')]).optional();

/**
 * Runtime validation schema for the Business record.
 *
 * Key constraints enforced here:
 * - `businessId` must start with `biz_` followed by a standard UUID
 * - `websiteUrl` is optional — a Business is valid without one
 * - `googlePlaceId` is optional — a Business is valid without one
 * - Status and source values are restricted to their `as const` arrays
 * - Score fields are integers in [0, 100]
 */
export const BusinessSchema = z.object({
  businessId: z
    .string()
    .regex(/^biz_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  legalName: z.string().max(200).optional(),
  industry: z.enum(INDUSTRIES),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  /** Optional — a Business remains valid with no websiteUrl. */
  websiteUrl: z.string().url().optional(),
  address: AddressSchema.optional(),
  /** Optional — a Business remains valid with no googlePlaceId. */
  googlePlaceId: z.string().optional(),
  googleMapsUrl: z.string().url().optional(),
  source: z.enum(BUSINESS_SOURCES),
  status: z.enum(BUSINESS_STATUSES),
  scores: BusinessScoresSchema.optional(),
  currentPreviewId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  servicesOffered: z.string().max(2000).optional(),
  serviceAreas: z.string().max(2000).optional(),
  description: z.string().max(2000).optional(),
  differentiators: z.string().max(2000).optional(),
  brandTone: z.enum(BRAND_TONES).optional(),
  notes: z.string().max(2000).optional(),
  socialLinks: z.array(z.string().url()).max(6).optional(),
  logoUrl: UrlOrPathSchema.optional(),
  photoUrls: z.array(UrlOrPathSchema).max(6).optional(),
  faviconUrl: UrlOrPathSchema.optional(),
  faviconSource: z.enum(['auto', 'manual']).optional(),
  heroPhotoUrl: PhotoSlotOverrideSchema,
  heroPhotoUrlMobile: PhotoSlotOverrideSchema,
  aboutPhotoUrl: PhotoSlotOverrideSchema,
  whyChooseUsPhotoUrl: PhotoSlotOverrideSchema,
  servicesPhotoUrl: PhotoSlotOverrideSchema,
  theme: z.enum(THEME_NAMES).optional(),
  cta: PreviewCtaConfigSchema.optional(),
  googleRating: z.number().min(0).max(5).optional(),
  googleReviewCount: z.number().int().min(0).optional(),
  testimonials: z
    .array(
      z.object({
        // Safety-net default for records written before this field existed
        // — application code always sets `id` explicitly at creation (see
        // domain/models/business.ts), since this default's freshly-generated
        // value is only ever used for parse-time validation, never actually
        // persisted by itself (relying on it alone would make `id` reshuffle
        // on every read for any record that never went through app code).
        id: z.string().default(() => crypto.randomUUID()),
        author: z.string().min(1).max(100),
        // 500 was sized for short, hand-typed manual testimonials. Real
        // Google reviews run much longer (Google allows up to ~4096 chars)
        // — the public card already clamps/truncates display via
        // line-clamp-5 + "Read more", so the stored value just needs a
        // generous ceiling, not a display-sized one.
        quote: z.string().min(1).max(4000),
        source: z.enum(TESTIMONIAL_SOURCES).default('manual'),
        hidden: z.boolean().default(false),
        rating: z.number().min(1).max(5).optional(),
        authorPhotoUrl: z.string().url().optional(),
        authorProfileUrl: z.string().url().optional(),
        googleReviewId: z.string().optional(),
        publishTimeDescription: z.string().max(50).optional(),
      }),
    )
    .max(20)
    .optional(),
  faqItems: z
    .array(z.object({ question: z.string().min(1).max(200), answer: z.string().min(1).max(1000) }))
    .max(30)
    .optional(),
  processSteps: z
    .array(z.object({ title: z.string().min(1).max(80), description: z.string().min(1).max(300) }))
    .max(10)
    .optional(),
  websiteSections: WebsiteSectionsConfigSchema.optional(),
  enrichmentStatus: z.enum(ENRICHMENT_STATUSES).optional(),
  manualApprovalReason: z.enum(MANUAL_APPROVAL_REASONS).optional(),
  manualApprovalNote: z.string().max(500).optional(),
  qualification: z.enum(QUALIFICATION_RESULTS).optional(),
  leadPriority: z.enum(LEAD_PRIORITIES).optional(),
  websiteQualityScore: ScoreSchema.optional(),
  adminReviewedQualification: z.enum(QUALIFICATION_RESULTS).optional(),
  adminReviewedScore: ScoreSchema.optional(),
  adminPostcardTemplateOverride: z.enum(POSTCARD_TEMPLATE_VARIANTS).optional(),
  latestScanExecutionId: z.string().optional(),
  scanExecutionStatus: z.enum(SCAN_WORKFLOW_STATUSES).optional(),
  scanExecutionUpdatedAt: IsoTimestampSchema.optional(),
  ownerUserId: z.string().min(1).optional(),
  claimedAt: IsoTimestampSchema.optional(),
  plan: z.enum(WEBPRESA_PLANS).optional(),
  billingInterval: z.enum(BILLING_INTERVALS).optional(),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).optional(),
  stripeRawStatus: z.string().optional(),
  currentPeriodEnd: IsoTimestampSchema.optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  lastStripeEventId: z.string().optional(),
  lastStripeEventAt: IsoTimestampSchema.optional(),
  lastStripeSyncAt: IsoTimestampSchema.optional(),
  pendingCheckoutSessionId: z.string().optional(),
  pendingCheckoutExpiresAt: IsoTimestampSchema.optional(),
  termsVersion: z.string().max(50).optional(),
  acceptedTermsAt: IsoTimestampSchema.optional(),
  firstPaidAt: IsoTimestampSchema.optional(),
  canceledAt: IsoTimestampSchema.optional(),
  draftChangesNoticeEnabled: z.boolean().optional(),
  leadNotificationEmail: z.string().email().optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type BusinessSchemaInput = z.input<typeof BusinessSchema>;
