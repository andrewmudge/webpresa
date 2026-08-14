import { NextResponse } from 'next/server';
import { getAsset } from '@/lib/s3/assets';

/**
 * Public read proxy for admin-uploaded business assets (logo/photos) and,
 * as of Stage 13, accepted Firecrawl scan-derived images.
 *
 * The assets bucket is fully private — this route is the only public-facing
 * path to any object in it. It serves exactly two prefixes:
 *   - `businesses/{businessId}/assets/...` — admin-uploaded logo/photos.
 *   - `scans/{businessId}/{scanId}/images/...` — accepted/review-required
 *     scan-derived images only (see `lib/firecrawl/images.ts`). The sibling
 *     `crawl.json`/`extracted.json` artifacts in the same scan folder are
 *     deliberately NOT matched by `SCAN_IMAGE_KEY_PATTERN` — they stay
 *     private, admin-viewable only via a short-lived signed URL
 *     (`getSignedAssetUrl`).
 * Preview and postcard artifacts stay fully private; do not widen this
 * beyond the two patterns below without reconsidering what's inside those
 * other prefixes.
 *
 * Content-Type allowlist (Stage 25 — Security Hardening): both prefixes are
 * only ever populated with server-validated JPEG/PNG/WebP bytes today —
 * `lib/s3/upload-validation.ts` for `businesses/...` uploads, the matching
 * allowlist in `lib/firecrawl/images.ts` for `scans/.../images/...`. `svg`
 * and `gif` were deliberately dropped from this map (neither path has ever
 * produced them): serving an uploaded SVG as `image/svg+xml` at a
 * same-origin, publicly cacheable URL is a stored-XSS vector (SVG can embed
 * `<script>`), and no SVG-sanitization dependency exists in this repo. An
 * unrecognized extension falls back to `application/octet-stream`, which a
 * browser won't execute — reinforced by the `nosniff` header below.
 */

const SCAN_IMAGE_KEY_PATTERN = /^scans\/[^/]+\/[^/]+\/images\//;

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function contentTypeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  return (ext && CONTENT_TYPES[ext]) || 'application/octet-stream';
}

interface Props {
  params: Promise<{ key: string[] }>;
}

export async function GET(_request: Request, { params }: Props) {
  const { key: segments } = await params;
  const key = segments.join('/');

  if (!key.startsWith('businesses/') && !SCAN_IMAGE_KEY_PATTERN.test(key)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const body = await getAsset(key);
  if (!body) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': contentTypeForKey(key),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
