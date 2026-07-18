import { z } from 'zod';
import { WEBSITE_ENRICHMENT_SCHEMA_VERSION } from '@/domain/models/website-enrichment';
import { IsoTimestampSchema } from './common.schema';

/**
 * Runtime validation for the normalized Firecrawl enrichment snapshot.
 *
 * This is the enforcement point that keeps an unbounded/untrusted raw
 * Firecrawl response from ever reaching the OpenAI generation prompt or
 * S3 storage unvalidated — see `lib/firecrawl/normalize.ts`. Every array
 * and string has a hard cap; malformed URLs are rejected rather than
 * silently coerced; optional fields distinguish "not found on the page"
 * from an empty string.
 */

const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const FaqItemSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(1000),
});

const LinkSchema = z.object({
  text: z.string().max(150).optional(),
  url: z.string().url(),
});

const ImageReferenceSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(200).optional(),
  context: z.string().max(200).optional(),
});

const ContactSchema = z.object({
  phones: z.array(z.string().min(1).max(50)).max(5),
  emails: z.array(z.string().email()).max(5),
  addresses: z.array(z.string().min(1).max(300)).max(5),
});

export const WebsiteEnrichmentSnapshotSchema = z.object({
  schemaVersion: z.literal(WEBSITE_ENRICHMENT_SCHEMA_VERSION),
  sourceUrl: z.string().url(),
  finalUrl: z.string().url().optional(),
  title: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  businessName: z.string().max(200).optional(),
  summary: z.string().max(1000).optional(),
  about: z.string().max(3000).optional(),
  services: z.array(ServiceSchema).max(20),
  serviceAreas: z.array(z.string().min(1).max(100)).max(20),
  faq: z.array(FaqItemSchema).max(20),
  navigationLabels: z.array(z.string().min(1).max(60)).max(20),
  callsToAction: z.array(z.string().min(1).max(100)).max(10),
  contact: ContactSchema,
  socialLinks: z.array(z.string().url()).max(10),
  links: z.array(LinkSchema).max(50),
  imageReferences: z.array(ImageReferenceSchema).max(30),
  extractedAt: IsoTimestampSchema,
});
