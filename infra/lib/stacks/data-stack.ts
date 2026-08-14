import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';
import { WebpresaTable } from '../constructs/webpresa-table';
import { WebpresaBucket } from '../constructs/webpresa-bucket';
import { WebpresaSecret } from '../constructs/webpresa-secret';
import { WebpresaUserPool } from '../constructs/webpresa-user-pool';

export interface WebpresaDataStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * WebpresaDataStack — DynamoDB, S3, and Secrets Manager data layer for the
 * Webpresa platform.
 *
 * Instantiated with an environment-aware ID from bin/webpresa.ts:
 *   dev  →  WebpresaDevDataStack
 *   prod →  WebpresaProdDataStack
 *
 * Every table shares the WebpresaTable construct, which applies
 * consistent encryption, billing, removal policy, and PITR settings
 * derived from the EnvironmentConfig.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠  PRE-PRODUCTION ARCHITECTURE NOTE — Status GSIs
 * ═══════════════════════════════════════════════════════════════════════════
 * Each table includes a `status-index` GSI with `status` as the partition
 * key.  This is appropriate for the development MVP where volumes are low
 * and query patterns are exploratory.
 *
 * THESE INDEXES MUST BE REASSESSED BEFORE PRODUCTION DEPLOYMENT because:
 *
 *   • `status` is a low-cardinality attribute (typically 4–6 values).
 *   • A GSI with a low-cardinality partition key concentrates all writes
 *     and reads onto a small number of DynamoDB internal partitions.
 *   • At production write volumes this creates hot partitions, leading to
 *     throttling even when the table has spare capacity.
 *
 * Recommended alternatives to evaluate before going to production:
 *   1. Replace status-only GSI queries with filter expressions on a
 *      higher-cardinality index (e.g. businessId-index) — no infra change.
 *   2. Composite partition key: `status#YYYY-MM` distributes writes across
 *      monthly partitions while preserving the status filter.
 *   3. DynamoDB Streams → secondary projection if global status scans are
 *      genuinely latency-critical at scale.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export class WebpresaDataStack extends cdk.Stack {
  // Exposed for cross-stack references — Stage 14's WebpresaScreenshotStack
  // grants its Lambda least-privilege access to exactly these resources
  // rather than reusing the broad webpresa-vercel-dev IAM policy. Only the
  // resources a later stack actually needs are exposed; everything else
  // stays a local constant inside this constructor as before.
  public readonly businessesTable: dynamodb.Table;
  public readonly sitePreviewsTable: dynamodb.Table;
  public readonly scanEventsTable: dynamodb.Table;
  public readonly scanExecutionsTable: dynamodb.Table;
  public readonly postcardsTable: dynamodb.Table;
  public readonly postcardWebhookEventsTable: dynamodb.Table;
  public readonly claimsTable: dynamodb.Table;
  public readonly leadsTable: dynamodb.Table;
  public readonly customerBillingProfilesTable: dynamodb.Table;
  public readonly customerOnboardingTable: dynamodb.Table;
  public readonly domainConnectionsTable: dynamodb.Table;
  public readonly campaignsTable: dynamodb.Table;
  public readonly campaignRecipientsTable: dynamodb.Table;
  public readonly scanHitsTable: dynamodb.Table;
  public readonly stripeWebhookFailuresTable: dynamodb.Table;
  public readonly customerUserPool: cognito.UserPool;
  public readonly customerUserPoolClient: cognito.UserPoolClient;
  public readonly assetsBucket: s3.Bucket;
  public readonly openAiSecret: secretsmanager.Secret;
  public readonly firecrawlSecret: secretsmanager.Secret;
  public readonly googlePlacesSecret: secretsmanager.Secret;
  public readonly stripeSecret: secretsmanager.Secret;
  public readonly lobSecret: secretsmanager.Secret;
  public readonly claimTokenSecret: secretsmanager.Secret;
  public readonly vercelApiSecret: secretsmanager.Secret;
  public readonly captureTokenSecret: secretsmanager.Secret;
  public readonly vercelProtectionBypassSecret: secretsmanager.Secret;
  public readonly internalApiSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: WebpresaDataStackProps) {
    super(scope, id, props);

    const { config } = props;
    const S = dynamodb.AttributeType.STRING;

    // Apply mandatory stack-level tags here so they are present during both
    // test synthesis and real deployment.  Tags propagate to all resources.
    const envLabel =
      config.suffix.charAt(0).toUpperCase() + config.suffix.slice(1);
    cdk.Tags.of(this).add('Project', 'Webpresa');
    cdk.Tags.of(this).add('Environment', envLabel);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    /**
     * Shared createdAt sort-key attribute definition.
     * Used on businessId GSIs to enable chronological queries and
     * newest-first pagination for all records belonging to one business.
     */
    const createdAtSortKey: dynamodb.Attribute = {
      name: 'createdAt',
      type: S,
    };

    /** Stage 17 — sorts a customer's owned businesses by claim date, not record-creation date. */
    const claimedAtSortKey: dynamodb.Attribute = {
      name: 'claimedAt',
      type: S,
    };

    // ───────────────────────────────────────────────────────────────────────
    // Businesses
    //   PK: businessId
    //   GSIs: slug-index, google-place-id-index, status-index
    // ───────────────────────────────────────────────────────────────────────
    const businesses = new WebpresaTable(this, 'Businesses', {
      config,
      tableName: 'businesses',
      partitionKey: { name: 'businessId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'slug-index',
          partitionKey: { name: 'slug', type: S },
        },
        {
          indexName: 'google-place-id-index',
          partitionKey: { name: 'googlePlaceId', type: S },
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
        // Stage 17 — Website Claim Flow. NOT unique per user by design: one
        // customer account may own multiple Businesses (see
        // implementation.md, Stage 17, "Ownership model"). Sparse — only
        // claimed businesses appear here.
        {
          indexName: 'owner-user-id-index',
          partitionKey: { name: 'ownerUserId', type: S },
          sortKey: claimedAtSortKey,
        },
        // Stage 18 — Stripe Subscriptions. Sparse (only populated after a
        // business's first Checkout), high-cardinality (Stripe subscription
        // IDs) — avoids the low-cardinality hot-partition anti-pattern noted
        // above for status GSIs. The webhook handler's primary Business
        // lookup when an event references a subscription ID.
        {
          indexName: 'stripe-subscription-id-index',
          partitionKey: { name: 'stripeSubscriptionId', type: S },
        },
      ],
    });
    this.businessesTable = businesses.table;

    // ───────────────────────────────────────────────────────────────────────
    // SitePreviews
    //   PK: previewId
    //   GSIs: slug-index
    //         business-id-index (SK: createdAt — newest-first pagination)
    //         status-index ⚠
    // ───────────────────────────────────────────────────────────────────────
    const sitePreviews = new WebpresaTable(this, 'SitePreviews', {
      config,
      tableName: 'site-previews',
      partitionKey: { name: 'previewId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'slug-index',
          partitionKey: { name: 'slug', type: S },
        },
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.sitePreviewsTable = sitePreviews.table;

    // ───────────────────────────────────────────────────────────────────────
    // ScanEvents
    //   PK: scanId
    //   GSIs: business-id-index (SK: createdAt — chronological history)
    //         status-index ⚠
    // ───────────────────────────────────────────────────────────────────────
    const scanEvents = new WebpresaTable(this, 'ScanEvents', {
      config,
      tableName: 'scan-events',
      partitionKey: { name: 'scanId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.scanEventsTable = scanEvents.table;

    // ───────────────────────────────────────────────────────────────────────
    // ScanExecutions (Stage 16 — Step Functions Scan and Preview Workflow)
    //   PK: scanExecutionId
    //   GSIs: business-id-index (SK: createdAt — chronological history)
    //         status-index ⚠
    // One workflow-execution record per Step Functions run, referencing the
    // several per-operation ScanEvents (and the SitePreview) it produces
    // rather than replacing them — see implementation.md, Stage 16,
    // "Workflow ownership".
    // ───────────────────────────────────────────────────────────────────────
    const scanExecutions = new WebpresaTable(this, 'ScanExecutions', {
      config,
      tableName: 'scan-executions',
      partitionKey: { name: 'scanExecutionId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.scanExecutionsTable = scanExecutions.table;

    // ───────────────────────────────────────────────────────────────────────
    // Postcards (Stage 22 — Webpresa Postcard Generation and Lob Fulfillment)
    //   PK: postcardId
    //   GSIs: business-id-index (SK: createdAt — chronological history)
    //         campaign-recipient-id-index (sparse — only set when a Postcard
    //           was generated for a Campaign, Stage 21, recipient; single-
    //           postcard test sends have no CampaignRecipient at all)
    //         provider-postcard-id-index (sparse — only set after submission)
    //         status-index ⚠
    //
    //   Renamed from `campaign-code-index`/`campaignCode` (Stage 5 draft,
    //   never deployed against real data — table is empty in dev, so this is
    //   a clean schema change, not a migration). Per Stage 21's own note
    //   (implementation.md, "Relationship to Postcard"), a Postcard no
    //   longer owns its own campaign code/destination — it references the
    //   CampaignRecipient that *is* "one mailed piece" instead of
    //   duplicating that data.
    // ───────────────────────────────────────────────────────────────────────
    const postcards = new WebpresaTable(this, 'Postcards', {
      config,
      tableName: 'postcards',
      partitionKey: { name: 'postcardId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
        {
          indexName: 'campaign-recipient-id-index',
          partitionKey: { name: 'campaignRecipientId', type: S },
        },
        {
          // Sparse index — only Postcard items that have been submitted to a
          // provider (and received a providerPostcardId) appear in this index.
          indexName: 'provider-postcard-id-index',
          partitionKey: { name: 'providerPostcardId', type: S },
        },
        // ⚠ See pre-production note above regarding status GSIs.
        {
          indexName: 'status-index',
          partitionKey: { name: 'status', type: S },
        },
      ],
    });
    this.postcardsTable = postcards.table;

    // ───────────────────────────────────────────────────────────────────────
    // PostcardWebhookEvents (Stage 22 — Webpresa Postcard Generation and Lob
    // Fulfillment)
    //   PK: lobEventId
    //   GSI: postcard-id-index (SK: receivedAt — chronological delivery
    //     history per postcard, for the admin status-timeline panel)
    //
    //   Immutable log, never deleted or overwritten — "never delete history"
    //   (see architecture.md), mirroring ScanHit's relationship to
    //   CampaignRecipient above. `lobEventId` is Lob's own globally-unique
    //   event id, so a plain conditional PutItem on the partition key
    //   (`attribute_not_exists(lobEventId)`) is the entire dedup mechanism —
    //   no secondary uniqueness reservation item needed, unlike ScanHit's
    //   FINGERPRINT# shape. `Postcard.status`/`mailedAt`/`deliveredAt`
    //   remain the denormalized rollup, updated in place only when an event
    //   is newly recorded (never on a dedup no-op) — the same "durable event
    //   record + denormalized rollup" split used throughout this stack.
    //   No TTL — webhook history must never auto-expire.
    // ───────────────────────────────────────────────────────────────────────
    const postcardWebhookEvents = new WebpresaTable(this, 'PostcardWebhookEvents', {
      config,
      tableName: 'postcard-webhook-events',
      partitionKey: { name: 'lobEventId', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'postcard-id-index',
          partitionKey: { name: 'postcardId', type: S },
          sortKey: { name: 'receivedAt', type: S },
        },
      ],
    });
    this.postcardWebhookEventsTable = postcardWebhookEvents.table;

    // ───────────────────────────────────────────────────────────────────────
    // Claims (Stage 17 — Website Claim Flow)
    //   PK: claimId
    //   GSIs: token-hash-index (high-cardinality — avoids the low-cardinality
    //           hot-partition anti-pattern flagged above for status GSIs)
    //         business-id-index (SK: createdAt — per-business claim history)
    //   No status-index: only 4 low-cardinality values; per-business queries
    //   cover admin needs; a global cross-business list is YAGNI.
    //
    //   TTL attribute `ttl` is enabled on this table, but is populated ONLY
    //   by the rate-limit-counter item shape this table also carries (PK
    //   `RATELIMIT#<ipHash>#<windowBucket>` — see web/lib/db/claims.ts).
    //   Real Claim records never set `ttl`, so claim history — which must be
    //   preserved indefinitely — is never touched by TTL deletion. Claim
    //   *token* expiration is a status transition at read time, never a TTL
    //   deletion.
    // ───────────────────────────────────────────────────────────────────────
    const claims = new WebpresaTable(this, 'Claims', {
      config,
      tableName: 'claims',
      partitionKey: { name: 'claimId', type: S },
      timeToLiveAttribute: 'ttl',
      globalSecondaryIndexes: [
        {
          indexName: 'token-hash-index',
          partitionKey: { name: 'tokenHash', type: S },
        },
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
      ],
    });
    this.claimsTable = claims.table;

    // ───────────────────────────────────────────────────────────────────────
    // Leads (Stage 20 — Contact Forms and Lead Delivery)
    //   PK: leadId
    //   GSI: business-id-index (SK: createdAt — per-business lead inbox,
    //     newest-first, mirrors postcards/scan-events)
    //   No status-index: LEAD_STATUSES is only 3 low-cardinality values;
    //   per-business queries (customer inbox, admin view) cover every real
    //   need — a global cross-business "all new leads" view is YAGNI, the
    //   same reasoning Claims above already documents for its own
    //   low-cardinality status field.
    //
    //   TTL attribute `ttl` is enabled on this table, but — exactly like
    //   Claims above — is populated ONLY by two non-Lead item shapes this
    //   table also carries (see web/lib/db/leads.ts):
    //     `RATELIMIT#<ipHash-or-businessId>#<windowBucket>` — per-IP and
    //       per-business submission rate limiting, reusing Claims' own
    //       counter shape via the shared web/lib/db/rate-limit.ts helper.
    //     `FINGERPRINT#<fingerprint>` — atomic duplicate-submission
    //       suppression via a conditional PutItem
    //       (ConditionExpression: attribute_not_exists(PK)), the same
    //       atomic-reservation pattern DomainConnections below uses for
    //       normalizedDomain rather than a GSI-query-then-write.
    //   Real Lead records never set `ttl` — lead history is preserved
    //   indefinitely, never auto-deleted.
    // ───────────────────────────────────────────────────────────────────────
    const leads = new WebpresaTable(this, 'Leads', {
      config,
      tableName: 'leads',
      partitionKey: { name: 'leadId', type: S },
      timeToLiveAttribute: 'ttl',
      globalSecondaryIndexes: [
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
      ],
    });
    this.leadsTable = leads.table;

    // ───────────────────────────────────────────────────────────────────────
    // CustomerBillingProfiles (Stage 18 — Stripe Subscriptions)
    //   PK: userId (Cognito `sub`)
    //   No GSI — every lookup is a direct GetItem by userId, always
    //   available from the authenticated customer session.
    //
    //   The canonical userId → stripeCustomerId mapping. One Cognito
    //   customer may own several Businesses (Stage 17); they share one
    //   Stripe Customer rather than minting a new one per Business. Not a
    //   "billing account"/organization concept — a single foreign key, one
    //   row per customer, ever, created via a conditional PutItem
    //   (see web/lib/db/customer-billing.ts).
    // ───────────────────────────────────────────────────────────────────────
    const customerBillingProfiles = new WebpresaTable(this, 'CustomerBillingProfiles', {
      config,
      tableName: 'customer-billing-profiles',
      partitionKey: { name: 'userId', type: S },
    });
    this.customerBillingProfilesTable = customerBillingProfiles.table;

    // ───────────────────────────────────────────────────────────────────────
    // CustomerOnboarding (Stage 19.x, Part 1 — Customer Onboarding Framework)
    //   PK: businessId
    //   No GSI — one onboarding record per business, one-to-one; every
    //   lookup already starts from an authorized `businessId` (the same
    //   `/app` route already resolves businesses by owner). Keyed directly
    //   on its natural one-to-one key, the same pattern
    //   CustomerBillingProfiles above uses for `userId` — no separate
    //   generated `onboardingId`.
    // ───────────────────────────────────────────────────────────────────────
    const customerOnboarding = new WebpresaTable(this, 'CustomerOnboarding', {
      config,
      tableName: 'customer-onboarding',
      partitionKey: { name: 'businessId', type: S },
    });
    this.customerOnboardingTable = customerOnboarding.table;

    // ───────────────────────────────────────────────────────────────────────
    // DomainConnections (Stage 19.x, Part 2 — Existing-Domain Connection)
    //   PK: normalizedDomain (NOT a generated ID — see the construct-level
    //     rationale in implementation.md, Stage 19.x, Part 2, "Why
    //     normalizedDomain is the partition key, not a GSI": a generated ID
    //     plus a uniqueness GSI cannot prevent two concurrent requests from
    //     each creating a record for the same domain, since a GSI query and
    //     a write under a different key are never atomic together. Keying
    //     directly on the domain and using a conditional PutItem
    //     (`attribute_not_exists(normalizedDomain)`) makes the reservation
    //     atomic by construction — the same pattern CustomerBillingProfiles
    //     above already uses for its own natural one-to-one key.
    //   GSIs: business-id-index (SK: createdAt)
    //   No status-index (low cardinality — see the pre-production note
    //   above) and no separate uniqueness index (the partition key itself
    //   is the uniqueness guarantee).
    // ───────────────────────────────────────────────────────────────────────
    const domainConnections = new WebpresaTable(this, 'DomainConnections', {
      config,
      tableName: 'domain-connections',
      partitionKey: { name: 'normalizedDomain', type: S },
      globalSecondaryIndexes: [
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
      ],
    });
    this.domainConnectionsTable = domainConnections.table;

    // ───────────────────────────────────────────────────────────────────────
    // Campaigns (Stage 21 — Campaign and QR Tracking)
    //   PK: campaignId
    //   No GSIs: campaign count stays small under manual creation (Stage
    //   21's MVP); a createdAt-sortable GSI can be added later without
    //   restructuring, the same YAGNI reasoning already applied to
    //   CustomerBillingProfiles/CustomerOnboarding above.
    // ───────────────────────────────────────────────────────────────────────
    const campaigns = new WebpresaTable(this, 'Campaigns', {
      config,
      tableName: 'campaigns',
      partitionKey: { name: 'campaignId', type: S },
    });
    this.campaignsTable = campaigns.table;

    // ───────────────────────────────────────────────────────────────────────
    // CampaignRecipients (Stage 21 — Campaign and QR Tracking)
    //   PK: campaignRecipientId
    //   GSIs: campaign-code-index (high-cardinality — the `/r/[campaignCode]`
    //           redirect route's primary lookup)
    //         campaign-id-index (SK: createdAt — admin recipient list per campaign)
    //         business-id-index (SK: createdAt — every campaign a business
    //           has ever been a recipient of)
    //   No status-index: CampaignRecipientStatus is only 2 low-cardinality
    //   values — same reasoning already documented for Claims/Leads above.
    //
    //   TTL attribute `ttl` is enabled on this table, but — exactly like
    //   Claims/Leads above — is populated ONLY by the rate-limit-counter item
    //   shape this table also carries (PK `RATELIMIT#<ipHash>#<windowBucket>`
    //   — see web/lib/db/campaign-recipients.ts), the `/r/[campaignCode]`
    //   route's own abuse/cost protection. Real CampaignRecipient records
    //   never set `ttl`.
    // ───────────────────────────────────────────────────────────────────────
    const campaignRecipients = new WebpresaTable(this, 'CampaignRecipients', {
      config,
      tableName: 'campaign-recipients',
      partitionKey: { name: 'campaignRecipientId', type: S },
      timeToLiveAttribute: 'ttl',
      globalSecondaryIndexes: [
        {
          indexName: 'campaign-code-index',
          partitionKey: { name: 'campaignCode', type: S },
        },
        {
          indexName: 'campaign-id-index',
          partitionKey: { name: 'campaignId', type: S },
          sortKey: createdAtSortKey,
        },
        {
          indexName: 'business-id-index',
          partitionKey: { name: 'businessId', type: S },
          sortKey: createdAtSortKey,
        },
      ],
    });
    this.campaignRecipientsTable = campaignRecipients.table;

    // ───────────────────────────────────────────────────────────────────────
    // ScanHits (Stage 21 — Campaign and QR Tracking)
    //   PK: campaignRecipientId   SK: sortKey
    //   No GSIs: this table is deliberately keyed so "recent scans for one
    //   recipient" is a single ordered Query (PK = campaignRecipientId, SK
    //   begins_with 'HIT#') with no index needed — see
    //   implementation.md, Stage 21, "Infrastructure changes".
    //
    //   Three item shapes share this table, distinguished by the `sortKey`
    //   prefix (the same fold-in pattern Claims/Leads use for their own
    //   rate-limit/fingerprint items):
    //     `HIT#<isoTimestamp>#<random>`   — real, permanent ScanHit records.
    //     `FINGERPRINT#<visitorFingerprint>` — atomic uniqueness reservation
    //       (conditional PutItem) backing CampaignRecipient.estimatedUniqueScans.
    //       Deliberately NOT TTL'd — unlike Claims'/Leads' own FINGERPRINT#/
    //       RATELIMIT# items (short-window abuse prevention, meant to
    //       expire), this backs a lifetime unique-visitor estimate and must
    //       persist for as long as the recipient does.
    //   Real ScanHit and FINGERPRINT# items never set a `ttl` attribute, so
    //   no TTL attribute is enabled on this table at all — unlike Claims/
    //   Leads/CampaignRecipients above, nothing on this table is ever meant
    //   to auto-expire.
    // ───────────────────────────────────────────────────────────────────────
    const scanHits = new WebpresaTable(this, 'ScanHits', {
      config,
      tableName: 'scan-hits',
      partitionKey: { name: 'campaignRecipientId', type: S },
      sortKey: { name: 'sortKey', type: S },
    });
    this.scanHitsTable = scanHits.table;

    // ───────────────────────────────────────────────────────────────────────
    // StripeWebhookFailures (Stage 24 — Operational Monitoring, Failure
    // Recovery, and Operations Center)
    //   PK: id
    //   No GSI — write-rare (failures only), TTL-bounded, and read only via
    //   a small bounded Scan for the admin Operations page (see
    //   web/lib/db/stripe-webhook-failures.ts).
    //
    //   Unlike PostcardWebhookEvents above (Stage 22's permanent, complete
    //   Lob delivery history), this table is diagnostics-only: Stripe
    //   webhook processing has no durable record of any kind today
    //   (reconciliation is snapshot-first — see architecture.md, "Stripe
    //   Subscriptions (Stage 18)" — and Business.lastStripeEventId/
    //   lastStripeEventAt/lastStripeSyncAt are explicitly diagnostics-only,
    //   never gating a write), so a failed/malformed webhook was previously
    //   invisible outside raw logs. Records only the two failure paths
    //   (invalid signature, processing error) — never a successfully
    //   processed event, never the raw request body or signature.
    //
    //   TTL attribute `ttl` is enabled and populated on EVERY item (~90
    //   days out from creation) — deliberately different from Claims'/
    //   Leads'/CampaignRecipients' TTL, which only ever touches a
    //   secondary rate-limit/fingerprint item shape while the "real"
    //   record on those tables is preserved indefinitely. Here the "real"
    //   record itself is meant to expire, since this is a short-window
    //   diagnostic log, not a permanent fulfillment record.
    // ───────────────────────────────────────────────────────────────────────
    const stripeWebhookFailures = new WebpresaTable(this, 'StripeWebhookFailures', {
      config,
      tableName: 'stripe-webhook-failures',
      partitionKey: { name: 'id', type: S },
      timeToLiveAttribute: 'ttl',
    });
    this.stripeWebhookFailuresTable = stripeWebhookFailures.table;

    // ───────────────────────────────────────────────────────────────────────
    // Customer identity (Stage 17 — Website Claim Flow)
    //
    // Amazon Cognito User Pool for customer accounts only — the admin auth
    // system (single hardcoded operator, scrypt + JWT) is completely
    // separate and untouched. See `webpresa-user-pool.ts` for the full
    // rationale.
    // ───────────────────────────────────────────────────────────────────────
    const customerAuth = new WebpresaUserPool(this, 'CustomerUserPool', { config });
    this.customerUserPool = customerAuth.userPool;
    this.customerUserPoolClient = customerAuth.userPoolClient;

    // ───────────────────────────────────────────────────────────────────────
    // Assets bucket — private object storage for scan artifacts, preview
    // assets, and postcard files. Single bucket, prefix-scoped:
    //   scans/{businessId}/{scanId}/...
    //   previews/{businessId}/{previewId}/...
    //   postcards/{businessId}/{postcardId}/...
    // ───────────────────────────────────────────────────────────────────────
    const assets = new WebpresaBucket(this, 'Assets', {
      config,
      bucketName: 'assets',
    });
    this.assetsBucket = assets.bucket;

    // ───────────────────────────────────────────────────────────────────────
    // Secrets — third-party API credentials. Created with a random
    // placeholder value only; real values are populated out-of-band once
    // each integration stage (11 OpenAI, 12 Google Places, 13 Firecrawl,
    // 18 Stripe, 22 Lob) actually needs them. See architecture.md for the
    // documented JSON shape and owner of each secret.
    // ───────────────────────────────────────────────────────────────────────
    const openAi = new WebpresaSecret(this, 'OpenAiSecret', {
      config,
      secretName: 'openai',
      description: 'OpenAI API credentials (Stage 11 — AI preview generation)',
      jsonKeys: ['apiKey'],
    });
    this.openAiSecret = openAi.secret;

    const firecrawl = new WebpresaSecret(this, 'FirecrawlSecret', {
      config,
      secretName: 'firecrawl',
      description: 'Firecrawl API credentials (Stage 13 — website capture)',
      jsonKeys: ['apiKey'],
    });
    this.firecrawlSecret = firecrawl.secret;

    const googlePlaces = new WebpresaSecret(this, 'GooglePlacesSecret', {
      config,
      secretName: 'google-places',
      description: 'Google Places API credentials (Stage 12 — business discovery)',
      jsonKeys: ['apiKey'],
    });
    this.googlePlacesSecret = googlePlaces.secret;

    const stripe = new WebpresaSecret(this, 'StripeSecret', {
      config,
      secretName: 'stripe',
      description: 'Stripe API credentials (Stage 18 — subscriptions)',
      jsonKeys: ['secretKey', 'webhookSecret'],
    });
    this.stripeSecret = stripe.secret;

    const lob = new WebpresaSecret(this, 'LobSecret', {
      config,
      secretName: 'lob',
      description: 'Lob API credentials (Stage 22 — postcard integration)',
      jsonKeys: ['apiKey'],
    });
    this.lobSecret = lob.secret;

    // Stage 17 — HMAC pepper for hashing claim tokens (see
    // web/lib/claim/token.ts). Held entirely within this platform — a
    // random placeholder at creation, a real value populated out-of-band,
    // same as capture-token below.
    const claimToken = new WebpresaSecret(this, 'ClaimTokenSecret', {
      config,
      secretName: 'claim-token',
      description: 'Claim-token HMAC pepper (Stage 17 — website claim flow)',
      jsonKeys: ['hmacSecret'],
    });
    this.claimTokenSecret = claimToken.secret;

    // Stage 19.x, Part 2 — Vercel Project Domains API credentials (add/
    // inspect/remove a custom domain on the Webpresa Vercel project — see
    // web/lib/vercel/client.ts). A real, distinct capability from the
    // AWS-credential-based "Vercel is the deployment host" relationship
    // this app already has — no existing secret covers this.
    const vercelApi = new WebpresaSecret(this, 'VercelApiSecret', {
      config,
      secretName: 'vercel-api',
      description: 'Vercel Project Domains API credentials (Stage 19.x, Part 2 — custom domain connection)',
      jsonKeys: ['accessToken', 'teamId', 'projectId'],
    });
    this.vercelApiSecret = vercelApi.secret;

    // Stage 14 — HMAC signing key for the screenshot Lambda's preview
    // capture token (see architecture.md, "Draft preview visibility"). Not
    // a third-party credential like the five above — generated and held
    // entirely within this platform — but provisioned the same way: a
    // random placeholder at creation, a real value populated out-of-band.
    // Read by both this Next.js app (verify only) and the screenshot Lambda
    // (mint only) — see infra/lib/stacks/screenshot-stack.ts for the
    // Lambda's own grant.
    const captureToken = new WebpresaSecret(this, 'CaptureTokenSecret', {
      config,
      secretName: 'capture-token',
      description: 'Preview capture-token HMAC signing key (Stage 14 — Playwright screenshots)',
      jsonKeys: ['signingKey'],
    });
    this.captureTokenSecret = captureToken.secret;

    // Stage 14 — Vercel "Protection Bypass for Automation" secret. Vercel's
    // own Deployment Protection sits in front of the whole dev preview
    // deployment at the edge, before any Next.js request handler runs — a
    // platform-level gate distinct from (and in front of) the app-level
    // capture-token cookie above. Discovered live: the screenshot Lambda's
    // generated_preview navigation was hitting Vercel's login page instead
    // of /b/[slug]. Sent as the `x-vercel-protection-bypass` HTTP header —
    // see infra/lambda/screenshot-capture/src/browser.ts.
    const vercelBypass = new WebpresaSecret(this, 'VercelProtectionBypassSecret', {
      config,
      secretName: 'vercel-protection-bypass',
      description: 'Vercel Protection Bypass for Automation secret (Stage 14 — lets the screenshot Lambda reach protected preview deployments for generated_preview captures)',
      jsonKeys: ['bypassSecret'],
    });
    this.vercelProtectionBypassSecret = vercelBypass.secret;

    // Stage 16 — shared secret authenticating Step Functions' HttpInvoke
    // calls (via an EventBridge Connection, API_KEY auth — see
    // infra/lib/stacks/scan-workflow-stack.ts) into this app's
    // `/api/internal/scan/*` routes. Not a third-party credential — held
    // entirely within this platform, provisioned the same way as
    // capture-token above: a random placeholder at creation, read by both
    // this app (verify only, via lib/internal-auth.ts) and the Connection
    // (which sources the same value to send as a request header).
    const internalApi = new WebpresaSecret(this, 'InternalApiSecret', {
      config,
      secretName: 'internal-api',
      description: 'Shared secret authenticating Step Functions HttpInvoke calls into /api/internal/scan/* (Stage 16 — scan workflow)',
      jsonKeys: ['sharedSecret'],
    });
    this.internalApiSecret = internalApi.secret;
  }
}
