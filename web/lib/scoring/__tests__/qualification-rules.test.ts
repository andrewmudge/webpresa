import { describe, it, expect, vi } from 'vitest';
import type { Business } from '@/domain/models/business';

vi.mock('server-only', () => ({}));

import { applyQualificationOverrides } from '../qualification-rules';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'google_places',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('applyQualificationOverrides — no website', () => {
  it('always resolves to qualified when the business has no website, regardless of AI recommendation', () => {
    const business = makeBusiness({ websiteUrl: undefined });

    expect(applyQualificationOverrides({ business, aiQualification: 'reject' })).toBe('qualified');
    expect(applyQualificationOverrides({ business, aiQualification: 'manual_review' })).toBe('qualified');
  });

  it('treats a whitespace-only websiteUrl the same as no website', () => {
    const business = makeBusiness({ websiteUrl: '   ' });
    expect(applyQualificationOverrides({ business, aiQualification: 'reject' })).toBe('qualified');
  });
});

describe('applyQualificationOverrides — website unavailable', () => {
  it('forces manual_review when the Firecrawl scan failed as unreachable', () => {
    const business = makeBusiness({ websiteUrl: 'https://acmeplumbing.example.com' });
    expect(
      applyQualificationOverrides({ business, aiQualification: 'qualified', firecrawlFailureCategory: 'website_unreachable' }),
    ).toBe('manual_review');
  });

  it('forces manual_review for a blocked or invalid URL too', () => {
    const business = makeBusiness({ websiteUrl: 'https://acmeplumbing.example.com' });
    expect(applyQualificationOverrides({ business, aiQualification: 'qualified', firecrawlFailureCategory: 'blocked_url' })).toBe(
      'manual_review',
    );
    expect(applyQualificationOverrides({ business, aiQualification: 'qualified', firecrawlFailureCategory: 'invalid_url' })).toBe(
      'manual_review',
    );
  });

  it('forces manual_review when the target site returned an error response (e.g. a 403 block page)', () => {
    const business = makeBusiness({ websiteUrl: 'https://acmeplumbing.example.com' });
    expect(
      applyQualificationOverrides({ business, aiQualification: 'qualified', firecrawlFailureCategory: 'website_error_response' }),
    ).toBe('manual_review');
  });

  it('does not override for an unrelated failure category', () => {
    const business = makeBusiness({ websiteUrl: 'https://acmeplumbing.example.com' });
    expect(
      applyQualificationOverrides({ business, aiQualification: 'qualified', firecrawlFailureCategory: 'empty_content' }),
    ).toBe('qualified');
  });
});

describe('applyQualificationOverrides — no override applies', () => {
  it('passes through the AI recommendation unchanged', () => {
    const business = makeBusiness({ websiteUrl: 'https://acmeplumbing.example.com' });
    expect(applyQualificationOverrides({ business, aiQualification: 'reject' })).toBe('reject');
    expect(applyQualificationOverrides({ business, aiQualification: 'manual_review' })).toBe('manual_review');
    expect(applyQualificationOverrides({ business, aiQualification: 'qualified' })).toBe('qualified');
  });
});
