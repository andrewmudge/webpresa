import 'server-only';
import { createHash } from 'crypto';
import {
  getCampaignRecipientByCode,
  checkAndIncrementRateLimit,
  buildRateLimitKey,
  recordScanHitRollup,
} from '@/lib/db/campaign-recipients';
import { getCampaignById } from '@/lib/db/campaigns';
import { getBusinessById } from '@/lib/db/businesses';
import { getClaimById, isClaimUsable } from '@/lib/db/claims';
import { putScanHit, reserveVisitorFingerprint } from '@/lib/db/scan-hits';
import { createScanHit } from '@/domain/factories/scan-hit.factory';
import { signClaimIntent, CLAIM_INTENT_MAX_AGE_SECONDS } from '@/lib/auth/claim-intent';
import { parseUserAgent } from './user-agent';

/**
 * `/r/[campaignCode]`'s validate → record → resolve-destination logic
 * (Stage 21) — kept out of the Route Handler itself, mirroring
 * `lib/claim/validate-token.ts`'s role for `/claim/[claimToken]`.
 *
 * Every non-`redirect` outcome (unknown code, disabled recipient, non-active
 * campaign, rate-limited) resolves identically — a generic homepage
 * fallback, never distinguished to the caller — per implementation.md,
 * Stage 21, "Security and privacy".
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 30;
/** Counter items are cleaned up well after their window closes — TTL is cleanup only, not the enforcement mechanism. */
const RATE_LIMIT_TTL_BUFFER_MS = RATE_LIMIT_WINDOW_MS * 2;

const MAX_USER_AGENT_LENGTH = 500;
const MAX_REFERRER_LENGTH = 2000;

export interface ClaimIntentCookie {
  value: string;
  maxAgeSeconds: number;
}

export type ResolveCampaignRedirectResult =
  | { outcome: 'invalid' }
  | { outcome: 'redirect'; destinationUrl: string; claimIntentCookie?: ClaimIntentCookie };

export interface ResolveCampaignRedirectParams {
  campaignCode: string;
  ipHash: string;
  userAgent: string;
  referrer?: string;
  /** Query params already present on the inbound `/r/{code}` request, forwarded to the destination. */
  incomingSearchParams: URLSearchParams;
  /** The inbound `/r/{code}` request's own URL — used to build a same-origin absolute destination for `'claim'`-type recipients (e.g. `/b/{slug}`). */
  requestUrl: string;
}

/**
 * Resolves a `'claim'`-type recipient's destination: always `/b/{slug}` (the
 * business's live page), paired with a signed claim-intent cookie only when
 * there's a genuinely usable claim to offer — mirroring `GET
 * /claim/[claimToken]`'s own "validate → set cookie → send to the preview"
 * behavior, but triggered by `claimId` (a plain internal reference) instead
 * of a stored raw token, which by Stage 17 design is never recoverable
 * after issuance. Every check is re-done live against the database; nothing
 * about claim/ownership state is ever trusted from the stored recipient.
 */
async function resolveClaimDestination(
  recipient: { businessId: string; claimId?: string },
  requestUrl: string,
): Promise<{ destinationUrl: URL; claimIntentCookie?: ClaimIntentCookie } | null> {
  const business = await getBusinessById(recipient.businessId);
  if (!business) return null;

  const destinationUrl = new URL(`/b/${business.slug}`, requestUrl);

  if (business.ownerUserId || !recipient.claimId) {
    // Already claimed, or no claim was ever provisioned for this recipient
    // (e.g. the business was already claimed when it was added) — just the
    // live page, no claim-intent cookie.
    return { destinationUrl };
  }

  const claim = await getClaimById(recipient.claimId);
  if (!claim || claim.businessId !== recipient.businessId || !isClaimUsable(claim)) {
    // Claim was revoked/expired/consumed independently since this recipient
    // was added — graceful degradation, same plain-live-page fallback.
    return { destinationUrl };
  }

  const token = await signClaimIntent({
    claimId: claim.claimId,
    businessId: claim.businessId,
    ...(claim.previewId !== undefined && { previewId: claim.previewId }),
  });

  return { destinationUrl, claimIntentCookie: { value: token, maxAgeSeconds: CLAIM_INTENT_MAX_AGE_SECONDS } };
}

