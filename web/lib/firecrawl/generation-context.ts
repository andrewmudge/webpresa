import 'server-only';
import type { Business } from '@/domain/models/business';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';

/**
 * The one explicit merge function that prepares generation input from a
 * canonical `Business` record and a normalized Firecrawl enrichment
 * snapshot.
 *
 * Merge precedence (see architecture.md, "Firecrawl Website Enrichment"):
 *   1. administrator-approved Business data
 *   2. Google Places data already stored canonically on Business
 *   3. normalized Firecrawl enrichment
 *   4. existing generic industry fallbacks (handled downstream, unchanged)
 *
 * Business fields 1–2 are indistinguishable at this point — both already
 * live on the same `Business` record — so in practice this function only
 * ever chooses between "the business's own field" (non-empty) and "the
 * Firecrawl snapshot" (only when the business's own field is blank).
 * `business` is never mutated; nothing here writes anything back.
 */

function linesFrom(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export interface GenerationContext {
  /** One service name per line — business's own list wins outright when non-empty. */
  servicesLines: string[];
  /** One service area per line — business's own list wins outright when non-empty. */
  serviceAreaLines: string[];
  /** One differentiator per line — business's own list wins outright when non-empty. */
  differentiatorLines: string[];
  /** Business's own description, else the snapshot's `about`/`summary`. */
  description: string | undefined;
  /**
   * Business's own phone/email/address win outright when present; each
   * field falls back independently to the first value the snapshot found
   * for that field when the business left it blank. This only affects what
   * the *generated preview* shows — it never writes back to `Business`
   * (see `applyFoundContactFieldAction` for the explicit admin action that
   * does that deliberately).
   */
  contact: { phone?: string; email?: string; address?: string };
  /** True when any field above was actually filled in from the snapshot rather than the business record. */
  usedEnrichmentFallback: boolean;
}

export function buildGenerationContext({
  business,
  snapshot,
}: {
  business: Business;
  snapshot: WebsiteEnrichmentSnapshot | undefined;
}): GenerationContext {
  const ownServiceLines = linesFrom(business.servicesOffered);
  const ownServiceAreaLines = linesFrom(business.serviceAreas);
  const ownDifferentiatorLines = linesFrom(business.differentiators);
  const ownDescription = business.description?.trim() || undefined;

  const snapshotServiceLines = (snapshot?.services ?? [])
    .map((s) => s.name.trim())
    .filter(Boolean);
  const snapshotServiceAreaLines = (snapshot?.serviceAreas ?? []).filter(Boolean);
  const snapshotDifferentiatorLines = (snapshot?.differentiators ?? []).filter(Boolean);
  const snapshotDescription = snapshot?.about?.trim() || snapshot?.summary?.trim() || undefined;

  const servicesLines = ownServiceLines.length > 0 ? ownServiceLines : snapshotServiceLines;
  const serviceAreaLines = ownServiceAreaLines.length > 0 ? ownServiceAreaLines : snapshotServiceAreaLines;
  const differentiatorLines = ownDifferentiatorLines.length > 0 ? ownDifferentiatorLines : snapshotDifferentiatorLines;
  const description = ownDescription ?? snapshotDescription;

  // Contact: business's own phone/email/address each win independently when
  // present; a blank field falls back to the first value the snapshot found
  // for that specific field. This is generation-input only — it never
  // writes back to Business (see `applyFoundContactFieldAction` in
  // enrichment-actions.ts for the explicit admin action that does).
  const ownPhone = business.phone?.trim() || undefined;
  const ownEmail = business.email?.trim() || undefined;
  const ownAddress = business.address
    ? [business.address.line1, business.address.city, business.address.state, business.address.postalCode]
        .filter(Boolean)
        .join(', ')
    : undefined;

  const snapshotPhone = snapshot?.contact.phones[0];
  const snapshotEmail = snapshot?.contact.emails[0];
  const snapshotAddress = snapshot?.contact.addresses[0];

  const contact = {
    ...((ownPhone ?? snapshotPhone) ? { phone: ownPhone ?? snapshotPhone } : {}),
    ...((ownEmail ?? snapshotEmail) ? { email: ownEmail ?? snapshotEmail } : {}),
    ...((ownAddress ?? snapshotAddress) ? { address: ownAddress ?? snapshotAddress } : {}),
  };

  const usedEnrichmentFallback =
    (ownServiceLines.length === 0 && snapshotServiceLines.length > 0) ||
    (ownServiceAreaLines.length === 0 && snapshotServiceAreaLines.length > 0) ||
    (ownDifferentiatorLines.length === 0 && snapshotDifferentiatorLines.length > 0) ||
    (!ownDescription && !!snapshotDescription) ||
    (!ownPhone && !!snapshotPhone) ||
    (!ownEmail && !!snapshotEmail) ||
    (!ownAddress && !!snapshotAddress);

  return {
    servicesLines,
    serviceAreaLines,
    differentiatorLines,
    description,
    contact,
    usedEnrichmentFallback,
  };
}
