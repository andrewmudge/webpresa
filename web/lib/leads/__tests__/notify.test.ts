/**
 * Unit tests for `sendLeadNotificationAndRecordOutcome` — specifically the
 * `leadNotificationEmail` → `email` fallback targeting logic. SES and the
 * DB write are mocked; `createLead` (the real factory) builds fixtures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockSendLeadNotificationEmail, mockUpdateLeadNotificationOutcome } = vi.hoisted(() => ({
  mockSendLeadNotificationEmail: vi.fn(),
  mockUpdateLeadNotificationOutcome: vi.fn(),
}));

vi.mock('@/lib/ses/send-lead-notification', () => ({
  sendLeadNotificationEmail: mockSendLeadNotificationEmail,
}));

vi.mock('@/lib/db/leads', () => ({
  updateLeadNotificationOutcome: mockUpdateLeadNotificationOutcome,
}));

import { sendLeadNotificationAndRecordOutcome } from '@/lib/leads/notify';
import { createLead } from '@/domain/factories/lead.factory';

const LEAD = createLead({
  businessId: 'biz_1',
  name: 'Jane Customer',
  submitterIpHash: 'a'.repeat(64),
  fingerprint: 'b'.repeat(64),
});

const BUSINESS_BASE = { name: 'Acme Plumbing', slug: 'acme-plumbing' };

beforeEach(() => {
  vi.clearAllMocks();
  mockSendLeadNotificationEmail.mockResolvedValue({ ok: true });
  mockUpdateLeadNotificationOutcome.mockResolvedValue(undefined);
});

describe('sendLeadNotificationAndRecordOutcome — targeting', () => {
  it('prefers leadNotificationEmail over email when both are set', async () => {
    await sendLeadNotificationAndRecordOutcome(LEAD, {
      ...BUSINESS_BASE,
      email: 'public@acme.com',
      leadNotificationEmail: 'leads@acme.com',
    });

    expect(mockSendLeadNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'leads@acme.com' }));
  });

  it('falls back to email when leadNotificationEmail is unset', async () => {
    await sendLeadNotificationAndRecordOutcome(LEAD, {
      ...BUSINESS_BASE,
      email: 'public@acme.com',
      leadNotificationEmail: undefined,
    });

    expect(mockSendLeadNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'public@acme.com' }));
  });

  it('records business_has_no_notification_email when neither is set', async () => {
    await sendLeadNotificationAndRecordOutcome(LEAD, {
      ...BUSINESS_BASE,
      email: undefined,
      leadNotificationEmail: undefined,
    });

    expect(mockSendLeadNotificationEmail).not.toHaveBeenCalled();
    expect(mockUpdateLeadNotificationOutcome).toHaveBeenCalledWith(LEAD.leadId, {
      status: 'failed',
      error: 'business_has_no_notification_email',
    });
  });

  it('records the sent outcome on a successful send', async () => {
    await sendLeadNotificationAndRecordOutcome(LEAD, { ...BUSINESS_BASE, leadNotificationEmail: 'leads@acme.com' });
    expect(mockUpdateLeadNotificationOutcome).toHaveBeenCalledWith(LEAD.leadId, { status: 'sent' });
  });

  it('records a failed outcome when SES reports an error', async () => {
    mockSendLeadNotificationEmail.mockResolvedValueOnce({ ok: false, error: 'timeout' });
    await sendLeadNotificationAndRecordOutcome(LEAD, { ...BUSINESS_BASE, leadNotificationEmail: 'leads@acme.com' });
    expect(mockUpdateLeadNotificationOutcome).toHaveBeenCalledWith(LEAD.leadId, { status: 'failed', error: 'timeout' });
  });
});
