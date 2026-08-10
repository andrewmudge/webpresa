'use server';
import type { Industry } from '@/domain/constants/industries';
import type { GooglePlaceSearchResult } from '@/domain/models/google-places';
import { GooglePlaceSearchResultSchema } from '@/domain/schemas/google-places.schema';
import { getSession } from '@/lib/auth/session';
import { findDuplicateSignalsForBatch } from '@/lib/google-places/duplicates';
import { importGooglePlaceCandidate } from '@/lib/google-places/import-candidate';
import { getCampaignById } from '@/lib/db/campaigns';
import { addCampaignRecipientAction } from '../../actions';
import type { ImportSummary } from '../../../discover/actions';

/**
 * Campaign-scoped Discover import (redesigned campaign flow) — combines
 * `importSelectedPlacesAction`'s per-candidate business creation with an
 * automatic `addCampaignRecipientAction` call, so importing a discovered
 * business into a campaign also makes it a recipient in one step. Selection
 * comes from `CampaignDiscoverPanel`'s cross-search client state, not a
 * single search results form — each selection round-trips its full,
 * client-controlled `GooglePlaceSearchResult` and is re-validated here
 * exactly like the standalone Discover page already does.
 */

export interface CampaignDiscoverSelection {
  result: GooglePlaceSearchResult;
  industry: Industry;
  confirmDuplicate?: boolean;
}

export type CampaignImportSummary = ImportSummary;

const EMPTY_STATE: CampaignImportSummary = { imported: 0, duplicates: 0, failed: 0, failures: [] };

export async function importSelectedPlacesForCampaignAction(
  campaignId: string,
  selections: CampaignDiscoverSelection[],
): Promise<CampaignImportSummary> {
  const session = await getSession();
  if (!session) return { ...EMPTY_STATE, failures: [{ name: '—', reason: 'Unauthorized' }] };

  if (selections.length === 0) return EMPTY_STATE;

  const campaign = await getCampaignById(campaignId);
  if (!campaign) return { ...EMPTY_STATE, failures: [{ name: '—', reason: 'Campaign not found.' }] };

  const state: ImportSummary = { imported: 0, duplicates: 0, failed: 0, failures: [] };

  // Re-validate every client-supplied result up front — same treatment as
  // `importSelectedPlacesAction`'s round-tripped hidden form data.
  const candidates: { result: GooglePlaceSearchResult; industry: Industry; confirmDuplicate: boolean }[] = [];
  for (const selection of selections) {
    const parsedResult = GooglePlaceSearchResultSchema.safeParse(selection.result);
    if (!parsedResult.success) {
      state.failed += 1;
      state.failures.push({ name: selection.result.name ?? 'Unknown', reason: 'Invalid search result data' });
      continue;
    }
    candidates.push({ result: parsedResult.data, industry: selection.industry, confirmDuplicate: selection.confirmDuplicate ?? false });
  }
  if (candidates.length === 0) return state;

  const duplicateSignalsByPlaceId = await findDuplicateSignalsForBatch(
    candidates.map(({ result }) => ({
      placeId: result.placeId,
      name: result.name,
      websiteUrl: result.websiteUrl,
      phone: result.phone,
      address: result.address,
    })),
  );

  for (const { result, industry, confirmDuplicate } of candidates) {
    const signals = duplicateSignalsByPlaceId.get(result.placeId) ?? [];
    const hasBlockingSignal = signals.some((signal) => signal.confidence === 'blocking');

    if (hasBlockingSignal && !confirmDuplicate) {
      state.duplicates += 1;
      continue;
    }

    const outcome = await importGooglePlaceCandidate(result, industry);
    if ('error' in outcome) {
      state.failed += 1;
      state.failures.push({ name: result.name, reason: outcome.error });
      continue;
    }

    const recipientResult = await addCampaignRecipientAction(campaignId, { businessId: outcome.businessId });
    if (recipientResult.error) {
      state.failed += 1;
      state.failures.push({ name: result.name, reason: `Imported but could not add to campaign: ${recipientResult.error}` });
      continue;
    }

    state.imported += 1;
  }

  console.info('[campaigns] discover import summary', {
    campaignId,
    selected: selections.length,
    imported: state.imported,
    duplicates: state.duplicates,
    failed: state.failed,
  });

  return state;
}
