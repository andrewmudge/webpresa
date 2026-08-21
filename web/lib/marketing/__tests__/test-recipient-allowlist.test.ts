import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.mock('server-only', () => ({}));

const mockResolveRuntimeEnvironment = vi.hoisted(() => vi.fn());
vi.mock('@/lib/env/runtime-environment', () => ({ resolveRuntimeEnvironment: mockResolveRuntimeEnvironment }));

import { isNonProdRecipientAllowed } from '../test-recipient-allowlist';

const ORIGINAL_ALLOWLIST = process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST;

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveRuntimeEnvironment.mockReturnValue('preview');
  delete process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST;
});

afterAll(() => {
  if (ORIGINAL_ALLOWLIST === undefined) delete process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST;
  else process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST = ORIGINAL_ALLOWLIST;
});

describe('isNonProdRecipientAllowed', () => {
  it('always allows in production, regardless of the allowlist', () => {
    mockResolveRuntimeEnvironment.mockReturnValue('production');
    expect(isNonProdRecipientAllowed('anyone@example.com')).toBe(true);
  });

  it('denies every recipient outside production when the allowlist is unset', () => {
    expect(isNonProdRecipientAllowed('someone@example.com')).toBe(false);
  });

  it('allows an exact match', () => {
    process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST = 'me@example.com';
    expect(isNonProdRecipientAllowed('me@example.com')).toBe(true);
    expect(isNonProdRecipientAllowed('other@example.com')).toBe(false);
  });

  it('is case-insensitive', () => {
    process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST = 'Me@Example.com';
    expect(isNonProdRecipientAllowed('me@example.com')).toBe(true);
  });

  it('allows a domain-suffix match', () => {
    process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST = '@example.com';
    expect(isNonProdRecipientAllowed('anyone@example.com')).toBe(true);
    expect(isNonProdRecipientAllowed('anyone@other.com')).toBe(false);
  });

  it('supports multiple comma-separated entries', () => {
    process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST = 'a@example.com, @other.com';
    expect(isNonProdRecipientAllowed('a@example.com')).toBe(true);
    expect(isNonProdRecipientAllowed('x@other.com')).toBe(true);
    expect(isNonProdRecipientAllowed('b@example.com')).toBe(false);
  });

  it('a literal "*" disables the gate entirely — every recipient allowed', () => {
    process.env.MARKETING_TEST_RECIPIENT_ALLOWLIST = '*';
    expect(isNonProdRecipientAllowed('anyone@anywhere.com')).toBe(true);
  });
});
