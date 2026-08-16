import { CTA_ACTION_TYPES } from '@/domain/models/site-preview';

/** Shared between the primary CTA select (`ContactTab.tsx`) and the secondary CTA select (`SecondaryCtaFields.tsx`). */
export const CTA_TYPE_LABELS: Record<(typeof CTA_ACTION_TYPES)[number], string> = {
  phone: 'Call',
  email: 'Email',
  sms: 'Text message',
  external_url: 'Link to a page',
  request_service: 'Open request form',
  none: 'Hidden',
};
