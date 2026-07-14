import {
  Wrench,
  Fan,
  Zap,
  HardHat,
  Trees,
  PaintRoller,
  SprayCan,
  UtensilsCrossed,
  Croissant,
  Scissors,
  Scale,
  Calculator,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Industry } from '@/domain/constants/industries';

/**
 * A large, low-opacity watermark icon shown on the hero background when no
 * uploaded photo is available (see GeneratedHero.tsx) — adds industry-
 * relevant visual interest to the gradient/pattern/solid fallback styles
 * without pretending to be a real photo of the business. Deliberately not
 * stock photography: avoids licensing overhead and the risk of two
 * competing local businesses (this app's actual customer base) ending up
 * with the identical stock photo.
 */
export const INDUSTRY_HERO_ICONS: Record<Industry, LucideIcon> = {
  plumbing: Wrench,
  hvac: Fan,
  electrical: Zap,
  roofing: HardHat,
  landscaping: Trees,
  painting: PaintRoller,
  cleaning: SprayCan,
  restaurant: UtensilsCrossed,
  bakery: Croissant,
  salon: Scissors,
  law_firm: Scale,
  accounting: Calculator,
};

/** Used for any industry not present in `INDUSTRY_HERO_ICONS` (shouldn't happen — defensive only). */
export const DEFAULT_HERO_ICON: LucideIcon = Sparkles;

export function getHeroIcon(industry: Industry | undefined): LucideIcon {
  if (!industry) return DEFAULT_HERO_ICON;
  return INDUSTRY_HERO_ICONS[industry] ?? DEFAULT_HERO_ICON;
}
