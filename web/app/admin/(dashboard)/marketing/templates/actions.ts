'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { validateTemplateVariables } from '@/lib/marketing/template-variables';
import { getEmailTemplate, putEmailTemplate } from '@/lib/db/marketing-email-templates';
import { createEmailTemplate, updateEmailTemplate } from '@/domain/factories/email-template.factory';
import { DEFAULT_EMAIL_TEMPLATES } from '@/lib/marketing/default-templates';
import { MARKETING_CAMPAIGN_ID } from '@/lib/marketing/constants';
import { renderTemplate } from '@/lib/marketing/render-template';
import { sendMarketingCampaignEmail } from '@/lib/ses/send-marketing-email';
import { isNonProdRecipientAllowed } from '@/lib/marketing/test-recipient-allowlist';
import { log } from '@/lib/logging/log';

export interface TemplateActionState {
  ok: boolean;
  error?: string;
}

const EmailSequenceSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** The load-bearing gate — an unrecognized `{{variable}}` fails validation before it can ever reach a save, per `implementation.md`, Marketing stage, "Email template editor": "Unknown variables should generate a validation error instead of silently producing broken email." */
const SaveTemplateSchema = z
  .object({
    emailSequence: EmailSequenceSchema,
    subject: z.string().min(1).max(300),
    body: z.string().min(1).max(20000),
  })
  .refine((data) => validateTemplateVariables(data.subject).valid, { message: 'Subject contains an unsupported variable — only {{businessName}}, {{previewUrl}}, {{unsubscribeUrl}} are allowed.', path: ['subject'] })
  .refine((data) => validateTemplateVariables(data.body).valid, { message: 'Body contains an unsupported variable — only {{businessName}}, {{previewUrl}}, {{unsubscribeUrl}} are allowed.', path: ['body'] });

export async function saveTemplateAction(_prevState: TemplateActionState | undefined, formData: FormData): Promise<TemplateActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };

  const parsed = SaveTemplateSchema.safeParse({
    emailSequence: Number(formData.get('emailSequence')),
    subject: formData.get('subject'),
    body: formData.get('body'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid template' };

  const existing = await getEmailTemplate(MARKETING_CAMPAIGN_ID, parsed.data.emailSequence);
  const updated = existing
    ? updateEmailTemplate(existing, { subject: parsed.data.subject, body: parsed.data.body, updatedBy: session.sub })
    : createEmailTemplate({
        marketingCampaignId: MARKETING_CAMPAIGN_ID,
        emailSequence: parsed.data.emailSequence,
        subject: parsed.data.subject,
        body: parsed.data.body,
        updatedBy: session.sub,
      });

  await putEmailTemplate(updated);
  log({
    event: 'admin.marketing.template_edited',
    component: 'admin-actions',
    actorId: session.sub,
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    emailSequence: parsed.data.emailSequence,
  });
  revalidatePath('/admin/marketing/templates');
  return { ok: true };
}

const ResetTemplateSchema = z.object({ emailSequence: EmailSequenceSchema });

export async function resetTemplateAction(_prevState: TemplateActionState | undefined, formData: FormData): Promise<TemplateActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };

  const parsed = ResetTemplateSchema.safeParse({ emailSequence: Number(formData.get('emailSequence')) });
  if (!parsed.success) return { ok: false, error: 'Invalid template step' };

  const defaults = DEFAULT_EMAIL_TEMPLATES[parsed.data.emailSequence];
  const existing = await getEmailTemplate(MARKETING_CAMPAIGN_ID, parsed.data.emailSequence);
  const updated = existing
    ? updateEmailTemplate(existing, { subject: defaults.subject, body: defaults.body, updatedBy: session.sub })
    : createEmailTemplate({
        marketingCampaignId: MARKETING_CAMPAIGN_ID,
        emailSequence: parsed.data.emailSequence,
        subject: defaults.subject,
        body: defaults.body,
        updatedBy: session.sub,
      });

  await putEmailTemplate(updated);
  log({
    event: 'admin.marketing.template_reset',
    component: 'admin-actions',
    actorId: session.sub,
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    emailSequence: parsed.data.emailSequence,
  });
  revalidatePath('/admin/marketing/templates');
  return { ok: true };
}

const SendTestEmailSchema = z.object({
  emailSequence: EmailSequenceSchema,
  subject: z.string().min(1),
  body: z.string().min(1),
  to: z.string().email('Enter a valid email address'),
});

/**
 * Sends the currently-rendered (possibly unsaved) template content through
 * `sendMarketingCampaignEmail` directly — bypasses `MarketingOutreach`/
 * `MarketingMessage`/eligibility entirely, since a test send is never a
 * real campaign step (see `implementation.md`, Marketing stage, "Email
 * template UX", "Test Email": "Never accidentally launch a prospect
 * campaign from the test-email action."). Still subject to the non-prod
 * recipient allowlist — dev/preview environments can't use this to email a
 * real address either.
 */
export async function sendTestEmailAction(_prevState: TemplateActionState | undefined, formData: FormData): Promise<TemplateActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };

  const parsed = SendTestEmailSchema.safeParse({
    emailSequence: Number(formData.get('emailSequence')),
    subject: formData.get('subject'),
    body: formData.get('body'),
    to: formData.get('to'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid test email request' };

  const variableCheck = validateTemplateVariables(`${parsed.data.subject}\n${parsed.data.body}`);
  if (!variableCheck.valid) {
    return { ok: false, error: `Unsupported variable: ${variableCheck.unknownVariables.join(', ')}` };
  }

  if (!isNonProdRecipientAllowed(parsed.data.to)) {
    return { ok: false, error: 'This recipient is not on the non-production test allowlist (MARKETING_TEST_RECIPIENT_ALLOWLIST).' };
  }

  const rendered = await renderTemplate({
    template: { subject: parsed.data.subject, body: parsed.data.body },
    business: { businessId: 'biz_test_preview', name: 'Pensacola Plumbing Co.', slug: 'pensacola-plumbing-co' },
    unsubscribeToken: 'test-preview-token',
    messageId: 'mktgmsg_test_preview',
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    emailSequence: parsed.data.emailSequence,
  });

  const testBanner = '<p style="background:#FEF3C7;padding:8px 12px;border-radius:8px;font-size:12px;color:#92400E;margin:0 0 16px;">This is a TEST message — not a real campaign send.</p>';

  const result = await sendMarketingCampaignEmail({
    to: parsed.data.to,
    subject: `[TEST] ${rendered.subject}`,
    htmlBody: testBanner + rendered.htmlBody,
    textBody: `[TEST MESSAGE — not a real campaign send]\n\n${rendered.textBody}`,
  });

  log({
    event: 'admin.marketing.test_email_sent',
    component: 'admin-actions',
    actorId: session.sub,
    marketingCampaignId: MARKETING_CAMPAIGN_ID,
    emailSequence: parsed.data.emailSequence,
    status: result.ok ? 'ok' : 'failed',
  });

  if (!result.ok) return { ok: false, error: `Send failed: ${result.error}` };
  return { ok: true };
}
