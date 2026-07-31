'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import type { DomainConnectionStatus, DomainDnsInstruction, DomainFailureCategory } from '@/domain/models/domain-connection';
import { completeExistingDomainAction } from '../actions';

const POLL_INTERVAL_MS = 7000;
const TERMINAL_STATUSES = new Set<DomainConnectionStatus>(['active', 'failed', 'disconnected', 'expired']);

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

interface Props {
  businessId: string;
  domainName: string;
  normalizedDomain: string;
  domainConnectionId: string;
  initialStatus: DomainConnectionStatus;
  initialVerificationRecords: DomainDnsInstruction[];
  initialFailureCategory: DomainFailureCategory | null;
}

/**
 * Real-time domain verification (implementation.md, Stage 19.x, Part 2).
 * One deliberate manual click ("Record Updated," signaling "I've made the
 * DNS change") starts automatic polling against `/api/domains/status` —
 * the customer never has to click again to see it progress through to
 * "Your domain is live."
 */
export function DomainStatusPanel({
  businessId,
  domainName,
  normalizedDomain,
  domainConnectionId,
  initialStatus,
  initialVerificationRecords,
  initialFailureCategory,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [records, setRecords] = useState(initialVerificationRecords);
  const [, setFailureCategory] = useState(initialFailureCategory);
  const [polling, setPolling] = useState(false);
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">{domainName}</h2>
        <div className="mt-1 flex items-center gap-2">
          {!isLive && !isTerminalFailure && polling && (
            <span className="h-2 w-2 rounded-full bg-(--color-brand) animate-pulse" aria-hidden="true" />
          )}
          <p className={`text-sm ${isLive ? 'text-green-700 font-medium' : isTerminalFailure ? 'text-red-700' : 'text-gray-600'}`}>
            {PROGRESS_COPY[status]}
          </p>
        </div>

        {showRecords && (
          <div className="mt-4 space-y-2">
            {records.map((rec, i) => (
              <div key={i} className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs font-mono text-gray-700">
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
            className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
            ? 'w-full rounded-lg bg-(--color-brand) text-white px-5 py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-50'
            : 'text-sm font-medium text-gray-600 underline disabled:opacity-50'
        }
      >
        {isLive ? 'Continue' : "Continue — I'll finish this later"}
      </button>
    </div>
  );
}
