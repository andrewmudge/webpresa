'use server';
import { redirect } from 'next/navigation';
import type { Business } from '@/domain/models/business';
import type { PreviewContent, PreviewTheme } from '@/domain/models/site-preview';
import { PreviewContentSchema } from '@/domain/schemas/site-preview.schema';
import { createSitePreview } from '@/domain/factories/site-preview.factory';
import {
  listPreviewsForBusiness,
  putSitePreview,
  deletePreviewById,
} from '@/lib/db/site-previews';
import { listScansForBusiness, deleteScanEventById } from '@/lib/db/scan-events';
import { listPostcardsForBusiness, deletePostcardById } from '@/lib/db/postcards';
import { deleteBusinessById, getBusinessById } from '@/lib/db/businesses';
import { getSession } from '@/lib/auth/session';

// ---------------------------------------------------------------------------
// Industry-specific seed content
//
// DEV_FIXTURE: All content here is clearly fictional development data.
// Images use picsum.photos placeholder URLs — replace with real S3 URLs
// when Stage 9 (image pipeline) is implemented.
//
// Do NOT represent these as real businesses, real reviews, real credentials,
// real ratings, or real statistics. Content must pass PreviewContentSchema.
// ---------------------------------------------------------------------------

type SeedOverrides = {
  services: { name: string; description: string }[];
  differentiators: { title: string; description: string }[];
  heroImageUrl: string;
  aboutImageUrl: string;
};

