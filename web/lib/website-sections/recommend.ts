import type { WebsiteSectionConfig, WebsiteSectionsConfig } from '@/domain/models/website-sections';
import { WEBSITE_SECTION_CATALOG, SECTION_CONFIG_VERSION } from '@/domain/constants/website-sections';
import { WebsiteSectionsConfigSchema } from '@/domain/schemas/website-sections.schema';
import { computeSectionAvailability, type SectionAvailabilityInput } from './availability';

/**
 * Deterministic, rule-based recommendation — no AI. Generates a proposed
 * section configuration from currently stored business data, exposed to
 * the admin as "Apply Recommended Sections". The admin can always override
 * the result afterward; this only sets the initial `enabled` values.
 *
 * Rules are intentionally the same conservative checks used to gate public
 * rendering (`computeSectionAvailability`) — missing data recommends
 * "disabled" rather than enabling a section that would immediately show an
 * admin warning for having no content. Required sections are always
 * recommended `enabled: true`; order and variant always come from the
 * catalog defaults (this stage doesn't support customizing those via the
 * recommendation engine, only via manual edits).
 */
export function recommendWebsiteSections(input: SectionAvailabilityInput): WebsiteSectionsConfig {
  const availability = computeSectionAvailability(input);

  const sections: WebsiteSectionConfig[] = Object.entries(WEBSITE_SECTION_CATALOG).map(([type, entry]) => ({
    component: type as WebsiteSectionConfig['component'],
    enabled: entry.required ? true : availability[type as WebsiteSectionConfig['component']],
    order: entry.defaultOrder,
    variant: entry.defaultVariant,
  }));

  const config: WebsiteSectionsConfig = {
    sectionConfigVersion: SECTION_CONFIG_VERSION,
    sections,
  };

  WebsiteSectionsConfigSchema.parse(config);
  return config;
}
