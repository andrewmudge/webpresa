/**
 * Unit tests for the Stage 22.5 live-mode guard wired into the Stripe
 * client singleton. Secrets Manager and the `stripe` SDK are mocked — no
 * real network or AWS calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetStripeSecret = vi.hoisted(() => vi.fn());

vi.mock('@/lib/secrets', () => ({
  getStripeSecret: mockGetStripeSecret,
}));

vi.mock('server-only', () => ({}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

// Re-imported fresh per test since the module caches its client singleton
// module-globally — `vi.resetModules()` + dynamic import gives each test a
// clean singleton, matching the module's actual per-process caching design.
async function importFreshClient() {
  vi.resetModules();
  return import('../client');
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.VERCEL_ENV;
  vi.unstubAllEnvs();
});

describe('getStripeClient', () => {
  it('constructs a client for a test-mode key on a preview deployment', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockGetStripeSecret.mockResolvedValue({ secretKey: 'sk_test_abc', webhookSecret: 'whsec_test' });

    const { getStripeClient } = await importFreshClient();
    await expect(getStripeClient()).resolves.toBeDefined();
  });

  it('constructs a client for a live-mode key on a production deployment', async () => {
    process.env.VERCEL_ENV = 'production';
    mockGetStripeSecret.mockResolvedValue({ secretKey: 'sk_live_abc', webhookSecret: 'whsec_live' });

    const { getStripeClient } = await importFreshClient();
    await expect(getStripeClient()).resolves.toBeDefined();
  });

  it('refuses a live-mode key on a preview deployment', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockGetStripeSecret.mockResolvedValue({ secretKey: 'sk_live_abc', webhookSecret: 'whsec_live' });

    const { getStripeClient } = await importFreshClient();
    await expect(getStripeClient()).rejects.toThrow(/Stripe: refusing to use a live-mode API key/);
  });
});
