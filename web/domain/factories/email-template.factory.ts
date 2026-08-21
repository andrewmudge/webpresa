import type { EmailTemplate, EmailSequence } from '@/domain/models/email-template';
import { EmailTemplateSchema } from '@/domain/schemas/email-template.schema';
import { nowIso } from './utils';

export interface CreateEmailTemplateInput {
  marketingCampaignId: string;
  emailSequence: EmailSequence;
  subject: string;
  body: string;
  /** Admin actorId — absent for system-seeded defaults (see `ensureMarketingCampaignExists`). */
  updatedBy?: string;
}

/** First-ever creation only (system seeding of default copy) — `version` starts at 1. Admin saves/resets of an *existing* row go through `updateEmailTemplate` below instead, which increments `version`. */
export function createEmailTemplate(input: CreateEmailTemplateInput): EmailTemplate {
  const now = nowIso();
  const record: EmailTemplate = {
    marketingCampaignId: input.marketingCampaignId,
    emailSequence: input.emailSequence,
    subject: input.subject,
    body: input.body,
    version: 1,
    ...(input.updatedBy !== undefined && { updatedBy: input.updatedBy }),
    createdAt: now,
    updatedAt: now,
  };
  EmailTemplateSchema.parse(record);
  return record;
}

export interface UpdateEmailTemplateInput {
  subject: string;
  body: string;
  updatedBy: string;
}

/** The admin "Save" and "Reset to default" actions both go through this — `version` always increments, `createdAt` is preserved from `existing`. */
export function updateEmailTemplate(existing: EmailTemplate, input: UpdateEmailTemplateInput): EmailTemplate {
  const record: EmailTemplate = {
    ...existing,
    subject: input.subject,
    body: input.body,
    version: existing.version + 1,
    updatedBy: input.updatedBy,
    updatedAt: nowIso(),
  };
  EmailTemplateSchema.parse(record);
  return record;
}
