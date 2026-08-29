import { getOpenSrsStorefrontSecret } from '@/lib/secrets';
import { OPENSRS_SIGNATURE_HEADER, verifyOpenSrsWebhookSignature } from '@/lib/opensrs/verify-webhook';
import { getDomainPurchaseIntent, putDomainPurchaseIntent } from '@/lib/db/domain-purchase-intents';
import type { DomainPurchaseIntent } from '@/domain/models/domain-purchase-intent';
import { getBusinessById } from '@/lib/db/businesses';
import { getDomainConnectionByNormalizedDomain, createDomainConnectionRecord, putDomainConnection } from '@/lib/db/domain-connections';
import type { DomainConnection } from '@/domain/models/domain-connection';
import { addProjectDomain } from '@/lib/vercel/domains';
import { VercelApiError } from '@/lib/vercel/errors';
import { normalizeDomainInput, isValidDomain } from '@/lib/domains/normalize';
import { generateId, nowIso } from '@/domain/factories/utils';
import { log } from '@/lib/logging/log';

/**
 * OpenSRS Storefront webhook Route Handler — structured like
 * `app/api/webhooks/stripe/route.ts` and `app/api/webhooks/lob/route.ts`:
 * verify signature (400 only on failure), resolve trusted context, and
 * return 200 on recognized-but-unusable/irrelevant events (never retried
 * forever) vs. 500 only on genuine internal errors (safe to retry — the
 * `record.status === 'failed'` branch below re-attempts the Vercel attach
 * on redelivery rather than treating it as already handled).
 *
 * **Event type name and payload field names are not confirmed against real
 * OpenSRS documentation** — see `lib/opensrs/verify-webhook.ts`'s doc
 * comment for the same gap. Adjust `ALLOWED_EVENT_TYPES` and the
 * `extract*` functions below once a real payload has been inspected in the
 * PTE environment (register the webhook, trigger a real test purchase,
 * read the actual delivered body).
 *
 * Never involved in DNS setup — the domain already points at Vercel via
 * the permanent DNS Template applied automatically at registration (see
 * `lib/opensrs/constants.ts`). This handler's only job is: learn a
 * purchase happened, attach the domain in Vercel so it actually serves/
 * gets a certificate, and create the `DomainConnection` record so the rest
 * of the existing domain machinery (`reconcileDomainConnection`,
 * `/api/domains/status`, `DomainStatusPanel`) takes over unchanged.
 */

const ALLOWED_EVENT_TYPES = new Set<string>(['domain.registered']);

function extractEventType(payload: Record<string, unknown>): string | undefined {
  return typeof payload.event_type === 'string' ? payload.event_type : undefined;
}

function extractDomain(payload: Record<string, unknown>): string | undefined {
  return typeof payload.domain === 'string' ? payload.domain : undefined;
}

function extractOrderId(payload: Record<string, unknown>): string | undefined {
  return typeof payload.order_id === 'string' ? payload.order_id : undefined;
}

/** Round-trips the `intentId` this app generated and passed as `extuserid` at SSO-redirect time — see `startDomainPurchaseAction`. */
function extractIntentId(payload: Record<string, unknown>): string | undefined {
  return typeof payload.external_user_id === 'string' ? payload.external_user_id : undefined;
}

