import type { SitePreview } from '@/domain/models/site-preview';
import { buildSiteTokens, isValidPhone, isValidEmail } from './tokens';
import { resolvePreviewCtaConfig } from './cta';
import { ClaimBanner } from '../ClaimBanner';
import { GeneratedSiteHeader } from './GeneratedSiteHeader';
import { GeneratedHero } from './GeneratedHero';
import { TrustStrip } from './TrustStrip';
import { ServicesGrid } from './ServicesGrid';
import { WhyChooseUs } from './WhyChooseUs';
import { AboutSection } from './AboutSection';
import { ServiceAreaSection } from './ServiceAreaSection';
import { ContactSection } from './ContactSection';
import { FinalCTA } from './FinalCTA';
import { GeneratedSiteFooter } from './GeneratedSiteFooter';
import { MobileCallBar } from './MobileCallBar';

interface Props {
  preview: SitePreview;
  businessName: string;
  isClaimed: boolean;
  isDraft: boolean;
  isAdmin: boolean;
}

export function GeneratedWebsite({ preview, businessName, isClaimed, isDraft, isAdmin }: Props) {
  const { content, theme } = preview;
  const phone = isValidPhone(content.contact.phone) ? content.contact.phone : undefined;
  const email = isValidEmail(content.contact.email) ? content.contact.email : undefined;
  const { primary, secondary } = resolvePreviewCtaConfig(content);

  return (
    <div style={{ ...buildSiteTokens(theme), fontFamily: theme.fontFamily }} className="min-h-screen">
      {/* Admin draft indicator */}
      {isDraft && isAdmin && (
        <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-bold py-2 px-4 sticky top-0 z-[60]">
          DRAFT PREVIEW — visible to admins only · not publicly accessible
        </div>
      )}

      {/* Claim banner */}
      {!isClaimed && !isDraft && <ClaimBanner businessName={businessName} />}

      {/* Navigation */}
      <GeneratedSiteHeader
        businessName={businessName}
        serviceAreas={content.serviceAreas}
        services={content.services}
        primary={primary}
        secondary={secondary}
      />

      {/* Hero */}
      <GeneratedHero
        headline={content.hero.headline}
        subheadline={content.hero.subheadline}
        serviceArea={content.serviceAreas?.[0]}
        heroImageUrl={theme.heroImageUrl}
        heroStyle={theme.heroStyle}
        primary={primary}
        secondary={secondary}
      />

      {/* Trust strip */}
      <TrustStrip />

      {/* Services */}
      <ServicesGrid services={content.services} />

      {/* Why choose us (conditional: only when differentiators data present) */}
      {content.differentiators && content.differentiators.length > 0 && (
        <WhyChooseUs
          differentiators={content.differentiators}
          aboutImageUrl={theme.aboutImageUrl}
          businessName={businessName}
          primary={primary}
        />
      )}

      {/* About */}
      <AboutSection
        businessName={businessName}
        tagline={content.tagline}
        aboutText={content.aboutText}
        primary={primary}
      />

      {/* Service areas (conditional) */}
      {content.serviceAreas && content.serviceAreas.length > 0 && (
        <ServiceAreaSection serviceAreas={content.serviceAreas} primary={primary} />
      )}

      {/* Final CTA */}
      <FinalCTA primary={primary} secondary={secondary} />

      {/* Contact */}
      <ContactSection
        phone={phone}
        email={email}
        address={content.contact.address}
        hours={content.hours}
      />

      {/* Footer */}
      <GeneratedSiteFooter
        businessName={businessName}
        phone={phone}
        email={email}
        address={content.contact.address}
        hours={content.hours}
        services={content.services}
        serviceAreas={content.serviceAreas}
        isClaimed={isClaimed}
      />

      {/* Mobile sticky CTA bar */}
      <MobileCallBar primary={primary} secondary={secondary} />

      {/* Bottom padding on mobile to keep content above the sticky bar */}
      {(primary || secondary) && <div className="h-16 md:hidden" />}
    </div>
  );
}
