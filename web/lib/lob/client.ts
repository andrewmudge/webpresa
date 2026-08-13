import 'server-only';
import { getLobSecret } from '@/lib/secrets';
import { assertLiveModeAllowed } from '@/lib/env/runtime-environment';

/**
 * Stage 22 Phase 4 — thin Lob REST client. Deliberately a hand-written
 * `fetch` wrapper, not the official `lob` npm SDK — confirmed against
 * Lob's live API docs (docs.lob.com) that the API is plain HTTP Basic
 * Auth (API key as the username, blank password) over a small set of
 * JSON endpoints at `https://api.lob.com/v1`, so a thin wrapper keeps
 * every request/response shape visible in this repo instead of behind an
 * external dependency's own types/versioning — matching this stage's
 * "Lob-specific code isolated in one adapter module" design decision (see
 * implementation.md, Stage 22, "Guiding decisions").
 *
 * There is no request-level "test mode" flag — confirmed against Lob's
 * docs, which state plainly that test vs. live mode is determined
 * entirely by which API key (`test_*` vs `live_*`) is configured. The
 * `lob` secret currently holds only a test-mode key (no payment method is
 * on file for this account, per Lob's own restriction that live keys need
 * one), so nothing in this module can cause a real postcard to be mailed
 * until that key is deliberately swapped out-of-band.
 *
 * Stage 22.5 — `assertLiveModeAllowed` below is a defense-in-depth check
 * on top of that: even once a `live_*` key exists, this module refuses to
 * use it unless the resolved runtime environment is genuinely
 * `'production'`, so a live key configured on a non-production deployment
 * can't be exercised.
 */

const LOB_API_BASE_URL = 'https://api.lob.com/v1';

export class LobApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

export async function lobRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = await getLobSecret();
  assertLiveModeAllowed('Lob', apiKey.startsWith('live_'));
  const authorization = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;

  const response = await fetch(`${LOB_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'error' in body ? JSON.stringify((body as { error: unknown }).error) : `HTTP ${response.status}`;
    throw new LobApiError(`Lob API request to ${path} failed: ${detail}`, response.status, body);
  }
  return body as T;
}
