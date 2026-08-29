import { getOpenSrsStorefrontSecret } from '@/lib/secrets';
import { OPENSRS_SIGNATURE_HEADER, verifyOpenSrsWebhookSignature } from '@/lib/opensrs/verify-webhook';
import { listDomainPurchaseIntentsByStorefrontUsername, putDomainPurchaseIntent } from '@/lib/db/domain-purchase-intents';
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
 * Field names below are confirmed (2026-08-29) against a real "Send Test"
 * delivery in PTE:
 * `{ event, event_id, username, changes_by, is_success, domain_name,
 *   created_date, record_type, data }`. **Not confirmed**: the exact
 * `event` string value for a genuine "Domain registration" (the test
 * delivery's `event` field just said the literal placeholder "Event name").
 * Storefront's own docs say a webhook subscribes per *category* and
 * receives every event in it — the registration webhook was configured
 * against the "Domain registration" entry under Domain Events, but per that
 * documented behavior this endpoint may actually receive every Domain
 * Events event (DNS changes, nameserver updates, contact changes, etc.),
 * not just registrations. `isLikelyRegistrationEvent` below is a
 * conservative, flagged-as-unconfirmed heuristic (case-insensitive
 * substring match on "registration") rather than an exact string compare,
 * to fail closed (ignore) rather than misfire on an unrelated domain event
 * — tighten this once a real registration delivery's exact `event` value
 * is confirmed.
 *
 * Correlation is via `username` (see `listDomainPurchaseIntentsByStorefrontUsername`),
 * not `external_user_id`/`extuserid` — confirmed the real payload carries no
 * such field at all, contrary to this integration's original design (see
 * `domain/models/domain-purchase-intent.ts`'s doc comment).
 *
 * Never involved in DNS setup — the domain already points at Vercel via
 * the permanent DNS Template applied automatically at registration (see
 * `lib/opensrs/constants.ts`). This handler's only job is: learn a
 * purchase happened, attach the domain in Vercel so it actually serves/
 * gets a certificate, and create the `DomainConnection` record so the rest
 * of the existing domain machinery (`reconcileDomainConnection`,
 * `/api/domains/status`, `DomainStatusPanel`) takes over unchanged.
 */

function extractEvent(payload: Record<string, unknown>): string | undefined {
  return typeof payload.event === 'string' ? payload.event : undefined;
}

function extractRecordType(payload: Record<string, unknown>): string | undefined {
  return typeof payload.record_type === 'string' ? payload.record_type : undefined;
}

function extractIsSuccess(payload: Record<string, unknown>): boolean {
  return payload.is_success === true || payload.is_success === 'true';
}

function isLikelyRegistrationEvent(payload: Record<string, unknown>): boolean {
  const event = extractEvent(payload);
  return extractRecordType(payload) === 'domain' && extractIsSuccess(payload) && !!event && event.toLowerCase().includes('registration');
}

function extractDomainName(payload: Record<string, unknown>): string | undefined {
  return typeof payload.domain_name === 'string' ? payload.domain_name : undefined;
}

/** The webhook delivery's own id — used as the idempotency key (there is no separate Storefront "order id" in this payload shape). */
function extractEventId(payload: Record<string, unknown>): string | undefined {
  return typeof payload.event_id === 'string' ? payload.event_id : undefined;
}

function extractUsername(payload: Record<string, unknown>): string | undefined {
  return typeof payload.username === 'string' ? payload.username : undefined;
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
    // TEMPORARY (remove once a real "Domain registration" delivery — not
    // just a "Send Test" — has been processed successfully end to end):
    // dumps headers + body for any delivery that still fails verification,
    // in case the confirmed x-signature/sha256= scheme has an edge case
    // this hasn't hit yet. PTE-only test data, not production.
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

  if (!isLikelyRegistrationEvent(payload)) {
    return new Response(null, { status: 200 }); // acknowledged, intentionally ignored (some other Domain Events event)
  }
  const event = extractEvent(payload) as string;

  const storefrontUsername = extractUsername(payload);
  const rawDomain = extractDomainName(payload);
  const eventId = extractEventId(payload);

  if (!storefrontUsername || !rawDomain || !eventId) {
    log({ level: 'warn', event: 'opensrs.webhook.unresolvable_payload', component: 'opensrs-webhook', operation: event });
    return new Response(null, { status: 200 });
  }

  const candidateIntents = await listDomainPurchaseIntentsByStorefrontUsername(storefrontUsername);
  const intent = candidateIntents.find((candidate) => candidate.status === 'pending');
  if (!intent) {
    // No matching pending intent — expired (TTL), already fulfilled, or never existed.
    log({ level: 'warn', event: 'opensrs.webhook.unknown_intent', component: 'opensrs-webhook', operation: event });
    return new Response(null, { status: 200 });
  }

  const business = await getBusinessById(intent.businessId);
  if (!business || business.ownerUserId !== intent.userId) {
    // Defense in depth, same posture as the Stripe webhook's metadata-
    // trust-but-verify — ownership may have changed since the intent was
    // created (e.g. `releaseOwnership`).
    log({ level: 'error', event: 'opensrs.webhook.ownership_mismatch', component: 'opensrs-webhook', businessId: intent.businessId, operation: event });
    return new Response(null, { status: 200 });
  }

  const normalizedDomain = normalizeDomainInput(rawDomain);
  if (!isValidDomain(normalizedDomain)) {
    log({ level: 'error', event: 'opensrs.webhook.invalid_domain', component: 'opensrs-webhook', businessId: intent.businessId, operation: event });
    return new Response(null, { status: 200 });
  }

  let record = await getDomainConnectionByNormalizedDomain(normalizedDomain);

  if (record && record.registration?.orderId !== eventId) {
    // Already tracked under a different event (or a pre-existing
    // customer_owned connection) — never silently overwrite. Surfaced
    // loudly for manual investigation; acknowledged so OpenSRS doesn't
    // retry forever on a conflict no retry can resolve.
    log({ level: 'error', event: 'opensrs.webhook.domain_conflict', component: 'opensrs-webhook', businessId: intent.businessId, operation: event });
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
      registration: { orderId: eventId, purchasedAt: now },
      createdAt: now,
      updatedAt: now,
    };
    const createdNew = await createDomainConnectionRecord(draft);
    record = createdNew ? draft : await getDomainConnectionByNormalizedDomain(normalizedDomain);
    if (!record) {
      log({ level: 'error', event: 'opensrs.webhook.reservation_failed', component: 'opensrs-webhook', businessId: intent.businessId, operation: event });
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

    log({ event: 'opensrs.webhook.processed', component: 'opensrs-webhook', businessId: intent.businessId, operation: event, status: 'connected' });
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
    log({ level: 'error', event: 'opensrs.webhook.attach_failed', component: 'opensrs-webhook', businessId: intent.businessId, operation: event, message });
    return new Response(null, { status: 500 });
  }
}
