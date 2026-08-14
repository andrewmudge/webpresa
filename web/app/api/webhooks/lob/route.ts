import { getLobSecret } from '@/lib/secrets';
import { LOB_SIGNATURE_HEADER, LOB_SIGNATURE_TIMESTAMP_HEADER, verifyLobWebhookSignature } from '@/lib/lob/verify-webhook';
import { mapLobEventToPostcardStatus } from '@/lib/lob/status-mapping';
import { getPostcardByProviderPostcardId, applyPostcardWebhookRollup } from '@/lib/db/postcards';
import { putPostcardWebhookEvent } from '@/lib/db/postcard-webhook-events';
import { createPostcardWebhookEvent } from '@/domain/factories/postcard-webhook-event.factory';
import { log } from '@/lib/logging/log';

/**
 * Lob webhook Route Handler (Stage 22 Phase 5) — structured like
 * `web/app/api/webhooks/stripe/route.ts`: verify signature (400 only on
 * failure), write durable history first, then update the rollup only when
 * that history write was newly recorded, and return 200 on
 * recognized-but-irrelevant events, 500 only on genuine internal errors.
 *
 * Registration is out-of-band (Lob dashboard only, no API for it) with
 * `?x-vercel-protection-bypass=<secret>` appended to the URL, reusing the
 * existing Stage 14 bypass secret — see `web/docs/deployment.md`, "Stage
 * 22 — ... deployment guidance", "Still outstanding".
 */

function extractEventType(payload: Record<string, unknown>): string | undefined {
  const raw = payload.event_type;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && typeof (raw as { id?: unknown }).id === 'string') {
    return (raw as { id: string }).id;
  }
  return undefined;
}

function extractProviderPostcardId(payload: Record<string, unknown>): string | undefined {
  const body = payload.body;
  if (body && typeof body === 'object' && typeof (body as { id?: unknown }).id === 'string') {
    return (body as { id: string }).id;
  }
  return undefined;
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text(); // raw, unparsed — required for signature verification
  const signature = request.headers.get(LOB_SIGNATURE_HEADER);
  const timestamp = request.headers.get(LOB_SIGNATURE_TIMESTAMP_HEADER);

  const { webhookSecret } = await getLobSecret();
  if (!webhookSecret) {
    // Fail closed — no webhook has been registered with a real secret yet
    // (see LobSecret.webhookSecret's doc comment), so no request can be
    // trusted regardless of what it claims.
    log({ level: 'warn', event: 'lob.webhook.webhook_secret_not_configured', component: 'lob-webhook' });
    return new Response('Invalid signature', { status: 400 });
  }

  const valid = verifyLobWebhookSignature({ rawBody, signatureHeader: signature, timestampHeader: timestamp, webhookSecret });
  if (!valid) {
    log({ level: 'warn', event: 'lob.webhook.invalid_signature', component: 'lob-webhook' });
    return new Response('Invalid signature', { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    log({ level: 'warn', event: 'lob.webhook.invalid_json', component: 'lob-webhook' });
    return new Response('Invalid payload', { status: 400 });
  }

  const lobEventId = typeof payload.id === 'string' ? payload.id : undefined;
  const eventType = extractEventType(payload);
  const providerPostcardId = extractProviderPostcardId(payload);
  const dateCreated = typeof payload.date_created === 'string' ? payload.date_created : undefined;

  if (!lobEventId || !eventType || !providerPostcardId) {
    // Recognized-but-unusable shape — acknowledge, don't retry forever.
    log({ level: 'warn', event: 'lob.webhook.unresolvable_payload', component: 'lob-webhook', operation: eventType, message: lobEventId });
    return new Response(null, { status: 200 });
  }

  const postcard = await getPostcardByProviderPostcardId(providerPostcardId);
  if (!postcard) {
    log({ level: 'warn', event: 'lob.webhook.unknown_postcard', component: 'lob-webhook', operation: eventType, message: lobEventId });
    return new Response(null, { status: 200 });
  }

  try {
    const occurredAt = dateCreated ?? new Date().toISOString();
    const mapped = mapLobEventToPostcardStatus(eventType, occurredAt);

    const webhookEvent = createPostcardWebhookEvent({
      lobEventId,
      postcardId: postcard.postcardId,
      eventType,
      rawPayload: payload,
      mappedStatus: mapped.status,
    });
    const newlyRecorded = await putPostcardWebhookEvent(webhookEvent);

    if (newlyRecorded && (mapped.status || mapped.mailedAt || mapped.deliveredAt || mapped.failureReason)) {
      await applyPostcardWebhookRollup(postcard.postcardId, mapped);
    }

    log({
      event: 'lob.webhook.processed',
      component: 'lob-webhook',
      operation: eventType,
      postcardId: postcard.postcardId,
      status: mapped.status,
      message: newlyRecorded ? 'newly_recorded' : 'dedup_no_op',
    });
    return new Response(null, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    log({ level: 'error', event: 'lob.webhook.processing_failed', component: 'lob-webhook', operation: eventType, postcardId: postcard.postcardId, message });
    return new Response(null, { status: 500 });
  }
}
