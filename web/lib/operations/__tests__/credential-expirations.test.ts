import { describe, it, expect } from 'vitest';
import { getUpcomingCredentialExpirations } from '../credential-expirations';

describe('getUpcomingCredentialExpirations', () => {
  it('returns nothing when the credential is well outside the warning window', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(getUpcomingCredentialExpirations('production', now)).toEqual([]);
  });

  it('warns once within the 30-day window', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    const result = getUpcomingCredentialExpirations('production', now);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'Vercel API token', expiresAt: '2026-10-29' });
    expect(result[0].daysRemaining).toBeGreaterThan(0);
    expect(result[0].daysRemaining).toBeLessThanOrEqual(30);
  });

  it('preview (the dev deployment) and production share the same credential list', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    expect(getUpcomingCredentialExpirations('preview', now)).toEqual(getUpcomingCredentialExpirations('production', now));
  });

  it('returns an empty list for an unknown environment key rather than throwing', () => {
    expect(getUpcomingCredentialExpirations('staging', new Date('2026-10-10T00:00:00Z'))).toEqual([]);
  });
});
