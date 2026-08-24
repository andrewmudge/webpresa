import { describe, it, expect } from 'vitest';
import { safeCustomerRedirectPath } from '../safe-redirect';

describe('safeCustomerRedirectPath', () => {
  it('allows an /account path', () => {
    expect(safeCustomerRedirectPath('/account/claim-status')).toBe('/account/claim-status');
  });

  it('allows an /app path', () => {
    expect(safeCustomerRedirectPath('/app/businesses/biz_1')).toBe('/app/businesses/biz_1');
  });

  it('falls back to /app for an external URL — no open redirect', () => {
    expect(safeCustomerRedirectPath('https://evil.example/phish')).toBe('/app');
  });

  it('falls back to /app for a protocol-relative URL', () => {
    expect(safeCustomerRedirectPath('//evil.example/phish')).toBe('/app');
  });

  it('falls back to /app for an unrelated internal path', () => {
    expect(safeCustomerRedirectPath('/admin')).toBe('/app');
  });

  it('falls back to /app for null', () => {
    expect(safeCustomerRedirectPath(null)).toBe('/app');
  });

  it('falls back to /app for undefined', () => {
    expect(safeCustomerRedirectPath(undefined)).toBe('/app');
  });

  it('falls back to /app for an empty string', () => {
    expect(safeCustomerRedirectPath('')).toBe('/app');
  });
});
