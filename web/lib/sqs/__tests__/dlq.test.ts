/**
 * Unit tests for the Stage 24 screenshot-DLQ depth reader. The SQS client
 * is mocked — no real AWS calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/sqs/client', () => ({ getSqsClient: () => ({ send: mockSend }) }));

import { getScreenshotDlqDepth, getScreenshotDlqUrl } from '../dlq';

const ORIGINAL_ENV = process.env.SCREENSHOT_DLQ_URL;

beforeEach(() => {
  mockSend.mockReset();
  process.env.SCREENSHOT_DLQ_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/webpresa-dev-screenshot-capture-dlq';
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.SCREENSHOT_DLQ_URL;
  else process.env.SCREENSHOT_DLQ_URL = ORIGINAL_ENV;
});

describe('getScreenshotDlqUrl', () => {
  it('throws when SCREENSHOT_DLQ_URL is unset', () => {
    delete process.env.SCREENSHOT_DLQ_URL;
    expect(() => getScreenshotDlqUrl()).toThrow(/SCREENSHOT_DLQ_URL/);
  });

  it('returns the configured URL', () => {
    expect(getScreenshotDlqUrl()).toContain('webpresa-dev-screenshot-capture-dlq');
  });
});

describe('getScreenshotDlqDepth', () => {
  it('returns the parsed message count on success', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: { ApproximateNumberOfMessages: '3' } });
    const result = await getScreenshotDlqDepth();
    expect(result).toEqual({ approximateMessageCount: 3 });
  });

  it('returns zero when the attribute is missing from a successful response', async () => {
    mockSend.mockResolvedValueOnce({ Attributes: {} });
    const result = await getScreenshotDlqDepth();
    expect(result).toEqual({ approximateMessageCount: 0 });
  });

  it('returns null (never throws) when the queue URL is not configured', async () => {
    delete process.env.SCREENSHOT_DLQ_URL;
    const result = await getScreenshotDlqDepth();
    expect(result).toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns null (never throws) when the AWS call itself fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('AccessDenied'));
    const result = await getScreenshotDlqDepth();
    expect(result).toBeNull();
  });
});
