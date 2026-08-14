/**
 * Unit tests for the Stage 24 "Needs Attention" aggregation. Every
 * repository call is mocked — no real AWS calls. Coverage focuses on the
 * classification logic (which items appear, what recommendedAction/recovery
 * each gets) since that's the part with real judgment calls baked in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockListAllScans = vi.hoisted(() => vi.fn());
const mockListAllScanExecutions = vi.hoisted(() => vi.fn());
const mockListAllPostcards = vi.hoisted(() => vi.fn());
const mockListLeadsNeedingNotificationRetry = vi.hoisted(() => vi.fn());
const mockListRecentStripeWebhookFailures = vi.hoisted(() => vi.fn());
const mockListAllBusinesses = vi.hoisted(() => vi.fn());
const mockGetScreenshotDlqDepth = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db/scan-events', () => ({ listAllScans: mockListAllScans }));
vi.mock('@/lib/db/scan-executions', () => ({ listAllScanExecutions: mockListAllScanExecutions }));
vi.mock('@/lib/db/postcards', () => ({ listAllPostcards: mockListAllPostcards }));
vi.mock('@/lib/db/leads', () => ({ listLeadsNeedingNotificationRetry: mockListLeadsNeedingNotificationRetry }));
vi.mock('@/lib/db/stripe-webhook-failures', () => ({ listRecentStripeWebhookFailures: mockListRecentStripeWebhookFailures }));
vi.mock('@/lib/db/businesses', () => ({ listAllBusinesses: mockListAllBusinesses }));
vi.mock('@/lib/sqs/dlq', () => ({ getScreenshotDlqDepth: mockGetScreenshotDlqDepth }));

import { aggregateNeedsAttention } from '../needs-attention';
import type { ScanEvent } from '@/domain/models/scan-event';
import type { ScanExecution } from '@/domain/models/scan-execution';
import type { Postcard } from '@/domain/models/postcard';
import type { Lead } from '@/domain/models/lead';
import type { StripeWebhookFailure } from '@/domain/models/stripe-webhook-failure';

const BUSINESS_ID = 'biz_1';
const now = new Date().toISOString();
const staleTimestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago — stale under any threshold used here

function scan(overrides: Partial<ScanEvent> = {}): ScanEvent {
  return {
    scanId: 'scan_1',
    businessId: BUSINESS_ID,
    provider: 'firecrawl',
    operation: 'scrape',
    status: 'failed',
    attempt: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function execution(overrides: Partial<ScanExecution> = {}): ScanExecution {
  return {
    scanExecutionId: 'scanexec_1',
    businessId: BUSINESS_ID,
    status: 'failed',
    triggerSource: 'admin_manual',
    requestedBy: 'admin',
    attemptNumber: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function postcard(overrides: Partial<Postcard> = {}): Postcard {
  return {
    postcardId: 'postcard_1',
    businessId: BUSINESS_ID,
    previewId: 'preview_1',
    provider: 'lob',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    leadId: 'lead_1',
    businessId: BUSINESS_ID,
    name: 'Test Lead',
    source: 'request_service_form',
    status: 'new',
    submitterIpHash: 'a'.repeat(64),
    fingerprint: 'b'.repeat(64),
    notificationStatus: 'failed',
    notificationAttempts: 2,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function stripeFailure(overrides: Partial<StripeWebhookFailure> = {}): StripeWebhookFailure {
  return {
    id: 'stripefail_1',
    errorCategory: 'invalid_signature',
    errorMessage: 'No signatures found matching the expected signature for payload',
    ttl: Math.floor(Date.now() / 1000) + 1000,
    createdAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListAllBusinesses.mockResolvedValue([{ businessId: BUSINESS_ID, name: 'Acme Plumbing' }]);
  mockListAllScans.mockResolvedValue([]);
  mockListAllScanExecutions.mockResolvedValue([]);
  mockListAllPostcards.mockResolvedValue([]);
  mockListLeadsNeedingNotificationRetry.mockResolvedValue([]);
  mockListRecentStripeWebhookFailures.mockResolvedValue([]);
  mockGetScreenshotDlqDepth.mockResolvedValue(null);
});

describe('scan events', () => {
  it('excludes manual_approval_required scans entirely (expected, frequent, not a failure)', async () => {
    mockListAllScans.mockResolvedValue([scan({ status: 'manual_approval_required', failureCategory: 'missing_website' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(0);
  });

  it('excludes completed/queued/running scans', async () => {
    mockListAllScans.mockResolvedValue([scan({ status: 'completed' }), scan({ scanId: 'scan_2', status: 'queued' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(0);
  });

  it('classifies a retryable Firecrawl failure as safe_retry with a retry_enrichment recovery', async () => {
    mockListAllScans.mockResolvedValue([scan({ status: 'failed', failureCategory: 'firecrawl_timeout' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      recommendedAction: 'safe_retry',
      recovery: { kind: 'retry_enrichment', businessId: BUSINESS_ID, scanId: 'scan_1' },
      businessName: 'Acme Plumbing',
    });
  });

  it('classifies a Firecrawl auth failure as requires_configuration_fix with no recovery button', async () => {
    mockListAllScans.mockResolvedValue([scan({ status: 'failed', failureCategory: 'firecrawl_auth' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('requires_configuration_fix');
    expect(items[0].recovery).toBeUndefined();
  });

  it('classifies a non-retryable, non-auth Firecrawl failure as requires_manual_review', async () => {
    mockListAllScans.mockResolvedValue([scan({ status: 'failed', failureCategory: 'invalid_url' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('requires_manual_review');
    expect(items[0].recovery).toBeUndefined();
  });

  it('classifies a stale Playwright scan as safe_retry with a mark_stale_scan_failed recovery', async () => {
    mockListAllScans.mockResolvedValue([
      scan({ provider: 'playwright', operation: 'screenshot', targetType: 'existing_site', status: 'running', createdAt: staleTimestamp, updatedAt: staleTimestamp }),
    ]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(1);
    expect(items[0].recommendedAction).toBe('safe_retry');
    expect(items[0].recovery).toEqual({ kind: 'mark_stale_scan_failed', businessId: BUSINESS_ID, scanId: 'scan_1' });
  });

  it('never offers retry_enrichment for a non-firecrawl provider even when the category happens to be retryable', async () => {
    mockListAllScans.mockResolvedValue([
      scan({ provider: 'openai', operation: 'score', status: 'failed', failureCategory: 'ai_timeout' }),
    ]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recovery).toBeUndefined();
    expect(items[0].recommendedAction).toBe('requires_manual_review');
  });
});

describe('scan executions', () => {
  it('classifies a stale execution as safe_retry with mark_stale_execution_failed', async () => {
    mockListAllScanExecutions.mockResolvedValue([execution({ status: 'running', createdAt: staleTimestamp, updatedAt: staleTimestamp })]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('safe_retry');
    expect(items[0].recovery).toEqual({ kind: 'mark_stale_execution_failed', businessId: BUSINESS_ID, scanExecutionId: 'scanexec_1' });
  });

  it('classifies a retry-eligible failed execution as safe_retry with rerun_scan_workflow', async () => {
    mockListAllScanExecutions.mockResolvedValue([
      execution({
        status: 'failed',
        failure: { step: 'crawling', category: 'provider_timeout', safeMessage: 'Timed out', occurredAt: now, attemptCount: 1, retryEligible: true },
      }),
    ]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('safe_retry');
    expect(items[0].recovery).toEqual({ kind: 'rerun_scan_workflow', businessId: BUSINESS_ID, scanExecutionId: 'scanexec_1' });
  });

  it('classifies a non-retry-eligible failed execution as requires_manual_review with no button', async () => {
    mockListAllScanExecutions.mockResolvedValue([
      execution({
        status: 'failed',
        failure: { step: 'validating', category: 'validation', safeMessage: 'Invalid', occurredAt: now, attemptCount: 1, retryEligible: false },
      }),
    ]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('requires_manual_review');
    expect(items[0].recovery).toBeUndefined();
  });

  it('excludes queued/running (non-stale) and every terminal-but-not-failed status', async () => {
    mockListAllScanExecutions.mockResolvedValue([
      execution({ status: 'running' }),
      execution({ scanExecutionId: 'scanexec_2', status: 'preview_ready' }),
      execution({ scanExecutionId: 'scanexec_3', status: 'qualified' }),
    ]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(0);
  });
});

describe('postcards', () => {
  it('classifies a render-failed postcard (pending, no front artifact) as safe_retry with retry_render_postcard', async () => {
    mockListAllPostcards.mockResolvedValue([postcard({ status: 'pending', frontArtifactKey: undefined })]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(1);
    expect(items[0].recommendedAction).toBe('safe_retry');
    expect(items[0].recovery).toEqual({ kind: 'retry_render_postcard', postcardId: 'postcard_1' });
  });

  it('classifies a submission failure as requires_manual_review with no recovery button (no retry path exists)', async () => {
    mockListAllPostcards.mockResolvedValue([postcard({ status: 'failed', failureReason: 'Address is invalid' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('requires_manual_review');
    expect(items[0].recovery).toBeUndefined();
  });

  it('classifies a submission failure whose message looks auth-related as requires_configuration_fix', async () => {
    mockListAllPostcards.mockResolvedValue([postcard({ status: 'failed', failureReason: 'Unauthorized: invalid API key' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('requires_configuration_fix');
  });

  it('excludes a normal not-yet-approved postcard that rendered successfully', async () => {
    mockListAllPostcards.mockResolvedValue([postcard({ status: 'pending', frontArtifactKey: 'front.pdf' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(0);
  });
});

describe('lead notifications', () => {
  it('classifies a failed lead notification as safe_retry with retry_lead_notification', async () => {
    mockListLeadsNeedingNotificationRetry.mockResolvedValue([lead({ notificationStatus: 'failed' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(1);
    expect(items[0].recommendedAction).toBe('safe_retry');
    expect(items[0].recovery).toEqual({ kind: 'retry_lead_notification', businessId: BUSINESS_ID, leadId: 'lead_1' });
  });

  it('excludes a still-pending (not yet exhausted) lead from the retry candidate list', async () => {
    mockListLeadsNeedingNotificationRetry.mockResolvedValue([lead({ notificationStatus: 'pending' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items).toHaveLength(0);
  });
});

describe('stripe webhook failures', () => {
  it('classifies invalid_signature as requires_configuration_fix', async () => {
    mockListRecentStripeWebhookFailures.mockResolvedValue([stripeFailure({ errorCategory: 'invalid_signature' })]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0].recommendedAction).toBe('requires_configuration_fix');
  });

  it('classifies processing_failed as investigate', async () => {
    mockListRecentStripeWebhookFailures.mockResolvedValue([stripeFailure({ errorCategory: 'processing_failed', businessId: BUSINESS_ID })]);
    const { items } = await aggregateNeedsAttention();
    expect(items[0]).toMatchObject({ recommendedAction: 'investigate', businessName: 'Acme Plumbing' });
  });
});

describe('screenshot DLQ', () => {
  it('adds one investigate item when the DLQ has messages', async () => {
    mockGetScreenshotDlqDepth.mockResolvedValue({ approximateMessageCount: 2 });
    const { items, screenshotDlqDepth } = await aggregateNeedsAttention();
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe('dlq');
    expect(items[0].recommendedAction).toBe('investigate');
    expect(screenshotDlqDepth).toBe(2);
  });

  it('adds nothing when the DLQ is empty or unreadable', async () => {
    mockGetScreenshotDlqDepth.mockResolvedValue({ approximateMessageCount: 0 });
    const empty = await aggregateNeedsAttention();
    expect(empty.items).toHaveLength(0);

    mockGetScreenshotDlqDepth.mockResolvedValue(null);
    const unreadable = await aggregateNeedsAttention();
    expect(unreadable.items).toHaveLength(0);
    expect(unreadable.screenshotDlqDepth).toBeNull();
  });
});

describe('sorting', () => {
  it('sorts every item newest-first across categories', async () => {
    const older = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const newer = new Date().toISOString();
    mockListAllScans.mockResolvedValue([scan({ scanId: 'scan_old', status: 'failed', failureCategory: 'invalid_url', completedAt: older, updatedAt: older })]);
    mockListRecentStripeWebhookFailures.mockResolvedValue([stripeFailure({ id: 'stripefail_new', createdAt: newer })]);

    const { items } = await aggregateNeedsAttention();
    expect(items.map((i) => i.id)).toEqual(['stripe:stripefail_new', 'scan:scan_old']);
  });
});
