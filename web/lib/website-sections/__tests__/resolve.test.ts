import { describe, it, expect } from 'vitest';
import { resolveStoredOrDefaultSections, resolveRenderableSections, resolveSectionWarnings } from '../resolve';
import { createDefaultWebsiteSectionsConfig } from '@/domain/factories/website-sections.factory';
import { WEBSITE_SECTION_TYPES, SECTION_CONFIG_VERSION } from '@/domain/constants/website-sections';
import type { WebsiteSectionsConfig, WebsiteSectionConfig } from '@/domain/models/website-sections';
import type { WebsiteSectionType } from '@/domain/constants/website-sections';

function fullyAvailable(): Record<WebsiteSectionType, boolean> {
  return Object.fromEntries(WEBSITE_SECTION_TYPES.map((t) => [t, true])) as Record<WebsiteSectionType, boolean>;
}

function noneAvailable(): Record<WebsiteSectionType, boolean> {
  return Object.fromEntries(WEBSITE_SECTION_TYPES.map((t) => [t, false])) as Record<WebsiteSectionType, boolean>;
}

describe('resolveStoredOrDefaultSections', () => {
  it('falls back to the computed default when configuration is absent', () => {
    const resolved = resolveStoredOrDefaultSections(undefined);
    expect(resolved).toEqual(createDefaultWebsiteSectionsConfig().sections.sort((a, b) => a.order - b.order));
  });

  it('falls back to the default when the stored version is newer than supported', () => {
    const future: WebsiteSectionsConfig = {
      sectionConfigVersion: SECTION_CONFIG_VERSION + 5,
      sections: createDefaultWebsiteSectionsConfig().sections,
    };
    const resolved = resolveStoredOrDefaultSections(future);
    expect(resolved.length).toBe(WEBSITE_SECTION_TYPES.length);
  });

  it('drops an individually malformed entry but keeps the rest', () => {
    const stored: WebsiteSectionsConfig = {
      sectionConfigVersion: SECTION_CONFIG_VERSION,
      sections: [
        ...createDefaultWebsiteSectionsConfig().sections,
        { component: 'notARealSection', enabled: true, order: 5, variant: 'default' } as unknown as WebsiteSectionConfig,
      ],
    };
    const resolved = resolveStoredOrDefaultSections(stored);
    expect(resolved.some((s) => s.component === ('notARealSection' as never))).toBe(false);
    expect(resolved.length).toBe(WEBSITE_SECTION_TYPES.length);
  });

  it('drops an entry with an unsupported variant for its component', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.map((s) =>
      s.component === 'gallery' ? { ...s, variant: 'carousel-3d' } : s,
    );
    const resolved = resolveStoredOrDefaultSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections });
    // Dropped entirely rather than kept with a bad variant — gallery isn't required, so it's simply absent.
    expect(resolved.find((s) => s.component === 'gallery')).toBeUndefined();
  });

  it('deduplicates entries for the same component, keeping the first occurrence', () => {
    const defaults = createDefaultWebsiteSectionsConfig().sections;
    const sections = [...defaults, { component: 'hero' as const, enabled: false, order: 999, variant: 'default' }];
    const resolved = resolveStoredOrDefaultSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections });
    const heroEntries = resolved.filter((s) => s.component === 'hero');
    expect(heroEntries).toHaveLength(1);
    expect(heroEntries[0].enabled).toBe(true);
  });

  it('backfills a missing required section from the catalog', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.filter((s) => s.component !== 'footer');
    const resolved = resolveStoredOrDefaultSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections });
    const footer = resolved.find((s) => s.component === 'footer');
    expect(footer).toBeDefined();
    expect(footer?.enabled).toBe(true);
  });

  it('backfills an optional section type that never existed in the stored data (catalog added after config was saved)', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.filter((s) => s.component !== 'socialLinks');
    const resolved = resolveStoredOrDefaultSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections });
    const socialLinks = resolved.find((s) => s.component === 'socialLinks');
    expect(socialLinks).toBeDefined();
    expect(socialLinks?.enabled).toBe(true);
  });

  it('forces a stored-disabled required section back to enabled', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.map((s) =>
      s.component === 'contact' ? { ...s, enabled: false } : s,
    );
    const resolved = resolveStoredOrDefaultSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections });
    expect(resolved.find((s) => s.component === 'contact')?.enabled).toBe(true);
  });

  it('sorts the resolved sections by order ascending', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.map((s) =>
      s.component === 'footer' ? { ...s, order: 1 } : s,
    );
    const resolved = resolveStoredOrDefaultSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections });
    expect(resolved[0].component).toBe('footer');
  });
});

describe('resolveRenderableSections', () => {
  it('excludes disabled sections', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.map((s) =>
      s.component === 'trustStrip' ? { ...s, enabled: false } : s,
    );
    const renderable = resolveRenderableSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections }, fullyAvailable());
    expect(renderable.some((s) => s.component === 'trustStrip')).toBe(false);
  });

  it('excludes an enabled optional section whose content is unavailable', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.map((s) =>
      s.component === 'gallery' ? { ...s, enabled: true } : s,
    );
    const renderable = resolveRenderableSections({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections }, noneAvailable());
    expect(renderable.some((s) => s.component === 'gallery')).toBe(false);
  });

  it('always includes required sections regardless of availability', () => {
    const renderable = resolveRenderableSections(undefined, noneAvailable());
    expect(renderable.map((s) => s.component)).toEqual(
      expect.arrayContaining(['header', 'hero', 'services', 'contact', 'footer']),
    );
  });

  it('renders enabled+available sections in ascending order', () => {
    const renderable = resolveRenderableSections(undefined, fullyAvailable());
    const orders = renderable.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe('resolveSectionWarnings', () => {
  it('flags an enabled optional section with unavailable content', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.map((s) =>
      s.component === 'whyChooseUs' ? { ...s, enabled: true } : s,
    );
    const warnings = resolveSectionWarnings(sections, noneAvailable());
    expect(warnings).toContain('whyChooseUs');
  });

  it('never flags required sections', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections;
    const warnings = resolveSectionWarnings(sections, noneAvailable());
    expect(warnings).not.toContain('contact');
  });

  it('does not flag a disabled section', () => {
    const sections = createDefaultWebsiteSectionsConfig().sections.map((s) =>
      s.component === 'gallery' ? { ...s, enabled: false } : s,
    );
    const warnings = resolveSectionWarnings(sections, noneAvailable());
    expect(warnings).not.toContain('gallery');
  });
});
