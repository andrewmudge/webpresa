// ---------------------------------------------------------------------------
// Normalized website enrichment snapshot (Stage 13 — Firecrawl Website
// Enrichment)
//
// The validated, bounded, deterministic normalization of a single
// Firecrawl Scrape response. This is the only shape of Firecrawl-derived
// data that ever reaches the OpenAI generation prompt or gets stored as
// `extracted.json` — the raw provider response is never fed to OpenAI or
// trusted directly. See `lib/firecrawl/normalize.ts`.
//
// Every field is evidence, not canonical truth. Nothing here is ever
// written onto `Business` automatically — see `lib/firecrawl/
// generation-context.ts` for the merge rule (Business always wins).
// ---------------------------------------------------------------------------

export const WEBSITE_ENRICHMENT_SCHEMA_VERSION = '1' as const;

export interface WebsiteEnrichmentService {
  name: string;
  description?: string;
}

export interface WebsiteEnrichmentFaqItem {
  question: string;
  answer: string;
}

export interface WebsiteEnrichmentLink {
  text?: string;
  url: string;
}

export interface WebsiteEnrichmentImageReference {
  url: string;
  alt?: string;
  context?: string;
}

export interface WebsiteEnrichmentContact {
  phones: string[];
  emails: string[];
  addresses: string[];
}

export interface WebsiteEnrichmentSnapshot {
  schemaVersion: typeof WEBSITE_ENRICHMENT_SCHEMA_VERSION;
  sourceUrl: string;
  finalUrl?: string;
  title?: string;
  metaDescription?: string;
  businessName?: string;
  summary?: string;
  about?: string;
  services: WebsiteEnrichmentService[];
  serviceAreas: string[];
  differentiators: string[];
  faq: WebsiteEnrichmentFaqItem[];
  navigationLabels: string[];
  callsToAction: string[];
  contact: WebsiteEnrichmentContact;
  socialLinks: string[];
  links: WebsiteEnrichmentLink[];
  imageReferences: WebsiteEnrichmentImageReference[];
  extractedAt: string;
}
