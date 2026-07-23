import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getPreviewsBySlug } from '@/lib/db/site-previews';
import { getBusinessById } from '@/lib/db/businesses';
import { getScanEventById } from '@/lib/db/scan-events';
import { getSession } from '@/lib/auth/session';
import { CAPTURE_TOKEN_COOKIE_NAME, verifyCaptureToken } from '@/lib/capture-token';
import { GeneratedWebsite } from './template';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Access-control helper
// ---------------------------------------------------------------------------

/**
 * Stage 14 (Playwright) alternate bypass — the screenshot Lambda has no
 * admin session, so it authenticates a `generated_preview` capture with a
 * short-lived, single-preview signed cookie instead (see
 * `implementation.md`, Stage 14, "Draft preview visibility"). Every claim is
 * checked, including that `scanId` still names an actual `queued`/`running`
 * Playwright ScanEvent for exactly this preview — a validly-signed token for
 * a scan that already finished (or was never for this preview) is rejected,
 * not just a bad signature.
 */
async function hasValidCaptureToken(previewId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CAPTURE_TOKEN_COOKIE_NAME)?.value;
  const claims = await verifyCaptureToken(token, { previewId });
  if (!claims) return false;

  const scan = await getScanEventById(claims.scanId);
  return (
    !!scan &&
    scan.provider === 'playwright' &&
    scan.targetType === 'generated_preview' &&
    scan.previewId === previewId &&
    (scan.status === 'queued' || scan.status === 'running')
  );
}

async function resolvePreview(slug: string) {
  const [previews, session] = await Promise.all([
    getPreviewsBySlug(slug),
    getSession(),
  ]);

  const isAdmin = !!session;

  // Published previews are visible to everyone, admin or not — check this
  // first regardless of session, so an admin session never has to fall
  // through to the capture-token check below.
  const published = previews.find((p) => p.status === 'published');
  if (published) return { preview: published, isAdmin };

  if (isAdmin) {
    const draftOrReady = previews.find((p) => p.status === 'draft' || p.status === 'ready');
    return draftOrReady ? { preview: draftOrReady, isAdmin } : null;
  }

  // Stage 14 — a Lambda holding a valid, scan-scoped capture token can see
  // exactly the one draft/ready preview it was issued for (see
  // "Draft preview visibility" above). previews-per-slug is always tiny
  // (every version of one business), so a small sequential await loop here
  // is fine — no batching machinery needed.
  for (const preview of previews) {
    if (await hasValidCaptureToken(preview.previewId)) {
      return { preview, isAdmin: false };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await resolvePreview(slug);
  if (!found) return {};

  const { preview } = found;
  const business = await getBusinessById(preview.businessId);
  const isClaimed = business?.status === 'active';

  return {
    title: preview.content.seo?.title ?? preview.content.hero.headline,
    description: preview.content.seo?.description ?? preview.content.hero.subheadline,
    robots: isClaimed ? 'index, follow' : 'noindex, nofollow',
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;
  const found = await resolvePreview(slug);
  if (!found) notFound();

  const { preview, isAdmin } = found;
  const business = await getBusinessById(preview.businessId);
  if (!business) notFound();

  const isClaimed = business.status === 'active';

  return (
    <GeneratedWebsite
      preview={preview}
      business={business}
      businessName={business.name}
      logoUrl={business.logoUrl}
      industry={business.industry}
      isClaimed={isClaimed}
      isDraft={preview.status === 'draft' || preview.status === 'ready'}
      isAdmin={isAdmin}
    />
  );
}
