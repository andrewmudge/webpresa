'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Circle, CircleCheck, CircleAlert, SendHorizontal } from 'lucide-react';
import type { Campaign, CampaignStatus } from '@/domain/models/campaign';
import { CAMPAIGN_STATUSES } from '@/domain/models/campaign';
import type { CampaignRecipient, CampaignRecipientStatus } from '@/domain/models/campaign-recipient';
import type { ScanHit } from '@/domain/models/scan-hit';
import type { Postcard } from '@/domain/models/postcard';
import type { QualificationResult, LeadPriority } from '@/domain/models/website-assessment';
import type { ScanWorkflowStatus } from '@/domain/models/scan-execution';
import { isActiveWorkflowStatus } from '@/lib/workflow/labels';
import { derivePostcardStatus, type RecipientPostcardStatus } from '@/lib/postcards/status';
import { formatCampaignCodeForDisplay } from '@/lib/campaign/code-format';
import {
  updateCampaignStatusAction,
  deleteCampaignAction,
  updateCampaignRecipientDestinationAction,
  updateCampaignRecipientStatusAction,
} from '../actions';
import { createPostcardAction, approvePostcardAction, submitPostcardToLobAction, retryRenderPostcardAction } from '../../postcards/actions';
import { runCampaignScanAction, type RunCampaignScanSummary } from './scan-actions';
import { CampaignScanAutoRefresh } from './CampaignScanAutoRefresh';
import { AssessmentTable } from './AssessmentTable';
import PostcardFrontThumbnail from '../../postcards/components/PostcardFrontThumbnail';

export interface BusinessOption {
  businessId: string;
  name: string;
  slug: string;
  qualification?: QualificationResult;
  leadPriority?: LeadPriority;
  websiteQualityScore?: number;
  currentPreviewId?: string;
}

export interface RecipientPostcardAssets {
  businessName: string;
  beforeScreenshotSrc?: string;
  afterDesktopScreenshotSrc?: string;
  afterMobileScreenshotSrc?: string;
  qrDataUri?: string;
  accessCodeDisplay?: string;
  /** Signed S3 URL for the rendered front PDF — absent until rendering completes. */
  frontUrl?: string;
}

interface Props {
  campaign: Campaign;
  recipients: CampaignRecipient[];
  businesses: BusinessOption[];
  recentScansByRecipient: Record<string, ScanHit[]>;
  postcardsByRecipient: Record<string, Postcard | null>;
  postcardAssetsByRecipient: Record<string, RecipientPostcardAssets>;
  /** Newest `ScanExecution.status` per business — `Business.scanExecutionStatus` itself is never actually written by the scan workflow, so this is sourced from `listScanExecutionsForBusiness` instead (same as the business detail page's own "Scan Workflow" card). */
  latestScanStatusByBusiness: Record<string, ScanWorkflowStatus | undefined>;
}

/**
 * Admin campaign detail view (Stage 21, redesigned) — recipients now come
 * exclusively from the discover-import flow (`campaigns/[campaignId]/discover`),
 * not a manual business picker here. This view adds a campaign-wide "Run
 * full scan" trigger, the AI assessment gate before recipients are
 * finalized (`AssessmentTable`), and per-recipient postcard status/approval
 * management without navigating to each postcard's own page.
 */
