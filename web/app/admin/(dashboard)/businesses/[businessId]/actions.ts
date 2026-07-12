'use server';
import { redirect } from 'next/navigation';
import type { Business } from '@/domain/models/business';
import type { PreviewContent, PreviewTheme } from '@/domain/models/site-preview';
import { PreviewContentSchema } from '@/domain/schemas/site-preview.schema';
import { createSitePreview } from '@/domain/factories/site-preview.factory';
import { listPreviewsForBusiness, putSitePreview } from '@/lib/db/site-previews';
import { getSession } from '@/lib/auth/session';

// ---------------------------------------------------------------------------
// Seed content generator
//
// Produces plausible placeholder content from the Business record so the
// /b/[slug] template can be tested without AI generation (Stage 11).
// ---------------------------------------------------------------------------

function buildSeedContent(business: Business): PreviewContent {
  const industryLabel = business.industry.replace(/_/g, ' ');
  const city = business.address?.city ?? 'your area';

  const raw: PreviewContent = {
    hero: {
      headline: business.name,
      subheadline: `Professional ${industryLabel} services in ${city}. Reliable, affordable, and ready to help.`,
      ctaText: 'Get a Free Quote',
    },
    services: [
      {
        name: `${industryLabel.charAt(0).toUpperCase() + industryLabel.slice(1)} Services`,
        description: `Quality ${industryLabel} work delivered on time and within budget.`,
      },
      {
        name: 'Inspections & Estimates',
        description: 'Free, no-obligation estimates from our experienced team.',
      },
      {
        name: 'Emergency Response',
        description: 'Available when you need us most — fast, reliable service every time.',
      },
    ],
    tagline: `Trusted ${industryLabel} services — serving ${city} with quality and care.`,
    aboutText: `${business.name} is a trusted local ${industryLabel} company committed to serving our community with quality and integrity. We take pride in every job and stand behind our work.`,
    contact: {
      ...(business.phone ? { phone: business.phone } : {}),
      ...(business.email ? { email: business.email } : {}),
      ...(business.address
        ? {
            address: `${business.address.line1}, ${business.address.city}, ${business.address.state} ${business.address.postalCode}`,
          }
        : {}),
    },
  };

  // Validate before returning — throws ZodError if content is malformed.
  PreviewContentSchema.parse(raw);
  return raw;
}

const SEED_THEME: PreviewTheme = {
  primaryColor: '#11455E',
  accentColor: '#CE9059',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function createSeedPreviewAction(business: Business): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const content = buildSeedContent(business);

  // Find the highest existing version for this business so the factory
  // can correctly set the new version number.
  const existing = await listPreviewsForBusiness(business.businessId);
  const previousVersion = existing.length > 0 ? Math.max(...existing.map((p) => p.version)) : 0;

  const preview = createSitePreview({
    businessId: business.businessId,
    slug: business.slug,
    templateId: 'local-business-v1',
    content,
    theme: SEED_THEME,
    previousVersion,
  });

  // Immediately publish so the /b/[slug] route can serve it.
  const published = { ...preview, status: 'published' as const, updatedAt: new Date().toISOString() };
  await putSitePreview(published);

  redirect(`/admin/businesses/${business.businessId}`);
}
