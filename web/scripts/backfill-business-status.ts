#!/usr/bin/env tsx
// One-off backfill for the `Business.status` funnel redesign — computes each
// business's correct status from independently-derived signals (subscription,
// ownership, scan, and postcard history) rather than the event-driven
// `advanceBusinessStatus` path, since it's establishing ground truth for the
// first time, not advancing forward from a known-good prior state.
//
// Must be run with `--conditions=react-server`: every `lib/db/*.ts` module
// this script imports starts with `import 'server-only'`, whose package
// unconditionally throws unless resolved through Next's own `react-server`
// module-resolution condition. Node's `--conditions` flag makes that same
// condition apply to a plain script invocation (confirmed empirically —
// `node --conditions=react-server -e "require('server-only')"` doesn't
// throw; without the flag, it does). Use the npm scripts below rather than
// invoking this file directly, so the flag and the right env file are never
// forgotten:
//
//   npm run backfill:business-status:dev             # dry run against dev
//   npm run backfill:business-status:dev -- --apply   # writes, against dev
//   npm run backfill:business-status:prod             # dry run against prod
//   npm run backfill:business-status:prod -- --apply  # writes, against prod
//
// `:prod` requires a local, gitignored `.env.prod.local` (AWS_PROFILE=
// webpresa-prod plus the webpresa-prod-* table names — see
// `.env.local.example` for the shape) that you create yourself; it does not
// exist in this repo.
//
// Flags:
//   --apply       Actually write changes. Omit for a dry run (the default —
//                 nothing is written unless this is passed explicitly).
//   --limit=N     Stop after inspecting N businesses (for a bounded test run).

import { listBusinesses, updateBusiness } from '@/lib/db/businesses';
import { listPostcardsForBusiness } from '@/lib/db/postcards';
import { listCampaignRecipientsForBusiness } from '@/lib/db/campaign-recipients';
import type { Business, BusinessStatus } from '@/domain/models/business';
import type { Postcard } from '@/domain/models/postcard';
import type { CampaignRecipient } from '@/domain/models/campaign-recipient';

const OUTREACH_POSTCARD_STATUSES = new Set<Postcard['status']>(['submitted', 'mailed', 'delivered']);

/**
 * Priority-ordered derivation — exported for unit testing independent of
 * AWS. `subscriptionStatus` (live, Stripe-sourced) always wins over
 * anything else, since it's the most authoritative and can move backward
 * (cancellation) in a way none of the other signals can.
 */
export function computeBackfillStatus(
  business: Pick<Business, 'subscriptionStatus' | 'ownerUserId'>,
  recipients: Pick<CampaignRecipient, 'firstScanAt'>[],
  postcards: Pick<Postcard, 'status'>[],
): BusinessStatus {
  if (business.subscriptionStatus === 'active') return 'customer';
  if (business.subscriptionStatus === 'canceled') return 'cancelled';
  if (business.ownerUserId) return 'claimed';
  if (recipients.some((r) => r.firstScanAt)) return 'engaged';
  if (postcards.some((p) => OUTREACH_POSTCARD_STATUSES.has(p.status))) return 'outreach';
  return 'pending';
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

  console.log(`[backfill] mode: ${apply ? 'APPLY (writing changes)' : 'DRY RUN (no writes)'}${limit ? `, limit=${limit}` : ''}`);

  let inspected = 0;
  let changed = 0;
  const targetCounts: Record<BusinessStatus, number> = {
    pending: 0,
    outreach: 0,
    engaged: 0,
    claimed: 0,
    customer: 0,
    cancelled: 0,
  };

  let cursor: string | undefined;
  outer: do {
    const { items, nextCursor } = await listBusinesses({ limit: 200, cursor });
    for (const business of items) {
      if (limit !== undefined && inspected >= limit) break outer;
      inspected += 1;

      const [recipients, postcards] = await Promise.all([
        listCampaignRecipientsForBusiness(business.businessId),
        listPostcardsForBusiness(business.businessId),
      ]);
      const target = computeBackfillStatus(business, recipients, postcards);
      targetCounts[target] += 1;

      if (target !== business.status) {
        changed += 1;
        console.log(`[backfill] ${business.businessId} (${business.name}): ${business.status} -> ${target}`);
        if (apply) {
          await updateBusiness(business.businessId, { status: target });
        }
      }
    }
    cursor = nextCursor;
  } while (cursor);

  console.log('---');
  console.log(`[backfill] inspected: ${inspected}, changed: ${changed}, unchanged: ${inspected - changed}`);
  console.log(`[backfill] target status counts: ${JSON.stringify(targetCounts)}`);
  if (!apply) {
    console.log('[backfill] DRY RUN — nothing was written. Re-run with --apply to write these changes.');
  }
}

// Guarded so importing this module (e.g. from a unit test exercising
// `computeBackfillStatus`) never triggers a real run as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[backfill] failed:', err);
    process.exit(1);
  });
}
