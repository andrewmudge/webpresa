import type { PreviewContact, PreviewCta, PreviewCtaConfig } from '@/domain/models/site-preview';

/**
 * Default CTA config for a newly created preview, derived from whatever
 * contact info the business has. Never defaults to a generic phrase like
 * "Get a Quote" — those are only used when an admin explicitly picks them.
 *
 * Plain sync helper — kept out of actions.ts because every export from a
 * `'use server'` file must be an async Server Action.
 */
export function buildDefaultCta(contact: PreviewContact): PreviewCtaConfig {
  if (contact.phone) {
    const primary: PreviewCta = { type: 'phone', label: 'Call Now' };
    if (contact.email) {
      return { primary, secondary: { type: 'email', label: 'Email Us' } };
    }
    return { primary };
  }
  if (contact.email) {
    return { primary: { type: 'email', label: 'Contact Us' } };
  }
  return { primary: { type: 'none', label: '' } };
}
