import { describe, it, expect } from 'vitest';

import { createBusiness } from '@/domain/factories/business.factory';
import { createSitePreview } from '@/domain/factories/site-preview.factory';
import { createScanEvent } from '@/domain/factories/scan-event.factory';
import { createPostcard } from '@/domain/factories/postcard.factory';

import { BusinessSchema, BusinessScoresSchema } from '@/domain/schemas/business.schema';
import { PreviewContentSchema, SitePreviewSchema } from '@/domain/schemas/site-preview.schema';
import { ScanEventSchema } from '@/domain/schemas/scan-event.schema';
import { PostcardSchema } from '@/domain/schemas/postcard.schema';

import type { PreviewContent, PreviewTheme } from '@/domain/models/site-preview';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const validContent: PreviewContent = {
  hero: {
    headline: 'Reliable Plumbing, Done Right',
    subheadline: 'Emergency repairs and scheduled service across Austin, TX.',
    ctaText: 'Get a Free Quote',
  },
  services: [
    { name: 'Drain Repair', description: 'Fast diagnosis and repair for blocked or slow drains.' },
    { name: 'Water Heater Installation', description: 'Same-day installation on all major brands.' },
  ],
  tagline: 'Austin\'s most trusted local plumber.',
  aboutText: 'Family-owned and operated since 2003. We treat your home like our own.',
  contact: { phone: '512-555-0100', email: 'hello@cityplumbing.com' },
};

const validTheme: PreviewTheme = {
  primaryColor: '#11455E',
  accentColor: '#CE9059',
  fontFamily: 'Inter',
};

// ---------------------------------------------------------------------------
// 1. Unique IDs
// ---------------------------------------------------------------------------

describe('unique IDs', () => {
  it('two Business records get different businessIds', () => {
    const a = createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' });
    const b = createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' });
    expect(a.businessId).not.toBe(b.businessId);
  });

  it('two SitePreview records get different previewIds', () => {
    const biz = createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' });
    const p1 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const p2 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    expect(p1.previewId).not.toBe(p2.previewId);
  });

  it('two ScanEvent records get different scanIds', () => {
    const biz = createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' });
    const s1 = createScanEvent({ businessId: biz.businessId, sourceUrl: 'https://example.com' });
    const s2 = createScanEvent({ businessId: biz.businessId, sourceUrl: 'https://example.com' });
    expect(s1.scanId).not.toBe(s2.scanId);
  });

  it('two Postcard records get different postcardIds', () => {
    const biz = createBusiness({ name: 'Acme Plumbing', industry: 'plumbing' });
    const preview = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const pc1 = createPostcard({ businessId: biz.businessId, previewId: preview.previewId, provider: 'lob', campaignCode: 'CAMP001', qrDestination: 'https://webpresa.com/preview/abc' });
    const pc2 = createPostcard({ businessId: biz.businessId, previewId: preview.previewId, provider: 'lob', campaignCode: 'CAMP001', qrDestination: 'https://webpresa.com/preview/abc' });
    expect(pc1.postcardId).not.toBe(pc2.postcardId);
  });
});

// ---------------------------------------------------------------------------
// 2. createdAt is set
// ---------------------------------------------------------------------------

