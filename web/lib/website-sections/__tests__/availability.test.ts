import { describe, it, expect } from 'vitest';
import { computeSectionAvailability, hasResolvableCta } from '../availability';
import { createBusiness } from '@/domain/factories/business.factory';
import type { Business } from '@/domain/models/business';
import type { PreviewContent } from '@/domain/models/site-preview';

function business(overrides: Partial<Business> = {}): Business {
  return { ...createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' }), ...overrides };
}

function content(overrides: Partial<PreviewContent> = {}): PreviewContent {
  return {
    hero: { headline: 'H', subheadline: 'S', ctaText: 'Call' },
    services: [{ name: 'Drain Cleaning', description: 'Fast and reliable.' }],
    tagline: 'Trusted local plumbers',
    aboutText: 'We are a local plumbing company.',
    contact: { phone: '512-555-0100' },
    ...overrides,
  };
}

describe('computeSectionAvailability', () => {
  it('always makes required sections available', () => {
    const result = computeSectionAvailability({ business: business(), content: undefined, hasCta: false });
    expect(result.header).toBe(true);
    expect(result.hero).toBe(true);
    expect(result.contact).toBe(true);
    expect(result.footer).toBe(true);
  });

  it('trust strip is always available (generic, non-data-driven indicators)', () => {
    const result = computeSectionAvailability({ business: business(), content: undefined, hasCta: false });
    expect(result.trustStrip).toBe(true);
  });

  it('services is available only when the preview has at least one service', () => {
    const withServices = computeSectionAvailability({ business: business(), content: content(), hasCta: false });
    expect(withServices.services).toBe(true);

    const noContent = computeSectionAvailability({ business: business(), content: undefined, hasCta: false });
    expect(noContent.services).toBe(false);
  });

  it('whyChooseUs is available only when differentiators exist', () => {
    const none = computeSectionAvailability({ business: business(), content: content(), hasCta: false });
    expect(none.whyChooseUs).toBe(false);

    const withDiff = computeSectionAvailability({
      business: business(),
      content: content({ differentiators: [{ title: 'Fast', description: 'We show up on time.' }] }),
      hasCta: false,
    });
    expect(withDiff.whyChooseUs).toBe(true);
  });

  it('serviceAreas is available only when the preview lists at least one area', () => {
    const none = computeSectionAvailability({ business: business(), content: content(), hasCta: false });
    expect(none.serviceAreas).toBe(false);

    const withAreas = computeSectionAvailability({
      business: business(),
      content: content({ serviceAreas: ['Austin, TX'] }),
      hasCta: false,
    });
    expect(withAreas.serviceAreas).toBe(true);
  });

  it('gallery is available only when the business has uploaded photos', () => {
    const none = computeSectionAvailability({ business: business(), content: undefined, hasCta: false });
    expect(none.gallery).toBe(false);

    const withPhotos = computeSectionAvailability({
      business: business({ photoUrls: ['/api/assets/businesses/biz_1/assets/photos/1.jpg'] }),
      content: undefined,
      hasCta: false,
    });
    expect(withPhotos.gallery).toBe(true);
  });

  it('reviews is available when googleReviewCount is at least 1 or a visible testimonial exists', () => {
    const none = computeSectionAvailability({ business: business(), content: undefined, hasCta: false });
    expect(none.reviews).toBe(false);

    const withGoogleRating = computeSectionAvailability({
      business: business({ googleReviewCount: 12, googleRating: 4.8 }),
      content: undefined,
      hasCta: false,
    });
    expect(withGoogleRating.reviews).toBe(true);

    // ReviewsSection now renders testimonials underneath the rating summary
    // (see app/b/[slug]/template/ReviewsSection.tsx), so it must also be
    // available for a business with testimonials but no Google rating.
    const withTestimonialsOnly = computeSectionAvailability({
      business: business({ testimonials: [{ id: 't1', author: 'Jane D.', quote: 'Great work!', source: 'manual' }] }),
      content: undefined,
      hasCta: false,
    });
    expect(withTestimonialsOnly.reviews).toBe(true);

    const hiddenTestimonialOnly = computeSectionAvailability({
      business: business({
        testimonials: [{ id: 't2', author: 'Google User', quote: 'Great work!', source: 'google', hidden: true }],
      }),
      content: undefined,
      hasCta: false,
    });
    expect(hiddenTestimonialOnly.reviews).toBe(false);
  });

  it('faq is available only when at least one FAQ item exists', () => {
    const withFaq = computeSectionAvailability({
      business: business({ faqItems: [{ question: 'Do you offer free estimates?', answer: 'Yes.' }] }),
      content: undefined,
      hasCta: false,
    });
    expect(withFaq.faq).toBe(true);
  });

  it('process is available only when at least one process step exists', () => {
    const withProcess = computeSectionAvailability({
      business: business({ processSteps: [{ title: 'Call us', description: 'We schedule a visit.' }] }),
      content: undefined,
      hasCta: false,
    });
    expect(withProcess.process).toBe(true);
  });

  it('socialLinks is available only when the generated content has at least one', () => {
    const none = computeSectionAvailability({ business: business(), content: content(), hasCta: false });
    expect(none.socialLinks).toBe(false);

    const withLinks = computeSectionAvailability({
      business: business(),
      content: content({ socialLinks: [{ platform: 'facebook', url: 'https://facebook.com/acme' }] }),
      hasCta: false,
    });
    expect(withLinks.socialLinks).toBe(true);
  });

  it('ctaBanner mirrors the hasCta flag passed in', () => {
    const noCta = computeSectionAvailability({ business: business(), content: undefined, hasCta: false });
    expect(noCta.ctaBanner).toBe(false);

    const withCta = computeSectionAvailability({ business: business(), content: undefined, hasCta: true });
    expect(withCta.ctaBanner).toBe(true);
  });
});

describe('hasResolvableCta', () => {
  it('is true when the business has a valid phone number', () => {
    expect(hasResolvableCta(business({ phone: '512-555-0100' }))).toBe(true);
  });

  it('is true when the business has a valid email', () => {
    expect(hasResolvableCta(business({ email: 'hello@example.com' }))).toBe(true);
  });

  it('is false when neither phone, email, nor a configured CTA exists', () => {
    expect(hasResolvableCta(business())).toBe(false);
  });

  it('is true when the preview content has a configured CTA value', () => {
    const c = content({ contact: {}, cta: { primary: { type: 'external_url', label: 'Book Now', value: 'https://example.com/book' } } });
    expect(hasResolvableCta(business(), c)).toBe(true);
  });
});
