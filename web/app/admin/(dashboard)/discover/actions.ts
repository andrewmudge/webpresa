'use server';
import { z } from 'zod';
import { INDUSTRIES } from '@/domain/constants/industries';
import type { Business } from '@/domain/models/business';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';
import { GooglePlaceSearchResultSchema } from '@/domain/schemas/google-places.schema';
import { createBusiness } from '@/domain/factories/business.factory';
import { putBusiness, updateBusiness, resolveUniqueSlug } from '@/lib/db/businesses';
import { getSession } from '@/lib/auth/session';
import { searchGooglePlaces } from '@/lib/google-places/search';
import { GooglePlacesApiError } from '@/lib/google-places/client';
import { findDuplicateSignalsForBatch } from '@/lib/google-places/duplicates';
import { isIndustry } from '@/lib/google-places/industry-map';
import { fetchAndMapGoogleReviews } from '@/lib/google-places/reviews';
import { enableWebsiteSection } from '@/lib/website-sections/resolve';

// ---------------------------------------------------------------------------
// Search — manual, admin-initiated only. Never runs Firecrawl, Playwright,
// OpenAI, scoring, or preview generation; never downloads Google photos.
// See implementation.md, Stage 12.
// ---------------------------------------------------------------------------

const SearchSchema = z.object({
  industry: z.enum(INDUSTRIES),
  location: z.string().min(1, 'Location is required').max(200),
});

export type SearchState =
  | {
      results?: GooglePlaceSearchResult[];
      query?: { industry: string; location: string };
      error?: string;
    }
  | undefined;

const SAFE_ERROR_MESSAGES: Record<string, string> = {
  invalid_key: 'The Google Places API key is invalid. Contact an administrator.',
  permission_denied:
    'The Google Places API key is not authorized for this request. Contact an administrator.',
  quota_exceeded: 'The Google Places API quota has been reached. Try again later.',
  invalid_request: 'That search could not be understood. Try a different location.',
  unknown: 'The Google Places search failed. Try again shortly.',
};

export async function searchPlacesAction(
  _prevState: SearchState | undefined,
  formData: FormData,
): Promise<SearchState> {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const parsed = SearchSchema.safeParse({
    industry: formData.get('industry'),
    location: (formData.get('location') as string | null)?.trim(),
  });
  if (!parsed.success) {
    return { error: 'Choose an industry and enter a location.' };
  }

  const startedAt = Date.now();
  try {
    const results = await searchGooglePlaces(parsed.data);
    // Safe, non-persistent operational log — no search-history table exists
    // or is introduced by this stage. See implementation.md, "Operational
    // logging (no search-history table)".
    console.info('[google-places] search', {
      industry: parsed.data.industry,
      location: parsed.data.location,
      resultCount: results.length,
      durationMs: Date.now() - startedAt,
    });
    return { results, query: parsed.data };
  } catch (err) {
    const category = err instanceof GooglePlacesApiError ? err.category : 'unknown';
    console.error('[google-places] search failed', {
      industry: parsed.data.industry,
      location: parsed.data.location,
      category,
      durationMs: Date.now() - startedAt,
    });
    return { error: SAFE_ERROR_MESSAGES[category] ?? SAFE_ERROR_MESSAGES.unknown };
  }
}

// ---------------------------------------------------------------------------
// Import — selective only. Nothing imports until the admin explicitly
// selects and submits. Duplicate detection re-runs here, immediately before
// persistence, even though the same signals were already shown during
// review — the database may have changed while the admin was looking.
// ---------------------------------------------------------------------------

export interface ImportFailure {
  name: string;
  reason: string;
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  failed: number;
  failures: ImportFailure[];
}

export type ImportState = ImportSummary | undefined;

const EMPTY_IMPORT_STATE: ImportSummary = { imported: 0, duplicates: 0, failed: 0, failures: [] };

interface SelectedRow {
  index: number;
  raw: string | null;
  industryOverride: string;
  confirmDuplicate: boolean;
}

function collectSelectedRows(formData: FormData): SelectedRow[] {
  const rows: SelectedRow[] = [];
  for (let i = 0; formData.has(`resultData.${i}`); i += 1) {
    if (formData.get(`selected.${i}`) !== '1') continue;
    rows.push({
      index: i,
      raw: formData.get(`resultData.${i}`) as string | null,
      industryOverride: ((formData.get(`industry.${i}`) as string | null) ?? '').trim(),
      confirmDuplicate: formData.get(`confirmDuplicate.${i}`) === '1',
    });
  }
  return rows;
}

