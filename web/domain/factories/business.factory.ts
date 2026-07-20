import type { Business, BusinessSource } from '@/domain/models/business';
import type { Industry } from '@/domain/constants/industries';
import { BusinessSchema } from '@/domain/schemas/business.schema';
import { generateId, nowIso } from './utils';

export interface CreateBusinessInput {
  name: string;
  industry: Industry;
  /** Defaults to `'scan'` when omitted. */
  source?: BusinessSource;
  /** Provide an explicit slug or one is generated from `name`. */
  slug?: string;
  legalName?: string;
  phone?: string;
  email?: string;
  /** Optional — absence is valid. */
  websiteUrl?: string;
}

/**
 * Create a new Business record with a prefixed UUID, `'pending'` status,
 * and current timestamps.  The record is validated against `BusinessSchema`
 * before being returned — an invalid input throws a ZodError.
 */
export function createBusiness(input: CreateBusinessInput): Business {
  const now = nowIso();

  const record: Business = {
    businessId: generateId('biz_'),
    slug: input.slug ?? slugify(input.name),
    name: input.name,
    ...(input.legalName !== undefined && { legalName: input.legalName }),
    industry: input.industry,
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
    source: input.source ?? 'scan',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  BusinessSchema.parse(record);
  return record;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a free-text business name into a URL-safe slug.
 * Callers are responsible for uniqueness checks when persisting.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    // Strip apostrophes entirely (straight, curly, and backtick variants) so
    // "Paul's" becomes "pauls", not "paul-s" \u2014 a possessive apostrophe isn't
    // a word separator. Must run before the general non-alphanumeric pass
    // below, which would otherwise turn it into a hyphen like any other
    // punctuation.
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
