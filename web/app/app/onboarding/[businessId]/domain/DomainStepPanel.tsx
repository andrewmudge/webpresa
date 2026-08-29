'use client';

import { useState } from 'react';
import type { DomainConnection } from '@/domain/models/domain-connection';
import { DomainChoiceCards } from './DomainChoiceCards';
import { DomainPurchaseWaiting } from './DomainPurchaseWaiting';
import { DomainStatusPanel } from './DomainStatusPanel';

/**
 * Decides which of three views the Domain step shows — a decision that has
 * to live in a Client Component (unlike `page.tsx`, a Server Component)
 * since it depends on local "did the customer just open a purchase" state
 * that only exists in the browser. `connection` is server-fetched by
 * `page.tsx` and re-delivered fresh on every `router.refresh()` call
 * `DomainPurchaseWaiting` makes — the moment it becomes non-null (the
 * webhook created it), this flips straight to `DomainStatusPanel`
 * regardless of `waiting`'s value, since that check comes first.
 */
export function DomainStepPanel({
  businessId,
  displayUrl,
  connection,
}: {
  businessId: string;
  displayUrl: string;
  connection: DomainConnection | null;
}) {
  const [waiting, setWaiting] = useState(false);

  if (connection) {
    return (
      <DomainStatusPanel
        businessId={businessId}
        domainName={connection.domainName}
        normalizedDomain={connection.normalizedDomain}
        domainConnectionId={connection.domainConnectionId}
        initialStatus={connection.status}
        initialVerificationRecords={connection.verificationRecords ?? []}
        initialFailureCategory={connection.failureCategory ?? null}
        source={connection.source}
      />
    );
  }

  if (waiting) {
    return <DomainPurchaseWaiting businessId={businessId} />;
  }

  return <DomainChoiceCards businessId={businessId} displayUrl={displayUrl} onPurchaseStarted={() => setWaiting(true)} />;
}
