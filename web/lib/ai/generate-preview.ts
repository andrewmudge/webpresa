import 'server-only';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { Business } from '@/domain/models/business';
import type { GenerationMetadata, PreviewContent, PreviewSocialLink, PreviewTheme } from '@/domain/models/site-preview';
import type { WebsiteEnrichmentSnapshot } from '@/domain/models/website-enrichment';
import type { ScanImageAsset } from '@/domain/models/scan-image';
import { PreviewContentSchema, SitePreviewSchema } from '@/domain/schemas/site-preview.schema';
import { buildDefaultCta } from '@/app/admin/(dashboard)/businesses/[businessId]/cta-defaults';
import { resolveBusinessTheme } from '@/lib/theme/select-theme';
import { resolveHeroImages } from '@/lib/image/resolve-hero-image';
import { getDefaultSectionImage } from '@/lib/image/default-section-images';
import { buildGenerationContext, type GenerationContext } from '@/lib/firecrawl/generation-context';
import { classifySocialPlatform } from '@/lib/social-links';
import { getOpenAiClient, getOpenAiModel } from './client';

/**
 * Optional Firecrawl enrichment input (Stage 13). When present,
 * `buildGenerationContext` fills gaps in the prompt input for fields the
 * business left blank, and scan-accepted images become a lower-priority
 * photo-slot fallback tier after `business.photoUrls`. Business fields
 * always win over the snapshot — see `lib/firecrawl/generation-context.ts`.
 */
export interface GeneratePreviewOptions {
  enrichment?: {
    snapshot: WebsiteEnrichmentSnapshot;
    scanImages: ScanImageAsset[];
    scanId: string;
  };
}

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

