import type { CtaActionType, PreviewCta, PreviewCtaConfig, PreviewContact, PreviewContent } from '@/domain/models/site-preview';
import { isHttpsUrl } from '@/domain/schemas/site-preview.schema';
import { isValidPhone, isValidEmail, toTelHref, toSmsHref, toMailtoHref } from './tokens';

/**
 * A CTA that has been resolved to a concrete, renderable link.
 * `resolvePreviewCta` returns `null` instead of this when the action
 * cannot be resolved (missing destination, unsafe URL, `type: "none"`).
 */
export interface ResolvedCta {
  type: CtaActionType;
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

/**
 * Resolve a single configured CTA into a renderable link, falling back to
 * the preview's contact info for phone/email/sms when `cta.value` is unset.
 * Returns `null` whenever the action has no valid destination — callers
 * must not render a button in that case.
 */
export function resolvePreviewCta({
  cta,
  contact,
  variant,
  leadCaptureEnabled = true,
}: {
  cta: PreviewCta | undefined;
  contact: PreviewContact;
  variant: 'primary' | 'secondary';
  /**
   * Stage 20 — lead capture is a Growth-plan-only capability
   * (`hasPlanCapability`, `lib/auth/customer-authorization.ts`). Defaults to
   * `true` so every other CTA type (and every existing call site/test) is
   * unaffected; `resolvePreviewCtaConfig` below is the one real caller that
   * passes a business's actual entitlement.
   */
  leadCaptureEnabled?: boolean;
}): ResolvedCta | null {
  if (!cta || cta.type === 'none' || !cta.label.trim()) return null;

  switch (cta.type) {
    case 'phone': {
      const phone = cta.value?.trim() || contact.phone;
      if (!isValidPhone(phone)) return null;
      return { type: 'phone', label: cta.label, href: toTelHref(phone), variant };
    }
    case 'sms': {
      const phone = cta.value?.trim() || contact.phone;
      if (!isValidPhone(phone)) return null;
      return { type: 'sms', label: cta.label, href: toSmsHref(phone), variant };
    }
    case 'email': {
      const email = cta.value?.trim() || contact.email;
      if (!isValidEmail(email)) return null;
      return { type: 'email', label: cta.label, href: toMailtoHref(email), variant };
    }
    case 'external_url': {
      const value = cta.value?.trim();
      if (!value || !isHttpsUrl(value)) return null;
      return { type: 'external_url', label: cta.label, href: value, variant };
    }
    case 'request_service':
      // Opens the reusable RequestServiceForm (see RequestServiceModal.tsx /
      // CtaButton.tsx) instead of navigating — needs no contact info to
      // resolve, so it's always available as a default secondary action.
      // `href` is a harmless in-page anchor; CtaButton never actually
      // navigates it, it intercepts the click. Gated on `leadCaptureEnabled`
      // (Stage 20) — a Basic-plan business must not render a "Request
      // Service" button that would silently no-op on click; falling through
      // to `null` here means the rest of the CTA-resolution pipeline (e.g.
      // collapsing an identical primary/secondary pair) behaves exactly as
      // if this CTA were never configured.
      if (!leadCaptureEnabled) return null;
      return { type: 'request_service', label: cta.label, href: '#request-service', variant };
    default:
      return null;
  }
}

/**
 * Legacy previews saved before `content.cta` existed only have
 * `hero.ctaText`. Normalize them into a CTA config without a destructive
 * migration: keep the old label, point it at phone if available, otherwise
 * email, otherwise hide the CTA entirely.
 */
function normalizeLegacyCtaConfig(content: PreviewContent): PreviewCtaConfig {
  const label = content.hero.ctaText?.trim() || 'Contact Us';
  if (content.contact.phone) return { primary: { type: 'phone', label } };
  if (content.contact.email) return { primary: { type: 'email', label } };
  return { primary: { type: 'none', label: '' } };
}

/**
 * The site-wide default secondary CTA — every business page shows a
 * "Request Service" button unless an admin has explicitly configured a
 * secondary CTA (including explicitly hiding it via `type: 'none'`). This
 * makes the pairing universal immediately, without requiring a preview
 * regeneration or admin action, even for previews that today only have a
 * primary CTA on file.
 */
const DEFAULT_SECONDARY_CTA: PreviewCta = { type: 'request_service', label: 'Request Service' };

/**
 * Resolve the full primary/secondary CTA configuration for a preview.
 * This is the single source every template section reads from — do not
 * construct CTA links ad hoc in individual components.
 */
export function resolvePreviewCtaConfig(
  content: PreviewContent,
  /** Stage 20 — whether this business's plan includes lead capture; see `resolvePreviewCta`. */
  leadCaptureEnabled = true,
): {
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
} {
  const config = content.cta ?? normalizeLegacyCtaConfig(content);

  const primary = resolvePreviewCta({ cta: config.primary, contact: content.contact, variant: 'primary', leadCaptureEnabled });
  let secondary = resolvePreviewCta({
    cta: config.secondary ?? DEFAULT_SECONDARY_CTA,
    contact: content.contact,
    variant: 'secondary',
    leadCaptureEnabled,
  });

  // Two CTAs resolving to the same action + destination collapse to one.
  if (primary && secondary && primary.type === secondary.type && primary.href === secondary.href) {
    secondary = null;
  }

  return { primary, secondary };
}

/** The resolved CTAs to render in the mobile sticky bar, in display order. Empty when neither resolves. */
export function getMobileBarActions(primary: ResolvedCta | null, secondary: ResolvedCta | null): ResolvedCta[] {
  return [primary, secondary].filter((cta): cta is ResolvedCta => cta !== null);
}

/** `target`/`rel` attributes for a resolved CTA — external links open in a new tab, everything else stays in-page. */
export function externalLinkAttrs(cta: ResolvedCta): { target?: string; rel?: string } {
  return cta.type === 'external_url' ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/** Small leading icon matched to the CTA's action type. Omits an icon for types with no obvious glyph. */
export function CtaIcon({ type, className }: { type: CtaActionType; className?: string }) {
  switch (type) {
    case 'phone':
    case 'sms':
      return (
        <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      );
    case 'email':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'external_url':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      );
    case 'request_service':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />
        </svg>
      );
    default:
      return null;
  }
}