export function CampaignDetail({
  campaign,
  recipients,
  businesses,
  recentScansByRecipient,
  postcardsByRecipient,
  postcardAssetsByRecipient,
  latestScanStatusByBusiness,
}: Props) {
  const businessById = new Map(businesses.map((b) => [b.businessId, b]));
  const totalScans = recipients.reduce((sum, r) => sum + r.totalScans, 0);
  const totalEstimatedUnique = recipients.reduce((sum, r) => sum + r.estimatedUniqueScans, 0);

  const anyScanEverRun = recipients.some((r) => latestScanStatusByBusiness[r.businessId]);
  const anyScanActive = recipients.some((r) => {
    const status = latestScanStatusByBusiness[r.businessId];
    return status ? isActiveWorkflowStatus(status) : false;
  });
  const anyPendingFinalization = recipients.some((r) => !r.postcardId);
  const showAssessmentTable = anyScanEverRun && !anyScanActive && anyPendingFinalization && recipients.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <CampaignScanAutoRefresh active={anyScanActive} />

      <CampaignHeader campaign={campaign} anyRecipients={recipients.length > 0} anyScanActive={anyScanActive} />

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

      {showAssessmentTable && <AssessmentTable campaignId={campaign.campaignId} recipients={recipients} businesses={businesses} />}

      <RecipientsSection
        campaignId={campaign.campaignId}
        recipients={recipients}
        businessById={businessById}
        recentScansByRecipient={recentScansByRecipient}
        postcardsByRecipient={postcardsByRecipient}
        postcardAssetsByRecipient={postcardAssetsByRecipient}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign header + status control + campaign-wide "Run full scan"
// ---------------------------------------------------------------------------

function CampaignHeader({ campaign, anyRecipients, anyScanActive }: { campaign: Campaign; anyRecipients: boolean; anyScanActive: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isScanning, startScanTransition] = useTransition();
  const [scanSummary, setScanSummary] = useState<RunCampaignScanSummary | null>(null);

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

  function handleRunFullScan() {
    setScanSummary(null);
    startScanTransition(async () => {
      const result = await runCampaignScanAction(campaign.campaignId);
      setScanSummary(result);
      router.refresh();
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

      <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={handleRunFullScan}
          disabled={isScanning || anyScanActive || !anyRecipients}
          className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isScanning || anyScanActive ? 'Running…' : 'Run full scan'}
        </button>
        {!anyRecipients && <p className="text-xs text-gray-400">Import businesses first to run a scan.</p>}
        {scanSummary && (
          <p className="text-xs text-gray-500">
            Started {scanSummary.started} · Conflict {scanSummary.conflict} · Failed {scanSummary.failed}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recipients — filter bar, bulk approve/submit, recipient cards
// ---------------------------------------------------------------------------

type StatusFilterValue = 'all' | 'not_approved' | 'approved' | 'submitted';

const STATUS_FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'not_approved', label: 'Not approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'submitted', label: 'Submitted' },
];

function RecipientsSection({
  campaignId,
  recipients,
  businessById,
  recentScansByRecipient,
  postcardsByRecipient,
  postcardAssetsByRecipient,
}: {
  campaignId: string;
  recipients: CampaignRecipient[];
  businessById: Map<string, BusinessOption>;
  recentScansByRecipient: Record<string, ScanHit[]>;
  postcardsByRecipient: Record<string, Postcard | null>;
  postcardAssetsByRecipient: Record<string, RecipientPostcardAssets>;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [isBulkPending, startBulkTransition] = useTransition();

  const statuses = new Map(recipients.map((r) => [r.campaignRecipientId, derivePostcardStatus(postcardsByRecipient[r.campaignRecipientId])]));

  const counts = {
    all: recipients.length,
    not_approved: recipients.filter((r) => statuses.get(r.campaignRecipientId) === 'not_approved').length,
    approved: recipients.filter((r) => statuses.get(r.campaignRecipientId) === 'approved').length,
    submitted: recipients.filter((r) => statuses.get(r.campaignRecipientId) === 'submitted').length,
  };

  const visibleRecipients = recipients.filter((r) => statusFilter === 'all' || statuses.get(r.campaignRecipientId) === statusFilter);

  function handleApproveAll() {
    startBulkTransition(async () => {
      const targets = visibleRecipients.filter((r) => statuses.get(r.campaignRecipientId) === 'not_approved' && r.postcardId);
      await Promise.all(targets.map((r) => approvePostcardAction(r.postcardId!)));
      router.refresh();
    });
  }

  function handleSubmitAll() {
    startBulkTransition(async () => {
      const targets = visibleRecipients.filter((r) => statuses.get(r.campaignRecipientId) === 'approved' && r.postcardId);
      await Promise.all(targets.map((r) => submitPostcardToLobAction(r.postcardId!)));
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Recipients</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApproveAll}
            disabled={isBulkPending || counts.not_approved === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Approve all
          </button>
          <button
            type="button"
            onClick={handleSubmitAll}
            disabled={isBulkPending || counts.approved === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Submit all
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === filter.value ? 'border-(--color-brand) bg-(--color-brand)/10 text-(--color-brand)' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label} ({counts[filter.value]})
          </button>
        ))}
      </div>

      {recipients.length === 0 ? (
        <p className="text-sm text-gray-500">
          No recipients yet —{' '}
          <a href={`/admin/campaigns/${campaignId}/discover`} className="text-(--color-brand) hover:underline">
            discover and import businesses
          </a>{' '}
          to add some.
        </p>
      ) : visibleRecipients.length === 0 ? (
        <p className="text-sm text-gray-500">No recipients match this filter.</p>
      ) : (
        <ul className="space-y-4">
          {visibleRecipients.map((recipient) => (
            <RecipientCard
              key={recipient.campaignRecipientId}
              recipient={recipient}
              business={businessById.get(recipient.businessId)}
              recentScans={recentScansByRecipient[recipient.campaignRecipientId] ?? []}
              postcard={postcardsByRecipient[recipient.campaignRecipientId]}
              assets={postcardAssetsByRecipient[recipient.campaignRecipientId]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One recipient — destination edit, status toggle, rollups, QR, recent
// scans, postcard status/thumbnail and inline approve/submit
// ---------------------------------------------------------------------------

function RecipientCard({
  recipient,
  business,
  recentScans,
  postcard,
  assets,
}: {
  recipient: CampaignRecipient;
  business?: BusinessOption;
  recentScans: ScanHit[];
  postcard: Postcard | null | undefined;
  assets: RecipientPostcardAssets | undefined;
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
        <PostcardControl campaignRecipientId={recipient.campaignRecipientId} postcard={postcard} postcardId={recipient.postcardId} assets={assets} />
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
// Postcard status/thumbnail/inline approve+submit (Stage 21 redesign) —
// replaces the old plain "Generate postcard" / "View postcard →" control.
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<RecipientPostcardStatus, { label: string; className: string; Icon: typeof Circle }> = {
  no_postcard: { label: 'No postcard', className: 'bg-gray-50 text-gray-500 border-gray-200', Icon: Circle },
  render_failed: { label: 'Render failed', className: 'bg-red-50 text-red-700 border-red-200', Icon: CircleAlert },
  not_approved: { label: 'Not approved', className: 'bg-gray-50 text-gray-700 border-gray-200', Icon: Circle },
  approved: { label: 'Approved', className: 'bg-amber-50 text-amber-700 border-amber-200', Icon: CircleCheck },
  submitted: { label: 'Submitted', className: 'bg-green-50 text-green-700 border-green-200', Icon: SendHorizontal },
};

function PostcardControl({
  campaignRecipientId,
  postcard,
  postcardId,
  assets,
}: {
  campaignRecipientId: string;
  postcard: Postcard | null | undefined;
  postcardId?: string;
  assets: RecipientPostcardAssets | undefined;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusValue = derivePostcardStatus(postcard);
  const badge = STATUS_BADGE[statusValue];

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await createPostcardAction(campaignRecipientId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.renderWarning) {
        setError(result.renderWarning);
      }
      router.refresh();
    });
  }

  function handleRetryRender() {
    if (!postcard) return;
    setError(null);
    startTransition(async () => {
      const result = await retryRenderPostcardAction(postcard.postcardId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleApprove() {
    if (!postcard) return;
    setError(null);
    startTransition(async () => {
      const result = await approvePostcardAction(postcard.postcardId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSubmit() {
    if (!postcard) return;
    setError(null);
    startTransition(async () => {
      const result = await submitPostcardToLobAction(postcard.postcardId);
      if (result.status !== 'submitted') {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  if (!postcardId || !postcard) {
    return (
      <div>
        <button type="button" onClick={handleGenerate} disabled={isPending} className="text-xs text-(--color-brand) hover:underline disabled:opacity-60">
          {isPending ? 'Generating…' : 'Generate postcard'}
        </button>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      <PostcardFrontThumbnail
        businessName={assets?.businessName ?? ''}
        beforeScreenshotSrc={assets?.beforeScreenshotSrc}
        afterDesktopScreenshotSrc={assets?.afterDesktopScreenshotSrc}
        afterMobileScreenshotSrc={assets?.afterMobileScreenshotSrc}
        qrDataUri={assets?.qrDataUri}
        accessCodeDisplay={assets?.accessCodeDisplay}
        href={assets?.frontUrl}
        width={128}
      />
      <div className="min-w-[140px] space-y-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${badge.className}`}>
          <badge.Icon size={12} />
          {badge.label}
        </span>
        <div className="flex flex-col items-start gap-1">
          {statusValue === 'render_failed' && (
            <button type="button" onClick={handleRetryRender} disabled={isPending} className="text-xs text-(--color-brand) hover:underline disabled:opacity-60">
              {isPending ? 'Retrying…' : 'Retry render'}
            </button>
          )}
          {statusValue === 'not_approved' && (
            <button type="button" onClick={handleApprove} disabled={isPending} className="text-xs text-(--color-brand) hover:underline disabled:opacity-60">
              {isPending ? 'Approving…' : 'Approve'}
            </button>
          )}
          {statusValue === 'approved' && (
            <button type="button" onClick={handleSubmit} disabled={isPending} className="text-xs text-(--color-brand) hover:underline disabled:opacity-60">
              {isPending ? 'Submitting…' : 'Submit to Lob'}
            </button>
          )}
          <a href={`/admin/postcards/${postcardId}`} className="text-xs text-gray-500 hover:underline">
            Full details →
          </a>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
