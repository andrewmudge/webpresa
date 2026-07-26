import { describe, it, expect } from 'vitest';
import { recommendWebsiteSections } from '../recommend';
import { REQUIRED_SECTION_TYPES } from '@/domain/constants/website-sections';
import { createBusiness } from '@/domain/factories/business.factory';
import type { Business } from '@/domain/models/business';
import type { PreviewContent } from '@/domain/models/site-preview';

function business(overrides: Partial<Business> = {}): Business {
  return { ...createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' }), ...overrides };
}

function enabledSet(config: ReturnType<typeof recommendWebsiteSections>): Set<string> {
  return new Set(config.sections.filter((s) => s.enabled).map((s) => s.component));
}

describe('recommendWebsiteSections', () => {
  it('always recommends every required section enabled, even with no data at all', () => {
    const config = recommendWebsiteSections({ business: business(), content: undefined, hasCta: false });
    const enabled = enabledSet(config);
    for (const required of REQUIRED_SECTION_TYPES) {
      expect(enabled.has(required)).toBe(true);
    }
  });

  it('recommends every optional section disabled for a minimal business with no data', () => {
    const config = recommendWebsiteSections({ business: business(), content: undefined, hasCta: false });
    const enabled = enabledSet(config);
    for (const optional of ['reviews', 'gallery', 'faq', 'process', 'whyChooseUs', 'serviceAreas', 'about', 'ctaBanner']) {
      expect(enabled.has(optional)).toBe(false);
    }
    // Trust strip's indicators are generic/always-safe, so it's still recommended.
    expect(enabled.has('trustStrip')).toBe(true);
  });

  it('recommends reviews enabled once a review count exists', () => {
    const config = recommendWebsiteSections({
      business: business({ googleReviewCount: 8, googleRating: 4.6 }),
      content: undefined,
      hasCta: false,
    });
    expect(enabledSet(config).has('reviews')).toBe(true);
  });

  it('recommends gallery enabled once photos are uploaded', () => {
    const config = recommendWebsiteSections({
      business: business({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/1.jpg'] }),
      content: undefined,
      hasCta: false,
    });
    expect(enabledSet(config).has('gallery')).toBe(true);
  });

  it('recommends ctaBanner enabled once the business has a resolvable CTA', () => {
    const config = recommendWebsiteSections({ business: business({ phone: '512-555-0100' }), content: undefined, hasCta: true });
    expect(enabledSet(config).has('ctaBanner')).toBe(true);
  });

  it('recommends content-derived sections based on the latest preview content', () => {
    const content: PreviewContent = {
      hero: { headline: 'H', subheadline: 'S', ctaText: 'Call' },
      services: [{ name: 'Drain Cleaning', description: 'Fast and reliable.' }],
      tagline: 'Trusted local plumbers',
      aboutText: 'We are a local plumbing company.',
      contact: { phone: '512-555-0100' },
      serviceAreas: ['Austin, TX'],
      differentiators: [{ title: 'Fast', description: 'We show up on time.' }],
    };
    const config = recommendWebsiteSections({ business: business(), content, hasCta: true });
    const enabled = enabledSet(config);
    expect(enabled.has('serviceAreas')).toBe(true);
    expect(enabled.has('whyChooseUs')).toBe(true);
  });

  it('produces a strictly valid configuration', () => {
    const config = recommendWebsiteSections({ business: business(), content: undefined, hasCta: false });
    // recommendWebsiteSections already parses internally and throws on
    // invalid output — reaching this point without throwing is the assertion.
    expect(config.sections.length).toBeGreaterThan(0);
  });
});
