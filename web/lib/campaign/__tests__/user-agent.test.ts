/**
 * Unit tests for User-Agent → device class / browser / OS parsing (Stage 21).
 * Uses the real `ua-parser-js` — no mocking, since correctness here depends
 * on the library's own regex tables.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseUserAgent } from '../user-agent';

const DESKTOP_CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

describe('parseUserAgent', () => {
  it('classifies an ordinary desktop browser as desktop', () => {
    const result = parseUserAgent(DESKTOP_CHROME_MAC);
    expect(result.deviceClass).toBe('desktop');
    expect(result.browserFamily).toBe('Chrome');
    expect(result.operatingSystem).toBe('macOS');
  });

  it('classifies a phone as mobile', () => {
    const result = parseUserAgent(IPHONE_SAFARI);
    expect(result.deviceClass).toBe('mobile');
    expect(result.operatingSystem).toBe('iOS');
  });

  it('classifies a tablet as tablet, not mobile', () => {
    const result = parseUserAgent(IPAD_SAFARI);
    expect(result.deviceClass).toBe('tablet');
  });

  it('classifies an Android phone as mobile', () => {
    const result = parseUserAgent(ANDROID_CHROME);
    expect(result.deviceClass).toBe('mobile');
    expect(result.operatingSystem).toBe('Android');
  });

  it('never throws on an empty or garbage user agent, and falls back to desktop/unknown fields', () => {
    expect(() => parseUserAgent('')).not.toThrow();
    const result = parseUserAgent('not-a-real-user-agent-string');
    expect(result.deviceClass).toBe('desktop');
    expect(result.browserFamily).toBeUndefined();
    expect(result.operatingSystem).toBeUndefined();
  });
});
