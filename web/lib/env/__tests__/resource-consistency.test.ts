/**
 * Unit tests for the Stage 25 (Security Hardening) cross-environment
 * resource-identifier consistency guard.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Module-level cache — reset it fresh for every test via a full module reset.
beforeEach(() => {
  vi.resetModules();
});

async function importGuard() {
  const mod = await import('@/lib/env/resource-consistency');
  return mod.assertResourceEnvironmentConsistency;
}

describe('assertResourceEnvironmentConsistency', () => {
  it('passes through a name that does not match the webpresa-{env}- convention', async () => {
    const assertFn = await importGuard();
    expect(assertFn('some-other-resource')).toBe('some-other-resource');
  });

  it('accepts a sequence of resource names that all belong to the same environment', async () => {
    const assertFn = await importGuard();
    expect(assertFn('webpresa-dev-businesses')).toBe('webpresa-dev-businesses');
    expect(assertFn('webpresa-dev-openai')).toBe('webpresa-dev-openai');
    expect(assertFn('webpresa-dev-assets')).toBe('webpresa-dev-assets');
  });

  it('accepts a full prod sequence identically', async () => {
    const assertFn = await importGuard();
    expect(assertFn('webpresa-prod-businesses')).toBe('webpresa-prod-businesses');
    expect(assertFn('webpresa-prod-stripe')).toBe('webpresa-prod-stripe');
  });

  it('throws when a later resource name belongs to a different environment than the first', async () => {
    const assertFn = await importGuard();
    assertFn('webpresa-dev-businesses');
    expect(() => assertFn('webpresa-prod-openai')).toThrow(/Resource environment mismatch/);
  });

  it('never throws for a name that does not match the convention, even after establishing an environment', async () => {
    const assertFn = await importGuard();
    assertFn('webpresa-dev-businesses');
    expect(() => assertFn('some-unrelated-name')).not.toThrow();
  });
});