export async function resolveCampaignRedirect(params: ResolveCampaignRedirectParams): Promise<ResolveCampaignRedirectResult> {
  const { campaignCode, ipHash, incomingSearchParams, requestUrl } = params;
  const userAgent = params.userAgent.slice(0, MAX_USER_AGENT_LENGTH);
  const referrer = params.referrer?.slice(0, MAX_REFERRER_LENGTH);

  const windowBucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS).toString();
  const bucketKey = buildRateLimitKey(ipHash, windowBucket);
  const ttlEpochSeconds = Math.floor((Date.now() + RATE_LIMIT_TTL_BUFFER_MS) / 1000);
  const withinLimit = await checkAndIncrementRateLimit({
    bucketKey,
    limit: RATE_LIMIT_MAX_ATTEMPTS,
    ttlEpochSeconds,
  });
  if (!withinLimit) return { outcome: 'invalid' };

  const recipient = await getCampaignRecipientByCode(campaignCode);
  if (!recipient || recipient.status !== 'active') return { outcome: 'invalid' };

  const campaign = await getCampaignById(recipient.campaignId);
  if (!campaign || campaign.status !== 'active') return { outcome: 'invalid' };

  // Server always re-resolves campaignCode → CampaignRecipient → destination
  // itself; nothing about the destination is ever trusted from the request
  // beyond the code.
  let resolvedUrl: URL;
  let claimIntentCookie: ClaimIntentCookie | undefined;

  if (recipient.destinationType === 'custom') {
    if (!recipient.destinationUrl) return { outcome: 'invalid' };
    resolvedUrl = new URL(recipient.destinationUrl);
  } else {
    const resolved = await resolveClaimDestination(recipient, requestUrl);
    if (!resolved) return { outcome: 'invalid' };
    resolvedUrl = resolved.destinationUrl;
    claimIntentCookie = resolved.claimIntentCookie;
  }

  const visitorFingerprint = createHash('sha256')
    .update(`${recipient.campaignRecipientId}|${ipHash}|${userAgent}`)
    .digest('hex');
  const isNewUniqueVisitor = await reserveVisitorFingerprint(recipient.campaignRecipientId, visitorFingerprint);

  const { deviceClass, browserFamily, operatingSystem } = parseUserAgent(userAgent);

  const hit = createScanHit({
    campaignRecipientId: recipient.campaignRecipientId,
    campaignCode: recipient.campaignCode,
    businessId: recipient.businessId,
    destinationUrl: resolvedUrl.toString(),
    visitorFingerprint,
    userAgent,
    ...(referrer !== undefined && { referrer }),
    deviceClass,
    ...(browserFamily !== undefined && { browserFamily }),
    ...(operatingSystem !== undefined && { operatingSystem }),
  });

  // ScanHit history must be durable before the caller redirects — matches
  // this repo's "persist before responding" convention (e.g. Stage 20's
  // lead submission).
  await putScanHit(hit);
  await recordScanHitRollup({ campaignRecipientId: recipient.campaignRecipientId, isNewUniqueVisitor });

  for (const [key, value] of incomingSearchParams.entries()) {
    // Never trust a client-supplied `campaign` param — the resolved code
    // (below) always wins, so this can't be used to spoof attribution.
    if (key === 'campaign') continue;
    resolvedUrl.searchParams.set(key, value);
  }
  resolvedUrl.searchParams.set('campaign', recipient.campaignCode);

  return { outcome: 'redirect', destinationUrl: resolvedUrl.toString(), ...(claimIntentCookie && { claimIntentCookie }) };
}
