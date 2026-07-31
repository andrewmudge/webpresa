import 'server-only';
import type { DomainDnsInstruction } from '@/domain/models/domain-connection';
import { getVercelApiSecret } from '@/lib/secrets';
import { vercelFetch } from './client';
import { VercelApiError } from './errors';

/**
 * Connection-only responsibilities (Stage 19.x, Part 2) — add a domain to
 * the Webpresa Vercel project, inspect its configuration, check
 * verification status, remove a failed/abandoned assignment. Search,
 * pricing, and purchase are Part 3's concern (a different provider —
 * OpenSRS — entirely; see implementation.md, Stage 19.x, Part 3).
 */

interface VercelDomainVerificationChallenge {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

interface VercelProjectDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: VercelDomainVerificationChallenge[];
}

interface VercelDomainConfigResponse {
  misconfigured: boolean;
}

export interface AddDomainResult {
  vercelProjectDomainId: string;
  verified: boolean;
  verificationRecords: DomainDnsInstruction[];
}

export interface DomainProviderStatus {
  verified: boolean;
  misconfigured: boolean;
  verificationRecords: DomainDnsInstruction[];
}

async function getProjectId(): Promise<string> {
  const { projectId } = await getVercelApiSecret();
  return projectId;
}

function mapVerificationChallenges(challenges: VercelDomainVerificationChallenge[]): DomainDnsInstruction[] {
  return challenges.map((c) => ({
    recordType: c.type === 'TXT' ? 'TXT' : c.type === 'CNAME' ? 'CNAME' : 'A',
    name: c.domain,
    value: c.value,
    purpose: 'ownership_verification',
    required: true,
  }));
}

/**
 * Vercel's standard apex/`www` routing values — documented as stable in
 * Vercel's own domain-setup guidance, unlike the ownership-verification
 * challenge above (which genuinely is per-domain and must come from the
 * live API response, never hardcoded). Reconfirm against Vercel's current
 * docs before the first real deployment.
 */
const VERCEL_APEX_A_RECORD = '76.76.21.21';
const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com';

export function buildRoutingInstructions(hostname: string, isApex: boolean): DomainDnsInstruction[] {
  if (isApex) {
    return [{ recordType: 'A', name: '@', value: VERCEL_APEX_A_RECORD, purpose: 'routing', required: true }];
  }
  const subdomain = hostname.split('.')[0] ?? 'www';
  return [{ recordType: 'CNAME', name: subdomain, value: VERCEL_CNAME_TARGET, purpose: 'routing', required: true }];
}

/**
 * `opts.gitBranch`: when set, Vercel serves this domain from that branch's
 * deployments instead of Production. Confirmed live against the real
 * Project Domains API (`PATCH /v9/projects/{id}/domains/{domain}` accepts
 * and persists `gitBranch` — verified 2026-07-31 against `fitreppro.com`).
 * Used so real customer domains connected while this app's customer-facing
 * pipeline (Stage 17+) still only exists on a non-production branch don't
 * silently fall through to whatever old build Production is serving — see
 * `lib/domains/connect.ts` for where the environment-driven value comes
 * from.
 *
 * `opts.redirect`: registers this hostname as a redirect-only domain
 * pointing at another hostname on the same project (e.g. `www.` redirecting
 * to the apex) — Vercel's documented `redirect`/`redirectStatusCode` fields
 * on this same endpoint. Vercel still needs DNS to resolve this hostname to
 * it and issues it its own certificate before the redirect can serve, so
 * this alone doesn't skip the normal DNS-instruction/verification flow.
 */
export async function addProjectDomain(
  hostname: string,
  opts: { gitBranch?: string; redirect?: string; redirectStatusCode?: number } = {},
): Promise<AddDomainResult> {
  const projectId = await getProjectId();

  let response: VercelProjectDomainResponse;
  try {
    response = await vercelFetch<VercelProjectDomainResponse>(`/v10/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({
        name: hostname,
        ...(opts.gitBranch ? { gitBranch: opts.gitBranch } : {}),
        ...(opts.redirect ? { redirect: opts.redirect, redirectStatusCode: opts.redirectStatusCode ?? 308 } : {}),
      }),
    });
  } catch (err) {
    if (err instanceof VercelApiError && err.httpStatus === 409) {
      throw new VercelApiError('domain_already_in_use', 'This domain is already attached to a Vercel project.', {
        httpStatus: 409,
      });
    }
    throw err;
  }

  return {
    vercelProjectDomainId: response.name,
    verified: response.verified,
    verificationRecords: mapVerificationChallenges(response.verification ?? []),
  };
}

export async function getProjectDomainStatus(hostname: string): Promise<DomainProviderStatus> {
  const projectId = await getProjectId();
  const domain = await vercelFetch<VercelProjectDomainResponse>(`/v9/projects/${projectId}/domains/${hostname}`);

  // A DNS-config check failing independently of the domain lookup itself is
  // treated as "not yet verified" rather than surfaced as a hard error — the
  // customer-facing state stays "still checking," not a technical failure.
  let misconfigured = true;
  try {
    const config = await vercelFetch<VercelDomainConfigResponse>(`/v6/domains/${hostname}/config`);
    misconfigured = config.misconfigured;
  } catch {
    // Leave misconfigured=true (treated as "still checking") — see above.
  }

  return {
    verified: domain.verified,
    misconfigured,
    verificationRecords: mapVerificationChallenges(domain.verification ?? []),
  };
}

export async function removeProjectDomain(hostname: string): Promise<void> {
  const projectId = await getProjectId();
  await vercelFetch<void>(`/v9/projects/${projectId}/domains/${hostname}`, { method: 'DELETE' });
}
