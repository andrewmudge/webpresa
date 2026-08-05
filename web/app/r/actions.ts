'use server';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { resolveCampaignRedirect } from '@/lib/campaign/resolve-redirect';
import { normalizeCampaignCodeInput } from '@/lib/campaign/code-format';
import { hashIp } from '@/lib/claim/validate-token';
import { CLAIM_INTENT_COOKIE_NAME } from '@/lib/auth/claim-intent';

/**
 * Manual campaign-code entry (Stage 21) — for a postcard recipient who
 * can't scan the QR. Deliberately reuses `resolveCampaignRedirect()`
 * unchanged rather than routing through `/claim` (Stage 17's own
 * manual-entry page): a typed-in code must count as a real `ScanHit`, the
 * same as a scan, and must work even when the recipient's claim was reused
 * rather than freshly generated (in which case no raw claim token was ever
 * available to print in the first place) — see implementation.md, Stage 21,
 * "Manual entry fallback".
 */

function resolveIpHash(headerList: Awaited<ReturnType<typeof headers>>): string {
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

function resolveRequestUrl(headerList: Awaited<ReturnType<typeof headers>>): string {
  const host = headerList.get('host') ?? 'localhost:3000';
  const proto = headerList.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${proto}://${host}/r`;
}

export type CampaignCodeFormState = { error?: string } | undefined;

export async function submitCampaignCodeAction(_prevState: CampaignCodeFormState, formData: FormData): Promise<CampaignCodeFormState> {
  const rawInput = String(formData.get('code') ?? '').trim();
  if (!rawInput) return { error: 'Enter your code.' };

  const campaignCode = normalizeCampaignCodeInput(rawInput);
  const headerList = await headers();

  const result = await resolveCampaignRedirect({
    campaignCode,
    ipHash: resolveIpHash(headerList),
    userAgent: headerList.get('user-agent') ?? '',
    referrer: headerList.get('referer') ?? undefined,
    incomingSearchParams: new URLSearchParams(),
    requestUrl: resolveRequestUrl(headerList),
  });

  // Same generic message regardless of which internal check failed — never
  // distinguished, matching /claim's own "invalid or expired" precedent.
  if (result.outcome === 'invalid') {
    return { error: 'That code doesn’t look right, or has expired. Please double-check and try again.' };
  }

  if (result.claimIntentCookie) {
    const cookieStore = await cookies();
    cookieStore.set(CLAIM_INTENT_COOKIE_NAME, result.claimIntentCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.claimIntentCookie.maxAgeSeconds,
      path: '/',
    });
  }

  redirect(result.destinationUrl);
}
