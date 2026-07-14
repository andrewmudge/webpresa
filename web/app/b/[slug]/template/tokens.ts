import type { PreviewTheme } from '@/domain/models/site-preview';
import { resolveThemePalette } from '@/lib/themes';

/**
 * Converts a PreviewTheme's resolved Brand Theme palette into a CSS custom
 * property style object. Apply to the root wrapper so every child component
 * can consume `var(--site-*)` — this is the only place a preview's colors
 * are ever read out of `lib/themes.ts`.
 */
export function buildSiteTokens(theme: PreviewTheme): React.CSSProperties {
  const palette = resolveThemePalette(theme);
  return {
    '--site-primary': palette.primary,
    '--site-accent': palette.accent,
    '--site-background': palette.background,
    '--site-surface': palette.surface,
    '--site-text': palette.text,
    '--site-muted': palette.mutedText,
    '--site-border': palette.border,
    '--site-success': palette.success,
    '--site-warning': palette.warning,
    '--site-danger': palette.danger,
    '--site-font': theme.fontFamily,
  } as React.CSSProperties;
}

/** Short-hand references for inline style usage */
export const V = {
  primary: 'var(--site-primary)',
  accent: 'var(--site-accent)',
  background: 'var(--site-background)',
  surface: 'var(--site-surface)',
  text: 'var(--site-text)',
  muted: 'var(--site-muted)',
  border: 'var(--site-border)',
  success: 'var(--site-success)',
  warning: 'var(--site-warning)',
  danger: 'var(--site-danger)',
} as const;

/** Normalize a phone string to digits only for a tel: link */
export function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:${digits.startsWith('1') ? '+' : '+1'}${digits}`;
}

/** Normalize a phone string to digits only for an sms: link */
export function toSmsHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `sms:${digits.startsWith('1') ? '+' : '+1'}${digits}`;
}

/** Build a mailto: link — centralized so every section constructs it the same way */
export function toMailtoHref(email: string): string {
  return `mailto:${email}`;
}

export function isValidPhone(phone: string | undefined): phone is string {
  if (!phone) return false;
  return phone.replace(/\D/g, '').length >= 7;
}

export function isValidEmail(email: string | undefined): email is string {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
