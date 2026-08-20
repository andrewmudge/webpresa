import { describe, it, expect } from 'vitest';
import { resolveIsIndexable } from '../indexability';

describe('resolveIsIndexable', () => {
  it('is indexable only for a customer (an active paying subscription)', () => {
    expect(resolveIsIndexable({ status: 'customer' })).toBe(true);
  });

  it.each(['pending', 'outreach', 'engaged', 'claimed', 'cancelled'] as const)(
    'is not indexable for status %s',
    (status) => {
      expect(resolveIsIndexable({ status })).toBe(false);
    },
  );

  it('is not indexable when the business is null or undefined', () => {
    expect(resolveIsIndexable(null)).toBe(false);
    expect(resolveIsIndexable(undefined)).toBe(false);
  });
});
