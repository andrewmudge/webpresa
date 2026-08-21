import type { MutableTimestampedRecord } from './common';

/**
 * The 3 steps of the Postcard Follow-Up drip campaign. Fixed at 3 for MVP —
 * see `implementation.md`, Marketing stage, "MVP scope".
 */
export const EMAIL_SEQUENCES = [1, 2, 3] as const;
export type EmailSequence = (typeof EMAIL_SEQUENCES)[number];

/**
 * Admin-editable subject/body for one step of one campaign. A single plain
 * text `body` (paragraph breaks as blank lines), not separate HTML/text
 * fields — keeps the editor intentionally simple for MVP (see
 * `implementation.md`, Marketing stage, "Email template editor") and
 * removes any risk of the two representations drifting. `renderTemplate()`
 * (`lib/marketing/render-template.ts`) derives both the HTML email body
 * (escaped, paragraph-wrapped, CTA auto-linked) and the plain text body
 * from this one source at send time.
 *
 * Current-state only — no version-history table. Templates resolve at send
 * time (not snapshotted when a business enrolls), but the actually-rendered
 * output is snapshotted onto the `MarketingMessage` record produced by that
 * send, which is the durable "what was sent" audit trail. See
 * `implementation.md`, Marketing stage, "Template versioning".
 */
export interface EmailTemplate extends MutableTimestampedRecord {
  marketingCampaignId: string;
  emailSequence: EmailSequence;
  subject: string;
  body: string;
  /** Incremented on every save — informational only, not used for lookups. */
  version: number;
  /** Admin actorId of whoever last saved this template. */
  updatedBy?: string;
}
