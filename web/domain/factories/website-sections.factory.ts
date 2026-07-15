import type { WebsiteSectionConfig, WebsiteSectionsConfig } from '@/domain/models/website-sections';
import { WEBSITE_SECTION_TYPES, WEBSITE_SECTION_CATALOG, SECTION_CONFIG_VERSION } from '@/domain/constants/website-sections';
import { WebsiteSectionsConfigSchema } from '@/domain/schemas/website-sections.schema';

/**
 * Build the default section configuration straight from the catalog — every
 * section present, using each entry's `defaultEnabled`/`defaultOrder`/
 * `defaultVariant`. This is what a business with no stored configuration
 * (created before this system existed, or never customized) resolves to at
 * render time, and it deliberately mirrors the exact set of sections the
 * fixed master template rendered before this system existed — trustStrip,
 * whyChooseUs, about, serviceAreas, and ctaBanner all default `enabled:
 * true` because the old template always attempted to render them (gated
 * only by their own data-presence checks, same as the new availability
 * gate). Reviews/testimonials/gallery/faq/process default `enabled: false`
 * since the old template never rendered them at all.
 *
 * Validated against `WebsiteSectionsConfigSchema` before being returned —
 * a change to the catalog that produces an invalid default is a bug caught
 * immediately, not at some later render.
 */
export function createDefaultWebsiteSectionsConfig(): WebsiteSectionsConfig {
  const sections: WebsiteSectionConfig[] = WEBSITE_SECTION_TYPES.map((type) => {
    const entry = WEBSITE_SECTION_CATALOG[type];
    return {
      component: type,
      enabled: entry.defaultEnabled,
      order: entry.defaultOrder,
      variant: entry.defaultVariant,
    };
  });

  const config: WebsiteSectionsConfig = {
    sectionConfigVersion: SECTION_CONFIG_VERSION,
    sections,
  };

  WebsiteSectionsConfigSchema.parse(config);
  return config;
}
