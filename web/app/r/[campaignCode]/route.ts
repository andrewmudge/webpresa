import { NextResponse, type NextRequest } from 'next/server';
import { hashIp } from '@/lib/claim/validate-token';
import { resolveCampaignRedirect } from '@/lib/campaign/resolve-redirect';

/**
 * Public QR-code entry point (Stage 21). A printed QR code never links
 * directly to a preview/claim/pricing page — every code resolves through
 * this route so its destination can change without reprinting anything.
 * See implementation.md, Stage 21, "Redirect behavior".
 *
 * A Route Handler, not a page — mirrors `/claim/[claimToken]`'s own
 * "validate → record → redirect" GET-route shape.
 */

function resolveIpHash(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignCode: string }> }) {
  const { campaignCode } = await params;

  const result = await resolveCampaignRedirect({
    campaignCode,
    ipHash: resolveIpHash(request),
    userAgent: request.headers.get('user-agent') ?? '',
    referrer: request.headers.get('referer') ?? undefined,
    incomingSearchParams: request.nextUrl.searchParams,
  });

  // Unknown, disabled, non-active-campaign, and rate-limited codes all
  // produce this same generic fallback — never distinguished to the caller.
  const response =
    result.outcome === 'redirect'
      ? NextResponse.redirect(result.destinationUrl)
      : NextResponse.redirect(new URL('/', request.url));

  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
