import type { DomainConnection, DomainRegistrarProvider, DomainRedirectDirection } from '@/domain/models/domain-connection';
import { DomainConnectionSchema } from '@/domain/schemas/domain-connection.schema';
import { generateId, nowIso } from './utils';

export interface CreateDomainConnectionInput {
  normalizedDomain: string;
  businessId: string;
  ownerUserId: string;
  domainName: string;
  slug: string;
  registrarProvider?: DomainRegistrarProvider;
  desiredRedirect?: DomainRedirectDirection;
}

/** Creates a fresh, unattached `DomainConnection` in `'draft'` status — the caller attaches it to Vercel next. */
export function createDomainConnection(input: CreateDomainConnectionInput): DomainConnection {
  const now = nowIso();

  const record: DomainConnection = {
    normalizedDomain: input.normalizedDomain,
    domainConnectionId: generateId('domain_'),
    businessId: input.businessId,
    ownerUserId: input.ownerUserId,
    domainName: input.domainName,
    slug: input.slug,
    source: 'customer_owned',
    ...(input.registrarProvider !== undefined && { registrarProvider: input.registrarProvider }),
    status: 'draft',
    isPrimary: true,
    desiredRedirect: input.desiredRedirect ?? 'www_to_apex',
    primaryHostname: input.normalizedDomain,
    aliasHostnames: [`www.${input.normalizedDomain}`],
    createdAt: now,
    updatedAt: now,
  };

  DomainConnectionSchema.parse(record);
  return record;
}
