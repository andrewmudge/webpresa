import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getPostcardById } from '@/lib/db/postcards';
import { getBusinessById } from '@/lib/db/businesses';
import { getCampaignRecipientById } from '@/lib/db/campaign-recipients';
import { getLatestExistingSiteScreenshots } from '@/lib/screenshots/latest-existing-site-screenshot';
import { getLatestPreviewScreenshots } from '@/lib/screenshots/latest-preview-screenshot';
import { generateCampaignQrPng } from '@/lib/campaign/qr';
import { formatCampaignCodeForDisplay } from '@/lib/campaign/code-format';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { getLobSenderAddress, type LobSenderAddress } from '@/lib/env/lob-sender-address';
import { CAPTURE_TOKEN_COOKIE_NAME, verifyPostcardRenderToken } from '@/lib/capture-token';
import PostcardFront from '@/app/admin/(dashboard)/postcards/components/PostcardFront';
import PostcardBack from '@/app/admin/(dashboard)/postcards/components/PostcardBack';

/**
 * Stage 22 Phase 2 — the page the postcard-render Lambda actually turns
 * into a print PDF via Playwright's `page.pdf()`. This is deliberately
 * the *same* `PostcardFront`/`PostcardBack` components the admin review
 * page (`admin/(dashboard)/postcards/[postcardId]/page.tsx`) renders live
 * for human review — one template, two callers — with `showGuides={false}`
 * so none of the review-only chrome (safe-zone lines, card border/shadow)
 * ends up in the artwork. That's also what makes "preview == submitted
 * artifact" true by construction: the review page and the print PDF can
 * never visually diverge, because they're the same component tree.
 *
 * Not admin-session-gated — the Lambda has no browser session to present.
 * Gated instead by a short-lived `postcard_render` capture token (minted
 * by the Lambda immediately before navigating here, verified below),
 * mirroring Stage 14's identical `preview_capture` pattern for
 * `/b/[slug]`. A failed/missing/wrong-postcard token renders `notFound()`
 * — same fail-closed shape as that page, and deliberately not a 401/403:
 * this route should not confirm or deny a given `postcardId` even exists
 * to an unauthenticated caller.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ postcardId: string; side: string }>;
}

export default async function PostcardRenderPage({ params }: Props) {
  const { postcardId, side } = await params;
  if (side !== 'front' && side !== 'back') notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(CAPTURE_TOKEN_COOKIE_NAME)?.value;
  const claims = await verifyPostcardRenderToken(token, { postcardId });
  if (!claims) notFound();

  const postcard = await getPostcardById(postcardId);
  if (!postcard) notFound();

  const business = await getBusinessById(postcard.businessId);
  if (!business) notFound();

  if (side === 'back') {
    let senderAddress: LobSenderAddress | undefined;
    try {
      senderAddress = getLobSenderAddress();
    } catch {
      senderAddress = undefined;
    }

    return (
      <PostcardBack
        recipientName={business.name}
        recipientAddress={business.address}
        senderName={senderAddress?.name}
        senderAddress={senderAddress}
        showGuides={false}
      />
    );
  }

  const [recipient, beforeShots, afterShots] = await Promise.all([
    postcard.campaignRecipientId ? getCampaignRecipientById(postcard.campaignRecipientId) : Promise.resolve(null),
    getLatestExistingSiteScreenshots(postcard.businessId),
    getLatestPreviewScreenshots(postcard.businessId),
  ]);

  let qrDataUri: string | undefined;
  let accessCodeDisplay: string | undefined;
  if (recipient) {
    const png = await generateCampaignQrPng(recipient.campaignCode, resolveAppBaseUrl());
    qrDataUri = `data:image/png;base64,${png.toString('base64')}`;
    accessCodeDisplay = formatCampaignCodeForDisplay(recipient.campaignCode);
  }

  return (
    <PostcardFront
      businessName={business.name}
      beforeScreenshotSrc={beforeShots.desktopSrc}
      afterDesktopScreenshotSrc={afterShots.desktopSrc}
      afterMobileScreenshotSrc={afterShots.mobileSrc}
      qrDataUri={qrDataUri}
      accessCodeDisplay={accessCodeDisplay}
      showGuides={false}
    />
  );
}
