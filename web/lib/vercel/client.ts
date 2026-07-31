import 'server-only';
import { getVercelApiSecret } from '@/lib/secrets';
import { VercelApiError, categorizeHttpError } from './errors';

/**
 * Server-only Vercel Project Domains API client (Stage 19.x, Part 2).
 *
 * Plain `fetch` against the REST API, mirroring `lib/firecrawl/client.ts`
 * and `lib/google-places/client.ts`: server-only/secret-from-Secrets-
 * Manager/typed-error-category/Zod-validated-response pattern already
 * established in this codebase — no vendor SDK.
 *
 * Endpoint paths used by `lib/vercel/domains.ts` reflect Vercel's
 * documented Project Domains API as of this writing. Reconfirm against
 * https://vercel.com/docs/rest-api before the first real deployment — the
 * same discipline this codebase already applies to every third-party
 * integration.
 */

const VERCEL_API_BASE = 'https://api.vercel.com';
const DEFAULT_TIMEOUT_MS = 15_000;

export async function vercelFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accessToken, teamId } = await getVercelApiSecret();

  const url = new URL(`${VERCEL_API_BASE}${path}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new VercelApiError('timeout', 'Vercel API request timed out.');
    }
    throw new VercelApiError('unreachable', 'Could not reach the Vercel API.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message;
    } catch {
      // Non-JSON error body — fall through with generic messaging.
    }
    throw new VercelApiError(
      categorizeHttpError(response.status),
      message ?? `Vercel API request failed (HTTP ${response.status}).`,
      { httpStatus: response.status },
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
