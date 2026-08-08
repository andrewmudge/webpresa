'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Campaign, CampaignStatus } from '@/domain/models/campaign';
import { CAMPAIGN_STATUSES } from '@/domain/models/campaign';
import type { CampaignRecipient, CampaignRecipientStatus } from '@/domain/models/campaign-recipient';
import type { ScanHit } from '@/domain/models/scan-hit';
import { formatCampaignCodeForDisplay } from '@/lib/campaign/code-format';
import {
  updateCampaignStatusAction,
  deleteCampaignAction,
  addCampaignRecipientAction,
  updateCampaignRecipientDestinationAction,
  updateCampaignRecipientStatusAction,
} from '../actions';
import { createPostcardAction } from '../../postcards/actions';

interface BusinessOption {
  businessId: string;
  name: string;
  slug: string;
}

interface Props {
  campaign: Campaign;
  recipients: CampaignRecipient[];
  businesses: BusinessOption[];
  recentScansByRecipient: Record<string, ScanHit[]>;
}

/**
 * Admin campaign detail view (Stage 21) — campaign details, recipient list
 * with an add-recipient form, per-recipient scan rollups + recent scans +
 * QR preview/download, and campaign-wide totals. No charts, no funnels —
 * counts and a recent-activity list only (see implementation.md, Stage 21,
 * "Admin experience").
 */
