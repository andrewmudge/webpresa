import { describe, it, expect } from 'vitest';
import { getScanTypeLabel, getScanTypeColorClass } from '../scan-type';

describe('getScanTypeLabel', () => {
  it('labels a Firecrawl scrape as Website Enrichment', () => {
    expect(getScanTypeLabel({ provider: 'firecrawl', operation: 'scrape' })).toBe('Website Enrichment');
  });

  it('labels an OpenAI score as AI Scoring', () => {
    expect(getScanTypeLabel({ provider: 'openai', operation: 'score' })).toBe('AI Scoring');
  });

  it('labels a Playwright screenshot of the existing site', () => {
    expect(
      getScanTypeLabel({ provider: 'playwright', operation: 'screenshot', targetType: 'existing_site' }),
    ).toBe('Screenshot — Existing Site');
  });

  it('labels a Playwright screenshot of a generated preview', () => {
    expect(
      getScanTypeLabel({ provider: 'playwright', operation: 'screenshot', targetType: 'generated_preview' }),
    ).toBe('Screenshot — Generated Preview');
  });

  it('falls back to a plain provider/operation label when targetType is absent', () => {
    expect(getScanTypeLabel({ provider: 'playwright', operation: 'screenshot' })).toBe('Screenshot');
  });

  it('falls back to a generic label for an unrecognized provider/operation pair', () => {
    expect(getScanTypeLabel({ provider: 'firecrawl', operation: 'score' })).toBe('firecrawl · score');
  });
});

describe('getScanTypeColorClass', () => {
  it('returns a distinct color class per known scan type', () => {
    const firecrawl = getScanTypeColorClass({ provider: 'firecrawl', operation: 'scrape' });
    const openai = getScanTypeColorClass({ provider: 'openai', operation: 'score' });
    const playwright = getScanTypeColorClass({ provider: 'playwright', operation: 'screenshot' });

    expect(new Set([firecrawl, openai, playwright]).size).toBe(3);
  });

  it('returns a fallback color class for an unrecognized pair', () => {
    expect(getScanTypeColorClass({ provider: 'openai', operation: 'scrape' })).toBe('bg-gray-50 text-gray-600');
  });
});
