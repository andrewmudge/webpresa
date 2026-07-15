import { DEFAULT_THEME_NAME, type ThemeName } from '@/domain/constants/themes';

/**
 * Theme-matched hero illustration fallback (replaces the old CSS
 * gradient/pattern/solid + lucide-icon-watermark fallback for every newly
 * generated preview — see `HeroStyle` in `domain/models/site-preview.ts`).
 * One hand-designed static image per Brand Theme preset, colored to that
 * preset's primary/accent/surface palette.
 */
const HERO_ILLUSTRATIONS: Record<ThemeName, string> = {
  classicBlue: '/hero_illustrations/classicBlue.png',
  premiumNavy: '/hero_illustrations/premiumNavy.png',
  contractor: '/hero_illustrations/contractor.png',
  modern: '/hero_illustrations/modern.png',
  green: '/hero_illustrations/green.png',
  orange: '/hero_illustrations/orange.png',
  modernDark: '/hero_illustrations/modernDark.png',
  warmPremium: '/hero_illustrations/warmPremium.png',
  purple: '/hero_illustrations/purple.png',
  red: '/hero_illustrations/red.png',
};

/** Legacy previews with no stored `themeName` fall back to the default preset's illustration. */
export function getHeroIllustration(themeName: ThemeName | undefined): string {
  return HERO_ILLUSTRATIONS[themeName ?? DEFAULT_THEME_NAME];
}
