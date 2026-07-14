import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BRAND_TONES } from '@/domain/constants/brand-tone';
import { THEME_NAMES } from '@/domain/constants/themes';
import { BUSINESS_STATUSES, BUSINESS_SOURCES } from '@/domain/models/business';
import { AddressSchema, IsoTimestampSchema, ScoreSchema, UrlOrPathSchema } from './common.schema';

export const BusinessScoresSchema = z.object({
  overall: ScoreSchema.optional(),
  design: ScoreSchema.optional(),
  mobile: ScoreSchema.optional(),
  seo: ScoreSchema.optional(),
  performance: ScoreSchema.optional(),
});

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
  logoUrl: UrlOrPathSchema.optional(),
  photoUrls: z.array(UrlOrPathSchema).max(6).optional(),
  theme: z.enum(THEME_NAMES).optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type BusinessSchemaInput = z.input<typeof BusinessSchema>;