function buildPrompt(business: Business, generationContext: GenerationContext): { system: string; user: string } {
  const services = generationContext.servicesLines;
  const serviceAreas = generationContext.serviceAreaLines;
  const differentiators = generationContext.differentiatorLines;
  const locationLabel = business.address
    ? [business.address.city, business.address.state].filter(Boolean).join(', ')
    : undefined;

  // The primary/secondary CTA *type and destination* are always decided in
  // code from verified contact fields (buildDefaultCta, called after this
  // prompt runs) — phone wins the primary slot whenever one is on file,
  // email only ever lands in secondary (or primary if there's no phone).
  // The model only supplies the button copy, so it must be told which
  // channel each label slot will actually be attached to — otherwise it has
  // no way to know "Call Now" belongs on the phone button, not the email
  // one, and the two can end up swapped on the rendered page.
  const primaryChannel = generationContext.contact.phone ? 'phone call' : generationContext.contact.email ? 'email' : null;
  const secondaryChannel = generationContext.contact.phone && generationContext.contact.email ? 'email' : null;

  const system = [
    'You write structured content for a local-service-business website generator.',
    'You must not invent the following — only use what is explicitly provided below:',
    ...GUARDRAILS.map((g) => `- ${g}`),
    'Some fields below may have been filled in from information found on the business\'s own existing website (noted as such) rather than typed directly by the owner — treat it as supporting context with the same "do not invent beyond what is provided" rule, never as license to add anything beyond what is listed.',
    'Write one service entry for each service listed — do not add extra services.',
    'Write one differentiator entry for each differentiator listed — do not add extra ones. If none were listed, return an empty array.',
    'CTA labels should be short (2-4 words) action phrases appropriate to the brand tone — never invent unrelated claims in them.',
    primaryChannel &&
      `primaryCtaLabel is the button text for a ${primaryChannel} action — write copy appropriate to that specific channel (e.g. "Call Now" for a phone call, "Email Us" or "Get a Free Estimate" for email).`,
    secondaryChannel
      ? `secondaryCtaLabel is the button text for a separate ${secondaryChannel} action — write copy appropriate to that specific channel, distinct from primaryCtaLabel.`
      : 'secondaryCtaLabel is unused in this case (only one contact channel is on file) — still return a short generic phrase, but it will not be rendered.',
  ]
    .filter(Boolean)
    .join('\n');

  const user = [
    `Business name: ${business.name}`,
    `Industry: ${business.industry.replace(/_/g, ' ')}`,
    locationLabel && `Location: ${locationLabel}`,
    `Has phone on file: ${!!generationContext.contact.phone}`,
    `Has email on file: ${!!generationContext.contact.email}`,
    `Has an uploaded photo: ${!!business.photoUrls?.length}`,
    business.brandTone && `Brand tone: ${business.brandTone}`,
    services.length > 0 && `Services offered (one per line):\n${services.join('\n')}`,
    serviceAreas.length > 0 && `Service areas (context only — do not restate as a separate field): ${serviceAreas.join(', ')}`,
    generationContext.description && `Business description: ${generationContext.description}`,
    differentiators.length > 0 && `Differentiators (one per line):\n${differentiators.join('\n')}`,
    business.notes && `Additional notes from the owner: ${business.notes}`,
    generationContext.usedEnrichmentFallback &&
      'Note: some of the fields above (services, service areas, differentiators, and/or description) were filled in from the business\'s own existing website because the owner left them blank — not typed directly by the owner.',
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
 * verified, admin-entered fields, optionally enriched with Firecrawl-scraped
 * website content (Stage 13 — see `options.enrichment`). Never crawls a
 * website itself — that's `lib/firecrawl/enrich-business.ts`'s job; this
 * function only ever receives an already-normalized snapshot.
 *
 * Without `options.enrichment`, behavior is identical to the original
 * Stage 11 manual-generation path. With it, `buildGenerationContext` fills
 * gaps in services/service areas/description that the business left blank
 * — this is what lets a Stage 12–imported business (typically no
 * `servicesOffered` text yet) get its first preview without completing
 * Stage 11 manually first. Business-entered fields still always win.
 *
 * Throws when required inputs are missing (no services available from
 * either the business record or the enrichment snapshot) or when the
 * model's output fails validation — callers must not persist a caught error.
 */
export async function generatePreviewContent(
  business: Business,
  options: GeneratePreviewOptions = {},
): Promise<GeneratedPreview> {
  const generationContext = buildGenerationContext({ business, snapshot: options.enrichment?.snapshot });

  if (generationContext.servicesLines.length === 0) {
    throw new Error('Add at least one service under "Services offered" before generating a website.');
  }

  const model = getOpenAiModel();
  const client = await getOpenAiClient();
  const { system, user } = buildPrompt(business, generationContext);
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

  // --- Contact + service areas: always code-derived, never the model.
  // `generationContext.contact` already resolved business-wins-else-snapshot
  // for each of phone/email/address (see buildGenerationContext) — this is
  // generation-input only, never a write-back to Business. ---
  const contact = generationContext.contact;
  // Capped to match `PreviewContentSchema` (`serviceAreas: max 10 items,
  // each max 80 chars`) — the Firecrawl snapshot alone allows up to 20, and
  // the admin free-text field has no line-count cap, so either source can
  // exceed the preview schema's limit. Same treatment `socialLinks` gets a
  // few lines below, and the same slice/truncate `section-content.ts`
  // already applies on the customer-editing side.
  const serviceAreas = generationContext.serviceAreaLines.slice(0, 10).map((area) => area.slice(0, 80));

  // --- CTA: a durable business-level decision, like theme — once an admin
  // has an edited (or a first-generation-seeded) CTA on file, every
  // subsequent regeneration reuses it verbatim instead of re-deriving one
  // from the model's fresh labels. Only derives a brand-new CTA (via
  // buildDefaultCta + the model's labels) when the business has none yet. ---
  const cta = business.cta ?? buildDefaultCta(contact, {
    primary: output.primaryCtaLabel,
    secondary: output.secondaryCtaLabel,
  });

  // --- About/services: uploaded photos always win over placeholders. Each
  // slot prefers a distinct photo so more of what was uploaded actually
  // gets used, falling back to reusing an earlier one when fewer exist.
  // An admin override (see Business model) takes priority over the
  // automatic pick; overriding to 'none' forces that slot's non-photo
  // fallback even when photos exist. Scan-accepted images (Stage 13) are a
  // lower-priority fallback tier — admin-uploaded photos always win over
  // anything discovered on the business's own website. Never sourced from
  // Google Places (Stage 12 never downloads photos at all). A curated
  // per-industry default image (`lib/image/default-section-images.ts`) is
  // the final fallback tier, used only when nothing above resolved — today
  // that's plumbing only. The hero slot has its own separate tier chain —
  // see resolveHeroImages below. ---
  const acceptedScanImages = (options.enrichment?.scanImages ?? []).filter(
    (img): img is typeof img & { url: string } => img.status === 'accepted' && !!img.url,
  );
  const scanHeroImageUrl = acceptedScanImages.find((img) => img.role === 'hero')?.url ?? acceptedScanImages[0]?.url;
  const otherScanImageUrls = acceptedScanImages.filter((img) => img.url !== scanHeroImageUrl).map((img) => img.url);

  // Hero/mobile-hero resolution has its own dedicated tier chain — see
  // lib/image/resolve-hero-image.ts — distinct from the resolvePhotoSlot
  // upload-order fallback the other slots below still use. Notably, an
  // automatically-picked uploaded photo is no longer part of the hero's
  // auto-chain (a Firecrawl dimension-matched image or curated stock photo
  // now takes that place); uploaded photos remain hero-selectable only via
  // an explicit admin override.
  const { heroImageUrl, heroImageUrlMobile, heroStyle } = await resolveHeroImages({ business, acceptedScanImages });
  const aboutImageUrl = resolvePhotoSlot(
    business.whyChooseUsPhotoUrl,
    business.photoUrls?.[1],
    business.photoUrls?.[0],
    otherScanImageUrls[0],
    getDefaultSectionImage(business.industry, 'whyChooseUs'),
  );
  const servicesImageUrl = resolvePhotoSlot(
    business.servicesPhotoUrl,
    business.photoUrls?.[2],
    business.photoUrls?.[1],
    business.photoUrls?.[0],
    otherScanImageUrls[1] ?? otherScanImageUrls[0],
    getDefaultSectionImage(business.industry, 'featuredService'),
  );
  const aboutSectionImageUrl = resolvePhotoSlot(
    business.aboutPhotoUrl,
    business.photoUrls?.[3],
    business.photoUrls?.[1],
    business.photoUrls?.[0],
    otherScanImageUrls[2] ?? otherScanImageUrls[0],
    getDefaultSectionImage(business.industry, 'about'),
  );

  // --- Social links: Business-entered wins outright (same "Business is
  // canonical" precedent as every other manually-entered field); Firecrawl's
  // discovered links are only used when the business left this blank. See
  // PreviewSocialLink's doc comment. Deterministic hostname classification
  // (lib/social-links.ts), never AI. Capped to 6 — the schema/snapshot cap
  // higher, but a row of icons doesn't need that many. ---
  const rawSocialLinks = business.socialLinks?.length
    ? business.socialLinks
    : options.enrichment?.snapshot.socialLinks;
  const socialLinks: PreviewSocialLink[] | undefined = rawSocialLinks?.length
    ? rawSocialLinks.slice(0, 6).map((url) => ({ platform: classifySocialPlatform(url), url }))
    : undefined;

  const content: PreviewContent = {
    hero: { ...output.hero, ctaText: cta.primary.label || 'Contact Us' },
    services: output.services,
    tagline: output.tagline,
    aboutText: output.aboutText,
    contact,
    ...(serviceAreas.length > 0 ? { serviceAreas } : {}),
    ...(output.differentiators.length > 0 ? { differentiators: output.differentiators } : {}),
    ...(socialLinks ? { socialLinks } : {}),
    seo: { title: output.seoTitle, description: output.seoDescription },
    cta,
  };

  const theme: PreviewTheme = {
    themeName,
    fontFamily: output.fontFamily,
    ...(heroImageUrl ? { heroImageUrl, heroStyle } : { heroStyle: 'illustration' as const }),
    ...(heroImageUrlMobile ? { heroImageUrlMobile } : {}),
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
      source: options.enrichment ? 'firecrawl_enriched' : 'manual_ai',
      ...(options.enrichment ? { scanId: options.enrichment.scanId } : {}),
    },
  };
}
