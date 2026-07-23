import 'server-only';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { putAsset } from '@/lib/s3/assets';
import { validateOutboundUrl } from '@/lib/security/url-validation';
import type { ScanImageAsset, WebsiteImageRole, WebsiteImageStatus } from '@/domain/models/scan-image';

/**
 * Server-side image discovery/ingestion for a Firecrawl scan. Fetches
 * candidate image URLs found on the business's own website, validates and
 * classifies them with deterministic heuristics (never AI, mirroring
 * `lib/website-sections/availability.ts`'s "no AI" convention), and
 * rehosts accepted images under the private `scans/` prefix — never
 * hotlinked, never written onto `Business.photoUrls`, never sourced from
 * Google Places.
 *
 * A single bad/unreachable image is skipped, never fails the whole scan.
 */

const MAX_CANDIDATES = 15;
const MAX_ACCEPTED = 8;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const MIN_ACCEPT_WIDTH = 400;
const MIN_ACCEPT_HEIGHT = 300;
/** Below this on either dimension, an image is almost certainly an icon or tracking pixel. */
const MIN_USABLE_DIMENSION_PX = 80;

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  // Non-standard but common in the wild — several real-world CDNs (including
  // one hit during manual verification) send this instead of 'image/jpeg'.
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const TRACKING_OR_ICON_URL_PATTERNS = [/pixel/i, /tracking/i, /1x1/i, /spacer/i, /blank\.(gif|png)/i, /favicon/i, /sprite/i];

function classifyRole(url: string): WebsiteImageRole {
  const lower = url.toLowerCase();
  if (/logo/.test(lower)) return 'logo';
  if (/hero|banner|header-bg|masthead/.test(lower)) return 'hero';
  if (/team|staff|founder|owner/.test(lower)) return 'team';
  if (/store|shop|location|office|storefront/.test(lower)) return 'location';
  if (/service|project|work/.test(lower)) return 'service';
  if (/gallery|portfolio/.test(lower)) return 'gallery';
  return 'unknown';
}

interface FetchedImage {
  buffer: Buffer;
  contentType: string;
}

/**
 * Fetches image bytes, manually following redirects (rather than trusting
 * `fetch`'s automatic follow) so every hop can be re-validated by the same
 * SSRF guard as the original URL — a malicious server could otherwise
 * redirect an already-validated request to an internal address.
 */
async function fetchImageBytes(startUrl: string): Promise<FetchedImage | null> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(currentUrl, { signal: controller.signal, redirect: 'manual' });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || hop === MAX_REDIRECTS) return null;
      const nextUrl = new URL(location, currentUrl).toString();
      const validation = await validateOutboundUrl(nextUrl);
      if (!validation.ok || !validation.normalizedUrl) return null;
      currentUrl = validation.normalizedUrl;
      continue;
    }

    if (!response.ok) return null;

    const rawContentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!(rawContentType in ALLOWED_CONTENT_TYPES)) return null;
    // Normalize the non-standard 'image/jpg' alias to the correct MIME type
    // before storing — keeps the S3 object's stored Content-Type standard
    // regardless of what the origin server happened to send.
    const contentType = rawContentType === 'image/jpg' ? 'image/jpeg' : rawContentType;

    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_BYTES) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) return null;

    return { buffer: Buffer.from(arrayBuffer), contentType };
  }

  return null;
}

export interface IngestScanImagesInput {
  businessId: string;
  scanId: string;
  /** Candidate image URLs discovered by Firecrawl on the business's own page. */
  candidateUrls: string[];
}

export async function ingestScanImages(input: IngestScanImagesInput): Promise<ScanImageAsset[]> {
  const results: ScanImageAsset[] = [];
  const candidates = input.candidateUrls.slice(0, MAX_CANDIDATES);
  let acceptedCount = 0;

  for (const originalUrl of candidates) {
    if (acceptedCount >= MAX_ACCEPTED) break;
    if (TRACKING_OR_ICON_URL_PATTERNS.some((pattern) => pattern.test(originalUrl))) continue;

    const validation = await validateOutboundUrl(originalUrl);
    if (!validation.ok || !validation.normalizedUrl) continue;

    try {
      const fetched = await fetchImageBytes(validation.normalizedUrl);
      if (!fetched) continue;

      const { buffer, contentType } = fetched;
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;
      if (!width || !height || width < MIN_USABLE_DIMENSION_PX || height < MIN_USABLE_DIMENSION_PX) continue;

      const role = classifyRole(originalUrl);
      const isHeroQuality = width >= MIN_ACCEPT_WIDTH && height >= MIN_ACCEPT_HEIGHT;
      const status: WebsiteImageStatus = isHeroQuality || role === 'logo' ? 'accepted' : 'review_required';
      const imageId = randomUUID();
      const extension = ALLOWED_CONTENT_TYPES[contentType];
      const s3Key = `scans/${input.businessId}/${input.scanId}/images/${imageId}.${extension}`;

      // Both accepted and review_required images are stored — 'review_required'
      // only means "not automatically used by generation," not "discarded."
      // The admin can view and promote either into the canonical Business
      // photo library later (see `approveScanImageAction`); only truly
      // 'rejected' candidates (never reach this line) have no stored bytes.
      await putAsset(s3Key, buffer, contentType);
      if (status === 'accepted') acceptedCount += 1;

      results.push({
        imageId,
        url: `/api/assets/${s3Key}`,
        s3Key,
        role,
        status,
        width,
        height,
        sizeBytes: buffer.byteLength,
        contentType,
        originalUrl,
        ...(status === 'review_required' ? { note: 'Below the size threshold for automatic use — available for manual review.' } : {}),
      });
    } catch (error) {
      console.error('Scan image ingestion failed for a candidate URL:', error instanceof Error ? error.message : error);
      continue;
    }
  }

  return results;
}
