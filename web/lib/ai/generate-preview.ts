import 'server-only';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { Business } from '@/domain/models/business';
import type { GenerationMetadata, HeroStyle, PreviewContent, PreviewTheme } from '@/domain/models/site-preview';
import { PreviewContentSchema, SitePreviewSchema } from '@/domain/schemas/site-preview.schema';
import { buildDefaultCta } from '@/app/admin/(dashboard)/businesses/[businessId]/cta-defaults';
import { resolveBusinessTheme } from '@/lib/theme/select-theme';
import { checkHeroPhotoDimensions } from '@/lib/image/hero-dimensions';
import { getOpenAiClient, getOpenAiModel } from './client';

// ---------------------------------------------------------------------------
// Structured output schema
//
// The model only supplies copy and font choice — hero presentation style is
// never AI-chosen (an uploaded photo always renders as 'image'; otherwise
// the theme-matched 'illustration' fallback is used deterministically, see
// the `theme` assembly below). Everything structural or fact-derived —
// contact info, service areas, CTA type and destination — is computed in
// code from verified Business fields, never trusted from model output. See
// the "must not invent" guardrail list below.
// ---------------------------------------------------------------------------

// Single-quoted font names (not double-quoted) — OpenAI's strict structured-output
// mode rejects `"` characters inside enum string literals; CSS accepts either.
const FONT_STACKS = [
  "system-ui, -apple-system, 'Segoe UI', sans-serif",
  "'Georgia', 'Times New Roman', serif",
  "'Helvetica Neue', Arial, sans-serif",
  "'Trebuchet MS', sans-serif",
] as const;

const GenerationOutputSchema = z.object({
  hero: z.object({
    headline: z.string().min(1).max(120),
    subheadline: z.string().min(1).max(300),
  }),
  services: z
    .array(z.object({ name: z.string().min(1).max(100), description: z.string().min(1).max(500) }))
    .min(1)
    .max(10),
  tagline: z.string().min(1).max(200),
  aboutText: z.string().min(1).max(2000),
  differentiators: z
    .array(z.object({ title: z.string().min(1).max(80), description: z.string().min(1).max(300) }))
    .max(8),
  /** Label for the primary CTA — code decides the actual type/destination via buildDefaultCta. */
  primaryCtaLabel: z.string().min(1).max(40),
  /** Label for the secondary CTA, used only when the business has a second contact channel. */
  secondaryCtaLabel: z.string().min(1).max(40),
  fontFamily: z.enum(FONT_STACKS),
  seoTitle: z.string().min(1).max(60),
  seoDescription: z.string().min(1).max(160),
});

const RESPONSE_FORMAT_NAME = 'webpresa_generated_website';

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const GUARDRAILS = [
  'certifications',
  'licenses',
  'years in business',
  'reviews',
  'awards',
  'guarantees',
  '24/7 availability',
  'service areas beyond what is explicitly listed',
  'business ownership claims',
  'statistics',
] as const;

function linesFrom(text: string | undefined): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Resolves one photo-slot assignment: an explicit admin `override` wins
 * outright (the reserved value `'none'` forces "no photo for this slot",
 * even when uploaded photos exist); otherwise the first defined value in
 * `autoFallbacks` is used (the automatic, upload-order-based assignment).
 */
function resolvePhotoSlot(
  override: string | undefined,
  ...autoFallbacks: (string | undefined)[]
): string | undefined {
  if (override === 'none') return undefined;
  if (override) return override;
  return autoFallbacks.find((url): url is string => !!url);
}

