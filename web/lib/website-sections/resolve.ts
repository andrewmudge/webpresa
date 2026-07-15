import type { WebsiteSectionConfig, WebsiteSectionsConfig } from '@/domain/models/website-sections';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import {
  WEBSITE_SECTION_CATALOG,
  REQUIRED_SECTION_TYPES,
  SECTION_CONFIG_VERSION,
} from '@/domain/constants/website-sections';
import { WebsiteSectionConfigSchema } from '@/domain/schemas/website-sections.schema';
import { createDefaultWebsiteSectionsConfig } from '@/domain/factories/website-sections.factory';

/**
 * Lenient, render-safe resolution of a business's stored section
 * configuration. Never throws — this runs on every public page load, so a
 * corrupted or legacy record must degrade gracefully rather than 500.
 *
 * Pipeline (mirrors the render-architecture spec):
 * 1. Fall back to the computed default when configuration is absent or its
 *    version is newer than this build understands.
 * 2. Drop individually malformed entries (defense in depth beyond what a
 *    successful `BusinessSchema.parse()` on read already guarantees).
 * 3. Drop duplicate `component` entries, keeping the first occurrence.
 * 4. Drop entries whose `variant` isn't supported for that `component`.
 * 5. Force every required section present and `enabled: true`, inserting
 *    catalog defaults for any that are missing entirely.
 * 6. Sort by `order` ascending.
 */
export function resolveStoredOrDefaultSections(
  stored: WebsiteSectionsConfig | undefined,
): WebsiteSectionConfig[] {
  const usableStored =
    stored && Array.isArray(stored.sections) && stored.sectionConfigVersion <= SECTION_CONFIG_VERSION
      ? stored.sections
      : createDefaultWebsiteSectionsConfig().sections;

  const seen = new Set<WebsiteSectionType>();
  const cleaned: WebsiteSectionConfig[] = [];

  for (const raw of usableStored) {
    const parsed = WebsiteSectionConfigSchema.safeParse(raw);
    if (!parsed.success) continue;
    const entry = parsed.data;
    if (seen.has(entry.component)) continue;
    seen.add(entry.component);
    cleaned.push(entry);
  }

  for (const required of REQUIRED_SECTION_TYPES) {
    const existingIndex = cleaned.findIndex((s) => s.component === required);
    if (existingIndex === -1) {
      const catalogEntry = WEBSITE_SECTION_CATALOG[required];
      cleaned.push({
        component: required,
        enabled: true,
        order: catalogEntry.defaultOrder,
        variant: catalogEntry.defaultVariant,
      });
    } else if (!cleaned[existingIndex].enabled) {
      cleaned[existingIndex] = { ...cleaned[existingIndex], enabled: true };
    }
  }

  return cleaned.sort((a, b) => a.order - b.order);
}

/**
 * The final, ordered list of sections the public renderer should render:
 * the sanitized/defaulted configuration, filtered to `enabled` sections
 * whose content is actually available — required sections always pass
 * regardless of availability (they carry their own safe fallback markup).
 */
export function resolveRenderableSections(
  stored: WebsiteSectionsConfig | undefined,
  availability: Record<WebsiteSectionType, boolean>,
): WebsiteSectionConfig[] {
  return resolveStoredOrDefaultSections(stored).filter(
    (section) =>
      section.enabled &&
      ((REQUIRED_SECTION_TYPES as readonly string[]).includes(section.component) || availability[section.component]),
  );
}

/**
 * Sections that are enabled in the stored/resolved configuration but whose
 * content isn't currently available — surfaced as admin warnings so an
 * admin understands why an enabled section isn't showing on the public
 * preview, without needing to invent placeholder content.
 */
export function resolveSectionWarnings(
  sections: WebsiteSectionConfig[],
  availability: Record<WebsiteSectionType, boolean>,
): WebsiteSectionType[] {
  return sections
    .filter((s) => s.enabled && !(REQUIRED_SECTION_TYPES as readonly string[]).includes(s.component) && !availability[s.component])
    .map((s) => s.component);
}
