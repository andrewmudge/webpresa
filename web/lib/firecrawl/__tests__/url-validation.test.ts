/**
 * Unit tests for the SSRF guard. DNS lookups are mocked — no real network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLookup = vi.hoisted(() => vi.fn());

vi.mock('node:dns', () => ({
  promises: { lookup: mockLookup },
}));

vi.mock('server-only', () => ({}));

import { validateOutboundUrl } from '../url-validation';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateOutboundUrl', () => {
  it('accepts a normal public https URL', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34' }]);
    const result = await validateOutboundUrl('https://example.com/');
    expect(result.ok).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/');
  });

  it('rejects a non-http(s) protocol', async () => {
    const result = await validateOutboundUrl('ftp://example.com/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unsupported_protocol');
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it('rejects a URL with embedded credentials', async () => {
    const result = await validateOutboundUrl('https://user:pass@example.com/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('embedded_credentials');
  });

  it('rejects localhost', async () => {
    const result = await validateOutboundUrl('http://localhost:3000/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_hostname');
  });

  it('rejects a bare loopback IP literal without a DNS lookup', async () => {
    const result = await validateOutboundUrl('http://127.0.0.1/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('private_or_blocked_address');
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it('rejects the AWS metadata endpoint IP literal', async () => {
    const result = await validateOutboundUrl('http://169.254.169.254/latest/meta-data/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('private_or_blocked_address');
  });

  it('rejects a hostname that resolves to a private RFC1918 address', async () => {
    mockLookup.mockResolvedValue([{ address: '10.0.0.5' }]);
    const result = await validateOutboundUrl('https://internal.example.com/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('private_or_blocked_address');
  });

  it('rejects when any resolved address (of multiple) is private', async () => {
    mockLookup.mockResolvedValue([{ address: '93.184.216.34' }, { address: '192.168.1.1' }]);
    const result = await validateOutboundUrl('https://mixed.example.com/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('private_or_blocked_address');
  });

  it('rejects an unresolvable hostname', async () => {
    mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
    const result = await validateOutboundUrl('https://does-not-exist.invalid/');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unresolvable_hostname');
  });

  it('rejects a malformed URL string', async () => {
    const result = await validateOutboundUrl('not a url');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_hostname');
  });
});