export function CampaignDetail({ campaign, recipients, businesses, recentScansByRecipient }: Props) {
  const businessById = new Map(businesses.map((b) => [b.businessId, b]));
  const totalScans = recipients.reduce((sum, r) => sum + r.totalScans, 0);
  const totalEstimatedUnique = recipients.reduce((sum, r) => sum + r.estimatedUniqueScans, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <CampaignHeader campaign={campaign} />

      <div className="rounded-xl border border-(--color-border) bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Campaign analytics</h3>
        <div className="flex gap-8">
          <div>
            <p className="text-2xl font-semibold text-gray-900">{totalScans}</p>
            <p className="text-xs text-gray-500">Total scans</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-gray-900">{totalEstimatedUnique}</p>
            <p className="text-xs text-gray-500">Estimated unique scans</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-(--color-border) bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recipients</h3>

        {recipients.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">No recipients yet — add one below to test the full flow end to end.</p>
        ) : (
          <ul className="space-y-4 mb-6">
            {recipients.map((recipient) => (
              <RecipientCard
                key={recipient.campaignRecipientId}
                recipient={recipient}
                business={businessById.get(recipient.businessId)}
                recentScans={recentScansByRecipient[recipient.campaignRecipientId] ?? []}
              />
            ))}
          </ul>
        )}

        <AddRecipientForm campaignId={campaign.campaignId} businesses={businesses} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign header + status control
// ---------------------------------------------------------------------------

function CampaignHeader({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleStatusChange(next: CampaignStatus) {
    setError(null);
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateCampaignStatusAction(campaign.campaignId, next);
      if (result.error) {
        setError(result.error);
        setStatus(previous);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Permanently delete "${campaign.name}" and all of its recipients/scan history? This cannot be undone.`)) return;
    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteCampaignAction(campaign.campaignId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/admin/campaigns');
    });
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{campaign.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {campaign.channel} · Created {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <label htmlFor="campaign-status" className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              id="campaign-status"
              value={status}
              disabled={isPending}
              onChange={(e) => handleStatusChange(e.target.value as CampaignStatus)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 capitalize disabled:opacity-60"
            >
              {CAMPAIGN_STATUSES.map((value) => (
                <option key={value} value={value} className="capitalize">
                  {value}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="mt-[21px] shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One recipient — destination edit, status toggle, rollups, QR, recent scans
// ---------------------------------------------------------------------------

function RecipientCard({
  recipient,
  business,
  recentScans,
}: {
  recipient: CampaignRecipient;
  business?: BusinessOption;
  recentScans: ScanHit[];
}) {
  const router = useRouter();
  const [destinationUrl, setDestinationUrl] = useState(recipient.destinationUrl ?? '');
  const [destinationLabel, setDestinationLabel] = useState(recipient.destinationLabel ?? '');
  const [status, setStatus] = useState<CampaignRecipientStatus>(recipient.status);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showScans, setShowScans] = useState(false);
  const [showOverride, setShowOverride] = useState(recipient.destinationType === 'custom');
  const [isPending, startTransition] = useTransition();

  const redirectUrl = `/r/${recipient.campaignCode}`;
  const qrUrl = `/api/campaigns/${recipient.campaignRecipientId}/qr`;

  function handleSaveDestination(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCampaignRecipientDestinationAction(recipient.campaignRecipientId, {
        destinationUrl,
        destinationLabel,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  function handleToggleStatus() {
    setError(null);
    const next: CampaignRecipientStatus = status === 'active' ? 'disabled' : 'active';
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateCampaignRecipientStatusAction(recipient.campaignRecipientId, next);
      if (result.error) {
        setError(result.error);
        setStatus(previous);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt={`QR code for ${redirectUrl}`} width={96} height={96} className="rounded-lg border border-gray-100" />
          <div className="text-sm">
            <p className="font-medium text-gray-900">{business ? business.name : recipient.businessId}</p>
            <p className="text-gray-500 font-mono text-xs mt-0.5">{formatCampaignCodeForDisplay(recipient.campaignCode)}</p>
            <p className="mt-1">
              <a href={qrUrl} download={`campaign-${recipient.campaignCode}.png`} className="text-(--color-brand) hover:underline text-xs">
                Download QR
              </a>
              <span className="text-gray-300 mx-1.5">·</span>
              <a href={redirectUrl} target="_blank" rel="noreferrer" className="text-(--color-brand) hover:underline text-xs">
                Open link
              </a>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              No scanner? Visit <span className="font-mono">webpresa.com/access</span> and enter this code.
            </p>
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-900">{recipient.totalScans}</span> total scans
              </span>
              <span>
                <span className="font-semibold text-gray-900">{recipient.estimatedUniqueScans}</span> est. unique
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {recipient.destinationType === 'custom' ? (
                <>Destination: {recipient.destinationLabel || recipient.destinationUrl}</>
              ) : recipient.claimId ? (
                <>Destination: claim flow (scans lead straight to signup)</>
              ) : (
                <span className="text-amber-600">Already claimed — links to the live page</span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={isPending}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
            status === 'active'
              ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          {status === 'active' ? 'Active — disable' : 'Disabled — reactivate'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <div className="mt-3">
        <GeneratePostcardControl campaignRecipientId={recipient.campaignRecipientId} postcardId={recipient.postcardId} />
      </div>

      <div className="mt-3">
        <button type="button" onClick={() => setShowOverride((v) => !v)} className="text-xs text-(--color-brand) hover:underline">
          {showOverride ? 'Hide destination override' : 'Override destination'}
        </button>
        {showOverride && (
          <form onSubmit={handleSaveDestination} className="mt-2 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Destination URL</label>
              <input
                type="text"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://webpresa.com/b/joe-plumbing"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Label (optional)</label>
              <input
                type="text"
                value={destinationLabel}
                onChange={(e) => setDestinationLabel(e.target.value)}
                placeholder="e.g. pricing"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              Save
            </button>
            {savedAt && <span className="text-xs text-green-600">Saved</span>}
          </form>
        )}
        {showOverride && recipient.destinationType === 'claim' && (
          <p className="mt-1 text-xs text-gray-400">Saving this switches the recipient away from the claim flow permanently.</p>
        )}
      </div>

      <div className="mt-3">
        <button type="button" onClick={() => setShowScans((v) => !v)} className="text-xs text-(--color-brand) hover:underline">
          {showScans ? 'Hide recent scans' : `Show recent scans (${recentScans.length})`}
        </button>
        {showScans && (
          <ul className="mt-2 space-y-1">
            {recentScans.length === 0 && <li className="text-xs text-gray-400">No scans recorded yet.</li>}
            {recentScans.map((hit) => (
              <li key={hit.sortKey} className="text-xs text-gray-500 flex gap-2">
                <span className="text-gray-400">{new Date(hit.createdAt).toLocaleString()}</span>
                <span className="capitalize">{hit.deviceClass}</span>
                {hit.browserFamily && <span>{hit.browserFamily}</span>}
                {hit.operatingSystem && <span>{hit.operatingSystem}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Generate postcard (Stage 22) — reachable per-recipient rather than a
// separate bulk-selection flow, matching this stage's manual-only workflow.
// ---------------------------------------------------------------------------

function GeneratePostcardControl({ campaignRecipientId, postcardId }: { campaignRecipientId: string; postcardId?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (postcardId) {
    return (
      <a href={`/admin/postcards/${postcardId}`} className="text-xs text-(--color-brand) hover:underline">
        View postcard →
      </a>
    );
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await createPostcardAction(campaignRecipientId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/admin/postcards/${result.postcardId}`);
    });
  }

  return (
    <div>
      <button type="button" onClick={handleGenerate} disabled={isPending} className="text-xs text-(--color-brand) hover:underline disabled:opacity-60">
        {isPending ? 'Generating…' : 'Generate postcard'}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add recipient
// ---------------------------------------------------------------------------

function AddRecipientForm({ campaignId, businesses }: { campaignId: string; businesses: BusinessOption[] }) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCampaignRecipientAction(campaignId, {
        businessId,
        ...(showOverride && destinationUrl ? { destinationUrl, destinationLabel } : {}),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.rawToken) setGeneratedToken(result.rawToken);
      setBusinessId('');
      setShowOverride(false);
      setDestinationUrl('');
      setDestinationLabel('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-100 space-y-3">
      <p className="text-xs font-medium text-gray-500">Add recipient</p>
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {generatedToken && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">
            A new claim code was generated for this recipient — copy it now, it won&apos;t be shown again:
          </p>
          <code className="block text-sm font-mono text-amber-900 break-all">{generatedToken}</code>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <label className="block text-xs font-medium text-gray-500 mb-1">Business</label>
          <select
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
          >
            <option value="" disabled>
              Select a business…
            </option>
            {businesses.map((b) => (
              <option key={b.businessId} value={b.businessId}>
                {b.name} ({b.slug})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-(--color-brand) text-white px-3 py-1.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60"
        >
          {isPending ? 'Adding…' : 'Add recipient'}
        </button>
      </div>
      <p className="text-xs text-gray-400">
        By default, the QR wires straight into this business&apos;s claim flow — reusing a usable claim
        if one already exists, generating a new one otherwise. No manual code entry needed.
      </p>

      <div>
        <button type="button" onClick={() => setShowOverride((v) => !v)} className="text-xs text-(--color-brand) hover:underline">
          {showOverride ? 'Hide advanced' : 'Advanced: override destination'}
        </button>
        {showOverride && (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Destination URL</label>
              <input
                type="text"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://webpresa.com/pricing"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Label (optional)</label>
              <input
                type="text"
                value={destinationLabel}
                onChange={(e) => setDestinationLabel(e.target.value)}
                placeholder="e.g. pricing"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
