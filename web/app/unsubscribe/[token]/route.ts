import { NextResponse, type NextRequest } from 'next/server';
import { getOutreachByUnsubscribeToken, transitionOutreachToTerminal } from '@/lib/db/marketing-outreach';
import { getBusinessById } from '@/lib/db/businesses';
import { createMarketingSuppression } from '@/domain/factories/marketing-suppression.factory';
import { putMarketingSuppressionIfNotExists } from '@/lib/db/marketing-suppressions';
import { log } from '@/lib/logging/log';

/**
 * Public, unauthenticated unsubscribe link (Marketing stage) — every
 * marketing email includes one. Performs the suppression side effect and
 * redirects to a static confirmation page rather than having the page
 * itself mutate state, so the mutating action stays a single idempotent
 * step regardless of how many times the link is opened/reloaded (see
 * `implementation.md`, Marketing stage, "Unsubscribe / CAN-SPAM support").
 *
 * An unknown/invalid token redirects to a generic "not valid" page — never
 * a 500, never distinguished from "already used"/"expired" — the token
 * itself is never recoverable or reissued.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const outreach = await getOutreachByUnsubscribeToken(token);
  if (!outreach) {
    return NextResponse.redirect(new URL('/unsubscribe/invalid', request.url));
  }

  const business = await getBusinessById(outreach.businessId);
  const targetEmail = business?.leadNotificationEmail ?? business?.email;
  if (targetEmail) {
    await putMarketingSuppressionIfNotExists(
      createMarketingSuppression({
        emailNormalized: targetEmail.trim().toLowerCase(),
        businessId: outreach.businessId,
        reason: 'unsubscribed',
      }),
    );
  }

  // Idempotent — a second visit to the same link is a harmless no-op; only
  // transition if this outreach isn't already in a terminal state.
  if (outreach.status === 'active' || outreach.status === 'paused') {
    await transitionOutreachToTerminal({
      businessId: outreach.businessId,
      marketingCampaignId: outreach.marketingCampaignId,
      status: 'suppressed',
      suppressionReason: 'unsubscribed',
      lastEventType: 'unsubscribed',
    });
  }

  log({
    event: 'marketing.unsubscribe.completed',
    component: 'marketing-unsubscribe',
    businessId: outreach.businessId,
    marketingCampaignId: outreach.marketingCampaignId,
  });

  return NextResponse.redirect(new URL('/unsubscribe/confirmed', request.url));
}