export async function importSelectedPlacesAction(
  _prevState: ImportState | undefined,
  formData: FormData,
): Promise<ImportState> {
  const session = await getSession();
  if (!session) {
    return { ...EMPTY_IMPORT_STATE, failures: [{ name: '—', reason: 'Unauthorized' }] };
  }

  const rows = collectSelectedRows(formData);
  const state: ImportSummary = { imported: 0, duplicates: 0, failed: 0, failures: [] };
  if (rows.length === 0) return state;

  // Parse + validate every selected row's round-tripped data up front —
  // it's client-controlled (a hidden form field), so it's treated as
  // external input, not trusted search output.
  const candidates: { row: SelectedRow; result: GooglePlaceSearchResult }[] = [];
  for (const row of rows) {
    let json: unknown;
    try {
      json = row.raw ? JSON.parse(row.raw) : undefined;
    } catch {
      state.failed += 1;
      state.failures.push({ name: `Row ${row.index + 1}`, reason: 'Malformed search result data' });
      continue;
    }
    const parsedResult = GooglePlaceSearchResultSchema.safeParse(json);
    if (!parsedResult.success) {
      state.failed += 1;
      state.failures.push({ name: `Row ${row.index + 1}`, reason: 'Invalid search result data' });
      continue;
    }
    candidates.push({ row, result: parsedResult.data });
  }
  if (candidates.length === 0) return state;

  // Server-side duplicate re-check, immediately before persistence.
  const duplicateSignalsByPlaceId = await findDuplicateSignalsForBatch(
    candidates.map(({ result }) => ({
      placeId: result.placeId,
      name: result.name,
      websiteUrl: result.websiteUrl,
      phone: result.phone,
      address: result.address,
    })),
  );

  // Each candidate is imported independently — a failure or a skipped
  // duplicate must never roll back a candidate that already succeeded.
  for (const { row, result } of candidates) {
    const signals = duplicateSignalsByPlaceId.get(result.placeId) ?? [];
    const hasBlockingSignal = signals.some((signal) => signal.confidence === 'blocking');

    if (hasBlockingSignal && !row.confirmDuplicate) {
      state.duplicates += 1;
      continue;
    }

    const industry = isIndustry(row.industryOverride) ? row.industryOverride : result.mappedIndustry;
    if (!industry) {
      state.failed += 1;
      state.failures.push({ name: result.name, reason: 'No industry selected' });
      continue;
    }

    try {
      const created = createBusiness({
        name: result.name,
        industry,
        source: 'google_places',
        phone: result.phone,
        websiteUrl: result.websiteUrl,
      });
      const uniqueSlug = await resolveUniqueSlug(created.slug);

      const record: Business = {
        ...created,
        slug: uniqueSlug,
        googlePlaceId: result.placeId,
        ...(result.address ? { address: result.address } : {}),
        ...(result.googleMapsUrl ? { googleMapsUrl: result.googleMapsUrl } : {}),
        ...(result.rating !== undefined ? { googleRating: result.rating } : {}),
        ...(result.userRatingCount !== undefined ? { googleReviewCount: result.userRatingCount } : {}),
      };

      await putBusiness(record);
      state.imported += 1;

      // Automatic Google reviews import (Stage 12 follow-on) — best-effort,
      // never allowed to fail the business import itself. A fetch failure
      // here just means the business ends up with no testimonials yet; an
      // admin can retry from the business detail page's "Import/Refresh
      // Google Reviews" action.
      if (record.googlePlaceId) {
        try {
          const googleTestimonials = await fetchAndMapGoogleReviews(record.googlePlaceId);
          if (googleTestimonials.length > 0) {
            await updateBusiness(record.businessId, {
              testimonials: googleTestimonials,
              // ReviewsSection renders testimonials underneath the rating
              // summary (see app/b/[slug]/template/ReviewsSection.tsx) —
              // there is no separate `testimonials` section to enable.
              websiteSections: enableWebsiteSection(record, 'reviews'),
            });
          }
        } catch (reviewErr) {
          console.error('[google-places] reviews import failed', {
            placeId: record.googlePlaceId,
            message: reviewErr instanceof Error ? reviewErr.message : String(reviewErr),
          });
        }
      }
    } catch (err) {
      state.failed += 1;
      state.failures.push({ name: result.name, reason: 'Could not save business' });
      console.error('[google-places] import failed', {
        placeId: result.placeId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.info('[google-places] import summary', {
    selected: rows.length,
    imported: state.imported,
    duplicates: state.duplicates,
    failed: state.failed,
  });

  return state;
}
