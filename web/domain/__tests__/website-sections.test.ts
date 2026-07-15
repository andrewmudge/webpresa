import { describe, it, expect } from 'vitest';
import {
  WEBSITE_SECTION_TYPES,
  REQUIRED_SECTION_TYPES,
  WEBSITE_SECTION_CATALOG,
  SECTION_CONFIG_VERSION,
} from '@/domain/constants/website-sections';
import { WebsiteSectionConfigSchema, WebsiteSectionsConfigSchema } from '@/domain/schemas/website-sections.schema';
import { createDefaultWebsiteSectionsConfig } from '@/domain/factories/website-sections.factory';
import { BusinessSchema } from '@/domain/schemas/business.schema';
import { createBusiness } from '@/domain/factories/business.factory';
import type { WebsiteSectionConfig } from '@/domain/models/website-sections';

function validSections(overrides: Partial<Record<string, Partial<WebsiteSectionConfig>>> = {}): WebsiteSectionConfig[] {
  return WEBSITE_SECTION_TYPES.map((type) => {
    const entry = WEBSITE_SECTION_CATALOG[type];
    return {
      component: type,
      enabled: entry.defaultEnabled,
      order: entry.defaultOrder,
      variant: entry.defaultVariant,
      ...(overrides[type] ?? {}),
    };
  });
}

describe('createDefaultWebsiteSectionsConfig', () => {
  it('includes every required section, enabled', () => {
    const config = createDefaultWebsiteSectionsConfig();
    for (const required of REQUIRED_SECTION_TYPES) {
      const entry = config.sections.find((s) => s.component === required);
      expect(entry).toBeDefined();
      expect(entry?.enabled).toBe(true);
    }
  });

  it('includes all catalog sections exactly once', () => {
    const config = createDefaultWebsiteSectionsConfig();
    expect(config.sections).toHaveLength(WEBSITE_SECTION_TYPES.length);
    const types = config.sections.map((s) => s.component);
    expect(new Set(types).size).toBe(WEBSITE_SECTION_TYPES.length);
  });

  it('enables the sections the pre-existing fixed template always attempted to render', () => {
    const config = createDefaultWebsiteSectionsConfig();
    const enabled = new Set(config.sections.filter((s) => s.enabled).map((s) => s.component));
    for (const type of ['header', 'hero', 'trustStrip', 'services', 'whyChooseUs', 'about', 'serviceAreas', 'ctaBanner', 'contact', 'footer']) {
      expect(enabled.has(type as WebsiteSectionConfig['component'])).toBe(true);
    }
  });

  it('disables newly-introduced sections with no data source yet', () => {
    const config = createDefaultWebsiteSectionsConfig();
    const enabled = new Set(config.sections.filter((s) => s.enabled).map((s) => s.component));
    for (const type of ['reviews', 'testimonials', 'gallery', 'faq', 'process']) {
      expect(enabled.has(type as WebsiteSectionConfig['component'])).toBe(false);
    }
  });

  it('sets the current schema version', () => {
    expect(createDefaultWebsiteSectionsConfig().sectionConfigVersion).toBe(SECTION_CONFIG_VERSION);
  });

  it('passes strict schema validation', () => {
    expect(() => WebsiteSectionsConfigSchema.parse(createDefaultWebsiteSectionsConfig())).not.toThrow();
  });
});

describe('WebsiteSectionConfigSchema', () => {
  it('accepts a valid entry', () => {
    expect(() =>
      WebsiteSectionConfigSchema.parse({ component: 'hero', enabled: true, order: 10, variant: 'default' }),
    ).not.toThrow();
  });

  it('rejects an unsupported component identifier', () => {
    expect(() =>
      WebsiteSectionConfigSchema.parse({ component: 'customJsxInjection', enabled: true, order: 10, variant: 'default' }),
    ).toThrow();
  });

  it('rejects an unsupported variant for a known component', () => {
    expect(() =>
      WebsiteSectionConfigSchema.parse({ component: 'hero', enabled: true, order: 10, variant: 'nonexistent-variant' }),
    ).toThrow();
  });

  it('rejects a negative order value', () => {
    expect(() =>
      WebsiteSectionConfigSchema.parse({ component: 'hero', enabled: true, order: -1, variant: 'default' }),
    ).toThrow();
  });

  it('rejects a non-integer order value', () => {
    expect(() =>
      WebsiteSectionConfigSchema.parse({ component: 'hero', enabled: true, order: 1.5, variant: 'default' }),
    ).toThrow();
  });
});

describe('WebsiteSectionsConfigSchema', () => {
  it('accepts a fully valid configuration', () => {
    expect(() =>
      WebsiteSectionsConfigSchema.parse({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections: validSections() }),
    ).not.toThrow();
  });

  it('rejects a configuration missing a required section', () => {
    const sections = validSections().filter((s) => s.component !== 'contact');
    expect(() =>
      WebsiteSectionsConfigSchema.parse({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections }),
    ).toThrow();
  });

  it('rejects a configuration with a disabled required section', () => {
    const sections = validSections({ footer: { enabled: false } });
    expect(() =>
      WebsiteSectionsConfigSchema.parse({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections }),
    ).toThrow();
  });

  it('rejects duplicate section entries for the same component', () => {
    const sections = [...validSections(), { component: 'hero' as const, enabled: true, order: 999, variant: 'default' }];
    expect(() =>
      WebsiteSectionsConfigSchema.parse({ sectionConfigVersion: SECTION_CONFIG_VERSION, sections }),
    ).toThrow();
  });

  it('rejects an unsupported (future) configuration version', () => {
    expect(() =>
      WebsiteSectionsConfigSchema.parse({ sectionConfigVersion: SECTION_CONFIG_VERSION + 1, sections: validSections() }),
    ).toThrow();
  });
});

describe('Business — websiteSections field', () => {
  it('is optional — an existing business record is valid without it', () => {
    const business = createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' });
    expect(() => BusinessSchema.parse(business)).not.toThrow();
    expect(business.websiteSections).toBeUndefined();
  });

  it('validates a business with a stored section configuration', () => {
    const business = {
      ...createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' }),
      websiteSections: createDefaultWebsiteSectionsConfig(),
    };
    expect(() => BusinessSchema.parse(business)).not.toThrow();
  });

  it('rejects a business with an invalid stored section configuration', () => {
    const business = {
      ...createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' }),
      websiteSections: { sectionConfigVersion: 1, sections: [] },
    };
    expect(() => BusinessSchema.parse(business)).toThrow();
  });
});
