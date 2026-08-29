import type { MutableTimestampedRecord } from './common';

/**
 * A custom domain attached to one Business (Stage 19.x, Part 2 — existing-
 * domain connection; the OpenSRS Storefront integration adds
 * `source: 'webpresa_registered'` and a `registration` sub-object
 * additively — see `lib/opensrs/client.ts` and
 * `app/api/webhooks/opensrs/route.ts`).
 *
 * Standalone record, not fields on `Business` — a business may eventually
 * have an apex domain, a `www` alias, redirects, and domain history.
 * Deliberately keyed on `normalizedDomain` itself (see
 * `lib/db/domain-connections.ts`), not a generated ID, so uniqueness is a
 * single atomic conditional write rather than a racy GSI-then-write.
 */

export const DOMAIN_CONNECTION_SOURCES = ['customer_owned', 'webpresa_registered'] as const;
export type DomainConnectionSource = (typeof DOMAIN_CONNECTION_SOURCES)[number];

/** Display-only — tailors customer instructions, grants no registrar access. */
export const DOMAIN_REGISTRAR_PROVIDERS = [
  'godaddy',
  'wix',
  'squarespace',
  'namecheap',
  'cloudflare',
  'hostinger',
  'network_solutions',
  'opensrs',
  'other',
  'unknown',
] as const;
export type DomainRegistrarProvider = (typeof DOMAIN_REGISTRAR_PROVIDERS)[number];

export const DOMAIN_CONNECTION_STATUSES = [
  'draft',
  'awaiting_dns',
  'verifying',
  'connected',
  'certificate_pending',
  'active',
  'failed',
  'disconnected',
  'expired',
] as const;
export type DomainConnectionStatus = (typeof DOMAIN_CONNECTION_STATUSES)[number];

export const DOMAIN_REDIRECT_DIRECTIONS = ['apex_to_www', 'www_to_apex', 'none'] as const;
export type DomainRedirectDirection = (typeof DOMAIN_REDIRECT_DIRECTIONS)[number];

/** No `'NS'` — this stage never asks a customer to delegate nameservers (see implementation.md, Stage 19.x, Part 2). */
export const DOMAIN_DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT'] as const;
export type DomainDnsRecordType = (typeof DOMAIN_DNS_RECORD_TYPES)[number];

export const DOMAIN_DNS_INSTRUCTION_PURPOSES = ['routing', 'ownership_verification', 'redirect', 'certificate'] as const;
export type DomainDnsInstructionPurpose = (typeof DOMAIN_DNS_INSTRUCTION_PURPOSES)[number];

export interface DomainDnsInstruction {
  recordType: DomainDnsRecordType;
  name: string;
  value: string;
  purpose: DomainDnsInstructionPurpose;
  required: boolean;
}

export const DOMAIN_PROVIDER_DOMAIN_STATUSES = ['pending', 'verified', 'certificate_pending', 'active', 'failed'] as const;
export type DomainProviderDomainStatus = (typeof DOMAIN_PROVIDER_DOMAIN_STATUSES)[number];

/** Apex and `www` are separate Vercel project-domain objects with independent status — never assume they share one. */
export interface DomainProviderDomain {
  hostname: string;
  vercelProjectDomainId?: string;
  status: DomainProviderDomainStatus;
}

export const DOMAIN_FAILURE_CATEGORIES = [
  'invalid_domain',
  'domain_already_assigned',
  'domain_owned_by_another_customer',
  'vercel_auth_failed',
  'vercel_project_not_found',
  'vercel_domain_add_failed',
  'ownership_verification_required',
  'dns_not_configured',
  'dns_mismatch',
  'dns_propagation_pending',
  'certificate_pending',
  'certificate_failed',
  'domain_expired',
  'unknown',
] as const;
export type DomainFailureCategory = (typeof DOMAIN_FAILURE_CATEGORIES)[number];

export interface DomainConnection extends MutableTimestampedRecord {
  /** Partition key — the normalized apex domain. */
  normalizedDomain: string;
  /** Stable opaque reference field (used in URLs/logs and as a cross-reference from `CustomerOnboarding`) — not the table key. Format: `domain_<uuid>`. */
  domainConnectionId: string;
  businessId: string;
  ownerUserId: string;

  /** As originally entered, pre-normalization, for display. */
  domainName: string;
  /** Denormalized from `Business.slug` at connect time, so host-based routing resolves in one lookup — see `lib/domains/routing.ts`. */
  slug: string;

  source: DomainConnectionSource;
  registrarProvider?: DomainRegistrarProvider;

  status: DomainConnectionStatus;
  isPrimary: boolean;
  desiredRedirect: DomainRedirectDirection;

  primaryHostname: string;
  aliasHostnames: string[];
  providerDomains?: DomainProviderDomain[];

  verificationRecords?: DomainDnsInstruction[];

  lastCheckedAt?: string;
  verifiedAt?: string;
  certificateReadyAt?: string;
  activatedAt?: string;

  failureCategory?: DomainFailureCategory;
  failureMessage?: string;

  /** Present only when `source === 'webpresa_registered'` — the OpenSRS Storefront purchase this connection came from. */
  registration?: DomainRegistrationDetails;
}

/** Populated from the OpenSRS Storefront webhook once a purchase completes — see `app/api/webhooks/opensrs/route.ts`. */
export interface DomainRegistrationDetails {
  /** OpenSRS Storefront's order id — the idempotency key for webhook replay. */
  orderId: string;
  purchasedAt: string;
  expiresAt?: string;
  autoRenew?: boolean;
  registrationPriceCents?: number;
  registrationCurrency?: string;
}
