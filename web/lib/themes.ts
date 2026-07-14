import { THEME_NAMES, DEFAULT_THEME_NAME, type ThemeName } from '@/domain/constants/themes';
import type { PreviewTheme } from '@/domain/models/site-preview';

/**
 * A complete, professionally designed color palette. This is the only
 * shape a generated website's branding may take — OpenAI selects a
 * `ThemeName`, it never invents any of these hex values (see
 * `lib/theme/select-theme.ts`).
 */
export interface BrandTheme {
  name: ThemeName;
  /** Human-readable label for admin UI (theme picker, previews). */
  displayName: string;
  /** Industries this preset was designed for — also fed to the AI selection prompt. */
  bestFor: readonly string[];
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

/**
 * The 10 approved Brand Theme presets. Every color value here is final —
 * no code path may alter, blend, or generate a variant of these hex values.
 * Add a new business vertical by adding to `bestFor`, never by inventing a
 * new color.
 */
export const THEMES: Record<ThemeName, BrandTheme> = {
  classicBlue: {
    name: 'classicBlue',
    displayName: 'Classic Blue',
    bestFor: ['Plumbing', 'HVAC', 'Electricians', 'Medical', 'Legal', 'Accounting'],
    primary: '#123A6B',
    accent: '#3B82F6',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#111827',
    mutedText: '#64748B',
    border: '#E2E8F0',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  premiumNavy: {
    name: 'premiumNavy',
    displayName: 'Premium Navy',
    bestFor: ['Luxury contractors', 'Roofing', 'Real Estate', 'Financial'],
    primary: '#0D2B52',
    accent: '#F4B400',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#111827',
    mutedText: '#64748B',
    border: '#E2E8F0',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  contractor: {
    name: 'contractor',
    displayName: 'Contractor',
    bestFor: ['Remodeling', 'Concrete', 'Construction'],
    primary: '#1F2937',
    accent: '#F97316',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#111827',
    mutedText: '#64748B',
    border: '#E5E7EB',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  modern: {
    name: 'modern',
    displayName: 'Modern Teal',
    bestFor: ['Technology', 'Consultants', 'Marketing', 'SaaS'],
    primary: '#0F8B8D',
    accent: '#14B8A6',
    background: '#FFFFFF',
    surface: '#F0FDFA',
    text: '#111827',
    mutedText: '#64748B',
    border: '#D1FAE5',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  green: {
    name: 'green',
    displayName: 'Green',
    bestFor: ['Landscaping', 'Tree Service', 'Irrigation', 'Water Treatment'],
    primary: '#1E7D46',
    accent: '#34D399',
    background: '#FFFFFF',
    surface: '#F0FDF4',
    text: '#111827',
    mutedText: '#64748B',
    border: '#DCFCE7',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  orange: {
    name: 'orange',
    displayName: 'Friendly Orange',
    bestFor: ['Cleaning', 'Movers', 'Handyman', 'Local Services'],
    primary: '#EA580C',
    accent: '#FB923C',
    background: '#FFFFFF',
    surface: '#FFF7ED',
    text: '#111827',
    mutedText: '#64748B',
    border: '#FED7AA',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  modernDark: {
    name: 'modernDark',
    displayName: 'Modern Dark',
    bestFor: ['Automotive', 'Fitness', 'Specialty Trades'],
    primary: '#111827',
    accent: '#A3E635',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#111827',
    mutedText: '#64748B',
    border: '#E2E8F0',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  warmPremium: {
    name: 'warmPremium',
    displayName: 'Warm Premium',
    bestFor: ['Woodworking', 'Furniture', 'Artisan Businesses'],
    primary: '#6B2C2C',
    accent: '#C68A52',
    background: '#FFFDF8',
    surface: '#F9F5EF',
    text: '#2D2D2D',
    mutedText: '#6B7280',
    border: '#E8DFD4',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  purple: {
    name: 'purple',
    displayName: 'Purple',
    bestFor: ['Salons', 'Creative Agencies', 'Wellness', 'Boutique Businesses'],
    primary: '#5B21B6',
    accent: '#8B5CF6',
    background: '#FFFFFF',
    surface: '#F5F3FF',
    text: '#111827',
    mutedText: '#64748B',
    border: '#DDD6FE',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
  red: {
    name: 'red',
    displayName: 'Red',
    bestFor: ['Emergency Services', 'Restoration', 'Fire Protection'],
    primary: '#B91C1C',
    accent: '#EF4444',
    background: '#FFFFFF',
    surface: '#FEF2F2',
    text: '#111827',
    mutedText: '#64748B',
    border: '#FECACA',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
  },
};

export function getTheme(name: ThemeName): BrandTheme {
  return THEMES[name];
}

export function isThemeName(value: string): value is ThemeName {
  return (THEME_NAMES as readonly string[]).includes(value);
}

export const THEME_OPTIONS: BrandTheme[] = THEME_NAMES.map((name) => THEMES[name]);

/**
 * Resolve the full color palette for a preview's stored theme.
 *
 * New previews only ever carry `themeName` — this is a direct lookup.
 * Previews saved before the curated preset system (pre 2026-07-14) only
 * have free-form `primaryColor`/`accentColor`; for those we fall back to
 * the default preset's neutrals with the legacy primary/accent colors
 * substituted in, so old previews keep rendering with their original brand
 * colors instead of silently changing.
 */
export function resolveThemePalette(theme: Pick<PreviewTheme, 'themeName' | 'primaryColor' | 'accentColor'>): BrandTheme {
  if (theme.themeName) return getTheme(theme.themeName);

  const fallback = getTheme(DEFAULT_THEME_NAME);
  return {
    ...fallback,
    primary: theme.primaryColor ?? fallback.primary,
    accent: theme.accentColor ?? fallback.accent,
  };
}
