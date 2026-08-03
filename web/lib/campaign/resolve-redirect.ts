import 'server-only';
import { createHash } from 'crypto';
import {
  getCampaignRecipientByCode,
  checkAndIncrementRateLimit,
  buildRateLimitKey,
  recordScanHitRollup,
} from '@/lib/db/campaign-recipients';
import { getCampaignById } from '@/lib/db/campaigns';
import { putScanHit, reserveVisitorFingerprint } from '@/lib/db/scan-hits';
import { createScanHit } from '@/domain/factories/scan-hit.factory';
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

export type ResolveCampaignRedirectResult = { outcome: 'invalid' } | { outcome: 'redirect'; destinationUrl: string };

export interface ResolveCampaignRedirectParams {
  campaignCode: string;
  ipHash: string;
  userAgent: string;
  referrer?: string;
  /** Query params already present on the inbound `/r/{code}` request, forwarded to the destination. */
  incomingSearchParams: URLSearchParams;
}

export async function resolveCampaignRedirect(params: ResolveCampaignRedirectParams): Promise<ResolveCampaignRedirectResult> {
  const { campaignCode, ipHash, incomingSearchParams } = params;
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
  const visitorFingerprint = createHash('sha256')
    .update(`${recipient.campaignRecipientId}|${ipHash}|${userAgent}`)
    .digest('hex');
  const isNewUniqueVisitor = await reserveVisitorFingerprint(recipient.campaignRecipientId, visitorFingerprint);

  const { deviceClass, browserFamily, operatingSystem } = parseUserAgent(userAgent);

  const hit = createScanHit({
    campaignRecipientId: recipient.campaignRecipientId,
    campaignCode: recipient.campaignCode,
    businessId: recipient.businessId,
    destinationUrl: recipient.destinationUrl,
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

  const destination = new URL(recipient.destinationUrl);
  for (const [key, value] of incomingSearchParams.entries()) {
    // Never trust a client-supplied `campaign` param — the resolved code
    // (below) always wins, so this can't be used to spoof attribution.
    if (key === 'campaign') continue;
    destination.searchParams.set(key, value);
  }
  destination.searchParams.set('campaign', recipient.campaignCode);

  return { outcome: 'redirect', destinationUrl: destination.toString() };
}
