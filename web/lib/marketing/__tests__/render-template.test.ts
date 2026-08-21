/**
 * Unit tests for renderTemplate() — the single function used by real sends,
 * the admin preview pane, and "Send Test Email" alike, so its output must
 * be exactly right: correct substitution, HTML-escaping of plain-text
 * content converted to HTML, and click-tracking wrapping only in the HTML
 * body (never the text body).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockResolveAppBaseUrl, mockCreateClickToken } = vi.hoisted(() => ({
  mockResolveAppBaseUrl: vi.fn(),
  mockCreateClickToken: vi.fn(),
}));

vi.mock('@/lib/env/app-base-url', () => ({ resolveAppBaseUrl: mockResolveAppBaseUrl }));
vi.mock('../click-token', () => ({ createClickToken: mockCreateClickToken }));

import { renderTemplate } from '../render-template';

const BUSINESS = { businessId: 'biz_1', name: 'Pensacola Plumbing Co.', slug: 'pensacola-plumbing-co' };

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveAppBaseUrl.mockReturnValue('https://webpresa.com');
  mockCreateClickToken.mockResolvedValue('TRACKED_TOKEN');
});

describe('renderTemplate — substitution', () => {
  it('substitutes all 3 supported variables in the subject and text body', async () => {
    const result = await renderTemplate({
      template: { subject: 'Hi {{businessName}}', body: 'See {{previewUrl}} or unsubscribe: {{unsubscribeUrl}}' },
      business: BUSINESS,
      unsubscribeToken: 'unsub-tok-123',
      messageId: 'mktgmsg_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 1,
    });

    expect(result.subject).toBe('Hi Pensacola Plumbing Co.');
    expect(result.textBody).toContain('https://webpresa.com/b/pensacola-plumbing-co');
    expect(result.textBody).toContain('https://webpresa.com/unsubscribe/unsub-tok-123');
  });

  it('wraps the HTML body preview link through the click-tracking redirect, never the text body', async () => {
    const result = await renderTemplate({
      template: { subject: 'Hi {{businessName}}', body: 'See {{previewUrl}}' },
      business: BUSINESS,
      unsubscribeToken: 'unsub-tok-123',
      messageId: 'mktgmsg_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 1,
    });

    expect(result.htmlBody).toContain('href="https://webpresa.com/e/TRACKED_TOKEN"');
    expect(result.textBody).not.toContain('/e/TRACKED_TOKEN');
    expect(result.textBody).toContain('https://webpresa.com/b/pensacola-plumbing-co');
  });

  it('passes the click token an unwrapped destinationUrl (the raw preview page, not itself wrapped)', async () => {
    await renderTemplate({
      template: { subject: 'x', body: '{{previewUrl}}' },
      business: BUSINESS,
      unsubscribeToken: 'tok',
      messageId: 'mktgmsg_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 2,
    });

    expect(mockCreateClickToken).toHaveBeenCalledWith(
      expect.objectContaining({ destinationUrl: 'https://webpresa.com/b/pensacola-plumbing-co', emailSequence: 2, businessId: 'biz_1' }),
    );
  });
});

describe('renderTemplate — HTML escaping (plain text body converted to HTML)', () => {
  it('escapes HTML-significant characters in the admin-authored body text', async () => {
    const result = await renderTemplate({
      template: { subject: 'x', body: 'Price < $50 & > free shipping' },
      business: BUSINESS,
      unsubscribeToken: 'tok',
      messageId: 'mktgmsg_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 1,
    });
    expect(result.htmlBody).toContain('Price &lt; $50 &amp; &gt; free shipping');
    expect(result.htmlBody).not.toContain('<50');
  });

  it('escapes a business name containing HTML-significant characters (XSS guard)', async () => {
    const result = await renderTemplate({
      template: { subject: 'x', body: '{{businessName}}' },
      business: { ...BUSINESS, name: '<script>alert(1)</script>' },
      unsubscribeToken: 'tok',
      messageId: 'mktgmsg_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 1,
    });
    expect(result.htmlBody).not.toContain('<script>');
    expect(result.htmlBody).toContain('&lt;script&gt;');
  });

  it('converts blank-line paragraph breaks into <p> tags', async () => {
    const result = await renderTemplate({
      template: { subject: 'x', body: 'First paragraph.\n\nSecond paragraph.' },
      business: BUSINESS,
      unsubscribeToken: 'tok',
      messageId: 'mktgmsg_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 1,
    });
    expect(result.htmlBody).toContain('<p>First paragraph.</p>');
    expect(result.htmlBody).toContain('<p>Second paragraph.</p>');
  });
});

describe('renderTemplate — defensive unknown-variable handling', () => {
  it('leaves an unrecognized {{variable}} as literal text rather than throwing', async () => {
    const result = await renderTemplate({
      template: { subject: 'x', body: 'Hello {{firstName}}, welcome' },
      business: BUSINESS,
      unsubscribeToken: 'tok',
      messageId: 'mktgmsg_1',
      marketingCampaignId: 'mktgcampaign_postcard_followup',
      emailSequence: 1,
    });
    expect(result.textBody).toContain('{{firstName}}');
    expect(result.htmlBody).toContain('{{firstName}}');
  });
});
