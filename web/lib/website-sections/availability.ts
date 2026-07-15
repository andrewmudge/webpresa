import type { Business } from '@/domain/models/business';
import type { PreviewContent } from '@/domain/models/site-preview';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';

/**
 * Deterministic content-availability checks — no AI, no invented facts.
 * An enabled section only renders on the public preview when its check
 * here is `true`; otherwise the admin section manager surfaces a warning
 * instead (see `resolveSectionWarnings` in `resolve.ts`).
 *
 * Adapted to the current data model:
 * - `reviews` reads `Business.googleReviewCount`, reserved ahead of Stage 12
 *   (Google Places) — always `false` today since nothing populates it yet.
 * - `testimonials` / `faqItems` / `processSteps` are manually-verified
 *   Business fields with no admin entry UI yet — always `false` today.
 * - `gallery` reuses the existing `Business.photoUrls` upload, so it's
 *   genuinely available whenever a business has uploaded at least one photo.
 * - `serviceAreas` reads the generated preview's `content.serviceAreas`
 *   (already the source `ServiceAreaSection` conditionally rendered from
 *   before this system existed).
 */
export interface SectionAvailabilityInput {
  business: Business;
  /** The generated preview's content. Optional — a business may not have a preview yet. */
  content?: PreviewContent;
  /** Whether `resolvePreviewCtaConfig` resolved at least one CTA. */
  hasCta: boolean;
}

export function computeSectionAvailability({
  business,
  content,
  hasCta,
}: SectionAvailabilityInput): Record<WebsiteSectionType, boolean> {
  return {
    header: true,
    hero: true,
    trustStrip: true,
    services: (content?.services.length ?? 0) > 0,
    gallery: (business.photoUrls?.length ?? 0) >= 1,
    whyChooseUs: (content?.differentiators?.length ?? 0) >= 1,
    about: (content?.aboutText.trim().length ?? 0) > 0,
    reviews: (business.googleReviewCount ?? 0) >= 1,
    testimonials: (business.testimonials?.length ?? 0) >= 1,
    serviceAreas: (content?.serviceAreas?.length ?? 0) >= 1,
    process: (business.processSteps?.length ?? 0) >= 1,
    faq: (business.faqItems?.length ?? 0) >= 1,
    ctaBanner: hasCta,
    contact: true,
    footer: true,
  };
}

/**
 * Conservative fallback for `hasCta` when no `resolvePreviewCtaConfig`
 * result is available (e.g. the admin recommendation action running before
 * any preview has been generated) — a business is treated as CTA-ready
 * once it has a usable phone number or email, matching the same priority
 * `buildDefaultCta` uses when a preview's own CTA is first derived.
 */
export function hasResolvableCta(business: Business, content?: PreviewContent): boolean {
  const phone = content?.contact.phone ?? business.phone;
  const email = content?.contact.email ?? business.email;
  const validPhone = !!phone && phone.replace(/\D/g, '').length >= 7;
  const validEmail = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return validPhone || validEmail || !!content?.cta?.primary?.value;
}
