import 'server-only';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { Business } from '@/domain/models/business';
import { THEME_NAMES, DEFAULT_THEME_NAME, type ThemeName } from '@/domain/constants/themes';
import { THEME_OPTIONS } from '@/lib/themes';
import { getOpenAiClient, getOpenAiModel } from '@/lib/ai/client';
import { detectLogoThemeFamily } from './logo-color';
import { INDUSTRY_THEME_DEFAULTS } from './industry-defaults';

/**
 * Brand Theme System — theme selection.
 *
 * OpenAI never invents a color. It only ever returns one name from
 * `THEME_NAMES`; every other step here is either a stored preference or a
 * deterministic, code-only decision. See `lib/themes.ts` for the actual
 * palettes and `web/docs/architecture.md` for the full step-by-step spec.
 */

const ThemeSelectionSchema = z.object({ theme: z.enum(THEME_NAMES) });

/**
 * Step 3 (reuse) + Step 1 (existing logo) — resolved without ever calling
 * OpenAI. Returns `undefined` when neither signal is available, so the
 * caller can decide what to do next (ask OpenAI, or use a deterministic
 * fallback for the free seed path).
 */
export async function pickStoredOrLogoTheme(business: Business): Promise<ThemeName | undefined> {
  if (business.theme) return business.theme;
  if (business.logoUrl) {
    const fromLogo = await detectLogoThemeFamily(business.logoUrl);
    if (fromLogo) return fromLogo;
  }
  return undefined;
}

function linesFrom(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Step 2 — no logo and no stored preference. Asks OpenAI to reason about
 * brand personality, target audience, professionalism, and modern-vs-
 * traditional / premium-vs-approachable positioning, but constrains its
 * answer to exactly one of the 10 curated preset names. The model cannot
 * return a color — the schema only accepts a `ThemeName` enum value.
 */
export async function pickThemeViaOpenAi(business: Business): Promise<ThemeName> {
  const model = getOpenAiModel();
  const client = await getOpenAiClient();

  const presetSummary = THEME_OPTIONS.map(
    (t) => `- ${t.name}: "${t.displayName}" — best for ${t.bestFor.join(', ')}`,
  ).join('\n');

  const system = [
    'You select a website brand theme for a local service business. You do not design colors.',
    'You must choose exactly one preset name from this approved list — never invent, blend, or modify a color:',
    presetSummary,
    'Base your choice on brand personality, target audience, level of professionalism, modern vs traditional feel, and premium vs approachable positioning.',
  ].join('\n');

  const locationLabel = business.address
    ? [business.address.city, business.address.state].filter(Boolean).join(', ')
    : undefined;

  const user = [
    `Business name: ${business.name}`,
    `Industry: ${business.industry.replace(/_/g, ' ')}`,
    locationLabel && `Location: ${locationLabel}`,
    business.brandTone && `Brand tone: ${business.brandTone}`,
    business.description && `Business description: ${business.description}`,
    linesFrom(business.differentiators).length > 0 &&
      `Differentiators:\n${linesFrom(business.differentiators).join('\n')}`,
    business.notes && `Additional notes: ${business.notes}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const completion = await client.chat.completions.parse({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: zodResponseFormat(ThemeSelectionSchema, 'webpresa_theme_selection'),
  });

  const output = completion.choices[0]?.message.parsed;
  return output?.theme ?? DEFAULT_THEME_NAME;
}

/**
 * Full Brand Theme System selection for a real AI-generated website:
 * stored preference → logo color → OpenAI personality-based pick. Always
 * returns a valid `ThemeName`, never a raw color.
 */
export async function resolveBusinessTheme(business: Business): Promise<ThemeName> {
  const fromStoredOrLogo = await pickStoredOrLogoTheme(business);
  if (fromStoredOrLogo) return fromStoredOrLogo;
  return pickThemeViaOpenAi(business);
}

/**
 * Theme selection for the free, no-AI seed preview path: stored preference
 * → logo color → deterministic industry default. Never calls OpenAI, so
 * the "Create test preview" action stays free and instant.
 */
export async function resolveBusinessThemeForSeed(business: Business): Promise<ThemeName> {
  const fromStoredOrLogo = await pickStoredOrLogoTheme(business);
  if (fromStoredOrLogo) return fromStoredOrLogo;
  return INDUSTRY_THEME_DEFAULTS[business.industry] ?? DEFAULT_THEME_NAME;
}
