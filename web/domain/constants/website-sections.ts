/**
 * Fixed catalog of approved website sections (Stage 11.x — Configurable
 * Website-Section System).
 *
 * This is the single source of truth for which section identifiers exist,
 * which are required (always render, never disableable), which variants
 * each supports, and the default order/enabled-state used when a business
 * has no stored configuration yet.
 *
 * AI must never directly control React components — this catalog is the
 * only bridge between stored configuration (business/preview data) and the
 * actual component registry (`app/b/[slug]/template/section-registry.tsx`).
 * Neither an admin nor a future automated rule/AI step may reference a
 * section identifier that isn't in this array.
 */
export const WEBSITE_SECTION_TYPES = [
  'header',
  'hero',
  'trustStrip',
  'services',
  'whyChooseUs',
  'about',
  'reviews',
  'serviceAreas',
  'gallery',
  'process',
  'faq',
  'ctaBanner',
  'socialLinks',
  'contact',
  'footer',
] as const;

export type WebsiteSectionType = (typeof WEBSITE_SECTION_TYPES)[number];

/**
 * Sections that always render and cannot be disabled through normal admin
 * controls. Enforced independently at both the schema layer (save-time) and
 * the render layer (defense in depth against a corrupted stored record).
 */
export const REQUIRED_SECTION_TYPES = ['header', 'hero', 'services', 'contact', 'footer'] as const;
export type RequiredSectionType = (typeof REQUIRED_SECTION_TYPES)[number];

export function isRequiredSectionType(type: WebsiteSectionType): boolean {
  return (REQUIRED_SECTION_TYPES as readonly string[]).includes(type);
}

/**
 * Current section-configuration schema version. Stored alongside every
 * `WebsiteSectionsConfig` so future catalog changes (new sections, new
 * variants) can migrate old records instead of silently misinterpreting
 * them. A stored version greater than this is treated as unsupported and
 * the render path falls back to the computed default configuration.
 */
export const SECTION_CONFIG_VERSION = 1;

/** Catalog metadata for a single section type. Pure data — never a component reference. */
export interface WebsiteSectionCatalogEntry {
  /** Human-readable label for admin UI. */
  label: string;
  /** Required sections always render and cannot be disabled. */
  required: boolean;
  /** Enabled state used when generating a default configuration. */
  defaultEnabled: boolean;
  /** Variant used when generating a default configuration. */
  defaultVariant: string;
  /** The only variants the renderer and validation will accept for this section. */
  variants: readonly string[];
  /** Order used when generating a default configuration (ascending = earlier on the page). */
  defaultOrder: number;
}

/**
 * The fixed component catalog. Defaults mirror the exact section set and
 * order the master template (`template/index.tsx`) rendered before this
 * system existed, so a business with no stored configuration renders
 * identically to before (see `domain/factories/website-sections.factory.ts`).
 *
 * No section currently has more than one layout — every `variants` list is
 * `['default']`. The field exists so the schema and renderer are ready for
 * future variants without another breaking schema change.
 */
export const WEBSITE_SECTION_CATALOG: Record<WebsiteSectionType, WebsiteSectionCatalogEntry> = {
  header: { label: 'Header', required: true, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 10 },
  hero: { label: 'Hero', required: true, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 20 },
  trustStrip: { label: 'Trust Strip', required: false, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 30 },
  services: { label: 'Services', required: true, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 40 },
  whyChooseUs: { label: 'Why Choose Us', required: false, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 50 },
  about: { label: 'About', required: false, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 60 },
  // Also renders the business's testimonials (Google reviews and/or manual
  // entries) directly underneath the rating summary — see
  // app/b/[slug]/template/ReviewsSection.tsx. The standalone `testimonials`
  // section type that used to own that content was removed once this merge
  // was confirmed; see build_log.md.
  reviews: { label: 'Reviews', required: false, defaultEnabled: false, defaultVariant: 'default', variants: ['default'], defaultOrder: 70 },
  serviceAreas: { label: 'Service Areas', required: false, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 90 },
  gallery: { label: 'Gallery', required: false, defaultEnabled: false, defaultVariant: 'default', variants: ['default'], defaultOrder: 100 },
  process: { label: 'Process / How It Works', required: false, defaultEnabled: false, defaultVariant: 'default', variants: ['default'], defaultOrder: 110 },
  faq: { label: 'FAQ', required: false, defaultEnabled: false, defaultVariant: 'default', variants: ['default'], defaultOrder: 120 },
  ctaBanner: { label: 'CTA Banner', required: false, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 80 },
  socialLinks: { label: 'Social Links', required: false, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 135 },
  contact: { label: 'Contact', required: true, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 140 },
  footer: { label: 'Footer', required: true, defaultEnabled: true, defaultVariant: 'default', variants: ['default'], defaultOrder: 150 },
};
