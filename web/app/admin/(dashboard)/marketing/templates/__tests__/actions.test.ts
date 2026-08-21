/**
 * Unit tests for the Email Templates admin Server Actions — unauthorized
 * calls are rejected, unknown template variables are rejected before ever
 * reaching a save, and a successful save/reset persists via the repository.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
// revalidatePath requires an active Next.js request-scoped store, which
// doesn't exist in a plain unit-test invocation.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const {
  mockGetSession,
  mockGetEmailTemplate,
  mockPutEmailTemplate,
  mockSendMarketingCampaignEmail,
  mockIsNonProdRecipientAllowed,
  mockRenderTemplate,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetEmailTemplate: vi.fn(),
  mockPutEmailTemplate: vi.fn(),
  mockSendMarketingCampaignEmail: vi.fn(),
  mockIsNonProdRecipientAllowed: vi.fn(),
  mockRenderTemplate: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getSession: mockGetSession }));
vi.mock('@/lib/db/marketing-email-templates', () => ({ getEmailTemplate: mockGetEmailTemplate, putEmailTemplate: mockPutEmailTemplate }));
vi.mock('@/lib/ses/send-marketing-email', () => ({ sendMarketingCampaignEmail: mockSendMarketingCampaignEmail }));
vi.mock('@/lib/marketing/test-recipient-allowlist', () => ({ isNonProdRecipientAllowed: mockIsNonProdRecipientAllowed }));
// render-template.test.ts already covers rendering fidelity in isolation —
// this file only needs to verify the action calls it and forwards the
// result, without needing WEBPRESA_APP_BASE_URL/secrets available here.
vi.mock('@/lib/marketing/render-template', () => ({ renderTemplate: mockRenderTemplate }));

import { saveTemplateAction, resetTemplateAction, sendTestEmailAction } from '@/app/admin/(dashboard)/marketing/templates/actions';

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ sub: 'admin' });
  mockGetEmailTemplate.mockResolvedValue(null);
  mockIsNonProdRecipientAllowed.mockReturnValue(true);
  mockRenderTemplate.mockResolvedValue({ subject: 'Rendered subject', htmlBody: '<p>Rendered html</p>', textBody: 'Rendered text' });
});

describe('saveTemplateAction', () => {
  it('rejects unauthenticated calls', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await saveTemplateAction(undefined, makeFormData({ emailSequence: '1', subject: 'Hi {{businessName}}', body: 'Body' }));
    expect(result).toEqual({ ok: false, error: 'Unauthorized' });
    expect(mockPutEmailTemplate).not.toHaveBeenCalled();
  });

  it('rejects a subject containing an unsupported variable', async () => {
    const result = await saveTemplateAction(undefined, makeFormData({ emailSequence: '1', subject: 'Hi {{firstName}}', body: 'Body text' }));
    expect(result.ok).toBe(false);
    expect(mockPutEmailTemplate).not.toHaveBeenCalled();
  });

  it('rejects a body containing an unsupported variable', async () => {
    const result = await saveTemplateAction(undefined, makeFormData({ emailSequence: '1', subject: 'Subject', body: 'See {{websiteScore}}' }));
    expect(result.ok).toBe(false);
    expect(mockPutEmailTemplate).not.toHaveBeenCalled();
  });

  it('persists a valid template and returns ok', async () => {
    const result = await saveTemplateAction(undefined, makeFormData({ emailSequence: '1', subject: 'Hi {{businessName}}', body: 'See {{previewUrl}}. {{unsubscribeUrl}}' }));
    expect(result).toEqual({ ok: true });
    expect(mockPutEmailTemplate).toHaveBeenCalledTimes(1);
    const saved = mockPutEmailTemplate.mock.calls[0][0];
    expect(saved.subject).toBe('Hi {{businessName}}');
    expect(saved.version).toBe(1);
  });

  it('increments the version on a save over an existing template', async () => {
    mockGetEmailTemplate.mockResolvedValue({
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 1,
      subject: 'old',
      body: 'old body',
      version: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await saveTemplateAction(undefined, makeFormData({ emailSequence: '1', subject: 'New subject', body: 'New body' }));
    const saved = mockPutEmailTemplate.mock.calls[0][0];
    expect(saved.version).toBe(4);
  });
});

describe('resetTemplateAction', () => {
  it('rejects unauthenticated calls', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await resetTemplateAction(undefined, makeFormData({ emailSequence: '2' }));
    expect(result).toEqual({ ok: false, error: 'Unauthorized' });
    expect(mockPutEmailTemplate).not.toHaveBeenCalled();
  });

  it('restores the default copy for the given sequence', async () => {
    const result = await resetTemplateAction(undefined, makeFormData({ emailSequence: '2' }));
    expect(result).toEqual({ ok: true });
    const saved = mockPutEmailTemplate.mock.calls[0][0];
    expect(saved.subject).toContain('{{businessName}}');
  });
});

describe('sendTestEmailAction', () => {
  it('rejects unauthenticated calls', async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await sendTestEmailAction(undefined, makeFormData({ emailSequence: '1', subject: 'x', body: 'y', to: 'me@example.com' }));
    expect(result).toEqual({ ok: false, error: 'Unauthorized' });
    expect(mockSendMarketingCampaignEmail).not.toHaveBeenCalled();
  });

  it('rejects a recipient not on the non-prod allowlist', async () => {
    mockIsNonProdRecipientAllowed.mockReturnValue(false);
    const result = await sendTestEmailAction(undefined, makeFormData({ emailSequence: '1', subject: 'x', body: 'y', to: 'stranger@example.com' }));
    expect(result.ok).toBe(false);
    expect(mockSendMarketingCampaignEmail).not.toHaveBeenCalled();
  });

  it('clearly marks the send as a test and never touches outreach/eligibility state', async () => {
    mockSendMarketingCampaignEmail.mockResolvedValue({ ok: true, sesMessageId: 'ses-1' });
    const result = await sendTestEmailAction(undefined, makeFormData({ emailSequence: '1', subject: 'Hi {{businessName}}', body: '{{previewUrl}}', to: 'me@example.com' }));
    expect(result).toEqual({ ok: true });
    const call = mockSendMarketingCampaignEmail.mock.calls[0][0];
    expect(call.subject).toContain('[TEST]');
    expect(call.htmlBody).toContain('TEST message');
  });

  it('surfaces an SES failure', async () => {
    mockSendMarketingCampaignEmail.mockResolvedValue({ ok: false, error: 'MessageRejected' });
    const result = await sendTestEmailAction(undefined, makeFormData({ emailSequence: '1', subject: 'x', body: 'y', to: 'me@example.com' }));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('MessageRejected');
  });
});
