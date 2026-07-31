import { describe, it, expect } from 'vitest';
import { normalizeDomainInput, isValidDomain, isReservedHost } from '@/lib/domains/normalize';

describe('normalizeDomainInput', () => {
  it('lowercases and strips protocol/path/query/trailing dot', () => {
    expect(normalizeDomainInput('HTTPS://CoastalPlumbing.com/some/path?x=1')).toBe('coastalplumbing.com');
    expect(normalizeDomainInput('coastalplumbing.com.')).toBe('coastalplumbing.com');
  });

  it('treats www. as an alias, not a separate record', () => {
    expect(normalizeDomainInput('www.coastalplumbing.com')).toBe('coastalplumbing.com');
  });

  it('trims whitespace', () => {
    expect(normalizeDomainInput('  coastalplumbing.com  ')).toBe('coastalplumbing.com');
  });
});

describe('isValidDomain', () => {
  it('accepts a normal domain', () => {
    expect(isValidDomain('coastalplumbing.com')).toBe(true);
    expect(isValidDomain('coastal-plumbing.co.uk')).toBe(true);
  });

  it('rejects a bare label, empty string, or path fragment', () => {
    expect(isValidDomain('coastalplumbing')).toBe(false);
    expect(isValidDomain('')).toBe(false);
    expect(isValidDomain('coastalplumbing.com/path')).toBe(false);
  });

  it('rejects an over-long domain', () => {
    expect(isValidDomain(`${'a'.repeat(250)}.com`)).toBe(false);
  });
});

describe('isReservedHost', () => {
  it('rejects the Webpresa hosts and localhost', () => {
    expect(isReservedHost('webpresa.com')).toBe(true);
    expect(isReservedHost('www.webpresa.com')).toBe(true);
    expect(isReservedHost('localhost')).toBe(true);
  });

  it('rejects Vercel preview hosts', () => {
    expect(isReservedHost('webpresa-git-dev-andrew.vercel.app')).toBe(true);
  });

  it('allows a genuine customer domain', () => {
    expect(isReservedHost('coastalplumbing.com')).toBe(false);
  });
});
