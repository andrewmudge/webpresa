import type { Industry } from '@/domain/constants/industries';

/**
 * Deterministic industry → default "Services offered" fallback, used only
 * when a business has none on file — the case for every Google-Places-
 * imported, no-website business (Google Places exposes no services/menu
 * data, and there's no scraped website to substitute, unlike the
 * with-website Firecrawl path — see `generateAndSaveWebsite`). Same shape
 * as `INDUSTRY_THEME_DEFAULTS` (`lib/theme/industry-defaults.ts`); unlike
 * that one this is a full `Record`, not `Partial`, since every current
 * `Industry` value needs a plausible generic list for bulk no-website
 * campaigns to work without per-business editing — adding a new industry
 * to `INDUSTRIES` will fail to compile here until a default is added too.
 *
 * Generic and industry-typical on purpose, not business-specific — the
 * caller persists this onto `Business.servicesOffered` so it's visible and
 * editable in the admin UI (Business Details form) rather than a hidden
 * fallback, letting an admin correct it to the business's real services at
 * any time.
 */
export const INDUSTRY_SERVICE_DEFAULTS: Record<Industry, string> = {
  plumbing: 'Drain cleaning\nWater heater repair\nPipe repair\nEmergency plumbing',
  hvac: 'AC repair\nHeating repair\nDuct cleaning\nSystem installation',
  electrical: 'Electrical repairs\nPanel upgrades\nLighting installation\nWiring inspections',
  roofing: 'Roof repair\nRoof replacement\nGutter installation\nStorm damage repair',
  landscaping: 'Lawn care\nLandscape design\nTree trimming\nIrrigation systems',
  painting: 'Interior painting\nExterior painting\nCabinet refinishing\nPressure washing',
  cleaning: 'House cleaning\nDeep cleaning\nMove-in/move-out cleaning\nRecurring maintenance cleaning',
  restaurant: 'Dine-in service\nTakeout\nCatering\nPrivate events',
  bakery: 'Custom cakes\nFresh pastries\nWedding cakes\nCatering orders',
  salon: 'Haircuts\nColor services\nStyling\nSpa treatments',
  law_firm: 'Legal consultations\nCase representation\nDocument preparation\nContract review',
  accounting: 'Tax preparation\nBookkeeping\nPayroll services\nFinancial consulting',
};
