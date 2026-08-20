/**
 * Unit tests for `submitPostcardToLob` (Stage 22 Phase 4). Every
 * DB/Lob/S3/env call is mocked — this exercises the eligibility checks,
 * the idempotent `pending` → `submitting` guard, and success/failure
 * status recording, not real network calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  mockLobRequest,
  mockGetPostcardById,
  mockTransitionPostcardToSubmitting,
  mockMarkPostcardSubmitted,
  mockMarkPostcardSubmissionFailed,
  mockGetBusinessById,
  mockAdvanceBusinessStatus,
  mockGetLobSenderAddress,
  mockGetSignedAssetUrl,
} = vi.hoisted(() => ({
  mockLobRequest: vi.fn(),
  mockGetPostcardById: vi.fn(),
  mockTransitionPostcardToSubmitting: vi.fn(),
  mockMarkPostcardSubmitted: vi.fn(),
  mockMarkPostcardSubmissionFailed: vi.fn(),
  mockGetBusinessById: vi.fn(),
  mockAdvanceBusinessStatus: vi.fn(),
  mockGetLobSenderAddress: vi.fn(),
  mockGetSignedAssetUrl: vi.fn(),
}));

const MockLobApiError = vi.hoisted(
  () =>
    class extends Error {
      status: number;
      body: unknown;
      constructor(message: string, status: number, body: unknown) {
        super(message);
        this.status = status;
        this.body = body;
      }
    },
);

vi.mock('../client', () => ({ lobRequest: mockLobRequest, LobApiError: MockLobApiError }));
vi.mock('@/lib/db/postcards', () => ({
  getPostcardById: mockGetPostcardById,
  transitionPostcardToSubmitting: mockTransitionPostcardToSubmitting,
  markPostcardSubmitted: mockMarkPostcardSubmitted,
  markPostcardSubmissionFailed: mockMarkPostcardSubmissionFailed,
}));
vi.mock('@/lib/db/businesses', () => ({ getBusinessById: mockGetBusinessById, advanceBusinessStatus: mockAdvanceBusinessStatus }));
vi.mock('@/lib/env/lob-sender-address', () => ({ getLobSenderAddress: mockGetLobSenderAddress }));
vi.mock('@/lib/s3/assets', () => ({ getSignedAssetUrl: mockGetSignedAssetUrl }));

import { submitPostcardToLob } from '../submit-postcard';
import type { Postcard } from '@/domain/models/postcard';
import type { Business } from '@/domain/models/business';

const POSTCARD_ID = 'postcard_1';
const BUSINESS_ID = 'biz_1';

function basePostcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: POSTCARD_ID,
    businessId: BUSINESS_ID,
    previewId: 'preview_1',
    provider: 'lob',
    status: 'pending',
    reviewedAt: '2026-08-08T00:00:00.000Z',
    reviewedBy: 'admin_1',
    frontArtifactKey: `postcards/${BUSINESS_ID}/${POSTCARD_ID}/front.pdf`,
    backArtifactKey: `postcards/${BUSINESS_ID}/${POSTCARD_ID}/back.pdf`,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function baseBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: BUSINESS_ID,
    name: 'Acme Plumbing',
    address: { line1: '1 Main St', city: 'Springfield', state: 'IL', postalCode: '62701', country: 'US' },
    ...overrides,
  } as Business;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPostcardById.mockResolvedValue(basePostcard());
  mockGetBusinessById.mockResolvedValue(baseBusiness());
  mockGetLobSenderAddress.mockReturnValue({
    name: 'Webpresa',
    line1: '4600 Baybrook Dr',
    city: 'Pensacola',
    state: 'FL',
    postalCode: '32514',
    country: 'US',
  });
  mockGetSignedAssetUrl.mockImplementation(async (key: string) => `https://signed.example.com/${key}`);
  mockTransitionPostcardToSubmitting.mockResolvedValue(true);
  mockLobRequest.mockResolvedValue({ id: 'psc_abc123', price: 1.23 });
  mockAdvanceBusinessStatus.mockResolvedValue(true);
});

describe('submitPostcardToLob — eligibility checks', () => {
  it('refuses when the postcard is not found', async () => {
    mockGetPostcardById.mockResolvedValue(null);
    const result = await submitPostcardToLob(POSTCARD_ID);
    expect(result).toEqual({ status: 'failed', message: 'Postcard not found.' });
    expect(mockTransitionPostcardToSubmitting).not.toHaveBeenCalled();
  });

  it('refuses when not yet approved (reviewedAt unset)', async () => {
    mockGetPostcardById.mockResolvedValue(basePostcard({ reviewedAt: undefined }));
    const result = await submitPostcardToLob(POSTCARD_ID);
    expect(result.status).toBe('not_eligible');
    expect(mockTransitionPostcardToSubmitting).not.toHaveBeenCalled();
  });

  it('refuses when artwork has not been rendered yet', async () => {
    mockGetPostcardById.mockResolvedValue(basePostcard({ frontArtifactKey: undefined }));
    const result = await submitPostcardToLob(POSTCARD_ID);
    expect(result.status).toBe('not_eligible');
    expect(mockTransitionPostcardToSubmitting).not.toHaveBeenCalled();
  });

  it('refuses when the business has no mailing address', async () => {
    mockGetBusinessById.mockResolvedValue(baseBusiness({ address: undefined }));
    const result = await submitPostcardToLob(POSTCARD_ID);
    expect(result.status).toBe('not_eligible');
    expect(mockTransitionPostcardToSubmitting).not.toHaveBeenCalled();
  });

  it('refuses when the sender address is not configured', async () => {
    mockGetLobSenderAddress.mockImplementation(() => {
      throw new Error('WEBPRESA_LOB_SENDER_NAME environment variable is not set');
    });
    const result = await submitPostcardToLob(POSTCARD_ID);
    expect(result.status).toBe('not_eligible');
    expect(mockTransitionPostcardToSubmitting).not.toHaveBeenCalled();
  });
});

describe('submitPostcardToLob — idempotency', () => {
  it('refuses with conflict when the pending→submitting transition loses the race', async () => {
    mockTransitionPostcardToSubmitting.mockResolvedValue(false);
    const result = await submitPostcardToLob(POSTCARD_ID);
    expect(result.status).toBe('conflict');
    expect(mockLobRequest).not.toHaveBeenCalled();
  });
});

describe('submitPostcardToLob — happy path', () => {
  it('builds the request from structured to/from addresses and signed artifact URLs, records success', async () => {
    const result = await submitPostcardToLob(POSTCARD_ID);

    expect(mockLobRequest).toHaveBeenCalledWith(
      '/postcards',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"address_line1":"1 Main St"'),
      }),
    );
    const requestBody = JSON.parse(mockLobRequest.mock.calls[0][1].body);
    expect(requestBody.to).toEqual({
      name: 'Acme Plumbing',
      address_line1: '1 Main St',
      address_city: 'Springfield',
      address_state: 'IL',
      address_zip: '62701',
      address_country: 'US',
    });
    expect(requestBody.from.name).toBe('Webpresa');
    expect(requestBody.front).toBe(`https://signed.example.com/postcards/${BUSINESS_ID}/${POSTCARD_ID}/front.pdf`);
    expect(requestBody.size).toBe('6x9');
    expect(requestBody.mail_type).toBe('usps_first_class');
    expect(requestBody.use_type).toBe('marketing');
    expect(requestBody.metadata).toEqual({ postcardId: POSTCARD_ID });

    expect(mockMarkPostcardSubmitted).toHaveBeenCalledWith(POSTCARD_ID, { providerPostcardId: 'psc_abc123', costCents: 123 });
    expect(result).toEqual({ status: 'submitted', providerPostcardId: 'psc_abc123' });
    expect(mockAdvanceBusinessStatus).toHaveBeenCalledWith(BUSINESS_ID, 'outreach');
  });

  it('leaves costCents unset when Lob does not return a numeric price', async () => {
    mockLobRequest.mockResolvedValue({ id: 'psc_abc123' });
    await submitPostcardToLob(POSTCARD_ID);
    expect(mockMarkPostcardSubmitted).toHaveBeenCalledWith(POSTCARD_ID, { providerPostcardId: 'psc_abc123', costCents: undefined });
  });

  it('still reports a successful submission when advancing business status fails — non-fatal', async () => {
    mockAdvanceBusinessStatus.mockRejectedValue(new Error('conditional write failed'));

    const result = await submitPostcardToLob(POSTCARD_ID);

    expect(result).toEqual({ status: 'submitted', providerPostcardId: 'psc_abc123' });
    expect(mockMarkPostcardSubmitted).toHaveBeenCalled();
  });
});

describe('submitPostcardToLob — long business name degradation', () => {
  it('truncates a business name over 40 chars at a word boundary with no dangling punctuation, and logs it', async () => {
    mockGetBusinessById.mockResolvedValue(baseBusiness({ name: 'Radiant Plumbing, Air Conditioning, & Electrical' }));
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await submitPostcardToLob(POSTCARD_ID);

    const requestBody = JSON.parse(mockLobRequest.mock.calls[0][1].body);
    expect(requestBody.to.name.length).toBeLessThanOrEqual(40);
    expect(requestBody.to.name).toBe('Radiant Plumbing, Air Conditioning');
    expect(requestBody.to.name).not.toMatch(/[\s,;:&-]$/);

    const truncationLog = consoleSpy.mock.calls.map((call) => call[0]).find((line) => typeof line === 'string' && line.includes('postcard.submission.name_truncated'));
    expect(truncationLog).toBeDefined();
    consoleSpy.mockRestore();
  });

  it('leaves a name exactly at 40 chars unchanged', async () => {
    const name = 'A'.repeat(40);
    mockGetBusinessById.mockResolvedValue(baseBusiness({ name }));

    await submitPostcardToLob(POSTCARD_ID);

    const requestBody = JSON.parse(mockLobRequest.mock.calls[0][1].body);
    expect(requestBody.to.name).toBe(name);
  });

  it('hard-truncates a single word with no spaces that exceeds 40 chars', async () => {
    const name = 'B'.repeat(55);
    mockGetBusinessById.mockResolvedValue(baseBusiness({ name }));

    await submitPostcardToLob(POSTCARD_ID);

    const requestBody = JSON.parse(mockLobRequest.mock.calls[0][1].body);
    expect(requestBody.to.name).toBe('B'.repeat(40));
  });

  it('does not log a truncation event when the name already fits', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await submitPostcardToLob(POSTCARD_ID);
    // baseBusiness() name is 'Acme Plumbing' (13 chars) — well under the limit.
    const requestBody = JSON.parse(mockLobRequest.mock.calls[0][1].body);
    expect(requestBody.to.name).toBe('Acme Plumbing');

    const truncationLog = consoleSpy.mock.calls.map((call) => call[0]).find((line) => typeof line === 'string' && line.includes('postcard.submission.name_truncated'));
    expect(truncationLog).toBeUndefined();
    consoleSpy.mockRestore();
  });
});

describe('submitPostcardToLob — failure after claiming', () => {
  it('records a failed submission (via markPostcardSubmissionFailed) when the Lob API call throws', async () => {
    mockLobRequest.mockRejectedValue(new MockLobApiError('Lob API request to /postcards failed: bad address', 422, {}));

    const result = await submitPostcardToLob(POSTCARD_ID);

    expect(mockMarkPostcardSubmissionFailed).toHaveBeenCalledWith(POSTCARD_ID, expect.stringContaining('bad address'));
    expect(result).toEqual({ status: 'failed', message: expect.stringContaining('bad address') });
  });
});
