import { describe, it, expect } from 'vitest';
import { resolveFaviconIcons } from '../favicon-icons';

describe('resolveFaviconIcons', () => {
  it('uses faviconUrl when set, with type/sizes', () => {
    expect(resolveFaviconIcons({ faviconUrl: '/api/assets/businesses/biz_1/assets/favicon.png', logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' })).toEqual({
      icon: [{ url: '/api/assets/businesses/biz_1/assets/favicon.png', type: 'image/png', sizes: '256x256' }],
    });
  });

  it('falls back to the raw logoUrl when no faviconUrl exists yet', () => {
    expect(resolveFaviconIcons({ logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' })).toEqual({
      icon: [{ url: '/api/assets/businesses/biz_1/assets/logo.png' }],
    });
  });

  it('returns undefined when neither exists', () => {
    expect(resolveFaviconIcons({})).toBeUndefined();
  });

  it('returns undefined when the business is null or undefined', () => {
    expect(resolveFaviconIcons(null)).toBeUndefined();
    expect(resolveFaviconIcons(undefined)).toBeUndefined();
  });
});
