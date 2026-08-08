import type { PostcardStatus } from '@/domain/models/postcard';

/**
 * Maps a Lob webhook `event_type` string to Webpresa's internal `Postcard`
 * rollup fields — mirrors `web/lib/stripe/status-mapping.ts`'s pure-switch
 * shape.
 *
 * Event type strings confirmed against Lob's live docs (help.lob.com's
 * webhooks guide + a search of their published tracking-event names):
 * `postcard.mailed`, `postcard.in_transit`, `postcard.in_local_area`,
 * `postcard.processed_for_delivery`, `postcard.re-routed`,
 * `postcard.returned_to_sender` are all directly confirmed.
 * `postcard.delivered` is inferred from the same `postcard.<snake_case>`
 * naming convention plus Lob's own prose ("'Delivered' is typically the
 * last event... for First and Standard Class mailings") — not seen
 * verbatim in the fetched docs, so double-check it against a real webhook
 * payload the first time a test postcard actually gets tracked, and
 * correct this mapping if the real string differs.
 *
 * Only `mailed`/`delivered`/`returned_to_sender` change the rollup — the
 * in-flight tracking milestones are intentionally informational-only
 * (still recorded in full in `PostcardWebhookEvent` history by the
 * webhook route, just without moving `Postcard.status`), since
 * `POSTCARD_STATUSES` only models pending → submitting → submitted →
 * mailed → delivered/failed, not USPS's finer-grained transit states.
 */
export interface MappedPostcardEvent {
  status?: PostcardStatus;
  mailedAt?: string;
  deliveredAt?: string;
  failureReason?: string;
}

export function mapLobEventToPostcardStatus(eventType: string, occurredAt: string): MappedPostcardEvent {
  switch (eventType) {
    case 'postcard.mailed':
      return { status: 'mailed', mailedAt: occurredAt };
    case 'postcard.delivered':
      return { status: 'delivered', deliveredAt: occurredAt };
    case 'postcard.returned_to_sender':
      return { status: 'failed', failureReason: 'Returned to sender by USPS.' };
    case 'postcard.in_transit':
    case 'postcard.in_local_area':
    case 'postcard.processed_for_delivery':
    case 'postcard.re-routed':
      return {};
    default:
      return {};
  }
}
