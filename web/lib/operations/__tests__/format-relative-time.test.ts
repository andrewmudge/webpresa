import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../format-relative-time';

describe('formatRelativeTime', () => {
  it('returns "just now" for under a minute', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('just now');
  });

  it('formats minutes', () => {
    const iso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso)).toBe('5 minutes ago');
  });

  it('formats singular minute', () => {
    const iso = new Date(Date.now() - 1 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso)).toBe('1 minute ago');
  });

  it('formats hours', () => {
    const iso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso)).toBe('3 hours ago');
  });

  it('formats days', () => {
    const iso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso)).toBe('2 days ago');
  });
});
