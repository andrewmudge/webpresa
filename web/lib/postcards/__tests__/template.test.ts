import { describe, it, expect } from 'vitest';
import { resolvePostcardTemplateVariant } from '../template';

describe('resolvePostcardTemplateVariant', () => {
  it('is no_website when websiteUrl is absent', () => {
    expect(resolvePostcardTemplateVariant({ websiteUrl: undefined, adminPostcardTemplateOverride: undefined })).toBe('no_website');
  });

  it('is no_website when websiteUrl is blank', () => {
    expect(resolvePostcardTemplateVariant({ websiteUrl: '   ', adminPostcardTemplateOverride: undefined })).toBe('no_website');
  });

  it('is has_website when websiteUrl is set', () => {
    expect(resolvePostcardTemplateVariant({ websiteUrl: 'https://example.com', adminPostcardTemplateOverride: undefined })).toBe('has_website');
  });

  it('prefers the admin override over the computed default, in either direction', () => {
    expect(resolvePostcardTemplateVariant({ websiteUrl: 'https://example.com', adminPostcardTemplateOverride: 'no_website' })).toBe('no_website');
    expect(resolvePostcardTemplateVariant({ websiteUrl: undefined, adminPostcardTemplateOverride: 'has_website' })).toBe('has_website');
  });
});
