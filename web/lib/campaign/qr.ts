import 'server-only';
import QRCode from 'qrcode';

/**
 * Renders the QR PNG for a CampaignRecipient's `/r/{campaignCode}` redirect
 * URL (Stage 21). Extracted from the admin QR route (Stage 21) so Stage 22's
 * postcard-rendering pipeline can embed the same QR image in generated
 * artwork without re-implementing the encoding, or fetching the
 * admin-session-gated route over HTTP.
 */
export async function generateCampaignQrPng(campaignCode: string, baseUrl: string): Promise<Buffer> {
  const redirectUrl = new URL(`/r/${campaignCode}`, baseUrl).toString();
  return QRCode.toBuffer(redirectUrl, { type: 'png', width: 512, margin: 2 });
}
