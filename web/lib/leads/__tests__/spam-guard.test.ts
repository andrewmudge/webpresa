import { describe, it, expect } from 'vitest';
import { isHoneypotTripped, isSubmittedTooFast, computeLeadFingerprint, MIN_FORM_FILL_MS } from '../spam-guard';

describe('isHoneypotTripped', () => {
  it('is false for an empty value — a real visitor never fills this field', () => {
    expect(isHoneypotTripped('')).toBe(false);
  });

  it('is false for a whitespace-only value', () => {
    expect(isHoneypotTripped('   ')).toBe(false);
  });

  it('is true for any non-empty value — a bot filled every field', () => {
    expect(isHoneypotTripped('https://spam.example')).toBe(true);
  });
});

describe('isSubmittedTooFast', () => {
  it('is true when submitted before the minimum fill time elapses', () => {
    const renderedAt = 1000;
    const now = renderedAt + MIN_FORM_FILL_MS - 1;
    expect(isSubmittedTooFast(String(renderedAt), now)).toBe(true);
  });

  it('is false once the minimum fill time has elapsed', () => {
    const renderedAt = 1000;
    const now = renderedAt + MIN_FORM_FILL_MS + 1;
    expect(isSubmittedTooFast(String(renderedAt), now)).toBe(false);
  });

  it('is true for a malformed/missing renderedAt value — treated as a bot, not trusted', () => {
    expect(isSubmittedTooFast('not-a-number')).toBe(true);
    expect(isSubmittedTooFast('')).toBe(true);
  });
});

describe('computeLeadFingerprint', () => {
  it('is deterministic for identical input', () => {
    const params = { businessId: 'biz_1', name: 'Jane Smith', email: 'jane@example.com' };
    expect(computeLeadFingerprint(params)).toBe(computeLeadFingerprint(params));
  });

  it('produces a 64-character hex string (SHA-256)', () => {
    const fingerprint = computeLeadFingerprint({ businessId: 'biz_1', name: 'Jane Smith', phone: '555-0100' });
    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is case- and whitespace-insensitive on name', () => {
    const a = computeLeadFingerprint({ businessId: 'biz_1', name: 'Jane Smith', email: 'jane@example.com' });
    const b = computeLeadFingerprint({ businessId: 'biz_1', name: '  JANE SMITH  ', email: 'jane@example.com' });
    expect(a).toBe(b);
  });

  it('differs across businesses for the same submitter — never suppresses a real lead for a different business', () => {
    const a = computeLeadFingerprint({ businessId: 'biz_1', name: 'Jane Smith', email: 'jane@example.com' });
    const b = computeLeadFingerprint({ businessId: 'biz_2', name: 'Jane Smith', email: 'jane@example.com' });
    expect(a).not.toBe(b);
  });

  it('prefers email over phone when both are supplied', () => {
    const withBoth = computeLeadFingerprint({ businessId: 'biz_1', name: 'Jane Smith', phone: '555-0100', email: 'jane@example.com' });
    const emailOnly = computeLeadFingerprint({ businessId: 'biz_1', name: 'Jane Smith', email: 'jane@example.com' });
    expect(withBoth).toBe(emailOnly);
  });
});
