import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getPreviewsBySlug } from '@/lib/db/site-previews';
import { getBusinessById } from '@/lib/db/businesses';
import { getScanEventById } from '@/lib/db/scan-events';
import { getSession } from '@/lib/auth/session';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { computeBusinessAccessMode } from '@/lib/auth/customer-authorization';
import { CAPTURE_TOKEN_COOKIE_NAME, verifyCaptureToken } from '@/lib/capture-token';
import { getClaimBannerState } from '@/lib/claim/banner-state';
import { CLAIM_INTENT_COOKIE_NAME, verifyClaimIntent } from '@/lib/auth/claim-intent';
import { GeneratedWebsite } from './template';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
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

async function resolvePreview(slug: string, previewMode?: string) {
  const [previews, session] = await Promise.all([
    getPreviewsBySlug(slug),
    getSession(),
  ]);

  const isAdmin = !!session;

  // Stage 19 — `?preview=draft` lets the owning customer explicitly view
  // their draft even once a published preview already exists (the "Draft
  // Preview" link on the dashboard, and the Overview page's iframe when
  // draft changes are pending). Without this, the branch below it (and the
  // customer branch further down) can only ever fire for a business that
  // has never published at all, since "published wins" always short-circuits
  // first otherwise — there would be no way to ever preview a draft again
  // after the first publish. Checked before the published-wins rule, but
  // only actually returns the draft after re-verifying the same
  // ownership/entitlement checks used everywhere else in this app; anyone
  // not authorized falls straight through to the unchanged logic below.
  if (previewMode === 'draft') {
    const draftOrReady = previews.find((p) => p.status === 'draft' || p.status === 'ready');
    if (draftOrReady) {
      if (isAdmin) return { preview: draftOrReady, isAdmin: true };
      const customerSession = await getCustomerSession();
      if (customerSession) {
        const business = await getBusinessById(draftOrReady.businessId);
        if (business?.ownerUserId === customerSession.sub) {
          const { mode } = computeBusinessAccessMode(business);
          if (mode === 'full' || mode === 'billing_recovery') {
            return { preview: draftOrReady, isAdmin: false };
          }
        }
      }
      // Not authorized for the draft view — fall through to normal resolution.
    }
  }

  // Published previews are visible to everyone, admin or not — check this
  // first regardless of session, so an admin session never has to fall
  // through to the capture-token check below.
  const published = previews.find((p) => p.status === 'published');
  if (published) return { preview: published, isAdmin };

  if (isAdmin) {
    const draftOrReady = previews.find((p) => p.status === 'draft' || p.status === 'ready');
    return draftOrReady ? { preview: draftOrReady, isAdmin } : null;
  }

  // Stage 19 — an owning customer with 'full' or 'billing_recovery' access
  // may view their own business's draft/ready preview (the dashboard's
  // "Preview draft" iframe/link resolves through this exact page). Checked
  // before the Stage 14 capture-token loop below since it's a single
  // targeted lookup rather than a per-preview loop. `isAdmin: false` here is
  // deliberate and safe — `isAdmin` in this file gates exactly one thing
  // (the admin-only draft banner in `template/index.tsx`), which a customer
  // must never see; the dashboard shell outside this iframe already
  // communicates draft state.
  const draftOrReady = previews.find((p) => p.status === 'draft' || p.status === 'ready');
  if (draftOrReady) {
    const customerSession = await getCustomerSession();
    if (customerSession) {
      const business = await getBusinessById(draftOrReady.businessId);
      if (business?.ownerUserId === customerSession.sub) {
        const { mode } = computeBusinessAccessMode(business);
        if (mode === 'full' || mode === 'billing_recovery') {
          return { preview: draftOrReady, isAdmin: false };
        }
      }
    }
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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { preview: previewMode } = await searchParams;
  const found = await resolvePreview(slug, previewMode);
  if (!found) return {};

  const { preview } = found;
  const business = await getBusinessById(preview.businessId);
  // Deliberately unrelated to claim ownership (Stage 17) — this stays on
  // the general `Business.status` lifecycle field until Stage 18/19 decide
  // whether paid activation should also flip it. See
  // implementation.md, Stage 17, "Public claim-banner behavior".
  const isIndexable = business?.status === 'active';

  return {
    title: preview.content.seo?.title ?? preview.content.hero.headline,
    description: preview.content.seo?.description ?? preview.content.hero.subheadline,
    robots: isIndexable ? 'index, follow' : 'noindex, nofollow',
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PreviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview: previewMode } = await searchParams;
  const found = await resolvePreview(slug, previewMode);
  if (!found) notFound();

  const { preview, isAdmin } = found;
  const business = await getBusinessById(preview.businessId);
  if (!business) notFound();

  const claimBannerState = getClaimBannerState(business);

  const cookieStore = await cookies();
  const claimIntent = await verifyClaimIntent(cookieStore.get(CLAIM_INTENT_COOKIE_NAME)?.value);
  const hasMatchingClaimIntent = claimIntent?.businessId === business.businessId;

  return (
    <GeneratedWebsite
      preview={preview}
      business={business}
      businessName={business.name}
      logoUrl={business.logoUrl}
      industry={business.industry}
      claimBannerState={claimBannerState}
      hasMatchingClaimIntent={hasMatchingClaimIntent}
      isDraft={preview.status === 'draft' || preview.status === 'ready'}
      isAdmin={isAdmin}
    />
  );
}
