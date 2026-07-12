import type { PreviewTheme } from '@/domain/models/site-preview';

/**
 * Converts a PreviewTheme into CSS custom property style object.
 * Apply to the root wrapper so child components can use var(--site-primary) etc.
 */
export function buildSiteTokens(theme: PreviewTheme): React.CSSProperties {
  return {
    '--site-primary': theme.primaryColor,
    '--site-accent': theme.accentColor,
    '--site-font': theme.fontFamily,
  } as React.CSSProperties;
}

/** Short-hand references for inline style usage */
export const V = {
  primary: 'var(--site-primary)',
  accent: 'var(--site-accent)',
} as const;

/** Normalize a phone string to digits only for a tel: link */
export function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:${digits.startsWith('1') ? '+' : '+1'}${digits}`;
}

export function isValidPhone(phone: string | undefined): phone is string {
  if (!phone) return false;
  return phone.replace(/\D/g, '').length >= 7;
}

export function isValidEmail(email: string | undefined): email is string {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
