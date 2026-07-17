# Webpresa — Architecture

**Last updated:** 2026-07-16  
**Status:** Stage 10 complete in development. **Stage 11 (Manual AI Website Generation) foundation implemented and live-tested in development** — an admin can enter verified business facts, upload a logo/photos, and generate a real `SitePreview` (content, CTA, theme, hero presentation) via the OpenAI API; generated previews stay in draft until manually published. **Brand Theme System implemented** — AI (and admins) select from 10 curated theme presets by name only; no free-form color generation remains anywhere in the app. **Stage 11.x — Configurable Website-Section System implemented** — the public preview renders from a stored, per-business `websiteSections` configuration through a controlled component registry instead of a permanently fixed layout; an admin can enable/disable optional sections (required sections are locked on), reorder them via up/down controls, and apply a deterministic (non-AI) recommendation — see "Configurable Website-Section System" below. This is the foundation Stage 12 (Google Places discovery) will populate eligibility data into. **Theme-matched hero illustrations implemented** — every newly generated no-photo preview gets a deterministic, theme-matched illustration background (never AI-chosen) in place of the old AI-picked CSS gradient/pattern/solid fallback; see "Hero presentation" below. **Desktop hero image dimension classification implemented** — a resolved hero photo only renders full-bleed when within 100px of 1920×1080 or 1600×900px, otherwise it renders in a new two-column split layout instead; mobile does not yet show a real hero photo at any size (deferred). Admin business creation is a 3-step wizard (details → photos → sections) with no separate edit page — every field is editable inline on the business detail page; step 2 now surfaces the Photo Assignment section immediately after upload, before advancing to step 3. Premium generated website template live with a configurable primary/secondary CTA system and a picture background on the featured service card; admin with cascade delete; DynamoDB tables, S3 assets bucket, and Secrets Manager secrets live in `us-east-1`. Hosting on Vercel.

---

## Repository layout

```
webpresa/
├── web/                   Next.js application (homepage + future admin)
│   ├── app/               Next.js App Router pages and components
│   ├── domain/            Pure TypeScript domain models, schemas, factories
│   ├── lib/               Shared utilities, auth, and DynamoDB clients
│   ├── public/            Static assets (logo, images)
│   └── docs/              Architecture, deployment, build log
├── infra/                 AWS CDK infrastructure project
│   ├── bin/               CDK app entry point
│   ├── lib/
│   │   ├── config/        Environment configuration (dev / prod)
│   │   ├── constructs/    Reusable CDK constructs
│   │   └── stacks/        CloudFormation stacks
│   └── test/              CDK assertion tests
└── vercel.json            Vercel monorepo config (rootDirectory: "web")
```

---

## Applications

### Public homepage (`web/app/`)

A Next.js marketing site. No authentication. No server-side data fetching.

- Built with Next.js 16, React 19, Tailwind CSS v4, Framer Motion
- Homepage pages are statically prerendered at build time (`○` routes)
- Deployed via **Vercel** (connected to the GitHub repo; `main` → production, `dev` → preview)
- `output: 'export'` was removed in Stage 7 to support Server Actions and proxy.ts
- All section components live in `web/app/components/`

### Admin application (`web/app/admin/`)

Protected internal dashboard for operating Webpresa manually. Built in Stage 7; extended in Stage 8.

