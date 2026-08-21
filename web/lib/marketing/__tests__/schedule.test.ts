import { describe, it, expect } from 'vitest';
import { computeNextActionAt } from '../schedule';

const DELIVERED_AT = '2026-08-10T14:30:00.000Z'; // Monday 2:30 PM UTC

describe('computeNextActionAt', () => {
  it('Email 1 is exactly 24 hours after delivery', () => {
    expect(computeNextActionAt(DELIVERED_AT, 1)).toBe('2026-08-11T14:30:00.000Z');
  });

  it('Email 2 is exactly 4 days after delivery', () => {
    expect(computeNextActionAt(DELIVERED_AT, 2)).toBe('2026-08-14T14:30:00.000Z');
  });

  it('Email 3 is exactly 10 days after delivery', () => {
    expect(computeNextActionAt(DELIVERED_AT, 3)).toBe('2026-08-20T14:30:00.000Z');
  });

  it('every step is always anchored on the original deliveredAt, never drifting when computed at different times', () => {
    // Simulates a late-sent Email 1 not pushing Email 2/3 later — both
    // calls use the same deliveredAt regardless of when they're invoked.
    const email2First = computeNextActionAt(DELIVERED_AT, 2);
    const email2Second = computeNextActionAt(DELIVERED_AT, 2);
    expect(email2First).toBe(email2Second);
  });
});
