/**
 * Unit tests for the Stage 16 internal-API shared-secret verification.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetInternalApiSecret = vi.hoisted(() => vi.fn());

vi.mock('@/lib/secrets', () => ({
  getInternalApiSecret: mockGetInternalApiSecret,
}));

vi.mock('server-only', () => ({}));

import { verifyInternalRequest, INTERNAL_API_SECRET_HEADER } from '@/lib/internal-auth';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetInternalApiSecret.mockResolvedValue({ sharedSecret: 'correct-secret-value' });
});

describe('verifyInternalRequest', () => {
  it('returns true when the header matches the secret', async () => {
    const request = new Request('http://localhost/api/internal/scan/crawl', {
      headers: { [INTERNAL_API_SECRET_HEADER]: 'correct-secret-value' },
    });

    expect(await verifyInternalRequest(request)).toBe(true);
  });

  it('returns false when the header value is wrong', async () => {
    const request = new Request('http://localhost/api/internal/scan/crawl', {
      headers: { [INTERNAL_API_SECRET_HEADER]: 'wrong-secret-value' },
    });

    expect(await verifyInternalRequest(request)).toBe(false);
  });

  it('returns false when the header is missing entirely, without fetching the secret', async () => {
    const request = new Request('http://localhost/api/internal/scan/crawl');

    expect(await verifyInternalRequest(request)).toBe(false);
    expect(mockGetInternalApiSecret).not.toHaveBeenCalled();
  });

  it('returns false when the header is a differently-lengthed near match', async () => {
    const request = new Request('http://localhost/api/internal/scan/crawl', {
      headers: { [INTERNAL_API_SECRET_HEADER]: 'correct-secret-value-plus-extra' },
    });

    expect(await verifyInternalRequest(request)).toBe(false);
  });
});
