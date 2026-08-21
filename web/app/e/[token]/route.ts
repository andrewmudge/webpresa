import { NextResponse, type NextRequest } from 'next/server';
import { decodeClickToken } from '@/lib/marketing/click-token';
import { hashIp } from '@/lib/claim/validate-token';
import { createMarketingClick } from '@/domain/factories/marketing-click.factory';
import { putMarketingClick } from '@/lib/db/marketing-clicks';
import { recordMarketingMessageClickRollup } from '@/lib/db/marketing-messages';
import { log } from '@/lib/logging/log';

/**
 * Public click-tracking redirect for marketing email links (Marketing
 * stage). Deliberately separate from `/r/[campaignCode]` (postcard QR
 * redirect, Stage 21) — this token is a self-contained encrypted JWE
 * (`lib/marketing/click-token.ts`), never a human-typed/guessable code, so
 * an invalid token is a 404 rather than that route's "always redirect
 * somewhere" posture (there's no enumeration risk to defend against here).
 */

const MAX_USER_AGENT_LENGTH = 500;
const MAX_REFERRER_LENGTH = 2000;

function resolveIpHash(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const payload = await decodeClickToken(token);
  if (!payload) {
    return new NextResponse('Not found', { status: 404 });
  }

  const userAgent = (request.headers.get('user-agent') ?? '').slice(0, MAX_USER_AGENT_LENGTH);
  const referrer = request.headers.get('referer')?.slice(0, MAX_REFERRER_LENGTH);

  const click = createMarketingClick({
    messageId: payload.messageId,
    businessId: payload.businessId,
    marketingCampaignId: payload.marketingCampaignId,
    emailSequence: payload.emailSequence,
    linkLabel: payload.linkLabel,
    destinationUrl: payload.destinationUrl,
    userAgent,
    ipHash: resolveIpHash(request),
    ...(referrer !== undefined && { referrer }),
  });

  // Durable history must be written before redirecting — matches this
  // repo's "persist before responding" convention (see
  // lib/campaign/resolve-redirect.ts). The rollup update below is
  // best-effort and must never block the redirect.
  await putMarketingClick(click);

  try {
    await recordMarketingMessageClickRollup(payload.businessId, `${payload.marketingCampaignId}#${payload.emailSequence}`, click.clickedAt);
  } catch (err) {
    log({
      level: 'error',
      event: 'marketing.click.rollup_failed',
      component: 'marketing-click',
      businessId: payload.businessId,
      marketingCampaignId: payload.marketingCampaignId,
      emailSequence: payload.emailSequence,
      message: err instanceof Error ? err.message : 'unknown error',
    });
  }

  const response = NextResponse.redirect(payload.destinationUrl);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
