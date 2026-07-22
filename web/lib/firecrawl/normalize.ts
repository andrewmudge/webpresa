import 'server-only';
import { z } from 'zod';
import type { FirecrawlScrapeData } from './client';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';
import { WEBSITE_ENRICHMENT_SCHEMA_VERSION } from '@/domain/models/website-enrichment';
import { WebsiteEnrichmentSnapshotSchema } from '@/domain/schemas/website-enrichment.schema';
import { isSocialLink } from '@/lib/social-links';

/**
 * Deterministic normalization from a raw Firecrawl scrape response into the
 * validated, bounded `WebsiteEnrichmentSnapshot`. This is the only place
 * Firecrawl's structured `json` extraction result is trusted — it is
 * treated as untrusted provider output the whole way through (parsed with
 * a permissive schema, then capped/sanitized/re-validated), never fed
 * directly into OpenAI or stored as-is.
 */

// Loose shape for `data.json` — every field optional, since it's untrusted
// LLM output from Firecrawl that may omit or malform anything.
const RawExtractionSchema = z
  .object({
    businessName: z.string().optional(),
    summary: z.string().optional(),
    about: z.string().optional(),
    services: z.array(z.object({ name: z.string().optional(), description: z.string().optional() })).optional(),
    serviceAreas: z.array(z.string()).optional(),
    differentiators: z.array(z.string()).optional(),
    faq: z.array(z.object({ question: z.string().optional(), answer: z.string().optional() })).optional(),
    navigationLabels: z.array(z.string()).optional(),
    callsToAction: z.array(z.string()).optional(),
    contact: z
      .object({
        phones: z.array(z.string()).optional(),
        emails: z.array(z.string()).optional(),
        addresses: z.array(z.string()).optional(),
      })
      .optional(),
    socialLinks: z.array(z.string()).optional(),
  })
  .partial();

/** Matches ASCII control characters (C0 range and DEL) — stripped from any text before storage. */
const CONTROL_CHAR_PATTERN = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

/** Strips markup and control characters, collapses whitespace, and trims to `maxLen`. */
function sanitizeText(value: string | undefined, maxLen: number): string | undefined {
  if (!value) return undefined;
  const withoutTags = value.replace(/<[^>]*>/g, ' ');
  const withoutControlChars = withoutTags.replace(CONTROL_CHAR_PATTERN, '');
  const cleaned = withoutControlChars.replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trim() : cleaned;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeUrlList(values: string[] | undefined, maxLen: number): string[] {
  if (!values) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (!isValidHttpUrl(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= maxLen) break;
  }
  return out;
}

/**
 * Same as `sanitizeUrlList`, but dedupes by normalized host+path (protocol,
 * `www.`, and a trailing slash stripped) rather than exact string match — a
 * real page very often links the same social profile twice as both
 * `https://facebook.com/x` and `https://www.facebook.com/x`, which are the
 * same destination and shouldn't render as two icons.
 */
export function sanitizeAndDedupeSocialLinks(values: string[], maxLen: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (!isValidHttpUrl(raw)) continue;
    let key: string;
    try {
      const url = new URL(raw);
      key = `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`.toLowerCase();
    } catch {
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
    if (out.length >= maxLen) break;
  }
  return out;
}

export interface NormalizeInput {
  sourceUrl: string;
  finalUrl?: string;
  data: FirecrawlScrapeData;
}

/**
 * Throws (never returns partial/invalid data) if the resulting snapshot
 * fails `WebsiteEnrichmentSnapshotSchema` — callers should treat this as a
 * `normalization_failed` ScanEvent failure category.
 */
export function normalizeFirecrawlResponse(input: NormalizeInput): WebsiteEnrichmentSnapshot {
  const parsedExtraction = RawExtractionSchema.safeParse(input.data.json);
  const extraction = parsedExtraction.success ? parsedExtraction.data : {};

  const services = (extraction.services ?? [])
    .filter((s): s is { name: string; description?: string } => !!s.name?.trim())
    .slice(0, 20)
    .map((s) => ({
      name: sanitizeText(s.name, 100)!,
      ...(sanitizeText(s.description, 500) ? { description: sanitizeText(s.description, 500) } : {}),
    }));

  const faq = (extraction.faq ?? [])
    .filter((f): f is { question: string; answer: string } => !!f.question?.trim() && !!f.answer?.trim())
    .slice(0, 20)
    .map((f) => ({ question: sanitizeText(f.question, 300)!, answer: sanitizeText(f.answer, 1000)! }));

  const serviceAreas = Array.from(
    new Set((extraction.serviceAreas ?? []).map((a) => sanitizeText(a, 100)).filter((a): a is string => !!a)),
  ).slice(0, 20);

  const differentiators = Array.from(
    new Set((extraction.differentiators ?? []).map((d) => sanitizeText(d, 100)).filter((d): d is string => !!d)),
  ).slice(0, 8);

  const navigationLabels = Array.from(
    new Set((extraction.navigationLabels ?? []).map((n) => sanitizeText(n, 60)).filter((n): n is string => !!n)),
  ).slice(0, 20);

  const callsToAction = Array.from(
    new Set((extraction.callsToAction ?? []).map((c) => sanitizeText(c, 100)).filter((c): c is string => !!c)),
  ).slice(0, 10);

  const emails = Array.from(new Set(extraction.contact?.emails ?? []))
    .filter((e) => z.string().email().safeParse(e).success)
    .slice(0, 5);
  const phones = Array.from(
    new Set((extraction.contact?.phones ?? []).map((p) => sanitizeText(p, 50)).filter((p): p is string => !!p)),
  ).slice(0, 5);
  const addresses = Array.from(
    new Set((extraction.contact?.addresses ?? []).map((a) => sanitizeText(a, 300)).filter((a): a is string => !!a)),
  ).slice(0, 5);

  const discoveredSocialLinks = (input.data.links ?? []).filter((link) => isSocialLink(link));
  const socialLinks = sanitizeAndDedupeSocialLinks([...(extraction.socialLinks ?? []), ...discoveredSocialLinks], 10);

  const links = sanitizeUrlList(input.data.links, 50).map((url) => ({ url }));

  const imageReferences = sanitizeUrlList(input.data.images, 30).map((url) => ({ url }));

  const snapshot: WebsiteEnrichmentSnapshot = {
    schemaVersion: WEBSITE_ENRICHMENT_SCHEMA_VERSION,
    sourceUrl: input.sourceUrl,
    ...(input.finalUrl ? { finalUrl: input.finalUrl } : {}),
    ...(sanitizeText(input.data.metadata?.title, 200) ? { title: sanitizeText(input.data.metadata?.title, 200) } : {}),
    ...(sanitizeText(input.data.metadata?.description, 500)
      ? { metaDescription: sanitizeText(input.data.metadata?.description, 500) }
      : {}),
    ...(sanitizeText(extraction.businessName, 200) ? { businessName: sanitizeText(extraction.businessName, 200) } : {}),
    ...(sanitizeText(extraction.summary, 1000) ? { summary: sanitizeText(extraction.summary, 1000) } : {}),
    ...(sanitizeText(extraction.about, 3000) ? { about: sanitizeText(extraction.about, 3000) } : {}),
    services,
    serviceAreas,
    differentiators,
    faq,
    navigationLabels,
    callsToAction,
    contact: { phones, emails, addresses },
    socialLinks,
    links,
    imageReferences,
    extractedAt: new Date().toISOString(),
  };

  return WebsiteEnrichmentSnapshotSchema.parse(snapshot);
}
