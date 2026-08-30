'use client';

import { useState } from 'react';
import type { DomainConnection } from '@/domain/models/domain-connection';
import { DomainChoiceCards } from '@/app/app/onboarding/[businessId]/domain/DomainChoiceCards';
import { DomainPurchaseWaiting } from '@/app/app/onboarding/[businessId]/domain/DomainPurchaseWaiting';
import { DomainStatusPanel } from '@/app/app/onboarding/[businessId]/domain/DomainStatusPanel';
import {
  settingsDeferDomainAction,
  settingsConnectExistingDomainAction,
  settingsManageOpenSrsAccountAction,
  settingsDisconnectCurrentDomainAction,
} from './actions';

/**
 * Settings' equivalent of the onboarding wizard's `DomainStepPanel` — same
 * three underlying views (choice cards / purchase-waiting / status), reused
 * unmodified apart from action props that redirect back to Settings instead
 * of the onboarding wizard, plus a fourth state: `changingDomain`, entered
 * when the customer clicks "Change domain" on an already-connected domain's
 * status view and exited once the old connection is disconnected — see
 * `DomainStatusPanel`'s `variant="settings"` behavior.
 */
export function SettingsDomainPanel({
  businessId,
  displayUrl,
  connection,
}: {
  businessId: string;
  displayUrl: string;
  connection: DomainConnection | null;
}) {
  const [waiting, setWaiting] = useState(false);
  const [changingDomain, setChangingDomain] = useState(false);

  if (connection && !changingDomain) {
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
        variant="settings"
        manageOnStorefrontAction={settingsManageOpenSrsAccountAction}
        disconnectAction={settingsDisconnectCurrentDomainAction}
        onChangeDomain={() => setChangingDomain(true)}
      />
    );
  }

  if (waiting) {
    return <DomainPurchaseWaiting businessId={businessId} deferAction={settingsDeferDomainAction} />;
  }

  return (
    <DomainChoiceCards
      businessId={businessId}
      displayUrl={displayUrl}
      onPurchaseStarted={() => setWaiting(true)}
      deferAction={settingsDeferDomainAction}
      connectExistingAction={settingsConnectExistingDomainAction}
    />
  );
}
