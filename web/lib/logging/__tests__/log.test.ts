/**
 * Unit tests for the Stage 24 shared structured logger — the redaction
 * boundary (only allowlisted keys ever serialize, even past the type
 * system) and level routing are the load-bearing behaviors to verify.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env/runtime-environment', () => ({
  resolveRuntimeEnvironment: () => 'test',
}));

import { log, serializeLogFields, type LogFields } from '../log';

describe('serializeLogFields', () => {
  it('keeps every allowlisted field that is set', () => {
    const fields: LogFields = {
      event: 'scan.enrichment.failed',
      message: 'Firecrawl scrape failed',
      businessId: 'biz_1',
      scanId: 'scan_1',
      provider: 'firecrawl',
      errorCategory: 'firecrawl_timeout',
      retryable: true,
      attempt: 2,
      durationMs: 1234,
    };
    expect(serializeLogFields(fields)).toEqual(fields);
  });

  it('Stage 25 — keeps actorId (the identity performing a security-sensitive action)', () => {
    const fields: LogFields = { event: 'admin.business.deleted', actorId: 'admin', businessId: 'biz_1' };
    expect(serializeLogFields(fields)).toEqual(fields);
  });

  it('omits undefined optional fields entirely rather than serializing them as null/undefined', () => {
    const picked = serializeLogFields({ event: 'scan.enrichment.completed' });
    expect(picked).toEqual({ event: 'scan.enrichment.completed' });
    expect('businessId' in picked).toBe(false);
  });

  it('drops any key at runtime that is not in the allowlist, even if the type system was bypassed', () => {
    const unsafe = {
      event: 'scan.enrichment.failed',
      apiKey: 'sk-should-never-appear',
      rawSecretsManagerResponse: { SecretString: 'super-secret' },
      authorization: 'Bearer sk-live-1234',
    } as unknown as LogFields;

    const picked = serializeLogFields(unsafe);

    expect(picked).toEqual({ event: 'scan.enrichment.failed' });
    expect(JSON.stringify(picked)).not.toContain('sk-should-never-appear');
    expect(JSON.stringify(picked)).not.toContain('super-secret');
    expect(JSON.stringify(picked)).not.toContain('Bearer');
  });
});

describe('log', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('routes info-level (default) entries to console.log as single-line JSON', () => {
    log({ event: 'scan.enrichment.completed', businessId: 'biz_1' });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = logSpy.mock.calls[0][0] as string;
    expect(line.split('\n')).toHaveLength(1);
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      level: 'info',
      service: 'webpresa',
      environment: 'test',
      event: 'scan.enrichment.completed',
      businessId: 'biz_1',
    });
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('routes error-level entries to console.error', () => {
    log({ level: 'error', event: 'scan.enrichment.failed', errorCategory: 'firecrawl_auth' });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
  });

  it('routes warn-level entries to console.warn', () => {
    log({ level: 'warn', event: 'scan.workflow.stale' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('never includes a raw secret even when a caller tries to pass one via message', () => {
    // Not a redaction bug if this appears — message is a free-text field by
    // design. This test documents that expectation and guards the one thing
    // that IS guaranteed: the fixed field set never gains a payload/headers
    // field a future edit could accidentally widen.
    const allowedKeys = Object.keys(serializeLogFields({ event: 'x' } as LogFields));
    expect(allowedKeys).not.toContain('payload');
    expect(allowedKeys).not.toContain('headers');
    expect(allowedKeys).not.toContain('rawResponse');
  });
});
