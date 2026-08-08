/**
 * Unit tests for `renderPostcardArtifacts` (Stage 22 Phase 2). The Lambda
 * client and DB layer are mocked — this exercises the eligibility guard
 * (only `pending` postcards may render) and how the two synchronous
 * Lambda invocations' results get recorded.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockSend, mockGetPostcardById, mockMarkPostcardRendered, mockGetPostcardRenderLambdaFunctionName } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetPostcardById: vi.fn(),
  mockMarkPostcardRendered: vi.fn(),
  mockGetPostcardRenderLambdaFunctionName: vi.fn(() => 'webpresa-dev-postcard-render'),
}));

vi.mock('@aws-sdk/client-lambda', () => ({
  InvokeCommand: vi.fn((input) => ({ input })),
}));
vi.mock('@/lib/db/postcards', () => ({
  getPostcardById: mockGetPostcardById,
  markPostcardRendered: mockMarkPostcardRendered,
}));
vi.mock('@/lib/lambda/client', () => ({
  getLambdaClient: () => ({ send: mockSend }),
  getPostcardRenderLambdaFunctionName: mockGetPostcardRenderLambdaFunctionName,
}));

import { renderPostcardArtifacts } from '../render';
import type { Postcard } from '@/domain/models/postcard';

const POSTCARD_ID = 'postcard_1';
const BUSINESS_ID = 'biz_1';

function basePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: POSTCARD_ID,
    businessId: BUSINESS_ID,
    previewId: 'preview_1',
    provider: 'lob',
    status: 'pending',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function lambdaPayload(call: { input: { Payload: Buffer } }): unknown {
  return JSON.parse(Buffer.from(call.input.Payload).toString('utf-8'));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPostcardById.mockResolvedValue(basePostcard());
  mockSend.mockImplementation(async (command: { input: { Payload: Buffer } }) => {
    const payload = lambdaPayload(command) as { side: 'front' | 'back' };
    return { Payload: Buffer.from(JSON.stringify({ storageKey: `postcards/${BUSINESS_ID}/${POSTCARD_ID}/${payload.side}.pdf` })) };
  });
});

describe('renderPostcardArtifacts — eligibility', () => {
  it('fails when the postcard is not found', async () => {
    mockGetPostcardById.mockResolvedValue(null);
    const result = await renderPostcardArtifacts(POSTCARD_ID);
    expect(result).toEqual({ status: 'failed', message: 'Postcard not found.' });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('refuses to re-render a postcard that is past pending', async () => {
    mockGetPostcardById.mockResolvedValue(basePostcard({ status: 'submitted' }));
    const result = await renderPostcardArtifacts(POSTCARD_ID);
    expect(result.status).toBe('not_eligible');
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('renderPostcardArtifacts — happy path', () => {
  it('invokes the Lambda synchronously for both sides and records the resulting keys', async () => {
    const result = await renderPostcardArtifacts(POSTCARD_ID);

    expect(mockSend).toHaveBeenCalledTimes(2);
    const payloads = mockSend.mock.calls.map((call) => lambdaPayload(call[0]));
    expect(payloads).toEqual(
      expect.arrayContaining([
        { postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'front' },
        { postcardId: POSTCARD_ID, businessId: BUSINESS_ID, side: 'back' },
      ]),
    );
    for (const call of mockSend.mock.calls) {
      expect(call[0].input.InvocationType).toBe('RequestResponse');
      expect(call[0].input.FunctionName).toBe('webpresa-dev-postcard-render');
    }

    expect(mockMarkPostcardRendered).toHaveBeenCalledWith(POSTCARD_ID, {
      frontArtifactKey: `postcards/${BUSINESS_ID}/${POSTCARD_ID}/front.pdf`,
      backArtifactKey: `postcards/${BUSINESS_ID}/${POSTCARD_ID}/back.pdf`,
    });
    expect(result).toEqual({ status: 'rendered' });
  });
});

describe('renderPostcardArtifacts — failure', () => {
  it('returns failed and never records artifacts when a Lambda invocation reports a FunctionError', async () => {
    mockSend.mockResolvedValue({ FunctionError: 'Unhandled', Payload: Buffer.from('{"errorMessage":"boom"}') });

    const result = await renderPostcardArtifacts(POSTCARD_ID);

    expect(result.status).toBe('failed');
    expect(mockMarkPostcardRendered).not.toHaveBeenCalled();
  });

  it('returns failed when the Lambda invocation itself rejects', async () => {
    mockSend.mockRejectedValue(new Error('network error'));

    const result = await renderPostcardArtifacts(POSTCARD_ID);

    expect(result).toEqual({ status: 'failed', message: expect.stringContaining('network error') });
    expect(mockMarkPostcardRendered).not.toHaveBeenCalled();
  });
});
