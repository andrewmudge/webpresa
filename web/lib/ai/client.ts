import 'server-only';
import OpenAI from 'openai';
import { getOpenAiSecret } from '@/lib/secrets';

/**
 * Singleton OpenAI client.
 *
 * The API key is fetched once from Secrets Manager (via `getOpenAiSecret`,
 * which caches indefinitely per process — same lifetime as this client
 * singleton) and never read from an environment variable directly.
 *
 * Never expose this module or its callers to browser bundles. Never log
 * the API key.
 */

let client: OpenAI | undefined;

export async function getOpenAiClient(): Promise<OpenAI> {
  if (client) return client;

  const { apiKey } = await getOpenAiSecret();
  client = new OpenAI({ apiKey });

  return client;
}

// ---------------------------------------------------------------------------
// Model — configurable via OPENAI_MODEL rather than hardcoded (Stage 11
// requirement). Falls back to a small, cost-effective default.
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'gpt-4o-mini';

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

// ---------------------------------------------------------------------------
// Scoring model — deliberately separate from OPENAI_MODEL/DEFAULT_MODEL
// above. Stage 15 (AI Prospect Qualification & Website Analysis) output
// drives real sales-prioritization decisions, so it defaults to a stronger
// model than the Stage 11 content-generation path rather than sharing its
// cost-optimized default. Configurable via OPENAI_SCORING_MODEL for the same
// reason OPENAI_MODEL is configurable — never hardcode a model choice a
// deployment can't override.
// ---------------------------------------------------------------------------

const DEFAULT_SCORING_MODEL = 'gpt-5.5';

export function getOpenAiScoringModel(): string {
  return process.env.OPENAI_SCORING_MODEL || DEFAULT_SCORING_MODEL;
}
