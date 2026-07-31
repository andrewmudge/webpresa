import 'server-only';
import type { DomainConnection, DomainRegistrarProvider } from '@/domain/models/domain-connection';
import { createDomainConnection } from '@/domain/factories/domain-connection.factory';
import {
  getDomainConnectionByNormalizedDomain,
  createDomainConnectionRecord,
  putDomainConnection,
} from '@/lib/db/domain-connections';
import { addProjectDomain, buildRoutingInstructions } from '@/lib/vercel/domains';
import { VercelApiError } from '@/lib/vercel/errors';
import { normalizeDomainInput, isValidDomain, isReservedHost } from './normalize';

export type ConnectDomainResult =
  | { outcome: 'connected'; connection: DomainConnection }
  | { outcome: 'invalid'; message: string }
  | { outcome: 'already_assigned'; message: string }
  | { outcome: 'provider_error'; message: string };

export interface StartDomainConnectionParams {
  businessId: string;
  ownerUserId: string;
  slug: string;
  rawDomain: string;
  registrarProvider?: DomainRegistrarProvider;
}

/**
 * Begins connecting an existing domain (implementation.md, Stage 19.x, Part
 * 2, "Existing-domain flow", steps 1–3). Normalizes/validates, atomically
 * reserves the domain (or resumes this business's own pending record — see
 * `createDomainConnectionRecord`'s conditional-write contract), then
 * attaches it to the Vercel project and stores whatever DNS/verification
 * instructions Vercel returns.
 */
export async function startDomainConnection(params: StartDomainConnectionParams): Promise<ConnectDomainResult> {
  const normalizedDomain = normalizeDomainInput(params.rawDomain);

  if (!isValidDomain(normalizedDomain) || isReservedHost(normalizedDomain)) {
    return { outcome: 'invalid', message: 'Enter a domain such as coastalplumbing.com.' };
  }

  let record = await getDomainConnectionByNormalizedDomain(normalizedDomain);

  if (record && record.businessId !== params.businessId) {
    return { outcome: 'already_assigned', message: 'That domain is already connected to another Webpresa website.' };
  }

  if (!record) {
    const draft = createDomainConnection({
      normalizedDomain,
      businessId: params.businessId,
      ownerUserId: params.ownerUserId,
      domainName: params.rawDomain.trim(),
      slug: params.slug,
      registrarProvider: params.registrarProvider,
    });
    const created = await createDomainConnectionRecord(draft);
    record = created ? draft : await getDomainConnectionByNormalizedDomain(normalizedDomain);

    if (record && record.businessId !== params.businessId) {
      return { outcome: 'already_assigned', message: 'That domain is already connected to another Webpresa website.' };
    }
  }

  if (!record) {
    return { outcome: 'provider_error', message: 'Something went wrong. Please try again.' };
  }

  // Already attached (a resumed record past the initial draft) — nothing more to do here.
  if (record.status !== 'draft') {
    return { outcome: 'connected', connection: record };
  }

  const now = new Date().toISOString();
  try {
    const added = await addProjectDomain(record.primaryHostname);
    const routing = buildRoutingInstructions(record.primaryHostname, true);
    const updated: DomainConnection = {
      ...record,
      status: 'awaiting_dns',
      providerDomains: [
        {
          hostname: record.primaryHostname,
          vercelProjectDomainId: added.vercelProjectDomainId,
          status: added.verified ? 'verified' : 'pending',
        },
      ],
      verificationRecords: [...routing, ...added.verificationRecords],
      lastCheckedAt: now,
      updatedAt: now,
    };
    await putDomainConnection(updated);
    return { outcome: 'connected', connection: updated };
  } catch (err) {
    const failed: DomainConnection = {
      ...record,
      status: 'failed',
      failureCategory: err instanceof VercelApiError && err.category === 'auth' ? 'vercel_auth_failed' : 'vercel_domain_add_failed',
      failureMessage: 'We could not connect this domain right now. Please try again.',
      updatedAt: now,
    };
    await putDomainConnection(failed);
    return { outcome: 'provider_error', message: failed.failureMessage! };
  }
}
