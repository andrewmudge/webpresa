import 'server-only';
import type { DomainConnection } from '@/domain/models/domain-connection';
import { getDomainConnectionByNormalizedDomain, putDomainConnection } from '@/lib/db/domain-connections';
import { getProjectDomainStatus } from '@/lib/vercel/domains';
import { VercelApiError } from '@/lib/vercel/errors';

const TERMINAL_STATUSES = new Set(['active', 'failed', 'disconnected', 'expired']);

/**
 * Load and validate the record, query Vercel's project-domain status, map
 * the result onto a safe status transition, persist, and return a
 * customer-safe result (implementation.md, Stage 19.x, Part 2,
 * `reconcileDomainConnection`). Called from Domain page load (non-terminal
 * status only) and the "check again" action — never from a scheduled job in
 * this part (see Non-goals; that's Stage 23's job, once it exists).
 *
 * No client-controlled transition is ever accepted directly — every
 * transition here is server-derived from a live provider check.
 */
export async function reconcileDomainConnection(normalizedDomain: string): Promise<DomainConnection | null> {
  const record = await getDomainConnectionByNormalizedDomain(normalizedDomain);
  if (!record || TERMINAL_STATUSES.has(record.status)) return record;

  const now = new Date().toISOString();

  try {
    const status = await getProjectDomainStatus(record.primaryHostname);

    if (!status.verified) {
      const updated: DomainConnection = {
        ...record,
        status: 'awaiting_dns',
        verificationRecords: status.verificationRecords.length > 0 ? status.verificationRecords : record.verificationRecords,
        failureCategory: 'dns_not_configured',
        lastCheckedAt: now,
        updatedAt: now,
      };
      await putDomainConnection(updated);
      return updated;
    }

    if (status.misconfigured) {
      const updated: DomainConnection = {
        ...record,
        status: 'verifying',
        failureCategory: 'dns_propagation_pending',
        lastCheckedAt: now,
        updatedAt: now,
      };
      await putDomainConnection(updated);
      return updated;
    }

    // Verified and correctly configured. Vercel manages certificate
    // issuance automatically once DNS resolves correctly; without a
    // dedicated certificate-status field to poll, a domain that reaches
    // "verified + configured" on two consecutive checks is treated as
    // certificate-ready. This is a deliberate simplification — reconfirm
    // Vercel's actual certificate-status signal against current API docs
    // before real deployment.
    const nextStatus = record.status === 'connected' || record.status === 'certificate_pending' ? 'active' : 'connected';
    const updated: DomainConnection = {
      ...record,
      status: nextStatus,
      verifiedAt: record.verifiedAt ?? now,
      certificateReadyAt: nextStatus === 'active' ? (record.certificateReadyAt ?? now) : record.certificateReadyAt,
      activatedAt: nextStatus === 'active' ? (record.activatedAt ?? now) : record.activatedAt,
      failureCategory: undefined,
      failureMessage: undefined,
      lastCheckedAt: now,
      updatedAt: now,
    };
    await putDomainConnection(updated);
    return updated;
  } catch (err) {
    const updated: DomainConnection = {
      ...record,
      failureCategory:
        err instanceof VercelApiError && err.category === 'not_found' ? 'vercel_project_not_found' : 'unknown',
      lastCheckedAt: now,
      updatedAt: now,
    };
    await putDomainConnection(updated);
    return updated;
  }
}
