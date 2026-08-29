'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import type { DomainConnectionStatus, DomainConnectionSource, DomainDnsInstruction, DomainFailureCategory } from '@/domain/models/domain-connection';
import { completeExistingDomainAction } from '../actions';

const POLL_INTERVAL_MS = 7000;
const TERMINAL_STATUSES = new Set<DomainConnectionStatus>(['active', 'failed', 'disconnected', 'expired']);

const AWAITING_DNS_IDLE_COPY = 'Update your DNS records at your domain registrar, then click "Record Updated" below.';

const PROGRESS_COPY: Record<DomainConnectionStatus, string> = {
  draft: 'Getting started.',
  awaiting_dns: 'Checking your DNS records…',
  verifying: 'Still checking — this can take a few minutes…',
  connected: 'Domain connected — securing your website…',
  certificate_pending: 'Securing your website…',
  active: 'Your domain is live.',
  failed: "We couldn't verify this domain. Double-check the records below and try again, or contact us for help.",
  disconnected: 'This domain is no longer connected.',
  expired: 'This domain connection has expired.',
};

/**
 * A freshly-*purchased* domain (`source: 'webpresa_registered'`) can take
 * meaningfully longer here than a domain the customer already owned and is
 * just connecting — a brand-new domain needs its NS delegation to
 * propagate *and* OpenSRS's own control-plane-to-DNS sync to catch up,
 * confirmed directly against live DNS during testing (2026-08-29) to take
 * well beyond the "a few minutes" `PROGRESS_COPY` implies for the
 * already-established-domain case. Only overrides the two statuses where
 * that distinction actually matters; every other status's copy is already
 * accurate for both sources.
 */
const PURCHASED_DOMAIN_PROGRESS_COPY: Partial<Record<DomainConnectionStatus, string>> = {
  verifying:
    "Setting up your new domain — this can take longer than a domain you already own, since it was just registered. Often just a few minutes, but it's completely normal if it takes longer. No action needed — feel free to continue setting up your site in the meantime.",
  certificate_pending: 'Almost there — securing your website. New domains occasionally take a bit longer here too.',
};

function resolveProgressCopy(status: DomainConnectionStatus, source: DomainConnectionSource): string {
  if (source === 'webpresa_registered') {
    const override = PURCHASED_DOMAIN_PROGRESS_COPY[status];
    if (override) return override;
  }
  return PROGRESS_COPY[status];
}

interface Props {
  businessId: string;
  domainName: string;
  normalizedDomain: string;
  domainConnectionId: string;
  initialStatus: DomainConnectionStatus;
  initialVerificationRecords: DomainDnsInstruction[];
  initialFailureCategory: DomainFailureCategory | null;
  source: DomainConnectionSource;
}

/**
 * Real-time domain verification (implementation.md, Stage 19.x, Part 2).
 * One deliberate manual click ("Record Updated," signaling "I've made the
 * DNS change") starts automatic polling against `/api/domains/status` —
 * the customer never has to click again to see it progress through to
 * "Your domain is live."
 *
 * That manual click doesn't apply to a Part 3 (OpenSRS Storefront) purchase
 * — DNS is already correct via the permanent DNS Template by the time the
 * webhook creates the connection at `'connected'`, so there's no DNS action
 * for the customer to confirm and the `awaiting_dns`-only button never
 * shows. Confirmed as a real bug (2026-08-29): a purchased domain sat at
 * `'connected'` indefinitely with nothing ever re-checking it. Polling now
 * also auto-starts whenever the initial status is already past
 * `awaiting_dns` and not yet terminal, so a Storefront-purchased domain
 * watches itself through to `'active'` with no click needed.
 */
export function DomainStatusPanel({
  businessId,
  domainName,
  normalizedDomain,
  domainConnectionId,
  initialStatus,
  initialVerificationRecords,
  initialFailureCategory,
  source,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [records, setRecords] = useState(initialVerificationRecords);
  const [, setFailureCategory] = useState(initialFailureCategory);
  const [polling, setPolling] = useState(() => initialStatus !== 'awaiting_dns' && initialStatus !== 'draft' && !TERMINAL_STATUSES.has(initialStatus));
  const [checking, setChecking] = useState(false);
  const [isContinuePending, startContinueTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/domains/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, normalizedDomain }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setRecords(data.verificationRecords ?? []);
        setFailureCategory(data.failureCategory ?? null);
      }
    } catch {
      // Transient network error — the next poll tick (or a manual retry) tries again.
    } finally {
      setChecking(false);
    }
  }, [businessId, normalizedDomain]);

  function handleRecordUpdated() {
    setPolling(true);
    void checkStatus();
  }

  useEffect(() => {
    if (!polling || TERMINAL_STATUSES.has(status)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => void checkStatus(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [polling, status, checkStatus]);

  const isLive = status === 'active';
  const isTerminalFailure = status === 'failed' || status === 'expired';
  const showRecords = !isLive && records.length > 0;
  const showRecordUpdatedButton = status === 'awaiting_dns' && !polling;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-(--color-border) bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">{domainName}</h2>
        <div className="mt-1 flex items-center gap-2">
          {!isLive && !isTerminalFailure && polling && (
            <span className="h-2 w-2 rounded-full bg-(--color-brand) animate-pulse" aria-hidden="true" />
          )}
          <p className={`text-sm ${isLive ? 'text-green-700 font-medium' : isTerminalFailure ? 'text-red-700' : 'text-gray-600'}`}>
            {showRecordUpdatedButton ? AWAITING_DNS_IDLE_COPY : resolveProgressCopy(status, source)}
          </p>
        </div>

        {showRecords && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500">
              Log in to {domainName}&apos;s registrar (where you purchased or manage this domain — e.g. GoDaddy,
              Namecheap, Google Domains) and add or edit its DNS records to match exactly what&apos;s shown below.
              Changes usually take a few minutes but can take up to 48 hours to fully take effect.
            </p>
            {records.map((rec, i) => (
              <div key={i} className="rounded-lg border border-(--color-border) bg-gray-50 p-3 font-mono text-xs text-gray-700">
                <div>Type: {rec.recordType}</div>
                <div>Name: {rec.name}</div>
                <div>Value: {rec.value}</div>
              </div>
            ))}
          </div>
        )}

        {(showRecordUpdatedButton || isTerminalFailure) && (
          <button
            type="button"
            onClick={handleRecordUpdated}
            disabled={checking}
            className="mt-4 rounded-lg border border-(--color-border) bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {checking ? 'Checking…' : isTerminalFailure ? 'Try again' : 'Record Updated'}
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={isContinuePending}
        onClick={() => startContinueTransition(() => completeExistingDomainAction(businessId, domainConnectionId, new FormData()))}
        className={
          isLive
            ? 'w-full rounded-lg bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark) disabled:opacity-50 sm:w-auto'
            : 'text-sm font-medium text-gray-500 underline disabled:opacity-50'
        }
      >
        {isLive ? 'Continue to publish' : "Continue — I'll finish this later"}
      </button>
    </div>
  );
}
