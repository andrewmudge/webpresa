/**
 * Unit tests for the Stage 22.5 live-mode-key guard. No network/AWS calls.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveRuntimeEnvironment, assertLiveModeAllowed } from '../runtime-environment';

afterEach(() => {
  delete process.env.VERCEL_ENV;
  vi.unstubAllEnvs();
});

describe('resolveRuntimeEnvironment', () => {
  it('prefers VERCEL_ENV over NODE_ENV', () => {
    process.env.VERCEL_ENV = 'preview';
    vi.stubEnv('NODE_ENV', 'production');
    expect(resolveRuntimeEnvironment()).toBe('preview');
  });

  it('falls back to NODE_ENV when VERCEL_ENV is unset', () => {
    delete process.env.VERCEL_ENV;
    vi.stubEnv('NODE_ENV', 'test');
    expect(resolveRuntimeEnvironment()).toBe('test');
  });
});

describe('assertLiveModeAllowed', () => {
  it('does nothing for a non-live key, regardless of environment', () => {
    delete process.env.VERCEL_ENV;
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => assertLiveModeAllowed('Stripe', false)).not.toThrow();
  });

  it('allows a live key when the resolved environment is production', () => {
    process.env.VERCEL_ENV = 'production';
    expect(() => assertLiveModeAllowed('Stripe', true)).not.toThrow();
  });

  it('rejects a live key on a preview deployment', () => {
    process.env.VERCEL_ENV = 'preview';
    expect(() => assertLiveModeAllowed('Stripe', true)).toThrow(/refusing to use a live-mode API key/);
  });

  it('rejects a live key when only NODE_ENV=development is set (local dev)', () => {
    delete process.env.VERCEL_ENV;
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => assertLiveModeAllowed('Lob', true)).toThrow(/refusing to use a live-mode API key/);
  });

  it('includes the provider name in the error message', () => {
    process.env.VERCEL_ENV = 'preview';
    expect(() => assertLiveModeAllowed('Lob', true)).toThrow(/^Lob:/);
  });
});