const INDUSTRY_SEEDS: Partial<Record<string, SeedOverrides>> = {
  plumbing: {
    services: [
      { name: 'Drain Cleaning', description: 'Hydro-jetting and snaking to clear stubborn clogs fast and completely.' },
      { name: 'Leak Detection & Repair', description: 'Non-invasive tools to find hidden leaks before they cause damage.' },
      { name: 'Water Heater Service', description: 'Tank and tankless water heater repair, maintenance, and installation.' },
      { name: 'Toilet Repair & Install', description: 'From running toilets to full replacements — same-day availability.' },
      { name: 'Pipe Repair & Replacement', description: 'Durable repairs for burst, corroded, or aging pipes of any material.' },
      { name: 'Fixture Installation', description: 'Faucets, sinks, showers, and bathtub installations done right.' },
    ],
    differentiators: [
      { title: 'On-Time Arrivals', description: 'We respect your schedule. If we\'re running late, you\'ll hear from us in advance.' },
      { title: 'Upfront Flat-Rate Pricing', description: 'You get a clear quote before work begins. No hourly surprises, no hidden fees.' },
      { title: 'Clean Work Guarantee', description: 'We leave your home cleaner than we found it. Every single visit.' },
      { title: 'Rapid Response', description: 'Most calls are answered within minutes and service is dispatched the same day.' },
    ],
    // DEV_FIXTURE: picsum.photos placeholder images
    heroImageUrl: 'https://picsum.photos/id/162/1600/900',
    aboutImageUrl: 'https://picsum.photos/id/1011/800/600',
  },
  hvac: {
    services: [
      { name: 'AC Repair & Service', description: 'Diagnose and repair any cooling system — fast, reliable, same-day.' },
      { name: 'Heating Repair', description: 'Furnace, heat pump, and boiler repairs to keep your home comfortable.' },
      { name: 'System Installation', description: 'High-efficiency HVAC system installations sized for your space.' },
      { name: 'Maintenance Plans', description: 'Seasonal tune-ups that extend equipment life and reduce energy bills.' },
      { name: 'Air Quality Solutions', description: 'Filtration, humidifiers, and ventilation for a healthier indoor environment.' },
    ],
    differentiators: [
      { title: 'Same-Day Service', description: 'We dispatch technicians quickly so you\'re not left waiting in discomfort.' },
      { title: 'Transparent Estimates', description: 'Every service begins with a clear written estimate — no surprises.' },
      { title: 'Certified Technicians', description: 'Our team is trained and experienced on all major HVAC brands and systems.' },
      { title: 'Energy-Efficiency Focus', description: 'We recommend solutions that reduce your utility costs over time.' },
    ],
    heroImageUrl: 'https://picsum.photos/id/1080/1600/900',
    aboutImageUrl: 'https://picsum.photos/id/1031/800/600',
  },
  roofing: {
    services: [
      { name: 'Roof Repair', description: 'Fast, lasting repairs for leaks, missing shingles, and storm damage.' },
      { name: 'Full Roof Replacement', description: 'Complete tear-off and installation with quality materials and warranty.' },
      { name: 'Storm Damage Assessment', description: 'Thorough inspections after severe weather to document all damage.' },
      { name: 'Gutter Installation', description: 'Seamless gutter systems that protect your foundation and landscaping.' },
      { name: 'Roof Inspections', description: 'Comprehensive annual inspections to catch problems before they grow.' },
    ],
    differentiators: [
      { title: 'Quality Materials', description: 'We work only with proven materials backed by manufacturer warranties.' },
      { title: 'Detailed Documentation', description: 'Full photo documentation before, during, and after every project.' },
      { title: 'Clean Job Sites', description: 'We protect your property and clean up completely when the job is done.' },
      { title: 'Fair, Written Quotes', description: 'Every project starts with a detailed, written proposal — no verbal estimates.' },
    ],
    heroImageUrl: 'https://picsum.photos/id/164/1600/900',
    aboutImageUrl: 'https://picsum.photos/id/1074/800/600',
  },
  landscaping: {
    services: [
      { name: 'Lawn Care & Mowing', description: 'Regular maintenance to keep your lawn healthy, green, and well-manicured.' },
      { name: 'Landscape Design', description: 'Custom designs that enhance curb appeal and work with your property.' },
      { name: 'Irrigation Systems', description: 'Installation and repair of efficient irrigation to protect your investment.' },
      { name: 'Tree & Shrub Care', description: 'Pruning, trimming, and removal done safely by trained professionals.' },
      { name: 'Seasonal Cleanups', description: 'Spring and fall cleanups that prepare your yard for the season ahead.' },
    ],
    differentiators: [
      { title: 'Consistent Crews', description: 'The same team returns each visit — they learn your property and preferences.' },
      { title: 'Eco-Friendly Practices', description: 'We use responsible products and techniques to protect your soil and ecosystem.' },
      { title: 'Responsive Communication', description: 'You can always reach someone — before, during, and after the job.' },
      { title: 'Satisfaction Promise', description: 'If something doesn\'t look right, we come back and make it right.' },
    ],
    heroImageUrl: 'https://picsum.photos/id/145/1600/900',
    aboutImageUrl: 'https://picsum.photos/id/1084/800/600',
  },
};

const DEFAULT_SEED: SeedOverrides = {
  services: [
    { name: 'Core Service', description: 'Quality work delivered on time and within budget by experienced professionals.' },
    { name: 'Inspections & Estimates', description: 'Free, no-obligation estimates provided by our knowledgeable team.' },
    { name: 'Maintenance & Upkeep', description: 'Ongoing maintenance programs to protect your investment long-term.' },
    { name: 'Emergency Response', description: 'Available for urgent situations — fast dispatch and reliable resolution.' },
  ],
  differentiators: [
    { title: 'On-Time Service', description: 'We respect your schedule and communicate proactively if plans change.' },
    { title: 'Upfront Pricing', description: 'Clear quotes before any work begins — no hidden charges or surprises.' },
    { title: 'Clean Work Areas', description: 'We protect your property and leave every job site clean and tidy.' },
    { title: 'Quality You Can Count On', description: 'We take pride in every job and stand behind the work we deliver.' },
  ],
  heroImageUrl: 'https://picsum.photos/id/119/1600/900',
  aboutImageUrl: 'https://picsum.photos/id/1025/800/600',
};

