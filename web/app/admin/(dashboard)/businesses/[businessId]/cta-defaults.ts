import type { PreviewContact, PreviewCta, PreviewCtaConfig } from '@/domain/models/site-preview';

/**
 * Default CTA config for a newly created preview, derived from whatever
 * contact info the business has. Never defaults to a generic phrase like
 * "Get a Quote" — those are only used when an admin explicitly picks them.
 *
 * `labels` lets a caller (e.g. Stage 11 generation) supply brand-appropriate
 * copy while this function keeps sole authority over which contact channel
 * becomes primary/secondary — never let a caller (including the model)
 * choose a CTA type/destination the business doesn't actually have.
 *
 * Plain sync helper — kept out of actions.ts because every export from a
 * `'use server'` file must be an async Server Action.
 */
export function buildDefaultCta(
  contact: PreviewContact,
  labels?: { primary?: string; secondary?: string },
): PreviewCtaConfig {
  if (contact.phone) {
    const primary: PreviewCta = { type: 'phone', label: labels?.primary || 'Call Now' };
    if (contact.email) {
      return { primary, secondary: { type: 'email', label: labels?.secondary || 'Email Us' } };
    }
    return { primary };
  }
  if (contact.email) {
    return { primary: { type: 'email', label: labels?.primary || 'Contact Us' } };
  }
  return { primary: { type: 'none', label: '' } };
}
