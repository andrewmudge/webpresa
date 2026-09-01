import { describe, it, expect } from 'vitest';
import { getDefaultSectionImage } from '@/lib/image/default-section-images';

describe('getDefaultSectionImage', () => {
  it('returns the curated plumbing default for each slot', () => {
    expect(getDefaultSectionImage('plumbing', 'about')).toBe('/default-images/plumb3.jpg');
    expect(getDefaultSectionImage('plumbing', 'whyChooseUs')).toBe('/default-images/plumb2.jpg');
    expect(getDefaultSectionImage('plumbing', 'featuredService')).toBe('/default-images/plumb1.jpg');
  });

  it('returns undefined for an industry with no default images configured', () => {
    expect(getDefaultSectionImage('hvac', 'about')).toBeUndefined();
    expect(getDefaultSectionImage('hvac', 'whyChooseUs')).toBeUndefined();
    expect(getDefaultSectionImage('hvac', 'featuredService')).toBeUndefined();
  });
});
