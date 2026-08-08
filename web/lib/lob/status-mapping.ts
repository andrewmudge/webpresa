import type { PostcardStatus } from '@/domain/models/postcard';

/**
 * Maps a Lob webhook `event_type` string to Webpresa's internal `Postcard`
 * rollup fields — mirrors `web/lib/stripe/status-mapping.ts`'s pure-switch
 * shape.
 *
 * Event type strings confirmed directly against the live event-type
 * picker in Lob's own dashboard (2026-08-08, screenshotted while creating
 * the actual webhook). `postcard.mailed` **is** a real Lob event (this
 * file previously and incorrectly said it wasn't) — it just wasn't
 * offered as a selectable option in that Test-environment webhook's
 * event-type picker. The likely reason: test-mode postcards are never
 * actually physically produced or handed to USPS, so live-mailing
 * lifecycle events (`mailed`, and probably the tracking milestones that
 * were greyed out for the same reason — `delivered`, `in_transit`,
 * `in_local_area`, `processed_for_delivery`, `returned_to_sender`) don't
 * apply to a test webhook and aren't offered there. `postcard.billed`
 * *was* selectable and *is* what the current dev webhook (test-mode)
 * actually subscribes to and receives — Lob bills a piece once it's
 * produced, the closest thing test mode has to a "this would have been
 * mailed" signal.
 *
 * Both `billed` and `mailed` map to `'mailed'` below, so this is already
 * correct without a future code change:
 *   - **Now (test mode)**: `billed` fires, `mailed` never does.
 *   - **After going live** (a live `apiKey` with a payment method on
 *     file — see `web/lib/lob/client.ts`'s doc comment): re-open the Lob
 *     dashboard, create/update the Live-environment webhook, and check
 *     `postcard.mailed` there (and the other now-real tracking events
 *     above, if desired) — Lob's real physical-mail lifecycle should
 *     fire `mailed` instead of/alongside `billed` at that point. No
 *     change needed here when that happens; `billed`'s case below can be
 *     removed at that point if it turns out live mode doesn't also send
 *     it, but there's no harm leaving both mapped to the same outcome.
 *
 * `failed` and `rejected` both map to Webpresa's `'failed'` status — Lob
 * distinguishes pre-production validation failures (`rejected`) from
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
    // Live-mode-only placeholder — not selectable/received under the
    // current test-mode webhook, but real once a live API key with a
    // payment method on file is in use. See this file's doc comment.
    case 'postcard.mailed':
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
