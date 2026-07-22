import { Fragment } from 'react';
import type { SitePreview } from '@/domain/models/site-preview';
import type { Business } from '@/domain/models/business';
import type { Industry } from '@/domain/constants/industries';
import { buildSiteTokens, isValidPhone, isValidEmail } from './tokens';
import { resolvePreviewCtaConfig } from './cta';
import { ClaimBanner } from '../ClaimBanner';
import { MobileCallBar } from './MobileCallBar';
import { RequestServiceProvider } from './RequestServiceModal';
import { sectionRegistry, type SectionRenderContext } from './section-registry';
import { computeSectionAvailability } from '@/lib/website-sections/availability';
import { resolveRenderableSections } from '@/lib/website-sections/resolve';

interface Props {
  preview: SitePreview;
  business: Business;
  businessName: string;
  logoUrl?: string;
  industry?: Industry;
  isClaimed: boolean;
  isDraft: boolean;
  isAdmin: boolean;
}

export function GeneratedWebsite({
  preview,
  business,
  businessName,
  logoUrl,
  industry,
  isClaimed,
  isDraft,
  isAdmin,
}: Props) {
  const { content, theme } = preview;
  const phone = isValidPhone(content.contact.phone) ? content.contact.phone : undefined;
  const email = isValidEmail(content.contact.email) ? content.contact.email : undefined;
  const { primary, secondary } = resolvePreviewCtaConfig(content);

  // Load the business's stored section configuration (falling back to the
  // computed default when absent), validate/sanitize it, and drop any
  // enabled optional section whose content isn't actually available —
  // see lib/website-sections/ for the full pipeline this delegates to.
  const availability = computeSectionAvailability({ business, content, hasCta: !!(primary || secondary) });
  const sections = resolveRenderableSections(business.websiteSections, availability);

  const ctx: SectionRenderContext = {
    business,
    content,
    theme,
    businessName,
    logoUrl,
    industry,
    isClaimed,
    phone,
    email,
    primary,
    secondary,
  };

  return (
    <div
      style={{ ...buildSiteTokens(theme), fontFamily: theme.fontFamily }}
      className="min-h-screen bg-(--site-background) text-(--site-text)"
    >
      {/*
        RequestServiceProvider's dialog must render *inside* this div, not
        as its sibling — CSS custom properties (--site-*, set via the
        inline `style` above) only cascade to descendants. A sibling dialog
        would see none of them, rendering with a transparent background and
        unreadable text (see build_log.md, "Request Service dialog theming
        fix").
      */}
      <RequestServiceProvider businessName={businessName} phone={phone}>
        {/* Admin draft indicator */}
        {isDraft && isAdmin && (
          <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-bold py-2 px-4 sticky top-0 z-[60]">
            DRAFT PREVIEW — visible to admins only · not publicly accessible
          </div>
        )}

        {/* Claim banner */}
        {!isClaimed && !isDraft && <ClaimBanner businessName={businessName} />}

        {/* Configured sections, rendered in order through the controlled registry */}
        {sections.map((section) => (
          <Fragment key={section.component}>{sectionRegistry[section.component](ctx)}</Fragment>
        ))}

        {/* Mobile sticky CTA bar — not a configurable page section */}
        <MobileCallBar primary={primary} secondary={secondary} />

        {/* Bottom padding on mobile to keep content above the sticky bar */}
        {(primary || secondary) && <div className="h-16 md:hidden" />}
      </RequestServiceProvider>
    </div>
  );
}
