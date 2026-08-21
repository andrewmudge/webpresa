import 'server-only';
import type { EmailTemplate, EmailSequence } from '@/domain/models/email-template';
import type { Business } from '@/domain/models/business';
import { resolveAppBaseUrl } from '@/lib/env/app-base-url';
import { createClickToken } from './click-token';
import { ALLOWED_TEMPLATE_VARIABLES, VARIABLE_PATTERN, type AllowedTemplateVariable } from './template-variables';

export interface RenderTemplateInput {
  template: Pick<EmailTemplate, 'subject' | 'body'>;
  business: Pick<Business, 'businessId' | 'name' | 'slug'>;
  unsubscribeToken: string;
  messageId: string;
  marketingCampaignId: string;
  emailSequence: EmailSequence;
}

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain substitution for subject lines and the text body — no escaping (the destination isn't HTML). Unknown variables (belt-and-suspenders — the admin save path already rejects these via `validateTemplateVariables`) are left as literal `{{...}}` text rather than throwing, so one malformed template can't crash a whole cron sweep. */
function substitutePlainVariables(text: string, values: Record<AllowedTemplateVariable, string>): string {
  return text.replace(VARIABLE_PATTERN, (full, name: string) => {
    if ((ALLOWED_TEMPLATE_VARIABLES as readonly string[]).includes(name)) {
      return values[name as AllowedTemplateVariable];
    }
    return full;
  });
}

/**
 * Converts the admin's plain-text body into an HTML email body: every
 * literal text segment is HTML-escaped (the body is *plain* text being
 * converted to HTML, not trusted markup — a literal `<` in an admin's
 * prose must not be interpreted as a tag), `{{previewUrl}}`/
 * `{{unsubscribeUrl}}` become real `<a href>` links (click tracking
 * requires an actual anchor, not just visible URL text), `{{businessName}}`
 * is inserted as escaped text, and blank-line paragraph breaks become
 * `<p>`/`<br />`.
 */
function renderHtmlBody(
  plainBody: string,
  opts: { businessName: string; previewHref: string; previewText: string; unsubscribeHref: string },
): string {
  let result = '';
  let lastIndex = 0;

  for (const match of plainBody.matchAll(VARIABLE_PATTERN)) {
    const [full, name] = match;
    const start = match.index ?? 0;
    result += escapeHtml(plainBody.slice(lastIndex, start));

    if (name === 'businessName') {
      result += escapeHtml(opts.businessName);
    } else if (name === 'previewUrl') {
      result += `<a href="${escapeHtml(opts.previewHref)}">${escapeHtml(opts.previewText)}</a>`;
    } else if (name === 'unsubscribeUrl') {
      result += `<a href="${escapeHtml(opts.unsubscribeHref)}">${escapeHtml(opts.unsubscribeHref)}</a>`;
    } else {
      result += escapeHtml(full);
    }
    lastIndex = start + full.length;
  }
  result += escapeHtml(plainBody.slice(lastIndex));

  const paragraphs = result.split(/\n{2,}/).map((paragraph) => paragraph.split('\n').join('<br />'));
  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('\n');
}

/**
 * Renders one template against one business — the single function used by
 * the real send path, the admin preview pane, and "Send Test Email" alike
 * (see `implementation.md`, Marketing stage, "Template versioning" —
 * guarantees WYSIWYG parity, no separate preview logic).
 *
 * `{{previewUrl}}` resolves to `/b/[slug]` (the live business preview page)
 * wrapped through the `/e/[token]` click-tracking redirect for the HTML
 * body's link; the text body uses the raw, unwrapped URL — click tracking
 * only matters for HTML clients with real link rendering.
 */
export async function renderTemplate(input: RenderTemplateInput): Promise<RenderedEmail> {
  const { template, business, unsubscribeToken, messageId, marketingCampaignId, emailSequence } = input;
  const baseUrl = resolveAppBaseUrl();
  const rawPreviewUrl = `${baseUrl}/b/${business.slug}`;
  const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`;

  const trackedPreviewToken = await createClickToken({
    messageId,
    businessId: business.businessId,
    marketingCampaignId,
    emailSequence,
    linkLabel: 'preview',
    destinationUrl: rawPreviewUrl,
  });
  const trackedPreviewUrl = `${baseUrl}/e/${trackedPreviewToken}`;

  const plainValues: Record<AllowedTemplateVariable, string> = {
    businessName: business.name,
    previewUrl: rawPreviewUrl,
    unsubscribeUrl,
  };

  return {
    subject: substitutePlainVariables(template.subject, plainValues),
    textBody: substitutePlainVariables(template.body, plainValues),
    htmlBody: renderHtmlBody(template.body, {
      businessName: business.name,
      previewHref: trackedPreviewUrl,
      previewText: rawPreviewUrl,
      unsubscribeHref: unsubscribeUrl,
    }),
  };
}
