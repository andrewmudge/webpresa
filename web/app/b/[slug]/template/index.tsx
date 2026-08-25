import type { SitePreview } from '@/domain/models/site-preview';
import type { Business } from '@/domain/models/business';
import type { Industry } from '@/domain/constants/industries';
import type { ClaimBannerState } from '@/lib/claim/banner-state';
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
  claimBannerState: ClaimBannerState;
  /** Whether this browser holds a signed claim-intent cookie for this specific business. */
  hasMatchingClaimIntent: boolean;
  isDraft: boolean;
  isAdmin: boolean;
  /** Whether this request is the screenshot Lambda capturing this preview for a postcard — never shown the claim banner, regardless of draft/published status. */
  isCapture: boolean;
}

export function GeneratedWebsite({
  preview,
  business,
  businessName,
  logoUrl,
  industry,
  claimBannerState,
  hasMatchingClaimIntent,
  isDraft,
  isAdmin,
  isCapture,
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
    claimBannerState,
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
      <RequestServiceProvider businessName={businessName} phone={phone} slug={business.slug}>
        {/* Admin draft indicator */}
        {isDraft && isAdmin && (
          <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-bold py-2 px-4 sticky top-0 z-[60]">
            DRAFT PREVIEW — visible to admins only · not publicly accessible
          </div>
        )}

        {/* Claim banner — hidden only once genuinely active (paid); a
            claimed-but-unpaid business still shows a softer message rather
            than losing the banner entirely (see implementation.md, Stage 17,
            "Public claim-banner behavior"). */}
        {claimBannerState !== 'active' && !isDraft && !isCapture && (
          <ClaimBanner
            businessId={business.businessId}
            businessName={businessName}
            state={claimBannerState}
            businessSlug={business.slug}
            hasMatchingClaimIntent={hasMatchingClaimIntent}
          />
        )}

        {/* Configured sections, rendered in order through the controlled
            registry. Each is wrapped in a bare, unstyled `div` carrying
            `data-editor-section` (Stage 19.A) — foundational metadata only,
            for a possible future click-to-edit stage in the customer
            dashboard; no interactive behavior reads it yet. A plain `div`
            with no className/style is presentation-neutral, so this changes
            no layout — it replaces the previous `Fragment`, which couldn't
            carry an attribute at all. */}
        {sections.map((section) => (
          <div key={section.component} data-editor-section={section.component}>
            {sectionRegistry[section.component](ctx)}
          </div>
        ))}

        {/* Mobile sticky CTA bar — not a configurable page section */}
        <MobileCallBar primary={primary} secondary={secondary} />

        {/* Bottom padding on mobile to keep content above the sticky bar */}
        {(primary || secondary) && <div className="h-16 md:hidden" />}
      </RequestServiceProvider>
    </div>
  );
}
