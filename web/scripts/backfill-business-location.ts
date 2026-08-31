#!/usr/bin/env tsx
// One-off backfill for `Business.googlePlaceLatitude`/`googlePlaceLongitude`
// — populates precise coordinates for existing Google-Places-sourced
// businesses that predate those fields (new imports get them for free, see
// `lib/google-places/import-candidate.ts`). Unlike a new import, this makes
// one real Place Details call per business (`getPlaceLocation`,
// `lib/google-places/client.ts`), the location-only field mask — the
// cheapest possible Place Details request, but still a real, billed,
// automated batch of Google Places API calls. Check the Cloud Console
// quota/budget before a real `--apply` run against more than a handful of
// businesses — see docs/deployment.md, Stage 12.
//
// Must be run with `--conditions=react-server` — same reason as
// backfill-business-status.ts: every `lib/db/*.ts`/`lib/google-places/*.ts`
// module this script imports starts with `import 'server-only'`.
//
//   npm run backfill:business-location:dev             # dry run against dev
//   npm run backfill:business-location:dev -- --apply   # writes, against dev
//   npm run backfill:business-location:prod             # dry run against prod
//   npm run backfill:business-location:prod -- --apply  # writes, against prod
//
// `:prod` requires a local, gitignored `.env.prod.local` — see
// backfill-business-status.ts's header comment for the shape.
//
// Flags:
//   --apply       Actually write changes. Omit for a dry run (the default —
//                 nothing is written, and no Place Details calls are made,
//                 unless this is passed explicitly).
//   --limit=N     Stop after inspecting N businesses (for a bounded run —
//                 also the way to stay under a low daily Places API quota).

import { listBusinesses, updateBusiness } from '@/lib/db/businesses';
import { getPlaceLocation } from '@/lib/google-places/client';

/** Small pause between real Place Details calls — not documented as required by Google for this endpoint, but a conservative courtesy given this is the first automated batch caller of the Places API in this codebase. */
const CALL_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CliOptions {
  apply: boolean;
  limit?: number;
}

function parseCliOptions(argv: string[]): CliOptions {
  const apply = argv.includes('--apply');
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined;
  return { apply, limit };
}

async function main(): Promise<void> {
  const { apply, limit } = parseCliOptions(process.argv.slice(2));

  console.log(`[backfill] mode: ${apply ? 'APPLY (writing changes, calling the real Places API)' : 'DRY RUN (no writes, no API calls)'}${limit ? `, limit=${limit}` : ''}`);

  let inspected = 0;
  let backfilled = 0;
  let alreadyHadLocation = 0;
  let missingPlaceId = 0;
  let apiFailures = 0;

  let cursor: string | undefined;
  outer: do {
    const { items, nextCursor } = await listBusinesses({ source: 'google_places', limit: 200, cursor });
    for (const business of items) {
      if (limit !== undefined && inspected >= limit) break outer;
      inspected += 1;

      if (business.googlePlaceLatitude !== undefined && business.googlePlaceLongitude !== undefined) {
        alreadyHadLocation += 1;
        continue;
      }
      if (!business.googlePlaceId) {
        missingPlaceId += 1;
        continue;
      }

      console.log(`[backfill] ${business.businessId} (${business.name}): resolving location for place ${business.googlePlaceId}`);
      if (!apply) {
        backfilled += 1;
        continue;
      }

      try {
        const location = await getPlaceLocation(business.googlePlaceId);
        if (location) {
          await updateBusiness(business.businessId, { googlePlaceLatitude: location.latitude, googlePlaceLongitude: location.longitude });
          backfilled += 1;
        } else {
          console.warn(`[backfill] ${business.businessId}: Places returned no location for ${business.googlePlaceId}`);
          apiFailures += 1;
        }
      } catch (err) {
        console.error(`[backfill] ${business.businessId}: getPlaceLocation failed:`, err instanceof Error ? err.message : err);
        apiFailures += 1;
      }
      await sleep(CALL_DELAY_MS);
    }
    cursor = nextCursor;
  } while (cursor);

  console.log('---');
  console.log(`[backfill] inspected: ${inspected}, backfilled: ${backfilled}, already had location: ${alreadyHadLocation}, missing placeId: ${missingPlaceId}, API failures: ${apiFailures}`);
  if (!apply) {
    console.log('[backfill] DRY RUN — nothing was written and no Place Details calls were made. Re-run with --apply to actually backfill.');
  }
}

// Guarded so importing this module never triggers a real run as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[backfill] failed:', err);
    process.exit(1);
  });
}
