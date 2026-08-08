import type { PostcardStatus } from '@/domain/models/postcard';

/**
 * Maps a Lob webhook `event_type` string to Webpresa's internal `Postcard`
 * rollup fields — mirrors `web/lib/stripe/status-mapping.ts`'s pure-switch
 * shape.
 *
 * Event type strings confirmed directly against the live event-type
 * picker in Lob's own dashboard (2026-08-08, screenshotted while creating
 * the actual webhook) — more authoritative than the scraped docs this
 * file originally cited, which turned out to reference a `postcard.mailed`
 * event that **does not actually exist** in the current product. The real
 * full set: `postcard.billed`, `created`, `deleted`, `delivered`,
 * `failed`, `in_local_area`, `in_transit`,
 * `informed_delivery.email_{sent,opened,clicked_through}`,
 * `international_exit`, `processed_for_delivery`, `re-routed`,
 * `rejected`, `rendered_pdf`, `rendered_thumbnails`,
 * `returned_to_sender`, `viewed`.
 *
 * `billed` is what this maps to `'mailed'` — Lob bills a piece once it's
 * actually been produced and handed to USPS, which is the closest real
 * equivalent to "mailed" in the confirmed event set (there is no separate
 * `postcard.mailed`/`postcard.printed` event). `failed` and `rejected`
 * both map to Webpresa's `'failed'` status — Lob distinguishes
 * pre-production validation failures (`rejected`) from
 * processing/production failures (`failed`), a distinction this stage's
 * internal model doesn't need to preserve, so both collapse to the same
 * outcome (the full raw payload is still preserved verbatim in
 * `PostcardWebhookEvent.rawPayload` either way).
 *
 * The remaining confirmed events (`created`, `deleted`, `rendered_pdf`,
 * `rendered_thumbnails`, `international_exit`, `viewed`,
 * `informed_delivery.*`) and any in-flight tracking milestones
 * (`in_transit`, `in_local_area`, `processed_for_delivery`, `re-routed`)
 * are intentionally informational-only — still recorded in full in
 * `PostcardWebhookEvent` history by the webhook route, just without
 * moving `Postcard.status`, since `POSTCARD_STATUSES` only models
 * pending → submitting → submitted → mailed → delivered/failed, not
 * USPS's finer-grained transit states.
 */
export interface MappedPostcardEvent {
  status?: PostcardStatus;
  mailedAt?: string;
  deliveredAt?: string;
  failureReason?: string;
}

export function mapLobEventToPostcardStatus(eventType: string, occurredAt: string): MappedPostcardEvent {
  switch (eventType) {
    case 'postcard.billed':
      return { status: 'mailed', mailedAt: occurredAt };
    case 'postcard.delivered':
      return { status: 'delivered', deliveredAt: occurredAt };
    case 'postcard.failed':
      return { status: 'failed', failureReason: 'Lob reported this postcard failed processing.' };
    case 'postcard.rejected':
      return { status: 'failed', failureReason: 'Rejected by Lob before production (e.g. invalid artwork or address).' };
    case 'postcard.returned_to_sender':
      return { status: 'failed', failureReason: 'Returned to sender by USPS.' };
    case 'postcard.created':
    case 'postcard.deleted':
    case 'postcard.rendered_pdf':
    case 'postcard.rendered_thumbnails':
    case 'postcard.in_transit':
    case 'postcard.in_local_area':
    case 'postcard.processed_for_delivery':
    case 'postcard.re-routed':
    case 'postcard.international_exit':
    case 'postcard.viewed':
    case 'postcard.informed_delivery.email_sent':
    case 'postcard.informed_delivery.email_opened':
    case 'postcard.informed_delivery.email_clicked_through':
      return {};
    default:
      return {};
  }
}
