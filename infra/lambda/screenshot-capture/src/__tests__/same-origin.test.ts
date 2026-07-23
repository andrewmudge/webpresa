import { describe, it, expect } from 'vitest';
import { buildPreviewUrl, isWithinConfiguredOrigin } from '../same-origin';

describe('buildPreviewUrl', () => {
  it('builds a same-origin preview URL from the configured base + slug', () => {
    const result = buildPreviewUrl('https://app.webpresa.com', 'acme-plumbing');
    expect(result.ok).toBe(true);
    expect(result.url).toBe('https://app.webpresa.com/b/acme-plumbing');
  });

  it('URL-encodes a slug with unusual characters rather than letting it smuggle a path', () => {
    const result = buildPreviewUrl('https://app.webpresa.com', '../evil');
    expect(result.ok).toBe(true);
    expect(result.url).toBe('https://app.webpresa.com/b/..%2Fevil');
  });

  it('rejects a malformed app base URL', () => {
    const result = buildPreviewUrl('not-a-url', 'acme');
    expect(result.ok).toBe(false);
    expect(result.url).toBeUndefined();
  });
});

describe('isWithinConfiguredOrigin', () => {
  it('accepts a URL on the same origin', () => {
    expect(isWithinConfiguredOrigin('https://app.webpresa.com', 'https://app.webpresa.com/b/acme')).toBe(true);
  });

  it('rejects a URL on a different origin (e.g. an off-origin redirect)', () => {
    expect(isWithinConfiguredOrigin('https://app.webpresa.com', 'https://evil.example.com/b/acme')).toBe(false);
  });

  it('rejects a different scheme on the same host', () => {
    expect(isWithinConfiguredOrigin('https://app.webpresa.com', 'http://app.webpresa.com/b/acme')).toBe(false);
  });
});
