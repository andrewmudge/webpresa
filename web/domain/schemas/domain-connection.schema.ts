import { z } from 'zod';
import {
  DOMAIN_CONNECTION_SOURCES,
  DOMAIN_REGISTRAR_PROVIDERS,
  DOMAIN_CONNECTION_STATUSES,
  DOMAIN_REDIRECT_DIRECTIONS,
  DOMAIN_DNS_RECORD_TYPES,
  DOMAIN_DNS_INSTRUCTION_PURPOSES,
  DOMAIN_PROVIDER_DOMAIN_STATUSES,
  DOMAIN_FAILURE_CATEGORIES,
} from '@/domain/models/domain-connection';
import { IsoTimestampSchema } from './common.schema';

const DomainDnsInstructionSchema = z.object({
  recordType: z.enum(DOMAIN_DNS_RECORD_TYPES),
  name: z.string().min(1),
  value: z.string().min(1),
  purpose: z.enum(DOMAIN_DNS_INSTRUCTION_PURPOSES),
  required: z.boolean(),
});

const DomainProviderDomainSchema = z.object({
  hostname: z.string().min(1),
  vercelProjectDomainId: z.string().optional(),
  status: z.enum(DOMAIN_PROVIDER_DOMAIN_STATUSES),
});

const DomainRegistrationDetailsSchema = z.object({
  orderId: z.string().min(1),
  purchasedAt: IsoTimestampSchema,
  expiresAt: IsoTimestampSchema.optional(),
  autoRenew: z.boolean().optional(),
  registrationPriceCents: z.number().int().nonnegative().optional(),
  registrationCurrency: z.string().length(3).optional(),
});

export const DomainConnectionSchema = z.object({
  normalizedDomain: z.string().min(1),
  domainConnectionId: z.string().regex(/^domain_/),
  businessId: z.string().regex(/^biz_/),
  ownerUserId: z.string().min(1),
  domainName: z.string().min(1).max(253),
  slug: z.string().min(1),
  source: z.enum(DOMAIN_CONNECTION_SOURCES),
  registrarProvider: z.enum(DOMAIN_REGISTRAR_PROVIDERS).optional(),
  status: z.enum(DOMAIN_CONNECTION_STATUSES),
  isPrimary: z.boolean(),
  desiredRedirect: z.enum(DOMAIN_REDIRECT_DIRECTIONS),
  primaryHostname: z.string().min(1),
  aliasHostnames: z.array(z.string()),
  providerDomains: z.array(DomainProviderDomainSchema).optional(),
  verificationRecords: z.array(DomainDnsInstructionSchema).optional(),
  lastCheckedAt: IsoTimestampSchema.optional(),
  verifiedAt: IsoTimestampSchema.optional(),
  certificateReadyAt: IsoTimestampSchema.optional(),
  activatedAt: IsoTimestampSchema.optional(),
  failureCategory: z.enum(DOMAIN_FAILURE_CATEGORIES).optional(),
  failureMessage: z.string().max(1000).optional(),
  registration: DomainRegistrationDetailsSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type DomainConnectionSchemaInput = z.input<typeof DomainConnectionSchema>;
