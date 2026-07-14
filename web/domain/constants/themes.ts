/**
 * Canonical Brand Theme preset names used across all Webpresa records.
 *
 * This is the single source of truth for which presets exist. Neither the
 * AI generation prompt nor any admin form may reference a theme name that
 * isn't in this array — see `lib/themes.ts` for the actual color palettes
 * and `lib/theme/select-theme.ts` for how a name gets chosen.
 */
export const THEME_NAMES = [
  'classicBlue',
  'premiumNavy',
  'contractor',
  'modern',
  'green',
  'orange',
  'modernDark',
  'warmPremium',
  'purple',
  'red',
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

/** Used whenever no logo, no stored preference, and no other signal is available. */
export const DEFAULT_THEME_NAME: ThemeName = 'classicBlue';