- Route group `app/admin/(dashboard)/` — server-rendered pages with shared sidebar layout
- `app/admin/sign-in/` — public sign-in page (uses root layout only)
- Authentication: username + **scrypt**-hashed password from environment variables; JWT session in an HTTP-only cookie signed with `SESSION_SECRET`
- Route protection via `proxy.ts` — unauthenticated requests to `/admin/*` redirect to `/admin/sign-in`
- All DynamoDB access is server-side only: never exposed to browser bundles
- Business CRUD via Next.js Server Actions. **No standalone edit page** — every field is editable inline, directly on the business detail page (`[businessId]/page.tsx`); there is nowhere else to navigate to change something about a business.
- **"Add business" is a 3-step wizard** (`businesses/new/` → `[businessId]/onboarding/photos/` → `[businessId]/onboarding/sections/`): business details (text) → photo upload → website section selection. Step 1 creates the `Business` record immediately (photo upload needs an existing `businessId` to key its S3 path off of, so the record can't wait until every step completes); abandoning the wizard partway through just leaves a business that's fully editable from its detail page — there's no separate "resume" flow. Step 2's redirect target is computed from the business's current `photoUrls` on each render: before any photos exist it redirects back to itself after an upload (revealing the Photo Assignment section — see "Photo slot assignment" below — in place, submit button "Upload Photos"), and only once photos exist does it advance to step 3 ("Continue →").
- Shared form components (`FormFields.tsx`, `BusinessDetailsForm.tsx`, `PhotosForm.tsx`) are reused identically by the wizard steps and the detail page's inline "Business Details"/"Photos" cards — `BusinessDetailsForm`/`PhotosForm` are the same component either way, only the bound Server Action (and its `redirectTo`) differs between "create → next step" and "update → stay here."
- `updateBusinessDetailsAction` and `updatePhotosAction` (`[businessId]/actions.ts`) are two narrow actions, not one big one — each only ever writes its own slice of `Business` fields (via `getBusinessById` → merge → `putBusiness()`), so saving one card can never clobber the other's data.
- **Business cascade delete** — removes the business record plus all SitePreviews, ScanEvents, and Postcards for that business
- **Create test preview** action on the business detail page — seeds a published `SitePreview` from the business record
- **Preview CTA editor** on the business detail page — configure the primary/secondary CTA (action type, label, destination override) on the most recent preview version; edits the preview in place, no new version created
- **Website Generation + Assets** — `BusinessDetailsForm`/`PhotosForm` capture free-text generation inputs (services offered, service areas, description, differentiators, brand tone, notes) and logo/photo uploads, persisted on the `Business` record so generation can be re-run later without re-entering data
- **Generate Website** action on the business detail page — calls the OpenAI API to produce a complete draft `SitePreview` (content, CTA, theme, hero presentation) from the business's verified fields; soft-capped at 3 real generations per business (the free seed-preview action is unaffected); always saves as `draft`, never auto-published
- Preview history, scan history, and postcard history on the business detail page
- Placeholder pages for `/admin/previews`, `/admin/scans`, `/admin/postcards`

**Credentials setup:**
```bash
# Generate a scrypt hash for ADMIN_PASSWORD_HASH (run from web/)
node -e "const{scryptSync,randomBytes}=require('crypto');const salt=randomBytes(16).toString('hex');console.log(scryptSync('YOUR_PASSWORD',salt,64).toString('hex')+':'+salt)"
# Generate SESSION_SECRET
openssl rand -base64 32
```
Store both in `.env.local` (local) or Vercel environment variables (deployed).

### Public preview website (`web/app/b/[slug]/`)

Customer-facing route that renders a `SitePreview` record as a professional local-service business website. Built in Stage 8; redesigned in Stage 8B.

- `/b/[slug]` — server-rendered (`force-dynamic`), queries the `slug-index` GSI on `webpresa-dev-site-previews`
- Draft / ready previews visible to authenticated admins only; published visible publicly; archived returns 404
- `generateMetadata` sets `noindex, nofollow` on unclaimed previews (`Business.status !== 'active'`); prefers `content.seo.title`/`description` when an AI-generated preview supplied them, falling back to the hero headline/subheadline otherwise
- Dismissible claim banner shown on published-but-unclaimed previews
- Theme colors applied via CSS custom properties (`--site-primary`, `--site-accent`, `--site-background`, `--site-surface`, `--site-text`, `--site-muted`, `--site-border`, `--site-success`, `--site-warning`, `--site-danger`) set on the root wrapper by `buildSiteTokens()` (`template/tokens.ts`), which resolves the preview's `PreviewTheme` to a full `BrandTheme` palette via `resolveThemePalette()` (`lib/themes.ts`) — see "Brand Theme System" below. All child sections reference `var(--site-*)`, either via Tailwind v4's `bg-(--site-*)`/`text-(--site-*)`/`border-(--site-*)` CSS-variable shorthand (parentheses, not square brackets — bracket arbitrary-value syntax emits the variable name as a literal, invalid value; see `build_log.md`, "Bug Fix — Tailwind CSS-variable syntax") or inline styles through the `V` shorthand object. No template component contains a hardcoded branding color.
- Template: `app/b/[slug]/template/` — 16 rendering components plus a shared `cta.tsx` resolver and a `section-registry.tsx` component registry:
  `GeneratedSiteHeader`, `GeneratedHero`, `TrustStrip`, `ServicesGrid`, `GallerySection`, `WhyChooseUs`, `AboutSection`, `ReviewsSection`, `TestimonialsSection`, `ServiceAreaSection`, `ProcessSection`, `FaqSection`, `FinalCTA`, `ContactSection`, `GeneratedSiteFooter`, `MobileCallBar`
- **Configurable Website-Section System (Stage 11.x):** `GeneratedWebsite` (`template/index.tsx`) no longer renders a fixed hardcoded sequence. It resolves `Business.websiteSections` (falling back to a computed catalog default when absent), filters to enabled sections whose content is actually available, sorts by `order`, and renders each through `sectionRegistry` — a `Record<WebsiteSectionType, (ctx) => ReactNode>` that is the only place a stored section identifier is ever turned into a real React component. See "Configurable Website-Section System" below for the full data model, catalog, and admin workflow. `MobileCallBar` stays outside this system (not a configurable page section).
- Sections with no data are hidden entirely — never rendered as an empty or broken block, and never left as a layout gap (no hardcoded copy)
- **Configurable CTA system:** `PreviewContent.cta` (`PreviewCtaConfig` — optional primary + secondary `PreviewCta`, each with an action `type` of `phone` / `email` / `sms` / `external_url` / `none`, a `label`, and an optional destination `value`) replaces hardcoded button copy across the template. `cta.tsx`'s `resolvePreviewCtaConfig()` is the single place that resolves configured CTAs into renderable links — phone/SMS/email fall back to `SitePreview.content.contact`, `external_url` requires a safe `https://` destination, and previews saved before this field existed (no `content.cta`) are normalized from the legacy `hero.ctaText` + `contact` at render time rather than migrated. Header, hero, Why Choose Us, About, Service Areas, the final CTA band, and the mobile sticky bar all read from the same resolved `{ primary, secondary }` pair; the phone/email cards in `ContactSection` and the footer stay tied directly to `contact` and are not part of the CTA system.
- `ServicesGrid`'s featured (first) service card shows a picture background on `lg:`+ screens (currently a `picsum.photos` `DEV_FIXTURE` placeholder — intended to be replaced by a real per-service photo once Stage 13 supplies one) and matches the other cards' styling below `lg:`
- **Hero presentation:** `PreviewTheme.heroStyle` (`image` / `imageSplit` / `illustration` / `gradient` / `pattern` / `solid`) drives `GeneratedHero`'s background. Never AI-chosen — a code decision: when a hero photo resolves, `lib/image/hero-dimensions.ts`'s `checkHeroPhotoDimensions()` classifies it by its actual pixel size — within `HERO_DIMENSION_TOLERANCE_PX` (100px, either dimension) of 1920×1080 or 1600×900 renders full-bleed (`image`), any other size still uses the photo but in a two-column split layout instead (`imageSplit`, text left/photo right — the same shell `illustration` uses, with the real photo on the desktop side). No hero photo at all deterministically gets `illustration` (`lib/ai/generate-preview.ts` no longer asks OpenAI to pick a hero style at all). On mobile, `image` and `imageSplit` both currently render the same no-photo illustration treatment as `illustration` — a real photo is not yet shown on mobile at any size (deferred to a future session); the admin-facing Photos card surfaces a dimension-mismatch warning for the desktop hero slot so this is visible before generating. `gradient`/`pattern`/`solid` are legacy-only values — no new preview produces them, but previews already saved with one keep rendering exactly as before at every viewport size, industry watermark (`template/industry-icons.tsx`, `getHeroIcon(industry)`, `lucide-react`) included. Legacy previews saved before `heroStyle` existed at all are inferred as `image` (if `heroImageUrl` is set) or `illustration` (upgraded from the old `solid` inference — a pure visual improvement, since illustration is now the preferred no-photo default).
- **Theme-matched hero illustrations:** `template/hero-illustrations.ts` — `getHeroIllustration(themeName)`, a static `Record<ThemeName, string>` lookup over 10 hand-designed PNGs at `public/hero_illustrations/{themeName}.png` (one per Brand Theme preset, colored to that preset's own primary/accent/surface palette; falls back to `DEFAULT_THEME_NAME`'s image for legacy previews with no stored `themeName`, mirroring `resolveThemePalette`'s own legacy fallback). `GeneratedHero.tsx`'s `illustration` branch is structurally distinct from the other four styles, not another case in the single-background-layer chain: on `lg:`+ it's a true full-bleed two-column split (no `max-w-6xl` wrapper, unlike every other section) — light background, no dark overlay, text left/image right. On mobile the image is `position: absolute`, cropped to a right-anchored slice of the screen (tuned interactively to 35%), height-matched to the text column's own natural content height (not a fixed section height), with a gradient blending its left portion into `var(--site-background)` so text stays legible regardless of which theme's illustration is behind it.
- Industry-specific seed content generated by `createSeedPreviewAction` in the admin, including a default CTA derived from the business's phone/email (`buildDefaultCta()` in `cta-defaults.ts`) — never defaults to generic phrases like "Get a Quote"

---

## Domain layer (`web/domain/`)

Pure TypeScript — no AWS, no React, no runtime framework dependencies. Imported by both the web application and future backend services.

### Path alias

`@/domain/…` resolves to `web/domain/…` via the tsconfig `@/*` → `./` alias.

### Constants

`domain/constants/industries.ts` — canonical `INDUSTRIES` array and `Industry` union type. Single source of truth used by models, schemas, and the database.

`domain/constants/themes.ts` — canonical `THEME_NAMES` array and `ThemeName` union type (the 10 approved Brand Theme System preset identifiers) plus `DEFAULT_THEME_NAME`. The actual color palettes live in `lib/themes.ts`, not here — see "Brand Theme System" above.

### Models (`domain/models/`)

TypeScript interfaces only. No runtime code.

| Model | Key fields |
|---|---|
| `Business` | `businessId`, `slug`, `name`, `industry`, `status`, `source`, `websiteUrl?`, `googlePlaceId?`, `scores?`, `currentPreviewId?`, Stripe IDs, optional Stage 11 website-generation inputs (`servicesOffered?`, `serviceAreas?`, `description?`, `differentiators?`, `brandTone?`, `notes?`), asset references (`logoUrl?`, `photoUrls?`), photo-slot overrides (`heroPhotoUrl?`, `aboutPhotoUrl?`, `whyChooseUsPhotoUrl?`, `servicesPhotoUrl?` — see "Photo slot assignment" below), `theme?` (the stored Brand Theme System preset), Stage 11.x section-eligibility signals (`googleRating?`, `googleReviewCount?`, `testimonials?`, `faqItems?`, `processSteps?` — see "Configurable Website-Section System" below), and `websiteSections?` (the stored per-business section configuration) |
| `SitePreview` | `previewId`, `businessId`, `slug`, `version` (monotonic), `status`, `templateId`, `content` (strict shape, includes optional `cta` — see `PreviewCtaConfig`), `theme` (`PreviewTheme.themeName` — see "Brand Theme System") |
| `ScanEvent` | `scanId`, `businessId`, `status`, `sourceUrl`, `scores?`, `storageKeys?`, `startedAt`, `completedAt?` |
| `Postcard` | `postcardId`, `businessId`, `previewId`, `provider`, `campaignCode`, `qrDestination`, `status`, `mailedAt?`, `deliveredAt?` |

All records extend `MutableTimestampedRecord` → `createdAt` + `updatedAt` (ISO 8601 UTC strings).

### Schemas (`domain/schemas/`)

Zod v3 runtime validation. Schemas import status arrays from models; models do not import Zod.

- `PreviewContentSchema` is the enforcement point for AI-generated content. All AI output must pass this schema before storage.
- Score fields validated as `integer ∈ [0, 100]`.
- ID fields validated against prefix regex (`^biz_`, `^preview_`, etc.).

### Factories (`domain/factories/`)

Create valid records and validate them via `Schema.parse()` before returning. Any invalid input throws a `ZodError` — no invalid records enter the system.

ID generation: `crypto.randomUUID()` global (Node 14.17+, modern browsers, edge runtimes).

| Factory | Prefix | Initial status |
|---|---|---|
| `createBusiness` | `biz_` | `pending` |
| `createSitePreview` | `preview_` | `draft` |
| `createScanEvent` | `scan_` | `pending` |
| `createPostcard` | `postcard_` | `pending` |

---

## Infrastructure (`infra/`)

AWS CDK TypeScript project. Standalone package with its own `package.json` and `tsconfig.json`.

### Environment model

All configuration is centralised in `infra/lib/config/environments.ts`. The CDK app reads `--context env=dev` (default) or `--context env=prod` and passes an `EnvironmentConfig` to every construct.

| Setting | dev | prod |
|---|---|---|
| Suffix | `dev` | `prod` |
| Billing | PAY_PER_REQUEST | PAY_PER_REQUEST |
| PITR | disabled | **enabled** |
| Deletion protection | disabled | **enabled** |
| Removal policy | DESTROY | RETAIN |

No account IDs are hard-coded. The CDK app resolves `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` from the active CLI profile at synth time.

### Reusable construct

`WebpresaTable` (`infra/lib/constructs/webpresa-table.ts`) wraps `dynamodb.Table` and automatically applies billing mode, encryption, removal policy, PITR, deletion protection, and two CloudFormation outputs (`TableName`, `TableArn`) for every table. Adding a new table requires only a name, partition key, and optional GSI list.

### Stacks

| Stack | Deployed | Description |
|---|---|---|
| `WebpresaDevDataStack` | ✅ us-east-1 | Four DynamoDB tables + assets S3 bucket + 5 Secrets Manager secrets, dev settings |
| `WebpresaProdDataStack` | ❌ not deployed | Same tables, bucket, and secrets, prod settings |

---

## DynamoDB tables

All tables: PAY_PER_REQUEST billing, AWS-managed encryption at rest, `ProjectionType.ALL` on all GSIs.

### `webpresa-dev-businesses`

| | |
|---|---|
| Partition key | `businessId` (S) |
| GSI: `slug-index` | PK: `slug` |
| GSI: `google-place-id-index` | PK: `googlePlaceId` |
| GSI: `status-index` ⚠ | PK: `status` |

### `webpresa-dev-site-previews`

| | |
|---|---|
| Partition key | `previewId` (S) |
| GSI: `slug-index` | PK: `slug` |
| GSI: `business-id-index` | PK: `businessId`, SK: `createdAt` |
| GSI: `status-index` ⚠ | PK: `status` |

### `webpresa-dev-scan-events`

| | |
|---|---|
| Partition key | `scanId` (S) |
| GSI: `business-id-index` | PK: `businessId`, SK: `createdAt` |
| GSI: `status-index` ⚠ | PK: `status` |

### `webpresa-dev-postcards`

| | |
|---|---|
| Partition key | `postcardId` (S) |
| GSI: `business-id-index` | PK: `businessId`, SK: `createdAt` |
| GSI: `campaign-code-index` | PK: `campaignCode` |
| GSI: `provider-postcard-id-index` | PK: `providerPostcardId` (sparse — only set after provider submission) |
| GSI: `status-index` ⚠ | PK: `status` |

> ⚠ **Status GSIs are low-cardinality and must be reassessed before production deployment.** See the pre-production note in `infra/lib/stacks/data-stack.ts`.

The `createdAt` sort key on `business-id-index` for SitePreviews, ScanEvents, and Postcards enables chronological queries and newest-first pagination for all records belonging to one business.

---

## S3 asset storage

**Implemented in Stage 9.** Single private, encrypted bucket per environment — `webpresa-{env}-assets` — provisioned via the reusable `WebpresaBucket` construct (`infra/lib/constructs/webpresa-bucket.ts`), mirroring the `WebpresaTable` pattern. Wired into the existing `WebpresaDataStack` alongside the four tables (`infra/lib/stacks/data-stack.ts`) rather than a separate stack.

### `webpresa-dev-assets`

| | |
|---|---|
| Encryption | S3-managed (SSE-S3) |
| Public access | fully blocked (`BLOCK_ALL`) |
| SSL | enforced via bucket policy |
| Versioning | disabled (dev) / **enabled** (prod) |
| Removal policy | DESTROY (dev) / RETAIN (prod) |
| Lifecycle | abort incomplete multipart uploads after 7 days; expire objects tagged `retain=false` after 90 days |

### Key structure (single bucket, prefix-scoped)

```
scans/{businessId}/{scanId}/crawl.json
scans/{businessId}/{scanId}/desktop.png
scans/{businessId}/{scanId}/mobile.png
previews/{businessId}/{previewId}/...
postcards/{businessId}/{postcardId}/...
businesses/{businessId}/assets/logo.{ext}
businesses/{businessId}/assets/photos/{n}.{ext}
```

The `businesses/` prefix (added in the Stage 11 foundation work) is the only one with a public-facing read path: `app/api/assets/[...key]/route.ts` — the app's first Route Handler — proxies `GET` requests for that prefix only, streaming via `getAsset()` with a one-year `Cache-Control`. Every other prefix stays fully private; there is deliberately no general-purpose public route into the bucket.

The `retain=false` object tag is *not yet written by anything* — Stage 9 only provisions the lifecycle rule. Stages 13/14 (scan artifacts) and 22 (postcards) are expected to set this tag when a scan or postcard is marked failed/obsolete, so the existing rule expires it automatically.

### Application-side access

- `web/lib/s3/client.ts` — `server-only` singleton `S3Client`, same region/credential pattern as `web/lib/db/client.ts` (`AWS_REGION`, `AWS_PROFILE` locally, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` on Vercel). `getAssetsBucketName()` reads `ASSETS_BUCKET_NAME`.
- `web/lib/s3/assets.ts` — `server-only` generic helpers: `putAsset`, `getAsset` (returns `null` on `NoSuchKey`), `getSignedAssetUrl` (short-lived signed URL, 300s default, for private admin viewing). All three reject keys outside the `scans/`, `previews/`, `postcards/`, `businesses/` prefixes before calling S3.
- No domain-model or UI wiring yet — `ScanEvent.storageKeys`, the `/admin/scans` and `/admin/postcards` placeholder pages, and any `Postcard` creative-file field are populated by the stages that actually produce that data (13, 14, 22), not Stage 9.

### IAM

The `webpresa-vercel-dev` IAM user's inline policy (see `deployment.md`) grants `s3:GetObject`/`PutObject`/`DeleteObject`/`ListBucket` scoped to the assets bucket only. Future Lambda execution roles (Stage 13 crawler, Stage 14 screenshot capture, Stage 22 postcard service) should be scoped further, to their own prefix only (`scans/*`, `postcards/*`) rather than the whole bucket — not yet created since those roles don't exist yet.

---

## Secrets Manager

**Implemented in Stage 10.** Five secrets provisioned via the reusable `WebpresaSecret` construct (`infra/lib/constructs/webpresa-secret.ts`), wired into the same `WebpresaDataStack` as the tables and bucket. Each secret is created with a securely-generated random placeholder value only — no real credential ever appears in the CDK synth output, the CloudFormation template, or Git history. Real values are populated out-of-band (`aws secretsmanager put-secret-value`) by whichever later stage first needs that integration; CloudFormation does not re-touch a secret's value on subsequent `cdk deploy` runs as long as its `jsonKeys` are unchanged, so a manually-set real value is never clobbered by a redeploy.

| Secret name | JSON shape | Owner (stage) |
|---|---|---|
| `webpresa-{env}-openai` | `{ apiKey }` | Stage 11 — AI preview generation |
| `webpresa-{env}-firecrawl` | `{ apiKey }` | Stage 13 — website capture |
| `webpresa-{env}-google-places` | `{ apiKey }` | Stage 12 — business discovery |
| `webpresa-{env}-stripe` | `{ secretKey, webhookSecret }` | Stage 18 — subscriptions |
| `webpresa-{env}-lob` | `{ apiKey }` | Stage 22 — postcard integration |

### Application-side access

- `web/lib/secrets/client.ts` — `server-only` singleton `SecretsManagerClient`, same region/credential pattern as `web/lib/db/client.ts` and `web/lib/s3/client.ts`. `getSecretJson(secretName)` fetches and JSON-parses a secret's `SecretString`, caching the result **indefinitely for the lifetime of the process** (matches Vercel's serverless function instance reuse — a fresh cold start re-fetches). Automated rotation is deferred work; today, rotating a secret requires a redeploy or cold start to take effect.
- `web/lib/secrets/index.ts` — typed wrappers (`getOpenAiSecret()`, `getFirecrawlSecret()`, `getGooglePlacesSecret()`, `getStripeSecret()`, `getLobSecret()`) reading the secret *name* from an env var (`OPENAI_SECRET_NAME`, etc.), matching the `TABLE_*`/`getAssetsBucketName()` accessor pattern.
- `getOpenAiSecret()` got its first real caller in Stage 11 (see "AI / OpenAI integration" below). Firecrawl, Google Places, Stripe, and Lob remain foundation-only for their respective later stages. Never log a secret's parsed value or raw `SecretString`.

### IAM

The `webpresa-vercel-dev` IAM user's inline policy (see `deployment.md`) grants `secretsmanager:GetSecretValue` scoped to the 5 dev secret ARNs. As with the S3 bucket, future dedicated Lambda execution roles (Stages 13, 18, 22) should be scoped to only the one secret each integration needs, not this broad grant.

---

## Brand Theme System

**Implemented 2026-07-14.** Replaces free-form AI-generated hex colors with a curated set of 10 professionally designed theme presets. No code path — AI or otherwise — may invent, blend, or free-type a color; the only decision anyone (a person or the model) makes is *which preset name* to use.

- `web/domain/constants/themes.ts` — `THEME_NAMES` (the 10 approved preset identifiers) and `DEFAULT_THEME_NAME` (`'classicBlue'`). Single source of truth for which names are valid, imported by both schemas and models — mirrors the `industries.ts` / `brand-tone.ts` pattern.
- `web/lib/themes.ts` — `THEMES: Record<ThemeName, BrandTheme>`, the actual palettes. Every `BrandTheme` carries `primary`, `accent`, `background`, `surface`, `text`, `mutedText`, `border`, `success`, `warning`, `danger` (all validated hex in tests), plus `displayName` and `bestFor` (the industries each preset is designed for — shown in the admin theme picker and fed to the AI selection prompt). `resolveThemePalette(theme)` is the single render-time lookup: it resolves `PreviewTheme.themeName` directly, or — for previews saved before this system existed — falls back to the default preset's neutrals with the legacy `primaryColor`/`accentColor` substituted in.
- `PreviewTheme.themeName` (`domain/models/site-preview.ts`) replaces free-form `primaryColor`/`accentColor` as the source of a preview's brand colors. The legacy fields remain on the type and schema (`PreviewThemeSchema` requires one or the other via `.refine()`) purely for backward compatibility with previews generated before this system — no code path may set them on a new preview.
- `Business.theme` (`domain/models/business.ts`) — the resolved preset persisted on the business record, so every regeneration reuses it instead of re-deriving it. Editable via the "Theme" field on `BusinessDetailsForm.tsx` (an "Auto" option plus the 10 named presets); leaving it on Auto clears any stored override and lets selection run again on the next generation.

### Selection logic (`web/lib/theme/`)

- `logo-color.ts` — `detectLogoThemeFamily(logoUrl)` (Step 1: existing branding). Reads the logo from S3 via `getAsset()`, uses `sharp` to flatten transparency onto white and downsample to a single pixel (a cheap stand-in for a full dominant-color histogram), converts that average RGB to HSL, and classifies the hue/saturation/lightness into the closest preset family (`classifyHsl()`, exported for testing). Returns `null` — never a guess — when the logo can't be read or its color is too neutral to signal a brand family.
- `select-theme.ts`:
  - `pickStoredOrLogoTheme(business)` — Steps 3 (reuse) + 1 (logo), shared by both paths below; never calls OpenAI.
  - `pickThemeViaOpenAi(business)` — Step 2 (no logo, no stored preference). Sends brand personality signals (industry, description, brand tone, differentiators, notes) plus each preset's name/`bestFor` list to OpenAI, constrained via `zodResponseFormat` to an enum of `THEME_NAMES` — the model literally cannot return anything outside the 10 approved names, let alone a color.
  - `resolveBusinessTheme(business)` — full selection for real AI generation: stored/logo, else OpenAI.
  - `resolveBusinessThemeForSeed(business)` — selection for the free, no-cost seed-preview path: stored/logo, else a deterministic `INDUSTRY_THEME_DEFAULTS` map (`industry-defaults.ts`, derived from each preset's `bestFor` list). Never calls OpenAI, so "Create test preview" stays free and instant.
- Both `generateWebsiteAction` and `createSeedPreviewAction` persist a newly resolved theme back onto the `Business` record (only when `business.theme` was previously unset) so every future regeneration reuses it — Step 3 of the spec.

### Deferred

- **Firecrawl re-detection** (Stage 13): when a scan discovers an existing logo/branding, compare it against the current theme and auto-switch + regenerate if it differs significantly. Not implemented — Stage 13 doesn't exist yet.
- Logo color detection is an average-pixel approximation, not a true dominant-color histogram; good enough for family classification (which hue band a logo falls into), not exact-shade matching.

---

## Photo slot assignment

**Implemented 2026-07-14.** Uploaded business photos (`Business.photoUrls`) are auto-assigned to four template image slots by upload order — hero background, About Us section, WhyChooseUs section, and the featured service card — each preferring a distinct photo and falling back to reusing an earlier one when fewer than four were uploaded. This is a positional guess with no way to know whether a given photo actually suits a given slot (e.g. an odd crop that works for "About Us" can look awkward as a full-bleed hero background).

- `resolvePhotoSlot(override, ...autoFallbacks)` (`lib/ai/generate-preview.ts`) is the single resolution point: an explicit override wins outright; the reserved value `'none'` forces that slot's non-photo fallback (hero's gradient/pattern, About/WhyChooseUs's decorative box, or Services' `picsum` `DEV_FIXTURE`) even though photos exist; otherwise the first defined value in the automatic upload-order chain is used.
- `Business.heroPhotoUrl` / `aboutPhotoUrl` / `whyChooseUsPhotoUrl` / `servicesPhotoUrl` — optional per-slot overrides, each either a URL from the business's own `photoUrls` or the literal `'none'`. Left unset ("Auto"), the automatic assignment applies.
- Admin UI: `PhotosForm.tsx`'s "Photo Assignment" section — a numbered thumbnail grid of the business's uploaded photos plus one `<select>` per slot (labeled "Desktop hero image" / "About Us section" / "Why Choose Us section" / "Featured service card"; Auto / No photo / each numbered photo). Only rendered once at least one photo exists (i.e. practically only after at least one photo has already been uploaded, since overrides reference photos that must already have URLs) so admins can correct a specific bad auto-pick without re-architecting the whole upload flow. Reachable from both the wizard's step 2 (`onboarding/photos/page.tsx`, which now stays on itself after an upload specifically so this section becomes visible before advancing to step 3 — see "Admin application" above) and the detail page's "Photos" card. The desktop hero slot shows a static sizing hint plus a live amber warning whenever the currently-*selected* photo isn't within 100px of 1920×1080 or 1600×900px — see "Hero presentation" below for what that means for rendering. `lib/image/hero-dimensions.ts`'s `describeHeroDimensionWarningsForPhotos()` checks every uploaded photo up front at page-render time (not just whichever is currently saved as the override), returning a `Record<photoUrl, warning | null>`; `PhotosForm.tsx` (a client component) tracks the select's current value in local state and looks up that map on every `onChange`, so the warning updates instantly when the admin changes the selection — no save/reload needed, and no photo is ever left unchecked.
- `AboutSection.tsx` (the section literally titled "About Us") previously never rendered any photo at all — it and `WhyChooseUs.tsx` both trace back to the same historically-misnamed `PreviewTheme.aboutImageUrl` field (which actually only ever fed `WhyChooseUs`). Fixed by adding a distinct `aboutSectionImageUrl` field for the literal About section rather than renaming the existing field (avoids another breaking schema change on top of the Brand Theme System's).

### Deferred

- No smarter crop/composition awareness beyond `object-top` positioning on people-photo containers (`WhyChooseUs`, `AboutSection`) — a photo with a genuinely bad composition for a given slot still requires an admin to notice and either override the slot or set it to `'none'`.

---

## Configurable Website-Section System

**Implemented 2026-07-15 (Stage 11.x — a foundation stage inserted before Stage 12).** Replaces the previously fixed page layout with a stored, per-business section configuration. The core architectural principle: **AI must never directly control React components.** A fixed catalog of approved sections is the only bridge between any stored configuration — manual today, rule-based or (later) AI-proposed in future stages — and actual rendered output; the application always validates and renders through a controlled registry, never a database-driven dynamic import.

- `domain/constants/website-sections.ts` — `WEBSITE_SECTION_TYPES` (the 15 approved identifiers: `header`, `hero`, `trustStrip`, `services`, `about`, `whyChooseUs`, `reviews`, `testimonials`, `gallery`, `faq`, `serviceAreas`, `process`, `ctaBanner`, `contact`, `footer`), `REQUIRED_SECTION_TYPES` (`header`, `hero`, `services`, `contact`, `footer` — always render, never disableable through admin controls), `SECTION_CONFIG_VERSION`, and `WEBSITE_SECTION_CATALOG` — the fixed component catalog: per-section `required`, `defaultEnabled`, `defaultVariant`, `variants` (every section currently supports only `['default']` — structurally variant-ready, no variant library built yet), and `defaultOrder`. Lives in `domain/`, not `lib/`, because the Zod schema validates `variant` against this catalog at parse time.
- `domain/models/website-sections.ts` — `WebsiteSectionConfig` (`component`, `enabled`, `order`, `variant`) and `WebsiteSectionsConfig` (`sectionConfigVersion`, `sections[]`). Stored on `Business.websiteSections?` (`domain/models/business.ts`) — a business-level setting, not a per-`SitePreview` one, so it persists across every "Generate Website" regeneration exactly like `Business.theme` already does (see "Brand Theme System" above), and is the natural shape for the future client dashboard to edit directly.
- `domain/schemas/website-sections.schema.ts` — `WebsiteSectionConfigSchema` (item-level: catalog-enum `component`, boolean `enabled`, bounded non-negative integer `order`, `variant` checked against that component's allowed variants) and `WebsiteSectionsConfigSchema` (whole-config: version not newer than supported, no duplicate `component` entries, every required section present and `enabled: true`). Wired into `BusinessSchema`, so `putBusiness`/`updateBusiness` reject an invalid configuration before it ever reaches DynamoDB.
- `domain/factories/website-sections.factory.ts` — `createDefaultWebsiteSectionsConfig()` builds a full config straight from the catalog, chosen to exactly reproduce the pre-existing fixed template's appearance (`trustStrip`/`whyChooseUs`/`about`/`serviceAreas`/`ctaBanner` default enabled, matching what the old hardcoded template always attempted to render; `reviews`/`testimonials`/`gallery`/`faq`/`process` default disabled, since the old template never rendered them). `Business.websiteSections` being absent — true for every business that predates this stage — is a fully valid state; no migration was run or is needed.
- `web/lib/website-sections/` (mirrors the `lib/theme/` split — business-rule logic, not pure catalog shape):
  - `availability.ts` — `computeSectionAvailability({business, content, hasCta})`, deterministic content-presence checks, no AI, no invented facts. `gallery` reads the existing `Business.photoUrls` (functional today); `reviews`/`testimonials`/`faq`/`process` read new, currently-unpopulated `Business` fields (`googleRating`/`googleReviewCount`/`testimonials`/`faqItems`/`processSteps` — see "Section eligibility signals" below); `services`/`about`/`whyChooseUs`/`serviceAreas` read the generated preview's `PreviewContent`; `header`/`hero`/`trustStrip`/`contact`/`footer` are always available.
  - `resolve.ts` — `resolveStoredOrDefaultSections(stored)`: the lenient, render-safe pipeline (fall back to computed defaults on absence/future-version; drop malformed or unsupported-variant entries; deduplicate; force-enable/backfill required sections; sort by `order`) — never throws, since it runs on every public page load. `resolveRenderableSections(stored, availability)` additionally filters to sections that are both `enabled` and (for optional sections) available. `resolveSectionWarnings(sections, availability)` — the inverse, surfaced in the admin UI.
  - `recommend.ts` — `recommendWebsiteSections({business, content, hasCta})`: the deterministic, non-AI "Apply Recommended Sections" function. Reuses `computeSectionAvailability`'s predicate directly for each optional section's recommended `enabled` value — the objective's own conservative rule set ("Reviews: enable when a review count is available," etc.) *is* the availability check, so the two are kept identical by construction rather than duplicated and risking drift.
- Rendering (`app/b/[slug]/template/`): `section-registry.tsx` defines `sectionRegistry: Record<WebsiteSectionType, (ctx: SectionRenderContext) => ReactNode>` — the only place a stored section identifier becomes an actual React component, wiring the shared render context onto each existing (heterogeneous-props) component. `GeneratedWebsite` (`template/index.tsx`) resolves availability → resolves the renderable section list → maps it through the registry, in place of the old hardcoded JSX sequence. Five new, minimal components joined the registry for previously-nonexistent sections: `GallerySection`, `ReviewsSection`, `TestimonialsSection`, `FaqSection`, `ProcessSection` — all gated by the same availability checks, so they render nothing until real data exists (only `gallery` has a populated data source today).
- Admin (`app/admin/(dashboard)/businesses/[businessId]/`): a "Website Sections" card — `SectionConfigForm.tsx` (checkbox + up/down reorder buttons per section; required sections rendered locked with a "Required" badge; an inline warning on any enabled-but-currently-unavailable optional section) plus **Apply Recommended Sections** and **Reset to Defaults** quick actions. `saveWebsiteSectionsAction` force-enables required sections server-side regardless of submitted form data and validates strictly via `WebsiteSectionsConfigSchema` before persisting — a malformed submission is rejected outright, never partially saved. Header and Footer are pinned (always first/last, no reorder buttons at all); the other 13 sections reorder via client-side up/down arrows (`section-order.ts`'s pure `moveSection` helper) rather than a raw numeric order field — an admin never sees or types an order number; it's computed from final row position on save. Replaced the original numeric-input design after direct user feedback that it wasn't usable.

### Section eligibility signals

`Business.googleRating?` / `Business.googleReviewCount?` are reserved ahead of Stage 12 (Google Places) exactly as `googlePlaceId`/`googleMapsUrl` were reserved ahead of their own stage — inert today, but `computeSectionAvailability`'s `reviews` check (and therefore the recommendation engine, which shares the same predicate) will start returning `true` the moment Stage 12 populates them, with no further code change anticipated. `Business.testimonials?` / `Business.faqItems?` / `Business.processSteps?` are manually-verified content fields with no generation path and, currently, no admin entry UI either — they exist so the schema, availability checks, and registry are ready, but populating them is out of this stage's scope.

### Deferred

- No admin UI to manually enter `testimonials`/`faqItems`/`processSteps` — the fields validate and are schema-ready, but nothing writes to them yet.
- No variant picker in the admin UI (nothing to pick — every section has exactly one variant today).
- Order editing is a plain number input per the objective's explicit scope limit, not drag-and-drop.
- Rule-based/AI section *selection* (auto-approval, confidence scoring) is explicitly out of scope for this stage — only manual admin control plus an on-demand, admin-triggered deterministic recommendation exist today.

---

## AI / OpenAI integration

**Implemented in the Stage 11 foundation work.** Live-tested against the real OpenAI API — real usage costs apply per generation.

- `web/lib/ai/client.ts` — `server-only` singleton `OpenAI` client, built from `getOpenAiSecret()` (fetched once, cached for the process lifetime via the Secrets layer's own caching). Model is read from `OPENAI_MODEL` (env var, default `gpt-4o-mini`) rather than hardcoded.
- `web/lib/ai/generate-preview.ts` — `generatePreviewContent(business)` makes one structured-output request (`chat.completions.parse` + the `openai/helpers/zod` `zodResponseFormat` helper) covering hero copy, services, tagline, about text, differentiators, CTA button *labels*, font, and hero-style choice, run in parallel with the Brand Theme System's `resolveBusinessTheme(business)` (see above) — theme selection is a separate, independent OpenAI concern that never shares a response schema with content generation.
  - **Design invariant:** contact info, service areas, and CTA *type/destination* are always derived in code from the verified `Business` record — never trusted from the model. The model only supplies CTA labels, which are merged into a type/destination structure computed by `buildDefaultCta()` (same phone-first/email-fallback/hidden-CTA priority used by the CTA system's admin default). An uploaded photo always wins over the model's hero-style pick. Brand colors are never trusted from the model either — see "Brand Theme System" above.
  - Output is re-validated against `PreviewContentSchema` / the theme schema before being returned — defense in depth beyond the API's own schema enforcement.
- `generateWebsiteAction` (`app/admin/(dashboard)/businesses/[businessId]/actions.ts`) — soft-capped at 3 real generations per business; always saves the result as a `draft` `SitePreview`, never auto-published.
- OpenAI's strict structured-output mode has real constraints worth knowing about if this prompt/schema changes: it rejects `"` characters inside enum string literals (bit the font-family list on first live test — see `build_log.md`, "Bug Fixes — Live Generation Testing").

---

## Environment variables

The homepage requires no environment variables. The admin dashboard requires all of the following on both the development server and the Vercel deployment.

| Variable | Source | Used by |
|---|---|---|
| `AWS_REGION` | `us-east-1` | DynamoDB client |
| `AWS_PROFILE` | Local only — `webpresa` | AWS SDK credential chain (local dev) |
| `AWS_ACCESS_KEY_ID` | Vercel env var | AWS SDK credential chain (deployed) |
| `AWS_SECRET_ACCESS_KEY` | Vercel env var | AWS SDK credential chain (deployed) |
| `BUSINESSES_TABLE_NAME` | CloudFormation export `webpresa-dev-businesses-name` | Business repository |
| `SITE_PREVIEWS_TABLE_NAME` | CloudFormation export `webpresa-dev-site-previews-name` | SitePreview repository |
| `SCAN_EVENTS_TABLE_NAME` | CloudFormation export `webpresa-dev-scan-events-name` | ScanEvent repository |
| `POSTCARDS_TABLE_NAME` | CloudFormation export `webpresa-dev-postcards-name` | Postcard repository |
| `ASSETS_BUCKET_NAME` | CloudFormation export `webpresa-dev-assets-name` | S3 assets client (`web/lib/s3/`) |
| `OPENAI_SECRET_NAME` | Deterministic — `webpresa-dev-openai` | Secrets client (`web/lib/secrets/`) |
| `OPENAI_MODEL` | Configurable — default `gpt-4o-mini` | AI client (`web/lib/ai/client.ts`) |
| `FIRECRAWL_SECRET_NAME` | Deterministic — `webpresa-dev-firecrawl` | Secrets client (`web/lib/secrets/`) |
| `GOOGLE_PLACES_SECRET_NAME` | Deterministic — `webpresa-dev-google-places` | Secrets client (`web/lib/secrets/`) |
| `STRIPE_SECRET_NAME` | Deterministic — `webpresa-dev-stripe` | Secrets client (`web/lib/secrets/`) |
| `LOB_SECRET_NAME` | Deterministic — `webpresa-dev-lob` | Secrets client (`web/lib/secrets/`) |
| `ADMIN_USERNAME` | Set manually | Admin sign-in |
| `ADMIN_PASSWORD_HASH` | scrypt hash — see `.env.local.example` for generation command | Admin sign-in |
| `SESSION_SECRET` | `openssl rand -base64 32` | JWT session signing |

Copy `web/.env.local.example` to `web/.env.local` and fill in real values for local development.

Environment variables must never be bundled into client-side code. DynamoDB access belongs in server-side code only.

---

## Authentication

**Implemented in Stage 7** for the single-admin use case.

- Public homepage: no authentication
- Admin application: username + scrypt-hashed password from environment variables; JWT issued by `jose`, stored in an HTTP-only `SameSite=lax` cookie
- Session validity: 7 days; secret key rotated via `SESSION_SECRET` environment variable
- Route protection: `proxy.ts` intercepts all `/admin/*` requests before rendering
- Defense-in-depth: admin layout server component also reads the session and redirects if missing
- Server Actions independently verify the session before any DynamoDB write

**Future path:** Migrate to Amazon Cognito User Pool when multiple admin users or role-based permissions are needed.

---

## API boundaries

Admin mutations use **Next.js Server Actions** (`'use server'` modules):

- `web/lib/auth/actions.ts` — `signIn`, `signOut`
- `web/app/admin/(dashboard)/businesses/actions.ts` — `createBusinessAction`, `editBusinessAction`
- `web/app/admin/(dashboard)/businesses/[businessId]/actions.ts` — `createSeedPreviewAction`, `updatePreviewCtaAction`, `generateWebsiteAction`, `deleteBusinessAction`, `saveWebsiteSectionsAction`, `applyRecommendedSectionsAction`, `resetWebsiteSectionsAction`

All actions validate input with Zod and verify the admin session before any DynamoDB call. No raw DynamoDB code in UI components — all reads and writes go through the repository layer.

The one exception to the Server Action pattern: `web/app/api/assets/[...key]/route.ts` is a Next.js Route Handler (not a Server Action) — it needs to be a real HTTP `GET` endpoint so `<Image>`/`<img>` tags can address it directly by URL. It's intentionally public (no session check) but scoped to only the `businesses/` S3 prefix.

---

## Repository / data-access pattern

**Implemented in Stage 7.**

```
web/lib/
  auth/
    session.ts           JWT session encrypt/decrypt + cookie management (server-only)
    actions.ts           signIn / signOut Server Actions
  db/
    client.ts            DynamoDB DocumentClient singleton (server-only)
    businesses.ts        Business repository — list, get, put, update, resolveUniqueSlug
    site-previews.ts     SitePreview repository — get, listForBusiness, put
    scan-events.ts       ScanEvent repository — get, listForBusiness, put
    postcards.ts         Postcard repository — get, listForBusiness, put
  s3/
    client.ts            S3Client singleton (server-only) — Stage 9
    assets.ts            Generic asset helpers — putAsset, getAsset, getSignedAssetUrl — Stage 9
  secrets/
    client.ts            SecretsManagerClient singleton + cached getSecretJson (server-only) — Stage 10
    index.ts              Typed wrappers — getOpenAiSecret, getStripeSecret, etc. — Stage 10
  themes.ts              Brand Theme System — the 10 curated palettes + resolveThemePalette()
  theme/
    logo-color.ts         Logo dominant-color detection (server-only, sharp) — Brand Theme System Step 1
    industry-defaults.ts  Deterministic industry → theme fallback for the free seed path
    select-theme.ts       Selection orchestration (stored → logo → OpenAI) — Brand Theme System
  website-sections/
    availability.ts       computeSectionAvailability, hasResolvableCta — Configurable Website-Section System
    recommend.ts           recommendWebsiteSections — deterministic, non-AI
    resolve.ts             resolveStoredOrDefaultSections, resolveRenderableSections, resolveSectionWarnings
```

All repository files import `server-only` to prevent accidental bundling in client code. All functions accept and return canonical domain types from `@/domain/models`. Zod schemas are re-validated on every write.

Pagination uses DynamoDB `LastEvaluatedKey` encoded as a base64url JSON string passed as a `cursor` URL parameter.

---

## Future services

### Website scanner

A background job that:
1. Receives a `sourceUrl`
2. Creates a `ScanEvent` record via `createScanEvent()`
3. Captures a screenshot, HTML snapshot, and Lighthouse report
4. Stores artifacts in S3 (keys written to `ScanEvent.storageKeys`)
5. Writes scores to `ScanEvent.scores` and updates `Business.scores`

### Preview generator

A background job that:
1. Reads a `Business` and its `ScanEvent` data
2. Calls an LLM to generate structured `PreviewContent` (validated by `PreviewContentSchema` before storage)
3. Creates a `SitePreview` record via `createSitePreview({ previousVersion })`
4. Renders the preview site and makes it accessible at a preview URL

### Postcard service

A service that:
1. Creates a `Postcard` record via `createPostcard()`
2. Submits the postcard to a mailing provider (Lob, Stannp, or PostGrid)
3. Writes the `providerPostcardId` back to the record
4. Polls or webhooks provider status to update `mailedAt` and `deliveredAt`

Supported providers are defined in `POSTCARD_PROVIDERS` in `domain/models/postcard.ts`.

### Billing

Stripe integration. Stripe Customer ID and Subscription ID are stored on the `Business` record (`stripeCustomerId`, `stripeSubscriptionId`). No payment logic exists yet.