/** Best-effort — never let a diagnostic write turn an otherwise-handled webhook into a second, unrelated failure. */
async function markIntentFulfilled(intent: DomainPurchaseIntent, domain: string): Promise<void> {
  try {
    await putDomainPurchaseIntent({ ...intent, status: 'fulfilled', fulfilledAt: nowIso(), domain });
  } catch (err) {
    log({ level: 'error', event: 'opensrs.webhook.intent_update_failed', component: 'opensrs-webhook', message: err instanceof Error ? err.message : 'unknown' });
  }
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text(); // raw, unparsed — required for signature verification
  const signature = request.headers.get(OPENSRS_SIGNATURE_HEADER);

  const { webhookKey } = await getOpenSrsStorefrontSecret();
  const valid = verifyOpenSrsWebhookSignature({ rawBody, signatureHeader: signature, webhookKey });
  if (!valid) {
    // TEMPORARY (remove once the real signature header/algorithm is
    // confirmed — see implementation.md's "Documentation gap"): dumps every
    // header name + value and the raw body so a real PTE delivery can be
    // inspected directly, since `lib/opensrs/verify-webhook.ts`'s
    // HMAC-SHA256/`x-opensrs-signature` guess is unconfirmed and just
    // failed against a real delivery. PTE-only test data, not production.
    console.warn('[opensrs][DEBUG] unverified webhook delivery', {
      headers: Object.fromEntries(request.headers.entries()),
      rawBody,
    });
    log({ level: 'warn', event: 'opensrs.webhook.invalid_signature', component: 'opensrs-webhook' });
    return new Response('Invalid signature', { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    log({ level: 'warn', event: 'opensrs.webhook.invalid_json', component: 'opensrs-webhook' });
    return new Response('Invalid payload', { status: 400 });
  }

  const eventType = extractEventType(payload);
  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return new Response(null, { status: 200 }); // acknowledged, intentionally ignored
  }

  const intentId = extractIntentId(payload);
  const rawDomain = extractDomain(payload);
  const orderId = extractOrderId(payload);

  if (!intentId || !rawDomain || !orderId) {
    log({ level: 'warn', event: 'opensrs.webhook.unresolvable_payload', component: 'opensrs-webhook', operation: eventType });
    return new Response(null, { status: 200 });
  }

  const intent = await getDomainPurchaseIntent(intentId);
  if (!intent) {
    // Expired (TTL) or never existed — can't correlate to a Business.
    log({ level: 'warn', event: 'opensrs.webhook.unknown_intent', component: 'opensrs-webhook', operation: eventType });
    return new Response(null, { status: 200 });
  }

  const business = await getBusinessById(intent.businessId);
  if (!business || business.ownerUserId !== intent.userId) {
    // Defense in depth, same posture as the Stripe webhook's metadata-
    // trust-but-verify — ownership may have changed since the intent was
    // created (e.g. `releaseOwnership`).
    log({ level: 'error', event: 'opensrs.webhook.ownership_mismatch', component: 'opensrs-webhook', businessId: intent.businessId, operation: eventType });
    return new Response(null, { status: 200 });
  }

  const normalizedDomain = normalizeDomainInput(rawDomain);
  if (!isValidDomain(normalizedDomain)) {
    log({ level: 'error', event: 'opensrs.webhook.invalid_domain', component: 'opensrs-webhook', businessId: intent.businessId, operation: eventType });
    return new Response(null, { status: 200 });
  }

  let record = await getDomainConnectionByNormalizedDomain(normalizedDomain);

  if (record && record.registration?.orderId !== orderId) {
    // Already tracked under a different order (or a pre-existing
    // customer_owned connection) — never silently overwrite. Surfaced
    // loudly for manual investigation; acknowledged so OpenSRS doesn't
    // retry forever on a conflict no retry can resolve.
    log({ level: 'error', event: 'opensrs.webhook.domain_conflict', component: 'opensrs-webhook', businessId: intent.businessId, operation: eventType });
    return new Response(null, { status: 200 });
  }

  if (!record) {
    const now = nowIso();
    const draft: DomainConnection = {
      normalizedDomain,
      domainConnectionId: generateId('domain_'),
      businessId: business.businessId,
      ownerUserId: intent.userId,
      domainName: rawDomain,
      slug: business.slug,
      source: 'webpresa_registered',
      registrarProvider: 'opensrs',
      status: 'draft',
      isPrimary: true,
      desiredRedirect: 'www_to_apex',
      primaryHostname: normalizedDomain,
      aliasHostnames: [],
      registration: { orderId, purchasedAt: now },
      createdAt: now,
      updatedAt: now,
    };
    const createdNew = await createDomainConnectionRecord(draft);
    record = createdNew ? draft : await getDomainConnectionByNormalizedDomain(normalizedDomain);
    if (!record) {
      log({ level: 'error', event: 'opensrs.webhook.reservation_failed', component: 'opensrs-webhook', businessId: intent.businessId, operation: eventType });
      return new Response(null, { status: 500 });
    }
  }

  // Already successfully attached in a prior delivery — idempotent no-op.
  // A `'failed'` record (Vercel attach didn't succeed last time) falls
  // through to retry the attach below instead.
  if (record.status !== 'draft' && record.status !== 'failed') {
    await markIntentFulfilled(intent, normalizedDomain);
    return new Response(null, { status: 200 });
  }

  try {
    const gitBranch = process.env.WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH || undefined;
    const added = await addProjectDomain(normalizedDomain, { gitBranch });
    const now = nowIso();

    const updated: DomainConnection = {
      ...record,
      status: 'connected',
      providerDomains: [{ hostname: normalizedDomain, vercelProjectDomainId: added.vercelProjectDomainId, status: added.verified ? 'verified' : 'pending' }],
      failureCategory: undefined,
      failureMessage: undefined,
      lastCheckedAt: now,
      updatedAt: now,
    };
    await putDomainConnection(updated);
    await markIntentFulfilled(intent, normalizedDomain);

    log({ event: 'opensrs.webhook.processed', component: 'opensrs-webhook', businessId: intent.businessId, operation: eventType, status: 'connected' });
    return new Response(null, { status: 200 });
  } catch (err) {
    const now = nowIso();
    const failed: DomainConnection = {
      ...record,
      status: 'failed',
      failureCategory: err instanceof VercelApiError && err.category === 'auth' ? 'vercel_auth_failed' : 'vercel_domain_add_failed',
      failureMessage: 'We could not connect this domain right now.',
      updatedAt: now,
    };
    await putDomainConnection(failed);

    const message = err instanceof Error ? err.message : 'unknown';
    log({ level: 'error', event: 'opensrs.webhook.attach_failed', component: 'opensrs-webhook', businessId: intent.businessId, operation: eventType, message });
    return new Response(null, { status: 500 });
  }
}