function buildPrompt(business: Business): { system: string; user: string } {
  const services = linesFrom(business.servicesOffered);
  const serviceAreas = linesFrom(business.serviceAreas);
  const differentiators = linesFrom(business.differentiators);
  const locationLabel = business.address
    ? [business.address.city, business.address.state].filter(Boolean).join(', ')
    : undefined;

  const system = [
    'You write structured content for a local-service-business website generator.',
    'You must not invent the following — only use what is explicitly provided below:',
    ...GUARDRAILS.map((g) => `- ${g}`),
    'Write one service entry for each service the business owner listed — do not add extra services.',
    'Write one differentiator entry for each differentiator listed — do not add extra ones. If none were listed, return an empty array.',
    'CTA labels should be short (2-4 words) action phrases appropriate to the brand tone, e.g. "Call Now", "Get a Free Estimate", "Book Online" — never invent unrelated claims in them.',
  ].join('\n');

  const user = [
    `Business name: ${business.name}`,
    `Industry: ${business.industry.replace(/_/g, ' ')}`,
    locationLabel && `Location: ${locationLabel}`,
    `Has phone on file: ${!!business.phone}`,
    `Has email on file: ${!!business.email}`,
    `Has an uploaded photo: ${!!business.photoUrls?.length}`,
    business.brandTone && `Brand tone: ${business.brandTone}`,
    services.length > 0 && `Services offered (one per line, verbatim from the owner):\n${services.join('\n')}`,
    serviceAreas.length > 0 && `Service areas (context only — do not restate as a separate field): ${serviceAreas.join(', ')}`,
    business.description && `Business description: ${business.description}`,
    differentiators.length > 0 && `Differentiators (one per line, verbatim from the owner):\n${differentiators.join('\n')}`,
    business.notes && `Additional notes from the owner: ${business.notes}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, user };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface GeneratedPreview {
  content: PreviewContent;
  theme: PreviewTheme;
  metadata: GenerationMetadata;
}

/**
 * Generate a complete SitePreview (content + theme) for a business from its
 * verified, admin-entered fields. Never crawls a website — that's Stage 13.
 *
 * Throws when required inputs are missing (no services listed) or when the
 * model's output fails validation — callers must not persist a caught error.
 */
export async function generatePreviewContent(business: Business): Promise<GeneratedPreview> {
  if (linesFrom(business.servicesOffered).length === 0) {
    throw new Error('Add at least one service under "Services offered" before generating a website.');
  }

  const model = getOpenAiModel();
  const client = await getOpenAiClient();
  const { system, user } = buildPrompt(business);
  const startedAt = Date.now();

  // Content copy and theme-preset selection are independent OpenAI concerns
  // (see lib/theme/select-theme.ts — the model never invents a color here).
  const [completion, themeName] = await Promise.all([
    client.chat.completions.parse({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: zodResponseFormat(GenerationOutputSchema, RESPONSE_FORMAT_NAME),
    }),
    resolveBusinessTheme(business),
  ]);

  const output = completion.choices[0]?.message.parsed;
  if (!output) {
    throw new Error('OpenAI returned no parsable structured output.');
  }

  const durationMs = Date.now() - startedAt;

  // --- Contact + service areas: always code-derived from verified fields, never the model. ---
  const contact = {
    ...(business.phone ? { phone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.address
      ? {
          address: [
            business.address.line1,
            business.address.city,
            business.address.state,
            business.address.postalCode,
          ]
            .filter(Boolean)
            .join(', '),
        }
      : {}),
  };
  const serviceAreas = linesFrom(business.serviceAreas);

  // --- CTA: code decides type/destination via buildDefaultCta; model only supplied the labels. ---
  const cta = buildDefaultCta(contact, {
    primary: output.primaryCtaLabel,
    secondary: output.secondaryCtaLabel,
  });

  // --- Hero/about/services: uploaded photos always win over placeholders.
  // Each slot prefers a distinct photo so more of what was uploaded actually
  // gets used, falling back to reusing an earlier one when fewer exist.
  // An admin override (see Business model) takes priority over the
  // automatic pick; overriding to 'none' forces that slot's non-photo
  // fallback even when photos exist. ---
  const heroImageUrl = resolvePhotoSlot(business.heroPhotoUrl, business.photoUrls?.[0]);
  const aboutImageUrl = resolvePhotoSlot(
    business.whyChooseUsPhotoUrl,
    business.photoUrls?.[1],
    business.photoUrls?.[0],
  );
  const servicesImageUrl = resolvePhotoSlot(
    business.servicesPhotoUrl,
    business.photoUrls?.[2],
    business.photoUrls?.[1],
    business.photoUrls?.[0],
  );
  const aboutSectionImageUrl = resolvePhotoSlot(
    business.aboutPhotoUrl,
    business.photoUrls?.[3],
    business.photoUrls?.[1],
    business.photoUrls?.[0],
  );

  const content: PreviewContent = {
    hero: { ...output.hero, ctaText: cta.primary.label || 'Contact Us' },
    services: output.services,
    tagline: output.tagline,
    aboutText: output.aboutText,
    contact,
    ...(serviceAreas.length > 0 ? { serviceAreas } : {}),
    ...(output.differentiators.length > 0 ? { differentiators: output.differentiators } : {}),
    seo: { title: output.seoTitle, description: output.seoDescription },
    cta,
  };

  // Never AI-chosen: a resolved hero photo always wins over the theme-
  // matched illustration fallback. Whether it renders full-bleed or in the
  // split layout depends on its actual pixel dimensions — see
  // lib/image/hero-dimensions.ts, shared with the admin-facing warning in
  // PhotosForm so the two can never disagree.
  const heroDimensionCheck = heroImageUrl ? await checkHeroPhotoDimensions(heroImageUrl) : null;
  const heroStyle: HeroStyle = !heroImageUrl
    ? 'illustration'
    : heroDimensionCheck?.isFullBleedEligible
      ? 'image'
      : 'imageSplit';

  const theme: PreviewTheme = {
    themeName,
    fontFamily: output.fontFamily,
    ...(heroImageUrl ? { heroImageUrl, heroStyle } : { heroStyle: 'illustration' as const }),
    ...(aboutImageUrl ? { aboutImageUrl } : {}),
    ...(aboutSectionImageUrl ? { aboutSectionImageUrl } : {}),
    ...(servicesImageUrl ? { servicesImageUrl } : {}),
  };

  // Defense in depth — never persist output that didn't pass the model's own
  // schema even if a future prompt/version drifts from PreviewContentSchema.
  PreviewContentSchema.parse(content);
  SitePreviewSchema.shape.theme.parse(theme);

  return {
    content,
    theme,
    metadata: {
      model,
      promptVersion: '2026-07-13',
      generatedAt: new Date().toISOString(),
      durationMs,
    },
  };
}
