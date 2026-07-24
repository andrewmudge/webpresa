import 'server-only';
import type { Business } from '@/domain/models/business';
import type { ScanEvent } from '@/domain/models/scan-event';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';
import type { WebsiteDeterministicMetrics } from '@/domain/models/website-assessment';

/**
 * Computes the deterministic (non-AI) grounding metrics fed into the Stage
 * 15 scoring prompt — see implementation.md, Stage 15, "Deterministic
 * metrics". A pure function over already-loaded records; performs no I/O of
 * its own, so callers are responsible for loading `firecrawlScan`/
 * `snapshot`/`screenshotScan` first (mirrors `matchesBusinessFilters`'s pure-
 * predicate pattern in `lib/db/businesses.ts`).
 */

const HOURS_PATTERN = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i;
const CONTACT_KEYWORD = /contact/i;

export interface ComputeDeterministicMetricsInput {
  business: Business;
  /** The most recent Firecrawl `ScanEvent` for this business, regardless of outcome. */
  firecrawlScan?: ScanEvent;
  /** The normalized snapshot for `firecrawlScan` — only meaningful when that scan completed. */
  snapshot?: WebsiteEnrichmentSnapshot;
  /** The most recent Playwright `existing_site` `ScanEvent`. */
  screenshotScan?: ScanEvent;
}

/**
 * Heuristic 0-100 "how much did Firecrawl actually find" score. Firecrawl
 * itself reports no confidence value — this counts how many of the
 * snapshot's higher-signal fields came back populated. Undefined when there
 * is no snapshot to evaluate.
 */
function estimateExtractionConfidence(snapshot: WebsiteEnrichmentSnapshot | undefined): number | undefined {
  if (!snapshot) return undefined;
  const signals = [
    !!snapshot.title,
    !!snapshot.metaDescription,
    !!snapshot.businessName,
    !!snapshot.summary || !!snapshot.about,
    snapshot.services.length > 0,
    snapshot.serviceAreas.length > 0,
    snapshot.contact.phones.length > 0 || snapshot.contact.emails.length > 0,
    snapshot.imageReferences.length > 0,
  ];
  const hit = signals.filter(Boolean).length;
  return Math.round((hit / signals.length) * 100);
}

function detectContactForm(snapshot: WebsiteEnrichmentSnapshot | undefined): boolean {
  if (!snapshot) return false;
  return (
    snapshot.callsToAction.some((cta) => CONTACT_KEYWORD.test(cta)) ||
    snapshot.navigationLabels.some((label) => CONTACT_KEYWORD.test(label)) ||
    snapshot.links.some((link) => CONTACT_KEYWORD.test(link.text ?? '') || CONTACT_KEYWORD.test(link.url))
  );
}

function detectHours(snapshot: WebsiteEnrichmentSnapshot | undefined): boolean {
  if (!snapshot) return false;
  const text = [snapshot.about, snapshot.summary, ...snapshot.faq.map((f) => f.answer)].filter(Boolean).join(' ');
  return HOURS_PATTERN.test(text);
}

export function computeDeterministicMetrics({
  business,
  firecrawlScan,
  snapshot,
  screenshotScan,
}: ComputeDeterministicMetricsInput): WebsiteDeterministicMetrics {
  const effectiveUrl = firecrawlScan?.finalUrl ?? business.websiteUrl;

  return {
    websiteExists: !!business.websiteUrl?.trim(),
    httpsEnabled: !!effectiveUrl && effectiveUrl.startsWith('https://'),
    crawlSucceeded: firecrawlScan?.status === 'completed',
    desktopScreenshotCaptured: screenshotScan?.captureResults?.desktop?.status === 'completed',
    mobileScreenshotCaptured: screenshotScan?.captureResults?.mobile?.status === 'completed',
    firecrawlExtractionConfidence: estimateExtractionConfidence(snapshot),
    googlePlacesDataAvailable: !!business.googlePlaceId,
    businessCategory: business.industry,
    city: business.address?.city,
    state: business.address?.state,
    phoneDetected: !!business.phone || !!snapshot?.contact.phones.length,
    emailDetected: !!business.email || !!snapshot?.contact.emails.length,
    contactFormDetected: detectContactForm(snapshot),
    googleRating: business.googleRating,
    googleReviewCount: business.googleReviewCount,
    socialProfilesDetected: !!business.socialLinks?.length || !!snapshot?.socialLinks.length,
    hoursDetected: detectHours(snapshot),
    servicesDetected: !!business.servicesOffered?.trim() || !!snapshot?.services.length,
    heroImageAvailable: !!business.heroPhotoUrl || !!business.photoUrls?.length,
  };
}
