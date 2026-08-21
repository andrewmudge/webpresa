import type { EmailSequence } from '@/domain/models/email-template';

const OFFSET_HOURS_BY_SEQUENCE: Record<EmailSequence, number> = {
  1: 24,
  2: 4 * 24,
  3: 10 * 24,
};

/**
 * Every step's due timestamp is computed from the original postcard
 * `deliveredAt`, never from "now" or a prior step's actual send timestamp —
 * a late-sent Email 1 (e.g. after a cron outage) must not push Email 2/3
 * later too. See `implementation.md`, Marketing stage, "Drip campaign
 * timing".
 */
export function computeNextActionAt(deliveredAt: string, sequence: EmailSequence): string {
  const deliveredAtMs = new Date(deliveredAt).getTime();
  const offsetMs = OFFSET_HOURS_BY_SEQUENCE[sequence] * 60 * 60 * 1000;
  return new Date(deliveredAtMs + offsetMs).toISOString();
}
