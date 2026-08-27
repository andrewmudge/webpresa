/**
 * Unit tests for GET /api/build/[buildId]/status — the customer-facing,
 * build-session-authorized poll endpoint. Never exposes provider names or
 * raw ScanExecution/ScanWorkflowStep values, only the mapped progress copy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockVerifyBuildSession, mockGetSelfServiceBuildStatus, mockCookieGet } = vi.hoisted(() => ({
  mockVerifyBuildSession: vi.fn(),
  mockGetSelfServiceBuildStatus: vi.fn(),
  mockCookieGet: vi.fn(),
}));

vi.mock('@/lib/auth/build-session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/build-session')>('@/lib/auth/build-session');
  return { ...actual, verifyBuildSession: mockVerifyBuildSession };
});
vi.mock('@/lib/build/complete-self-service-build', () => ({ getSelfServiceBuildStatus: mockGetSelfServiceBuildStatus }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mockCookieGet }) }));

import { GET } from '../route';

function makeParams(buildId: string) {
  return { params: Promise.resolve({ buildId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookieGet.mockReturnValue({ value: 'signed-token' });
});

describe('GET /api/build/[buildId]/status', () => {
  it('returns 404 when there is no build-session cookie at all', async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockVerifyBuildSession.mockResolvedValueOnce(null);

    const res = await GET(new Request('http://localhost'), makeParams('scanexec_1'));

    expect(res.status).toBe(404);
    expect(mockGetSelfServiceBuildStatus).not.toHaveBeenCalled();
  });

  it('returns 404 when the build-session cookie authorizes a different buildId', async () => {
    mockVerifyBuildSession.mockResolvedValueOnce({ businessId: 'biz_1', buildId: 'scanexec_OTHER' });

    const res = await GET(new Request('http://localhost'), makeParams('scanexec_1'));

    expect(res.status).toBe(404);
    expect(mockGetSelfServiceBuildStatus).not.toHaveBeenCalled();
  });

  it('reports in_progress with mapped, provider-free copy', async () => {
    mockVerifyBuildSession.mockResolvedValueOnce({ businessId: 'biz_1', buildId: 'scanexec_1' });
    mockGetSelfServiceBuildStatus.mockResolvedValueOnce({
      outcome: 'in_progress',
      status: 'running',
      currentStep: 'crawling',
      hasExistingWebsite: true,
    });

    const res = await GET(new Request('http://localhost'), makeParams('scanexec_1'));
    const body = await res.json();

    expect(body).toEqual({
      outcome: 'in_progress',
      label: 'Analyzing your current website',
      position: 2,
      totalSteps: 6,
      hasExistingWebsite: true,
    });
    // Never leaks internal step names, provider names, or raw ScanExecution status.
    expect(JSON.stringify(body)).not.toContain('crawling');
    expect(JSON.stringify(body)).not.toContain('Firecrawl');
  });

  it('reports ready with the slug only', async () => {
    mockVerifyBuildSession.mockResolvedValueOnce({ businessId: 'biz_1', buildId: 'scanexec_1' });
    mockGetSelfServiceBuildStatus.mockResolvedValueOnce({ outcome: 'ready', slug: 'acme-plumbing', previewId: 'preview_1' });

    const res = await GET(new Request('http://localhost'), makeParams('scanexec_1'));
    const body = await res.json();

    expect(body).toEqual({ outcome: 'ready', slug: 'acme-plumbing' });
  });

  it('reports a real terminal failure, not an infinite in_progress', async () => {
    mockVerifyBuildSession.mockResolvedValueOnce({ businessId: 'biz_1', buildId: 'scanexec_1' });
    mockGetSelfServiceBuildStatus.mockResolvedValueOnce({ outcome: 'failed', message: 'We couldn’t finish building your website. Please try again.' });

    const res = await GET(new Request('http://localhost'), makeParams('scanexec_1'));
    const body = await res.json();

    expect(body.outcome).toBe('failed');
    expect(typeof body.message).toBe('string');
  });

  it('returns 404 for an unknown buildId even with a valid-looking session', async () => {
    mockVerifyBuildSession.mockResolvedValueOnce({ businessId: 'biz_1', buildId: 'scanexec_1' });
    mockGetSelfServiceBuildStatus.mockResolvedValueOnce({ outcome: 'not_found' });

    const res = await GET(new Request('http://localhost'), makeParams('scanexec_1'));

    expect(res.status).toBe(404);
  });
});
