import { describe, it, expect } from 'vitest';
import { classifySocialPlatform, isSocialLink } from '../social-links';

describe('classifySocialPlatform', () => {
  it('classifies known platforms by hostname', () => {
    expect(classifySocialPlatform('https://www.facebook.com/acmeplumbing')).toBe('facebook');
    expect(classifySocialPlatform('https://instagram.com/acmeplumbing')).toBe('instagram');
    expect(classifySocialPlatform('https://x.com/acmeplumbing')).toBe('x');
    expect(classifySocialPlatform('https://twitter.com/acmeplumbing')).toBe('x');
    expect(classifySocialPlatform('https://www.linkedin.com/company/acme')).toBe('linkedin');
    expect(classifySocialPlatform('https://youtube.com/@acme')).toBe('youtube');
    expect(classifySocialPlatform('https://www.yelp.com/biz/acme-plumbing')).toBe('yelp');
    expect(classifySocialPlatform('https://www.tiktok.com/@acme')).toBe('tiktok');
  });

  it('classifies an unrecognized host as other', () => {
    expect(classifySocialPlatform('https://acmeplumbing.com')).toBe('other');
  });

  it('classifies a malformed URL as other rather than throwing', () => {
    expect(classifySocialPlatform('not a url')).toBe('other');
  });
});

describe('isSocialLink', () => {
  it('returns true for a recognized social/review domain', () => {
    expect(isSocialLink('https://www.facebook.com/acmeplumbing')).toBe(true);
    expect(isSocialLink('https://www.yelp.com/biz/acme')).toBe(true);
  });

  it('returns false for a generic business domain', () => {
    expect(isSocialLink('https://acmeplumbing.com/about')).toBe(false);
  });

  it('returns false for a malformed URL', () => {
    expect(isSocialLink('not a url')).toBe(false);
  });
});
