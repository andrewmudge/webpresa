import type { WebsiteSectionConfig, WebsiteSectionsConfig } from '@/domain/models/website-sections';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';
import {
  WEBSITE_SECTION_TYPES,
  WEBSITE_SECTION_CATALOG,
  REQUIRED_SECTION_TYPES,
  SECTION_CONFIG_VERSION,
} from '@/domain/constants/website-sections';
import { WebsiteSectionConfigSchema, WebsiteSectionsConfigSchema } from '@/domain/schemas/website-sections.schema';
import { createDefaultWebsiteSectionsConfig } from '@/domain/factories/website-sections.factory';
import type { Business } from '@/domain/models/business';

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
 * 5. Insert catalog defaults for any section type missing from the cleaned
 *    list that was ALSO never present in the raw stored data at all — this
 *    is what happens when the catalog gains a new optional section type
 *    after a business's config was already saved (e.g. `socialLinks`), so
 *    it appears using the catalog's `defaultEnabled` rather than staying
 *    invisible forever. A type that WAS present in the raw data but got
 *    dropped by steps 2–4 (malformed / unsupported variant) is left absent
 *    — that's a deliberate safety drop, not something to silently
 *    resurrect with defaults. Required sections are always backfilled
 *    regardless, and forced back to `enabled: true` if somehow stored as
 *    disabled.
 * 6. Sort by `order` ascending.
 */
export function resolveStoredOrDefaultSections(
  stored: WebsiteSectionsConfig | undefined,
): WebsiteSectionConfig[] {
  const usableStored =
    stored && Array.isArray(stored.sections) && stored.sectionConfigVersion <= SECTION_CONFIG_VERSION
      ? stored.sections
      : createDefaultWebsiteSectionsConfig().sections;

  const presentInRaw = new Set<string>(
    usableStored
      .map((s) => (s as { component?: unknown }).component)
      .filter((c): c is string => typeof c === 'string'),
  );

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

  const requiredTypes = REQUIRED_SECTION_TYPES as readonly string[];
  for (const type of WEBSITE_SECTION_TYPES) {
    const existingIndex = cleaned.findIndex((s) => s.component === type);
    const isRequired = requiredTypes.includes(type);
    if (existingIndex === -1) {
      if (isRequired || !presentInRaw.has(type)) {
        const catalogEntry = WEBSITE_SECTION_CATALOG[type];
        cleaned.push({
          component: type,
          enabled: isRequired ? true : catalogEntry.defaultEnabled,
          order: catalogEntry.defaultOrder,
          variant: catalogEntry.defaultVariant,
        });
      }
    } else if (isRequired && !cleaned[existingIndex].enabled) {
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

/**
 * Forces one section on in a business's resolved configuration, overriding
 * even an explicitly-stored `enabled: false` — `resolveStoredOrDefaultSections`
 * on its own only ever backfills a section that was never stored at all, so
 * it can't be relied on to turn a previously-disabled section back on.
 *
 * Used as a "dual-write on population" step (matching the existing theme/
 * photo/CTA precedent — see architecture.md) whenever real Google reviews
 * get attached to a business: the Testimonials section should "just show up"
 * rather than requiring a separate manual admin toggle.
 */
export function enableWebsiteSection(
  business: Pick<Business, 'websiteSections'>,
  sectionType: WebsiteSectionType,
): WebsiteSectionsConfig {
  const sections = resolveStoredOrDefaultSections(business.websiteSections).map((s) =>
    s.component === sectionType ? { ...s, enabled: true } : s,
  );
  return WebsiteSectionsConfigSchema.parse({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections });
}