describe('createdAt is always set', () => {
  it('Business has createdAt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'hvac' });
    expect(biz.createdAt).toBeTruthy();
    expect(() => new Date(biz.createdAt)).not.toThrow();
  });

  it('SitePreview has createdAt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'hvac' });
    const p = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    expect(p.createdAt).toBeTruthy();
  });

  it('ScanEvent has createdAt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'hvac' });
    const s = createScanEvent({ businessId: biz.businessId, sourceUrl: 'https://example.com' });
    expect(s.createdAt).toBeTruthy();
  });

  it('Postcard has createdAt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'hvac' });
    const p = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const pc = createPostcard({ businessId: biz.businessId, previewId: p.previewId, provider: 'lob', campaignCode: 'C1', qrDestination: 'https://webpresa.com/p/1' });
    expect(pc.createdAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 3. updatedAt is set (all domain records are mutable)
// ---------------------------------------------------------------------------

describe('updatedAt is always set', () => {
  it('Business has updatedAt equal to createdAt on creation', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'electrical' });
    expect(biz.updatedAt).toBeTruthy();
    expect(biz.updatedAt).toBe(biz.createdAt);
  });

  it('SitePreview has updatedAt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'electrical' });
    const p = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    expect(p.updatedAt).toBeTruthy();
  });

  it('ScanEvent has updatedAt', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'electrical' });
    const s = createScanEvent({ businessId: biz.businessId, sourceUrl: 'https://acme.com' });
    expect(s.updatedAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4. Status values reject invalid strings
// ---------------------------------------------------------------------------

describe('status validation', () => {
  it('BusinessSchema rejects an invalid status string', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const result = BusinessSchema.safeParse({ ...biz, status: 'live' });
    expect(result.success).toBe(false);
  });

  it('SitePreviewSchema rejects an invalid status string', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const p = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const result = SitePreviewSchema.safeParse({ ...p, status: 'live' });
    expect(result.success).toBe(false);
  });

  it('ScanEventSchema rejects an invalid status string', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const s = createScanEvent({ businessId: biz.businessId, sourceUrl: 'https://acme.com' });
    const result = ScanEventSchema.safeParse({ ...s, status: 'done' });
    expect(result.success).toBe(false);
  });

  it('PostcardSchema rejects an invalid status string', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const p = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const pc = createPostcard({ businessId: biz.businessId, previewId: p.previewId, provider: 'lob', campaignCode: 'C1', qrDestination: 'https://webpresa.com/p/1' });
    const result = PostcardSchema.safeParse({ ...pc, status: 'sent' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Score validation
// ---------------------------------------------------------------------------

describe('score validation', () => {
  it('rejects a score above 100', () => {
    const result = BusinessScoresSchema.safeParse({ overall: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects a score below 0', () => {
    const result = BusinessScoresSchema.safeParse({ overall: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts scores of exactly 0 and 100', () => {
    expect(BusinessScoresSchema.safeParse({ overall: 0, design: 100 }).success).toBe(true);
  });

  it('rejects a non-integer score', () => {
    const result = BusinessScoresSchema.safeParse({ overall: 87.5 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Business is valid without a websiteUrl
// ---------------------------------------------------------------------------

describe('Business — optional fields', () => {
  it('is valid without a websiteUrl', () => {
    const biz = createBusiness({ name: 'No Website Co', industry: 'cleaning' });
    expect(biz.websiteUrl).toBeUndefined();
    expect(() => BusinessSchema.parse(biz)).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 7. Business is valid without a googlePlaceId
  // ---------------------------------------------------------------------------

  it('is valid without a googlePlaceId', () => {
    const biz = createBusiness({ name: 'No Maps Co', industry: 'restaurant' });
    expect(biz.googlePlaceId).toBeUndefined();
    expect(() => BusinessSchema.parse(biz)).not.toThrow();
  });

  it('is valid with both websiteUrl and googlePlaceId absent simultaneously', () => {
    const biz = createBusiness({ name: 'Minimal Co', industry: 'bakery' });
    const result = BusinessSchema.safeParse(biz);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Malformed AI preview content is rejected
// ---------------------------------------------------------------------------

describe('PreviewContent validation — AI output guard', () => {
  it('rejects content with a missing hero.headline', () => {
    const bad = {
      hero: { subheadline: 'Sub', ctaText: 'Click' }, // headline missing
      services: [{ name: 'Service A', description: 'Desc' }],
      tagline: 'Tag',
      aboutText: 'About',
      contact: {},
    };
    const result = PreviewContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects content with an empty services array', () => {
    const bad = { ...validContent, services: [] };
    const result = PreviewContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects content with a headline that exceeds 120 characters', () => {
    const bad = {
      ...validContent,
      hero: { ...validContent.hero, headline: 'A'.repeat(121) },
    };
    const result = PreviewContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects content with an invalid theme color format', () => {
    const biz = createBusiness({ name: 'Acme', industry: 'plumbing' });
    const badTheme: PreviewTheme = { ...validTheme, primaryColor: 'navy' };
    expect(() =>
      createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: badTheme })
    ).toThrow();
  });

  it('accepts valid structured content', () => {
    expect(PreviewContentSchema.safeParse(validContent).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. Preview versions coexist for one business
// ---------------------------------------------------------------------------

describe('SitePreview versioning', () => {
  it('first preview gets version 1', () => {
    const biz = createBusiness({ name: 'Versioned Co', industry: 'salon' });
    const v1 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    expect(v1.version).toBe(1);
  });

  it('regenerated preview gets version 2 with a new previewId', () => {
    const biz = createBusiness({ name: 'Versioned Co', industry: 'salon' });
    const v1 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const v2 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme, previousVersion: v1.version });
    expect(v2.version).toBe(2);
    expect(v2.previewId).not.toBe(v1.previewId);
    expect(v2.businessId).toBe(v1.businessId);
  });

  it('multiple previews for one business all share the same businessId', () => {
    const biz = createBusiness({ name: 'Multi-Preview Co', industry: 'law_firm' });
    const v1 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const v2 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme, previousVersion: v1.version });
    const v3 = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme, previousVersion: v2.version });
    expect(v1.businessId).toBe(biz.businessId);
    expect(v2.businessId).toBe(biz.businessId);
    expect(v3.businessId).toBe(biz.businessId);
    expect(v3.version).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 10. ID prefix format
// ---------------------------------------------------------------------------

describe('ID prefix format', () => {
  it('Business ID starts with biz_', () => {
    const biz = createBusiness({ name: 'Prefix Test', industry: 'accounting' });
    expect(biz.businessId).toMatch(/^biz_/);
  });

  it('SitePreview ID starts with preview_', () => {
    const biz = createBusiness({ name: 'Prefix Test', industry: 'accounting' });
    const p = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    expect(p.previewId).toMatch(/^preview_/);
  });

  it('ScanEvent ID starts with scan_', () => {
    const biz = createBusiness({ name: 'Prefix Test', industry: 'accounting' });
    const s = createScanEvent({ businessId: biz.businessId, sourceUrl: 'https://prefix-test.com' });
    expect(s.scanId).toMatch(/^scan_/);
  });

  it('Postcard ID starts with postcard_', () => {
    const biz = createBusiness({ name: 'Prefix Test', industry: 'accounting' });
    const p = createSitePreview({ businessId: biz.businessId, templateId: 't1', content: validContent, theme: validTheme });
    const pc = createPostcard({ businessId: biz.businessId, previewId: p.previewId, provider: 'lob', campaignCode: 'C1', qrDestination: 'https://webpresa.com/p/1' });
    expect(pc.postcardId).toMatch(/^postcard_/);
  });
});
