import type { ReactNode } from 'react';
import type { Business } from '@/domain/models/business';
import type { PreviewContent, PreviewTheme } from '@/domain/models/site-preview';
import type { Industry } from '@/domain/constants/industries';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import type { ResolvedCta } from './cta';
import { GeneratedSiteHeader } from './GeneratedSiteHeader';
import { GeneratedHero } from './GeneratedHero';
import { TrustStrip } from './TrustStrip';
import { ServicesGrid } from './ServicesGrid';
import { GallerySection } from './GallerySection';
import { WhyChooseUs } from './WhyChooseUs';
import { AboutSection } from './AboutSection';
import { ReviewsSection } from './ReviewsSection';
import { TestimonialsSection } from './TestimonialsSection';
import { ServiceAreaSection } from './ServiceAreaSection';
import { ProcessSection } from './ProcessSection';
import { FaqSection } from './FaqSection';
import { FinalCTA } from './FinalCTA';
import { SocialLinksSection } from './SocialLinksSection';
import { ContactSection } from './ContactSection';
import { GeneratedSiteFooter } from './GeneratedSiteFooter';

/**
 * Everything any registry entry might need to render its section. A single
 * shared context — rather than threading a different prop shape through
 * each call site — keeps `GeneratedWebsite` a plain loop over the resolved
 * section list instead of a hand-written switch statement per section.
 */
export interface SectionRenderContext {
  business: Business;
  content: PreviewContent;
  theme: PreviewTheme;
  businessName: string;
  logoUrl?: string;
  industry?: Industry;
  isClaimed: boolean;
  phone?: string;
  email?: string;
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

/**
 * The controlled component registry — the only place a `WebsiteSectionType`
 * identifier is turned into actual React output. AI or admin configuration
 * selects a `component` identifier from the fixed catalog
 * (`domain/constants/website-sections.ts`); it never selects a component
 * directly. Every catalog entry must have an entry here — a mismatch is a
 * compile-time error via the `Record<WebsiteSectionType, ...>` type.
 */
export const sectionRegistry: Record<WebsiteSectionType, (ctx: SectionRenderContext) => ReactNode> = {
  header: (ctx) => (
    <GeneratedSiteHeader
      businessName={ctx.businessName}
      logoUrl={ctx.logoUrl}
      serviceAreas={ctx.content.serviceAreas}
      services={ctx.content.services}
      primary={ctx.primary}
      secondary={ctx.secondary}
    />
  ),
  hero: (ctx) => (
    <GeneratedHero
      headline={ctx.content.hero.headline}
      subheadline={ctx.content.hero.subheadline}
      serviceArea={ctx.content.serviceAreas?.[0]}
      heroImageUrl={ctx.theme.heroImageUrl}
      heroImageUrlMobile={ctx.theme.heroImageUrlMobile}
      logoUrl={ctx.logoUrl}
      heroStyle={ctx.theme.heroStyle}
      industry={ctx.industry}
      themeName={ctx.theme.themeName}
      primary={ctx.primary}
      secondary={ctx.secondary}
    />
  ),
  trustStrip: () => <TrustStrip />,
  services: (ctx) => (
    <ServicesGrid
      services={ctx.content.services}
      featuredImageUrl={ctx.theme.servicesImageUrl}
      sectionHeadline={ctx.content.servicesSection?.headline}
      sectionSubheadline={ctx.content.servicesSection?.subheadline}
    />
  ),
  gallery: (ctx) => (
    <GallerySection
      businessName={ctx.businessName}
      images={ctx.content.gallerySection?.images ?? (ctx.business.photoUrls ?? []).map((url) => ({ url }))}
      sectionHeadline={ctx.content.gallerySection?.headline}
      sectionSubheadline={ctx.content.gallerySection?.subheadline}
    />
  ),
  whyChooseUs: (ctx) => (
    <WhyChooseUs
      differentiators={ctx.content.differentiators ?? []}
      aboutImageUrl={ctx.theme.aboutImageUrl}
      businessName={ctx.businessName}
      primary={ctx.primary}
      sectionHeadline={ctx.content.whyChooseUsSection?.headline}
    />
  ),
  about: (ctx) => (
    <AboutSection
      businessName={ctx.businessName}
      tagline={ctx.content.tagline}
      aboutText={ctx.content.aboutText}
      imageUrl={ctx.theme.aboutSectionImageUrl}
      primary={ctx.primary}
      quote={ctx.content.aboutSection?.quote}
    />
  ),
  reviews: (ctx) => (
    <ReviewsSection
      businessName={ctx.businessName}
      rating={ctx.business.googleRating}
      reviewCount={ctx.business.googleReviewCount}
      testimonials={ctx.business.testimonials}
    />
  ),
  testimonials: (ctx) => <TestimonialsSection testimonials={ctx.business.testimonials ?? []} />,
  serviceAreas: (ctx) => (
    <ServiceAreaSection
      serviceAreas={ctx.content.serviceAreas ?? []}
      primary={ctx.primary}
      sectionHeadline={ctx.content.serviceAreasSection?.headline}
      sectionSubheadline={ctx.content.serviceAreasSection?.subheadline}
    />
  ),
  process: (ctx) => <ProcessSection steps={ctx.business.processSteps ?? []} />,
  faq: (ctx) => <FaqSection faqItems={ctx.business.faqItems ?? []} />,
  ctaBanner: (ctx) => (
    <FinalCTA
      primary={ctx.primary}
      secondary={ctx.secondary}
      sectionHeadline={ctx.content.ctaBannerSection?.headline}
      sectionSubheadline={ctx.content.ctaBannerSection?.subheadline}
    />
  ),
  socialLinks: (ctx) => <SocialLinksSection businessName={ctx.businessName} socialLinks={ctx.content.socialLinks ?? []} />,
  contact: (ctx) => (
    <ContactSection phone={ctx.phone} email={ctx.email} address={ctx.content.contact.address} hours={ctx.content.hours} />
  ),
  footer: (ctx) => (
    <GeneratedSiteFooter
      businessName={ctx.businessName}
      phone={ctx.phone}
      email={ctx.email}
      address={ctx.content.contact.address}
      hours={ctx.content.hours}
      services={ctx.content.services}
      serviceAreas={ctx.content.serviceAreas}
      isClaimed={ctx.isClaimed}
    />
  ),
};
