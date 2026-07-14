import { NextResponse } from 'next/server';
import { getAsset } from '@/lib/s3/assets';

/**
 * Public read proxy for admin-uploaded business assets (logo/photos).
 *
 * The assets bucket is fully private — this route is the only public-facing
 * path to any object in it, and it intentionally only serves the
 * `businesses/` prefix. Scan, preview, and postcard artifacts stay private;
 * do not widen this beyond `businesses/` without reconsidering what's inside
 * those other prefixes.
 */

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
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

  if (!key.startsWith('businesses/')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const body = await getAsset(key);
  if (!body) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': contentTypeForKey(key),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
