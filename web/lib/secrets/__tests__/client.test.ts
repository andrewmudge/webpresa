/**
 * Unit tests for the Secrets Manager client helper module.
 * All AWS interactions are mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the AWS SDK before importing the module under test
// ---------------------------------------------------------------------------

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn(() => ({ send: mockSend })),
  GetSecretValueCommand: vi.fn((input) => ({ input })),
}));

// Mock server-only to a no-op (it's a build-time guard, irrelevant in tests)
vi.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { getSecretJson, getSecretName } from '@/lib/secrets/client';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env.AWS_REGION = 'us-east-1';
});

// ---------------------------------------------------------------------------
// getSecretName
// ---------------------------------------------------------------------------

describe('getSecretName', () => {
  it('returns the value when the env var is set', () => {
    process.env.TEST_SECRET_NAME = 'webpresa-test-openai';
    expect(getSecretName('TEST_SECRET_NAME')).toBe('webpresa-test-openai');
    delete process.env.TEST_SECRET_NAME;
  });

  it('throws when the env var is unset', () => {
    delete process.env.TEST_SECRET_NAME;
    expect(() => getSecretName('TEST_SECRET_NAME')).toThrow(
      'TEST_SECRET_NAME environment variable is not set',
    );
  });
});

// ---------------------------------------------------------------------------
// getSecretJson
// ---------------------------------------------------------------------------

describe('getSecretJson', () => {
  it('parses and returns the secret JSON', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ apiKey: 'sk-test-123' }),
    });

    const result = await getSecretJson('webpresa-test-openai-1');

    expect(result).toEqual({ apiKey: 'sk-test-123' });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('caches the result — a second call for the same name does not hit AWS again', async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ apiKey: 'sk-cached' }),
    });

    const first = await getSecretJson('webpresa-test-openai-2');
    const second = await getSecretJson('webpresa-test-openai-2');

    expect(first).toEqual({ apiKey: 'sk-cached' });
    expect(second).toEqual({ apiKey: 'sk-cached' });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('throws when the secret has no SecretString', async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(getSecretJson('webpresa-test-openai-3')).rejects.toThrow(
      /has no SecretString value/,
    );
  });
});