function buildSeedContent(business: Business): PreviewContent {
  const industry = business.industry;
  const seed = INDUSTRY_SEEDS[industry] ?? DEFAULT_SEED;
  const city = business.address?.city ?? 'your area';
  const state = business.address?.state;
  const locationLabel = state ? `${city}, ${state}` : city;

  const serviceAreas = [
    locationLabel,
    ...(business.address?.city ? [`Surrounding ${business.address.city} area`] : []),
  ].filter(Boolean);

  const raw: PreviewContent = {
    hero: {
      headline: business.name,
      subheadline: `Dependable ${industry.replace(/_/g, ' ')} services in ${city}. Professional results, clear communication, and no hidden fees.`,
      ctaText: 'Get a Free Quote',
    },
    services: seed.services,
    tagline: `Trusted ${industry.replace(/_/g, ' ')} services — proudly serving ${locationLabel}.`,
    aboutText: `${business.name} is a locally operated ${industry.replace(/_/g, ' ')} company dedicated to delivering quality work and exceptional service to our community. We believe in honest communication, fair pricing, and doing the job right the first time. Every project — big or small — gets our full attention and professional care.`,
    contact: {
      ...(business.phone ? { phone: business.phone } : {}),
      ...(business.email ? { email: business.email } : {}),
      ...(business.address
        ? {
            address: [
              business.address.line1,
              business.address.city,
              business.address.state,
              business.address.postalCode,
            ].filter(Boolean).join(', '),
          }
        : {}),
    },
    serviceAreas,
    differentiators: seed.differentiators,
    hours: 'Mon–Fri 8am–6pm · Sat 9am–3pm',
  };

  PreviewContentSchema.parse(raw);
  return raw;
}

const SEED_THEME = (industry: string): PreviewTheme => {
  const seed = INDUSTRY_SEEDS[industry] ?? DEFAULT_SEED;
  return {
    primaryColor: '#11455E',
    accentColor: '#CE9059',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    // DEV_FIXTURE: picsum.photos placeholder — replace with S3 URLs in Stage 9
    heroImageUrl: seed.heroImageUrl,
    aboutImageUrl: seed.aboutImageUrl,
  };
};

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function createSeedPreviewAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const content = buildSeedContent(business);

  const existing = await listPreviewsForBusiness(businessId);
  const previousVersion = existing.length > 0 ? Math.max(...existing.map((p) => p.version)) : 0;

  const preview = createSitePreview({
    businessId: business.businessId,
    slug: business.slug,
    templateId: 'local-business-v1',
    content,
    theme: SEED_THEME(business.industry),
    previousVersion,
  });

  const published = { ...preview, status: 'published' as const, updatedAt: new Date().toISOString() };
  await putSitePreview(published);

  redirect(`/admin/businesses/${business.businessId}`);
}


// ---------------------------------------------------------------------------
// Cascade delete action
// ---------------------------------------------------------------------------

/**
 * Permanently delete a business and all downstream records:
 *   SitePreviews, ScanEvents, Postcards.
 *
 * Requires an active admin session. Redirects to /admin/businesses on success.
 */
export async function deleteBusinessAction(businessId: string): Promise<{ error: string } | void> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const business = await getBusinessById(businessId);
  if (!business) return { error: 'Business not found' };

  // Fetch all downstream records concurrently
  const [previews, scans, postcards] = await Promise.all([
    listPreviewsForBusiness(businessId),
    listScansForBusiness(businessId),
    listPostcardsForBusiness(businessId),
  ]);

  // Delete downstream records concurrently
  await Promise.all([
    ...previews.map((p) => deletePreviewById(p.previewId)),
    ...scans.map((s) => deleteScanEventById(s.scanId)),
    ...postcards.map((p) => deletePostcardById(p.postcardId)),
  ]);

  // Delete the business record last
  await deleteBusinessById(businessId);

  redirect('/admin/businesses');
}
