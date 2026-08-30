import 'server-only';
import type {
  DomainConnection,
  DomainDnsInstruction,
  DomainProviderDomain,
  DomainRegistrarProvider,
} from '@/domain/models/domain-connection';
import { createDomainConnection } from '@/domain/factories/domain-connection.factory';
import {
  getDomainConnectionByNormalizedDomain,
  createDomainConnectionRecord,
  putDomainConnection,
} from '@/lib/db/domain-connections';
import { addProjectDomain, getProjectDomainStatus, buildRoutingInstructions, type AddDomainResult } from '@/lib/vercel/domains';
import { VercelApiError } from '@/lib/vercel/errors';
import { normalizeDomainInput, isValidDomain, isReservedHost } from './normalize';

/**
 * Wraps `addProjectDomain` to self-heal the one 409 case that's actually
 * fine: the hostname is already attached to *our own* Vercel project —
 * e.g. a residual attachment left behind by a disconnect whose best-effort
 * `removeProjectDomain` call silently failed (see `lib/domains/disconnect.ts`),
 * or a retry after a partial prior failure. Confirmed live (2026-08-30):
 * reconnecting `fitreppro.com` after an earlier disconnect hit exactly this
 * — Vercel already had it attached and verified, so the POST 409'd and the
 * connection was marked `'failed'` even though nothing was actually wrong.
 * If the GET below 404s instead (genuinely someone else's attachment), the
 * original error is rethrown — that's a real conflict, not a residual one.
 */
async function attachDomain(hostname: string, opts: { gitBranch?: string; redirect?: string; redirectStatusCode?: number }): Promise<AddDomainResult> {
  try {
    return await addProjectDomain(hostname, opts);
  } catch (err) {
    if (err instanceof VercelApiError && err.category === 'domain_already_in_use') {
      try {
        const status = await getProjectDomainStatus(hostname);
        return { vercelProjectDomainId: hostname, verified: status.verified, verificationRecords: status.verificationRecords };
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

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

  // Already attached (a resumed record past the initial draft) — nothing
  // more to do here. `'failed'` is retried, not short-circuited — otherwise
  // reconnecting the same domain after a failure can never actually retry
  // the Vercel attach, only re-show the stale failure.
  if (record.status !== 'draft' && record.status !== 'failed') {
    return { outcome: 'connected', connection: record };
  }

  const now = new Date().toISOString();
  try {
    // Unset in a real production environment; e.g. "dev" while this app's
    // customer-facing pipeline (Stage 17+) still lives only on a non-
    // production branch, so a real connected domain serves the right
    // deployment instead of silently falling through to whatever old build
    // Production happens to be running. See `lib/vercel/domains.ts`.
    const gitBranch = process.env.WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH || undefined;
    const added = await attachDomain(record.primaryHostname, { gitBranch });
    const routing = buildRoutingInstructions(record.primaryHostname, true);

    const providerDomains: DomainProviderDomain[] = [
      {
        hostname: record.primaryHostname,
        vercelProjectDomainId: added.vercelProjectDomainId,
        status: added.verified ? 'verified' : 'pending',
      },
    ];
    let aliasRecords: DomainDnsInstruction[] = [];

    // Best-effort: `www` is a separate Vercel project-domain object from the
    // apex (see `DomainProviderDomain`'s own doc comment) and was previously
    // never registered at all, leaving `www.<domain>` resolving to Vercel's
    // edge with no certificate for that hostname (ERR_CERT_COMMON_NAME_INVALID
    // for real visitors). Registered here as a redirect to the apex, matching
    // the only `desiredRedirect` value this flow ever actually produces
    // ('www_to_apex') — a failure here must never block the apex connection
    // that already succeeded above.
    for (const alias of record.aliasHostnames) {
      try {
        const addedAlias = await attachDomain(alias, { gitBranch, redirect: record.primaryHostname });
        providerDomains.push({
          hostname: alias,
          vercelProjectDomainId: addedAlias.vercelProjectDomainId,
          status: addedAlias.verified ? 'verified' : 'pending',
        });
        aliasRecords = [...aliasRecords, ...buildRoutingInstructions(alias, false), ...addedAlias.verificationRecords];
      } catch {
        // Leave the alias untracked — the customer still gets a working apex site.
      }
    }

    const updated: DomainConnection = {
      ...record,
      status: 'awaiting_dns',
      providerDomains,
      verificationRecords: [...routing, ...added.verificationRecords, ...aliasRecords],
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
