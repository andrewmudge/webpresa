import { z } from 'zod';

/** Zod schema for a physical address. */
export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  /** ISO 3166-1 alpha-2 — exactly 2 uppercase letters. */
  country: z.string().length(2),
});

/**
 * Validates an ISO 8601 UTC timestamp string.
 * `new Date().toISOString()` always satisfies this constraint.
 */
export const IsoTimestampSchema = z.string().datetime();

/**
 * Integer score in the range 0–100 inclusive.
 * Used for all website quality metrics.
 */
export const ScoreSchema = z.number().int().min(0).max(100);

/**
 * A displayable image reference — either a full absolute URL (`https://...`,
 * e.g. a picsum.photos seed fixture) or a root-relative app path
 * (`/api/assets/...`, e.g. the business-asset proxy route). Plain `.url()`
 * rejects the latter since it has no protocol/host.
 */
export const UrlOrPathSchema = z
  .string()
  .refine((value) => /^https?:\/\//.test(value) || value.startsWith('/'), {
    message: 'Must be a valid URL or an absolute path starting with "/"',
  });
