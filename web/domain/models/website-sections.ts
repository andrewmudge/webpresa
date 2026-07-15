import type { WebsiteSectionType } from '@/domain/constants/website-sections';

/**
 * Stored configuration for a single website section on a business's
 * generated preview. `component` is restricted to the fixed catalog in
 * `domain/constants/website-sections.ts` — never an arbitrary string,
 * component name, import path, or JSX.
 */
export interface WebsiteSectionConfig {
  component: WebsiteSectionType;
  enabled: boolean;
  /** Ascending sort position on the rendered page. */
  order: number;
  /** Must be one of the catalog's `variants` for this `component`. */
  variant: string;
}

/**
 * The full, versioned section configuration for a business. Persisted on
 * `Business.websiteSections` (see `domain/models/business.ts`) rather than
 * on any individual `SitePreview` — the layout choice is a business-level
 * setting an admin (and later a client) manages, independent of which
 * generated content snapshot happens to be live.
 */
export interface WebsiteSectionsConfig {
  /** See `SECTION_CONFIG_VERSION` — allows future catalog migrations. */
  sectionConfigVersion: number;
  sections: WebsiteSectionConfig[];
}
