'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CAMPAIGN_CHANNELS, type CampaignChannel } from '@/domain/models/campaign';
import { createCampaignAction } from '../actions';

export function NewCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<CampaignChannel>('postcard');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCampaignAction({ name, channel });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.campaignId) router.push(`/admin/campaigns/${result.campaignId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Campaign name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
          placeholder="e.g. Spring 2026 postcard drop"
        />
      </div>

      <div>
        <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">
          Channel
        </label>
        <select
          id="channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as CampaignChannel)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
        >
          {CAMPAIGN_CHANNELS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-(--color-brand) text-white px-4 py-2 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Create campaign'}
      </button>
    </form>
  );
}
