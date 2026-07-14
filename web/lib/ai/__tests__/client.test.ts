/**
 * Unit tests for the OpenAI client helper module.
 * No real OpenAI or AWS calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetOpenAiSecret = vi.hoisted(() => vi.fn());
const MockOpenAI = vi.hoisted(() => vi.fn().mockImplementation((opts: { apiKey: string }) => ({ apiKey: opts.apiKey })));

vi.mock('@/lib/secrets', () => ({
  getOpenAiSecret: mockGetOpenAiSecret,
}));

vi.mock('openai', () => ({
  default: MockOpenAI,
}));

vi.mock('server-only', () => ({}));

import { getOpenAiClient, getOpenAiModel } from '@/lib/ai/client';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  delete process.env.OPENAI_MODEL;
});

describe('getOpenAiClient', () => {
  // The client is a module-level singleton (like getS3Client/getSecretsManagerClient),
  // so both assertions must live in one test — a second `it()` would see an
  // already-warm cache from this one and give a false read on call counts.
  it('builds a client from the fetched secret and caches it across calls', async () => {
    mockGetOpenAiSecret.mockResolvedValueOnce({ apiKey: 'sk-test-123' });

    const first = await getOpenAiClient();
    const second = await getOpenAiClient();

    expect(MockOpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-123' });
    expect(MockOpenAI).toHaveBeenCalledOnce();
    expect(mockGetOpenAiSecret).toHaveBeenCalledOnce();
    expect(first).toBe(second);
  });
});

describe('getOpenAiModel', () => {
  it('falls back to the default model when OPENAI_MODEL is unset', () => {
    expect(getOpenAiModel()).toBe('gpt-4o-mini');
  });

  it('uses OPENAI_MODEL when set', () => {
    process.env.OPENAI_MODEL = 'gpt-4.1-mini';
    expect(getOpenAiModel()).toBe('gpt-4.1-mini');
  });
});
