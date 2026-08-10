'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import type { CampaignRecipient } from '@/domain/models/campaign-recipient';
import { QUALIFICATION_LABELS, QUALIFICATION_TONE, LEAD_PRIORITY_LABELS, LEAD_PRIORITY_TONE } from '@/lib/scoring/labels';
import { removeCampaignRecipientsAction } from '../actions';
import { publishAndGeneratePostcardsAction } from './postcard-batch-actions';
import type { BusinessOption } from './CampaignDetail';

/**
 * AI website assessment summary (Stage 21 redesign) — shown once every
 * recipient's scan has finished, gating whether a recipient actually gets
 * published + mailed. Qualified businesses default included; anything else
 * defaults excluded until the admin explicitly adds it. "Add Selected
 * Businesses" syncs the campaign's recipient set to match (§ removeCampaignRecipientsAction)
 * and publishes + generates postcards for the rest (§ publishAndGeneratePostcardsAction).
 */

interface Props {
  campaignId: string;
  recipients: CampaignRecipient[];
  businesses: BusinessOption[];
}

export function AssessmentTable({ campaignId, recipients, businesses }: Props) {
  const router = useRouter();
  const businessById = new Map(businesses.map((b) => [b.businessId, b]));

  const [excluded, setExcluded] = useState<Set<string>>(
    () => new Set(recipients.filter((r) => businessById.get(r.businessId)?.qualification !== 'qualified').map((r) => r.campaignRecipientId)),
  );
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<{ removed: number; published: number; postcardsGenerated: number; failed: number } | null>(null);

  function toggleExcluded(id: string, exclude: boolean) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (exclude) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleAddSelected() {
    setSummary(null);
    startTransition(async () => {
      const allIds = recipients.map((r) => r.campaignRecipientId);
      const includedIds = allIds.filter((id) => !excluded.has(id));
      const excludedIds = allIds.filter((id) => excluded.has(id));

      const [removeResult, publishResult] = await Promise.all([
        excludedIds.length ? removeCampaignRecipientsAction(campaignId, excludedIds) : Promise.resolve({ removed: 0 }),
        includedIds.length
          ? publishAndGeneratePostcardsAction(campaignId, includedIds)
          : Promise.resolve({ published: 0, alreadyPublished: 0, postcardsGenerated: 0, alreadyHadPostcard: 0, failed: [] }),
      ]);

      setSummary({
        removed: removeResult.removed,
        published: publishResult.published,
        postcardsGenerated: publishResult.postcardsGenerated,
        failed: publishResult.failed.length,
      });
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">AI website assessment</h3>
      <p className="text-xs text-gray-500 mb-4">
        Qualified businesses are marked for import automatically. Review the rest and choose whether to include or remove them before
        publishing sites and generating postcards.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-200">
              <th className="py-2 pr-3">Business</th>
              <th className="py-2 pr-3">Website Score</th>
              <th className="py-2 pr-3">Lead Priority</th>
              <th className="py-2 pr-3">Qualification</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((recipient) => {
              const business = businessById.get(recipient.businessId);
              const isExcluded = excluded.has(recipient.campaignRecipientId);
              return (
                <tr key={recipient.campaignRecipientId} className={`border-b border-gray-100 ${isExcluded ? 'opacity-50' : ''}`}>
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/businesses/${recipient.businessId}`} className="font-medium text-gray-900 hover:text-(--color-brand)">
                      {business?.name ?? recipient.businessId}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700">{business?.websiteQualityScore ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {business?.leadPriority ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium border ${LEAD_PRIORITY_TONE[business.leadPriority]}`}>
                        {LEAD_PRIORITY_LABELS[business.leadPriority]}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {business?.qualification ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium border ${QUALIFICATION_TONE[business.qualification]}`}>
                        {QUALIFICATION_LABELS[business.qualification]}
                      </span>
                    ) : (
                      <span className="text-gray-300">Not scored</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleExcluded(recipient.campaignRecipientId, false)}
                        aria-label={`Include ${business?.name ?? recipient.businessId}`}
                        className={`rounded-lg border p-1.5 transition-colors ${
                          !isExcluded ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExcluded(recipient.campaignRecipientId, true)}
                        aria-label={`Remove ${business?.name ?? recipient.businessId}`}
                        className={`rounded-lg border p-1.5 transition-colors ${
                          isExcluded ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleAddSelected}
          disabled={isPending}
          className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60"
        >
          {isPending ? 'Working…' : 'Add Selected Businesses'}
        </button>
        {summary && (
          <p className="text-xs text-gray-500">
            Removed {summary.removed} · Published {summary.published} · Postcards generated {summary.postcardsGenerated}
            {summary.failed > 0 && <span className="text-red-600"> · {summary.failed} failed</span>}
          </p>
        )}
      </div>
    </div>
  );
}
