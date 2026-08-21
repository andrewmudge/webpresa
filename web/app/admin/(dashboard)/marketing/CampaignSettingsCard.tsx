import type { MarketingCampaign } from '@/domain/models/marketing-campaign';
import { updateCampaignEnabledAction } from './settings-actions';

export function CampaignSettingsCard({ campaign }: { campaign: MarketingCampaign }) {
  const enabled = campaign.status === 'enabled';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Campaign Settings — {campaign.name}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {enabled ? 'Enabled — due emails will send on the next daily sweep.' : 'Disabled — no new emails will be scheduled or sent.'}
        </p>
      </div>
      <form action={updateCampaignEnabledAction}>
        <input type="hidden" name="enabled" value={(!enabled).toString()} />
        <button
          type="submit"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            enabled ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-(--color-brand) text-white hover:bg-(--color-brand-dark)'
          }`}
        >
          {enabled ? 'Disable Campaign' : 'Enable Campaign'}
        </button>
      </form>
    </div>
  );
}
