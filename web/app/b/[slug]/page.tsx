import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPreviewsBySlug } from '@/lib/db/site-previews';
import { getBusinessById } from '@/lib/db/businesses';
import { getSession } from '@/lib/auth/session';
import { GeneratedWebsite } from './template';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Access-control helper
// ---------------------------------------------------------------------------

async function resolvePreview(slug: string) {
  const [previews, session] = await Promise.all([
    getPreviewsBySlug(slug),
    getSession(),
  ]);

  const isAdmin = !!session;

  // Admins can see draft and ready previews; public can only see published.
  const visible = previews.find((p) =>
    isAdmin
      ? p.status === 'draft' || p.status === 'ready' || p.status === 'published'
      : p.status === 'published',
  );

  if (!visible) return null;
  return { preview: visible, isAdmin };
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
      businessName={business.name}
      logoUrl={business.logoUrl}
      isClaimed={isClaimed}
      isDraft={preview.status === 'draft' || preview.status === 'ready'}
      isAdmin={isAdmin}
    />
  );
}
