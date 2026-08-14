import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockListAllScans = vi.hoisted(() => vi.fn());
const mockListAllScanExecutions = vi.hoisted(() => vi.fn());
const mockListAllPostcards = vi.hoisted(() => vi.fn());
const mockListAllBusinesses = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/scan-events', () => ({ listAllScans: mockListAllScans }));
vi.mock('@/lib/db/scan-executions', () => ({ listAllScanExecutions: mockListAllScanExecutions }));
vi.mock('@/lib/db/postcards', () => ({ listAllPostcards: mockListAllPostcards }));
vi.mock('@/lib/db/businesses', () => ({ listAllBusinesses: mockListAllBusinesses }));

import { listRecentOperations } from '../recent';

const BUSINESS_ID = 'biz_1';
const now = new Date().toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  mockListAllBusinesses.mockResolvedValue([{ businessId: BUSINESS_ID, name: 'Acme Plumbing' }]);
  mockListAllScans.mockResolvedValue([]);
  mockListAllScanExecutions.mockResolvedValue([]);
  mockListAllPostcards.mockResolvedValue([]);
});

describe('listRecentOperations', () => {
  it('includes completed and partial scans, labeled by scan type', async () => {
    mockListAllScans.mockResolvedValue([
      { scanId: 'scan_1', businessId: BUSINESS_ID, provider: 'firecrawl', operation: 'scrape', status: 'completed', attempt: 1, completedAt: now, createdAt: now, updatedAt: now },
      { scanId: 'scan_2', businessId: BUSINESS_ID, provider: 'playwright', operation: 'screenshot', targetType: 'existing_site', status: 'partial', attempt: 1, completedAt: now, createdAt: now, updatedAt: now },
      { scanId: 'scan_3', businessId: BUSINESS_ID, provider: 'firecrawl', operation: 'scrape', status: 'failed', attempt: 1, completedAt: now, createdAt: now, updatedAt: now },
    ]);
    const items = await listRecentOperations();
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.id === 'scan:scan_1')?.label).toContain('completed');
    expect(items.some((i) => i.id === 'scan:scan_3')).toBe(false);
  });

  it('includes preview_ready/qualified scan executions as "Full scan completed"', async () => {
    mockListAllScanExecutions.mockResolvedValue([
      { scanExecutionId: 'scanexec_1', businessId: BUSINESS_ID, status: 'preview_ready', triggerSource: 'admin_manual', requestedBy: 'admin', attemptNumber: 1, completedAt: now, createdAt: now, updatedAt: now },
      { scanExecutionId: 'scanexec_2', businessId: BUSINESS_ID, status: 'running', triggerSource: 'admin_manual', requestedBy: 'admin', attemptNumber: 1, createdAt: now, updatedAt: now },
    ]);
    const items = await listRecentOperations();
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Full scan completed');
    expect(items[0].businessName).toBe('Acme Plumbing');
  });

  it('includes submitted/mailed/delivered postcards as "Postcard submitted"', async () => {
    mockListAllPostcards.mockResolvedValue([
      { postcardId: 'postcard_1', businessId: BUSINESS_ID, previewId: 'preview_1', provider: 'lob', status: 'submitted', submittedAt: now, createdAt: now, updatedAt: now },
      { postcardId: 'postcard_2', businessId: BUSINESS_ID, previewId: 'preview_1', provider: 'lob', status: 'pending', createdAt: now, updatedAt: now },
    ]);
    const items = await listRecentOperations();
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Postcard submitted');
  });

  it('sorts newest first and caps at 15 items', async () => {
    const scans = Array.from({ length: 20 }, (_, i) => ({
      scanId: `scan_${i}`,
      businessId: BUSINESS_ID,
      provider: 'firecrawl' as const,
      operation: 'scrape' as const,
      status: 'completed' as const,
      attempt: 1,
      completedAt: new Date(Date.now() - i * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    }));
    mockListAllScans.mockResolvedValue(scans);
    const items = await listRecentOperations();
    expect(items).toHaveLength(15);
    expect(items[0].id).toBe('scan:scan_0');
  });
});
