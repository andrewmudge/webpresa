import 'server-only';
import { getFirecrawlSecret } from '@/lib/secrets';

/**
 * Server-only Firecrawl v2 client — single-page Scrape operation only.
 *
 * Deliberately a plain `fetch` call against the REST API rather than the
 * `firecrawl` npm SDK, mirroring `lib/google-places/client.ts` (Stage 12):
 * same server-only/secret-from-Secrets-Manager/typed-error-category/
 * Zod-validated-response pattern already established in this codebase. The
 * SDK also wraps every error in its own `SdkError`, discarding the raw HTTP
 * response — this needs the `Retry-After` header directly (see
 * `lib/firecrawl/retry.ts`), which the SDK does not expose.
 *
 * Confirmed against the installed `firecrawl@4.30.1` SDK source (not just
 * docs): base URL `https://api.firecrawl.dev`, endpoint `POST /v2/scrape`,
 * `Authorization: Bearer <apiKey>`, request body `{ url, formats,
 * onlyMainContent, timeout }`, response `{ success, data: { markdown,
 * links, images, json, metadata: { title, description, sourceURL, url,
 * statusCode, error } } }`.
 *
 * The `json` format entry runs Firecrawl's own extraction LLM as part of
 * this single Scrape call — this is still the Scrape operation, not a
 * separate Search/Extract/Crawl call, and it means our own OpenAI usage
 * stays limited to the existing Stage 11 generation call (see
 * `lib/firecrawl/normalize.ts`).
 */

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/scrape';

/** Bounded by the request timeout below plus a small margin for the HTTP round trip. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * JSON Schema (not Zod — the wire format Firecrawl's API expects) describing
 * the structured business fields we want its extraction LLM to pull out of
 * the page alongside the markdown/links/images formats. Kept intentionally
 * small — only what `lib/firecrawl/normalize.ts` maps into
 * `WebsiteEnrichmentSnapshot`.
 */
const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    businessName: { type: 'string' },
    summary: { type: 'string' },
    about: { type: 'string' },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, description: { type: 'string' } },
        required: ['name'],
      },
    },
    serviceAreas: { type: 'array', items: { type: 'string' } },
    differentiators: { type: 'array', items: { type: 'string' } },
    faq: {
      type: 'array',
      items: {
        type: 'object',
        properties: { question: { type: 'string' }, answer: { type: 'string' } },
        required: ['question', 'answer'],
      },
    },
    navigationLabels: { type: 'array', items: { type: 'string' } },
    callsToAction: { type: 'array', items: { type: 'string' } },
    contact: {
      type: 'object',
      properties: {
        phones: { type: 'array', items: { type: 'string' } },
        emails: { type: 'array', items: { type: 'string' } },
        addresses: { type: 'array', items: { type: 'string' } },
      },
    },
    socialLinks: { type: 'array', items: { type: 'string' } },
  },
} as const;

const EXTRACTION_PROMPT =
  'Extract only information that is literally present on this page: business name, a short summary, ' +
  'an "about" paragraph if present, the list of services offered with short descriptions, cities/areas ' +
  'the business says it serves, short differentiator/"why choose us" phrases the business states about ' +
  'itself (e.g. years in business, family-owned/local, licensed/insured, 24/7 availability, awards or ' +
  'certifications, satisfaction guarantees) — only if literally stated on the page, never inferred or ' +
  'estimated — any FAQ question/answer pairs, the main navigation link labels, any call-to-action ' +
  'button/link text, contact phone numbers/emails/addresses, and social media profile URLs. Do not ' +
  'infer, guess, or add anything not literally stated on the page. Omit a field entirely if the page ' +
  'does not contain it.';

export const FIRECRAWL_ERROR_CATEGORIES = [
  'auth',
  'rate_limit',
  'timeout',
  'provider_error',
  'unreachable',
  'unknown',
] as const;
export type FirecrawlErrorCategory = (typeof FIRECRAWL_ERROR_CATEGORIES)[number];

export class FirecrawlApiError extends Error {
  category: FirecrawlErrorCategory;
  /** Seconds to wait before retrying, when the provider supplied one (429 responses). */
  retryAfterSeconds?: number;
  httpStatus?: number;

  constructor(
    category: FirecrawlErrorCategory,
    message: string,
    opts?: { retryAfterSeconds?: number; httpStatus?: number },
  ) {
    super(message);
    this.name = 'FirecrawlApiError';
    this.category = category;
    this.retryAfterSeconds = opts?.retryAfterSeconds;
    this.httpStatus = opts?.httpStatus;
  }
}

/** Raw shape of a successful `/v2/scrape` response's `data` field — only what we actually read. */
export interface FirecrawlScrapeData {
  markdown?: string;
  links?: string[];
  images?: string[];
  json?: unknown;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    url?: string;
    statusCode?: number;
    error?: string;
  };
  warning?: string;
}

function parseRetryAfterSeconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const asInt = Number.parseInt(header, 10);
  if (Number.isFinite(asInt) && asInt >= 0) return asInt;
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, Math.round((asDate - Date.now()) / 1000));
  }
  return undefined;
}

function categorizeHttpError(status: number): FirecrawlErrorCategory {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 408) return 'timeout';
  if (status >= 500) return 'provider_error';
  return 'unknown';
}

/**
 * Scrapes a single page URL. Never logs the API key, the authorization
 * header, or raw page content — callers are responsible for sanitizing
 * before persisting or logging anything derived from the response.
 */
export async function scrapeWebsite(
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<FirecrawlScrapeData> {
  const { apiKey } = await getFirecrawlSecret();
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout + 5_000);

  let response: Response;
  try {
    response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links', 'images', { type: 'json', schema: EXTRACTION_JSON_SCHEMA, prompt: EXTRACTION_PROMPT }],
        onlyMainContent: true,
        timeout,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FirecrawlApiError('timeout', 'Firecrawl scrape request timed out.');
    }
    throw new FirecrawlApiError('unreachable', 'Could not reach the Firecrawl API.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('Retry-After'));
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error;
    } catch {
      // Non-JSON error body — fall through with generic messaging.
    }
    throw new FirecrawlApiError(
      categorizeHttpError(response.status),
      message ?? `Firecrawl scrape request failed (HTTP ${response.status}).`,
      { retryAfterSeconds, httpStatus: response.status },
    );
  }

  let body: { success: boolean; data?: FirecrawlScrapeData; error?: string };
  try {
    body = await response.json();
  } catch {
    throw new FirecrawlApiError('provider_error', 'Firecrawl returned a non-JSON response.');
  }

  if (!body.success || !body.data) {
    throw new FirecrawlApiError('provider_error', body.error ?? 'Firecrawl scrape did not succeed.');
  }

  return body.data;
}
