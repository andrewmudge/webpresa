import type { Industry } from '@/domain/constants/industries';
import type { ThemeName } from '@/domain/constants/themes';

/**
 * Deterministic industry → theme fallback, used only when there is no
 * stored business preference, no logo to analyze, and the caller wants a
 * theme without an OpenAI call (the free seed-preview path). Derived
 * directly from each preset's documented "best for" industries in
 * `lib/themes.ts`. Industries not listed fall back to `DEFAULT_THEME_NAME`.
 */
export const INDUSTRY_THEME_DEFAULTS: Partial<Record<Industry, ThemeName>> = {
  plumbing: 'classicBlue',
  hvac: 'classicBlue',
  electrical: 'classicBlue',
  roofing: 'premiumNavy',
  landscaping: 'green',
  painting: 'orange',
  cleaning: 'orange',
  restaurant: 'warmPremium',
  bakery: 'warmPremium',
  salon: 'purple',
  law_firm: 'classicBlue',
  accounting: 'classicBlue',
};
