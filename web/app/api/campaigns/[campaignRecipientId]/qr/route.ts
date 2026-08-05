import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getCampaignRecipientById } from '@/lib/db/campaign-recipients';
import { generateCampaignQrPng } from '@/lib/campaign/qr';

/**
 * Admin-only QR PNG for one CampaignRecipient's `/r/{campaignCode}` URL
 * (Stage 21) — regenerated on every request, no S3 storage (see
 * implementation.md, Stage 21, "Required routes"). Used as both the admin
 * preview `<img>` src and the download link.
 *
 * A Route Handler, not a Server Action — it needs to be addressable as a
 * plain URL, matching this repo's existing exception for endpoints an
 * `<img>`/download link must reach directly (see architecture.md, "API
 * boundaries").
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ campaignRecipientId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { campaignRecipientId } = await params;
  const recipient = await getCampaignRecipientById(campaignRecipientId);
  if (!recipient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const png = await generateCampaignQrPng(recipient.campaignCode, request.url);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="campaign-${recipient.campaignCode}.png"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
