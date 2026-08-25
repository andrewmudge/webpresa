/**
 * Unit tests for startSelfServiceBuild — the self-service intake
 * orchestration (create/attach → visitor-canonical field write → trigger
 * the scan workflow). All DynamoDB/workflow interactions are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPutBusiness, mockUpdateBusiness, mockResolveUniqueSlug, mockStartScanWorkflow, mockResolveDuplicate } =
  vi.hoisted(() => ({
    mockPutBusiness: vi.fn(),
    mockUpdateBusiness: vi.fn(),
    mockResolveUniqueSlug: vi.fn(),
    mockStartScanWorkflow: vi.fn(),
    mockResolveDuplicate: vi.fn(),
  }));

vi.mock('@/lib/db/businesses', () => ({
  putBusiness: mockPutBusiness,
  updateBusiness: mockUpdateBusiness,
  resolveUniqueSlug: mockResolveUniqueSlug,
}));
vi.mock('@/lib/workflow/run-scan-workflow', () => ({ startScanWorkflow: mockStartScanWorkflow }));
vi.mock('../resolve-duplicate', () => ({ resolveDuplicateForSelfService: mockResolveDuplicate }));
vi.mock('server-only', () => ({}));

import {
  startSelfServiceBuild,
  createOrAttachSelfServiceBusiness,
  triggerSelfServiceScan,
  SELF_SERVICE_BLOCKED_MESSAGE,
} from '../start-self-service-build';

const BASE_INPUT = {
  name: 'Acme Plumbing',
  industry: 'plumbing' as const,
  phone: '512-555-0100',
  hasExistingWebsite: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveUniqueSlug.mockImplementation(async (slug: string) => slug);
  mockStartScanWorkflow.mockResolvedValue({ status: 'started', scanExecutionId: 'scanexec_1' });
});

describe('startSelfServiceBuild', () => {
  it('blocks and never writes anything when duplicate resolution fails closed', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'blocked' });

    const result = await startSelfServiceBuild(BASE_INPUT);

    expect(result).toEqual({ status: 'blocked', message: SELF_SERVICE_BLOCKED_MESSAGE });
    expect(mockPutBusiness).not.toHaveBeenCalled();
    expect(mockUpdateBusiness).not.toHaveBeenCalled();
    expect(mockStartScanWorkflow).not.toHaveBeenCalled();
  });

  it('creates a new self-service business when nothing matches', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'create' });

    const result = await startSelfServiceBuild({
      ...BASE_INPUT,
      servicesOffered: 'Drain cleaning\nWater heater repair',
      differentiators: 'Family owned\nSame-day service',
    });

    expect(result.status).toBe('started');
    expect(mockPutBusiness).toHaveBeenCalledTimes(1);
    const [createdBusiness] = mockPutBusiness.mock.calls[0];
    expect(createdBusiness.source).toBe('self_service');
    expect(createdBusiness.name).toBe('Acme Plumbing');

    expect(mockUpdateBusiness).toHaveBeenCalledTimes(1);
    const [updatedBusinessId, updates] = mockUpdateBusiness.mock.calls[0];
    expect(updatedBusinessId).toBe(createdBusiness.businessId);
    expect(updates.servicesOffered).toBe('Drain cleaning\nWater heater repair');
    expect(updates.differentiators).toBe('Family owned\nSame-day service');

    expect(mockStartScanWorkflow).toHaveBeenCalledWith(createdBusiness.businessId, createdBusiness.businessId, 'self_service');
  });

  it('attaches to an existing unclaimed business instead of creating a new one', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'attach', businessId: 'biz_existing' });

    const result = await startSelfServiceBuild(BASE_INPUT);

    expect(result.status).toBe('started');
    expect(mockPutBusiness).not.toHaveBeenCalled();
    expect(mockUpdateBusiness).toHaveBeenCalledWith('biz_existing', expect.objectContaining({ industry: 'plumbing' }));
    expect(mockStartScanWorkflow).toHaveBeenCalledWith('biz_existing', 'biz_existing', 'self_service');
  });

  it('defaults the address country to US without asking the visitor for it', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'create' });

    await startSelfServiceBuild({
      ...BASE_INPUT,
      address: { line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701' },
    });

    const [, updates] = mockUpdateBusiness.mock.calls[0];
    expect(updates.address).toEqual({ line1: '123 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' });
  });

  it('surfaces a conflict when a build is already active for the target business', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'attach', businessId: 'biz_existing' });
    mockStartScanWorkflow.mockResolvedValueOnce({ status: 'conflict', message: 'A scan workflow for this business is already queued or running.' });

    const result = await startSelfServiceBuild(BASE_INPUT);

    expect(result.status).toBe('conflict');
  });

  it('rejects malformed input before touching any duplicate check or write', async () => {
    await expect(startSelfServiceBuild({ ...BASE_INPUT, name: '' })).rejects.toThrow();
    expect(mockResolveDuplicate).not.toHaveBeenCalled();
  });

  it('sets logoUrl/photoUrls in a second updateBusiness call only when present', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'create' });

    await startSelfServiceBuild({ ...BASE_INPUT, logoUrl: '/api/assets/businesses/x/logo.png', photoUrls: ['/api/assets/businesses/x/photos/1.png'] });

    expect(mockUpdateBusiness).toHaveBeenCalledTimes(2);
    const [, secondUpdate] = mockUpdateBusiness.mock.calls[1];
    expect(secondUpdate).toEqual({
      logoUrl: '/api/assets/businesses/x/logo.png',
      photoUrls: ['/api/assets/businesses/x/photos/1.png'],
    });
  });
});

describe('createOrAttachSelfServiceBusiness / triggerSelfServiceScan (split, for the upload-in-between flow)', () => {
  it('createOrAttachSelfServiceBusiness never touches the scan workflow', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'create' });

    const result = await createOrAttachSelfServiceBusiness(BASE_INPUT);

    expect(result.status).toBe('ready');
    expect(mockStartScanWorkflow).not.toHaveBeenCalled();
  });

  it('triggerSelfServiceScan starts the workflow for an already-created business', async () => {
    const result = await triggerSelfServiceScan('biz_existing');

    expect(result).toEqual({ status: 'started', scanExecutionId: 'scanexec_1' });
    expect(mockStartScanWorkflow).toHaveBeenCalledWith('biz_existing', 'biz_existing', 'self_service');
  });

  it('composing the two steps with an upload in between matches the combined startSelfServiceBuild behavior', async () => {
    mockResolveDuplicate.mockResolvedValueOnce({ outcome: 'create' });

    const created = await createOrAttachSelfServiceBusiness(BASE_INPUT);
    expect(created.status).toBe('ready');
    if (created.status !== 'ready') return;

    // Simulates the Server Action uploading a file under `created.businessId`,
    // then writing the resolved URL — the whole reason this is split.
    await mockUpdateBusiness(created.businessId, { logoUrl: '/api/assets/businesses/x/logo.png' });

    const triggered = await triggerSelfServiceScan(created.businessId);
    expect(triggered.status).toBe('started');
  });
});
