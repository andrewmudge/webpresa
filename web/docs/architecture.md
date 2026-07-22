# Webpresa — Architecture

**Last updated:** 2026-07-22  
**Status:** **Stage 13 (Firecrawl Website Enrichment) implemented and manually verified** (2026-07-18) — an admin can enrich a business's `Business` record by scraping its known website with Firecrawl (single-page Scrape, REST client), normalizing the result into a validated `WebsiteEnrichmentSnapshot`, merging it in memory with canonical `Business` data (Business always wins), and generating a new versioned `SitePreview` through the existing Stage 11 pipeline — including creating a business's *first* preview, not only enriching an existing one. Businesses with no website enter an explicit `manual_approval_required` disposition instead of a generic failure; Google Places photos are never downloaded. Verified end-to-end against the real Firecrawl v2 API, the real OpenAI API, and the real dev S3/DynamoDB. See "Firecrawl Website Enrichment" below. Stage 10 complete in development. **Stage 11 (Manual AI Website Generation) foundation implemented and live-tested in development** — an admin can enter verified business facts, upload a logo/photos, and generate a real `SitePreview` (content, CTA, theme, hero presentation) via the OpenAI API; generated previews stay in draft until manually published. **Brand Theme System implemented** — AI (and admins) select from 10 curated theme presets by name only; no free-form color generation remains anywhere in the app. **Stage 11.x — Configurable Website-Section System implemented** — the public preview renders from a stored, per-business `websiteSections` configuration through a controlled component registry instead of a permanently fixed layout; an admin can enable/disable optional sections (required sections are locked on), reorder them via up/down controls, and apply a deterministic (non-AI) recommendation — see "Configurable Website-Section System" below. This is the foundation Stage 12 (Google Places discovery) populates eligibility data into. **Stage 12 (Google Places Discovery) implemented and manually verified** (2026-07-17) — strictly server-side search, review, and selective import into the existing `Business` model via a new `/admin/discover` admin page; no photo downloading, no automatic handoff into Stage 13 enrichment. Verified end-to-end against the real Google Places API and the real dev DynamoDB table (see `build_log.md`). See "Google Places Discovery Boundary (Stage 12)" below. **Theme-matched hero illustrations implemented** — every newly generated no-photo preview gets a deterministic, theme-matched illustration background (never AI-chosen) in place of the old AI-picked CSS gradient/pattern/solid fallback; see "Hero presentation" below. **Desktop hero image dimension classification implemented** — a resolved hero photo only renders full-bleed when within 100px of 1920×1080 or 1600×900px, otherwise it renders in a new two-column split layout instead; mobile does not yet show a real hero photo at any size (deferred). Admin business creation is a 3-step wizard (details → photos → sections) with no separate edit page — every field is editable inline on the business detail page; step 2 now surfaces the Photo Assignment section immediately after upload, before advancing to step 3. Premium generated website template live with a configurable primary/secondary CTA system and a picture background on the featured service card; admin with cascade delete; DynamoDB tables, S3 assets bucket, and Secrets Manager secrets live in `us-east-1`. Hosting on Vercel. **Universal hero CTA defaults + Request Service form implemented (2026-07-22, frontend only)** — every business page now shows Primary: Call Us / Secondary: Request Service by default (resolved at render time, applies immediately to existing previews without regeneration); "Request Service" opens a new reusable `RequestServiceForm` in a modal (desktop) / full-screen drawer (mobile) instead of navigating. See "Configurable CTA system" below.

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

- Route group `app/admin/(dashboard)/` — server-rendered pages with a shared sidebar layout. The sidebar (`AdminSidebar.tsx`, client) is fixed-width on `md:`+ and collapses into a hamburger-triggered slide-in drawer below it — the same `useState`/`lucide-react`/`framer-motion` pattern the public site's `Navbar.tsx` already used.
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
- **Business detail page card layout (2026-07-17):** Business Details, Photos, and Preview CTA are collapsible (`CollapsibleCard.tsx`, default closed); Theme and Admin (source/status) were split out of the old monolithic "Business Details" card into their own narrow cards/actions (`ThemeForm`/`updateThemeAction`, `AdminFieldsForm`/`updateAdminFieldsAction`), following the same one-action-one-slice convention as `updateBusinessDetailsAction`/`updatePhotosAction`. The current preview's link is duplicated into the page header (next to Delete) so it's visible without scrolling.
- **Inline section content editing (2026-07-17):** every row in the "Website Sections" card (except `header`/`footer`/`trustStrip`/`reviews`, which have no editable content) gets a chevron that expands to a content editor for that section — hero headline/subheadline, services list, differentiators, about text, service areas, gallery photos/captions, testimonials/FAQ/process steps, contact info, CTA banner copy. This is the foundation for the future client-facing editing dashboard, built in admin first. See "Configurable Website-Section System" below for the data model and server actions this relies on.
- **Website Generation + Assets** — `BusinessDetailsForm`/`PhotosForm` capture free-text generation inputs (services offered, service areas, description, differentiators, brand tone, notes) and logo/photo uploads, persisted on the `Business` record so generation can be re-run later without re-entering data
- **Generate Website** action on the business detail page — calls the OpenAI API to produce a complete draft `SitePreview` (content, CTA, theme, hero presentation) from the business's verified fields; soft-capped at 3 real generations per business (the free seed-preview action is unaffected); always saves as `draft`, never auto-published
- **Enrich Website** action (Stage 13) — "Website Enrichment" card (`EnrichmentSection.tsx`) on the business detail page; scrapes the business's own website with Firecrawl and generates a new draft `SitePreview` version reusing the same OpenAI pipeline as "Generate Website," enriched with normalized website content. Disabled while a scan is already queued/running; offers a "Retry" action for eligible failed scans. See "Firecrawl Website Enrichment" below.
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
- **Configurable CTA system:** `PreviewContent.cta` (`PreviewCtaConfig` — optional primary + secondary `PreviewCta`, each with an action `type` of `phone` / `email` / `sms` / `external_url` / `request_service` / `none`, a `label`, and an optional destination `value`) replaces hardcoded button copy across the template. `cta.tsx`'s `resolvePreviewCtaConfig()` is the single place that resolves configured CTAs into renderable links — phone/SMS/email fall back to `SitePreview.content.contact`, `external_url` requires a safe `https://` destination, `request_service` needs no destination at all, and previews saved before this field existed (no `content.cta`) are normalized from the legacy `hero.ctaText` + `contact` at render time rather than migrated. Header, hero, Why Choose Us, About, Service Areas, the final CTA band, and the mobile sticky bar all read from the same resolved `{ primary, secondary }` pair; the phone/email cards in `ContactSection` and the footer stay tied directly to `contact` and are not part of the CTA system.
- **Universal secondary CTA default — Call Us / Request Service (2026-07-22, frontend only):** `resolvePreviewCtaConfig()` now falls back to a built-in `{ type: 'request_service', label: 'Request Service' }` secondary whenever a preview's `content.cta.secondary` is entirely unset — a render-time default, not a data migration, so it applies immediately to every existing business page, including ones that today only ever had a primary CTA configured. An admin who has *explicitly* configured a secondary — including explicitly hiding it via `type: 'none'` in the "Preview CTA editor" — is still respected; only the never-configured case gets the new default. `buildDefaultCta()` (`cta-defaults.ts`) also changed its primary label default from "Call Now" to "Call Us." The `request_service`/`phone`/`sms`/`email`/`external_url` action types remain fully selectable for both primary and secondary in the admin "Preview CTA editor" — nothing was removed, only the out-of-the-box default changed.
- **`request_service` CTA type → reusable Request Service dialog:** clicking a `request_service` CTA never navigates — it opens a shared dialog instead. `RequestServiceProvider`/`useRequestService` (`template/RequestServiceModal.tsx`) is a client-side React Context wrapping the whole template (`template/index.tsx`) so any section's CTA button can trigger the same dialog. Renders via `framer-motion`'s `AnimatePresence` as a bottom sheet on mobile (`items-end`, `rounded-t-3xl`, `h-[92vh]`) and a centered card on desktop (`md:items-center`, `md:rounded-2xl`, `md:max-w-lg`) — one component, breakpoint-driven with Tailwind classes rather than two separate implementations; closes on Escape, backdrop click, or an explicit close button, and locks body scroll while open. `template/RequestServiceForm.tsx` is the actual form (name, phone/email, service needed, details) — kept independent of the modal/drawer shell so it can be reused elsewhere later. `template/CtaButton.tsx` (client) is the single place a resolved CTA's `type` decides between rendering a real `<a>` (every other action type, unchanged) and a `<button>` that opens the dialog; every section that renders a CTA (`GeneratedHero`, `GeneratedSiteHeader`, `WhyChooseUs`, `ServiceAreaSection`, `FinalCTA`, `MobileCallBar`, `AboutSection`) renders through it. **Frontend only, by explicit scope for this round:** `RequestServiceForm` submission is simulated locally (no request is sent anywhere) — a real lead-capture destination is deferred work.
- **CTA durability (2026-07-17):** `Business.cta?` persists the resolved CTA at the business level, the same durability pattern `Business.theme` already established — `generatePreviewContent()` reuses it verbatim once set instead of re-deriving one from the model's freshly generated labels, `generateWebsiteAction`/`createSeedPreviewAction` seed it from the first generation, and `updatePreviewCtaAction` always overwrites it on every explicit admin edit (not just once-if-absent, since an edit is a deliberate decision). Without this, an admin's CTA choice was silently discarded every time "Generate Website" ran again.
- **Theme/photo dual-write, and why `heroStyle` needs its own recomputation (2026-07-17):** editing `Business.theme` (`updateThemeAction`) or a photo slot (`updatePhotosAction`) patches the business's most recent `SitePreview` in place too — a specific theme/photo choice takes effect on the live preview immediately, not just on the next regeneration; "Auto" makes no live change either way, since there's nothing specific to apply retroactively. The hero slot is a special case: `GeneratedHero.tsx`'s `'illustration'` style ignores `heroImageUrl` entirely (it's a structurally different layout, not a fallback that also checks the URL), so patching `heroImageUrl` alone silently did nothing for a preview that had no hero photo at generation time. `updatePhotosAction` now recomputes `heroStyle` from the new photo's actual dimensions (`checkHeroPhotoDimensions`) whenever the hero slot changes, exactly mirroring what `generatePreviewContent` does at generation time.
- **Website Sections auto-save (2026-07-17):** the business detail page's "Website Sections" card no longer requires a manual "Save Sections" click — every checkbox toggle and reorder click persists immediately via `autoSaveWebsiteSectionsAction` (shares `saveWebsiteSectionsAction`'s validation/persist logic via `persistWebsiteSections()`, but never redirects, since a full page reload on every click would defeat the purpose). This closed a real gap where enabling a section and then immediately saving its content (a separate action) would reload the page before the enabled checkbox itself had ever been persisted, appearing to "reset." The onboarding wizard's "Finish setup" step keeps the original manual, redirecting save (`SectionConfigForm`'s `autoSaveAction` prop is only passed from the business detail page).
- **Business detail page ergonomics pass (2026-07-18):** in response to direct feedback that setup required "jumping around" the page and between pages. Four changes, all purely navigational/layout — no new data or actions:
  - **`NeedsAttentionStrip`** (top of the page, right under the header) — a single amber strip that only renders when there's something to actually look at (pending scan-image review, pending found-contact-info, `manual_approval_required`, or a retry-eligible failed scan), each item an in-page anchor link (`#enrichment-section`/`#business-details-card`/`#photos-card`) straight to the relevant card. `CollapsibleCard` gained an optional `id` prop (plus `scroll-mt-20` on its wrapper so an anchor jump doesn't land flush under the top edge) to make this possible without a new page.
  - **`EnrichmentSection` moved from the bottom of the page to right after the History cards** — for a newly-imported (Stage 12) business, enrichment is usually the *first* action an admin takes, not the last.
  - **`HistoryCard` rows are now links, not plain text** — scan rows go to `/admin/scans/{scanId}` (previously only reachable via the *global* scans list), preview rows go to `/b/{slug}`. `EnrichmentSection`'s "Latest scan status" field is now a link to the same scan detail page, closing the same gap there.
  - **The Scans "View all" link is scoped to the current business** (`/admin/scans?businessId=...`) instead of dropping the admin into the global unfiltered list. `/admin/scans/page.tsx` accepts an optional `businessId` search param and filters the already-fetched array in memory (same dev-scale tradeoff `listAllScans()`/`listAllBusinesses()` already document) rather than threading a filter into the repository function. Previews/postcards' "View all" links still point at their (still-unbuilt, Stage-9-era placeholder) global pages — nothing to scope yet.
- **Contact-promotion crash fix, slug apostrophe handling, Theme dropdown, and Social Links section (2026-07-18):** four items from direct bug/feature feedback.
  - **`applyFoundContactFieldAction` crash on address:** `CONTACT_FIELDS` (`enrichment-actions.ts`) is now `['phone', 'email']` only — `Business.address` is a structured `Address` object, not a string, so promoting a found address string via `updateBusiness(businessId, { address: value })` crashed `BusinessSchema.parse`. `FoundContactInfo.tsx` still surfaces a found address, but as a read-only display with no Apply button, telling the admin to copy it into Business Details manually.
  - **Slug apostrophe stripping:** `slugify()` (`domain/factories/business.factory.ts`) now strips apostrophes (straight, curly, backtick) before the general non-alphanumeric-to-hyphen pass, so "Paul's Plumbing" → `pauls-plumbing`, not `paul-s-plumbing`. Applies to newly-created businesses only — existing slugs are not retroactively renamed.
  - **Theme field is now a collapsed-by-default dropdown** (`FormFields.tsx`'s `ThemeField`) instead of listing all 10 presets inline — a button shows the current selection (swatch + name, or "Auto") and opens an absolutely-positioned panel (click-outside-to-close) listing every option with its swatches. Purely presentational; no change to what gets saved.
  - **Social Links section:** Firecrawl-discovered social profile URLs (`WebsiteEnrichmentSnapshot.socialLinks`) now flow all the way to the public site. New `domain/constants/social-platforms.ts` (`SOCIAL_PLATFORMS`, layered under `domain/` per the existing `themes.ts` convention) and `lib/social-links.ts` (`classifySocialPlatform`, `isSocialLink`) classify a URL into a platform; `generate-preview.ts` derives `PreviewContent.socialLinks` (`PreviewSocialLink[]`, max 6) from the enrichment snapshot at generation time, same "evidence sourced from Firecrawl" precedent as `reviews`. (2026-07-19: a manual admin-entry path was added on top of this — see below — since the section otherwise stayed permanently empty for any business generated without a Firecrawl scrape.) New `socialLinks` catalog entry (`defaultEnabled: true`, ordered between `ctaBanner` and `contact`) renders via new `SocialLinksSection.tsx`/`SocialIcon.tsx` in the public template — hand-embedded single-path SVGs for Facebook/Instagram/X/LinkedIn/YouTube (`lucide-react` has no brand icons; a generic `Globe` is the fallback for other platforms) rather than adding a new npm dependency. **Visual prominence fix (2026-07-22):** the section previously used `bg-(--site-background)` — the same token `AboutSection` (directly above it in default order) already uses — so the two sections visually merged into one; switched to `bg-(--site-surface)` to alternate, matching the banding convention `FaqSection`/`ServiceAreaSection`/`ReviewsSection` already establish. Icon badges enlarged (`w-11 h-11` → `w-16 h-16`, glyph `w-5 h-5` → `w-7 h-7`), given a solid `V.background` fill plus a `shadow-sm` so they read as distinct badges against the new surface band rather than thin outlined circles.
  - **`lib/firecrawl/normalize.ts` dedupes social links by normalized host+path**, not exact string match (`sanitizeAndDedupeSocialLinks`) — a real crawl surfaced the same Facebook profile twice as `facebook.com/x` and `www.facebook.com/x/`, which are the same destination and shouldn't render as two icons.
  - **`resolveStoredOrDefaultSections` now backfills any catalog section type entirely absent from a business's stored data**, not just required ones (`lib/website-sections/resolve.ts`) — discovered live-verifying the Social Links section against a real pre-existing business: adding a new *optional* section type to the catalog after a business's `websiteSections` was already saved left it permanently invisible and non-toggleable for that business, since the old logic only backfilled required sections. A type that's missing because the catalog just grew (never present in the raw stored data) is now inserted using its catalog `defaultEnabled`; a type that WAS present but got dropped by the existing malformed-entry/bad-variant cleaning steps is left absent, preserving that safety behavior exactly as before.
- `ServicesGrid`'s featured (first) service card shows a picture background on `lg:`+ screens (currently a `picsum.photos` `DEV_FIXTURE` placeholder — intended to be replaced by a real per-service photo once Stage 13 supplies one) and matches the other cards' styling below `lg:`. **Contrast fix (2026-07-22):** the flat dark overlay behind the white heading/description was too weak (`rgba(0,0,0,0.45)`) over a bright photo — same failure mode as `AboutSection`'s quote overlay (see "Photo slot assignment" below) — strengthened to `rgba(0,0,0,0.6)` and given the same `text-shadow` fallback on both the heading and description.
- **Hero presentation:** `PreviewTheme.heroStyle` (`image` / `imageSplit` / `illustration` / `gradient` / `pattern` / `solid`) drives `GeneratedHero`'s background. Never AI-chosen — a code decision: when a hero photo resolves, `lib/image/hero-dimensions.ts`'s `checkHeroPhotoDimensions()` classifies it by its actual pixel size — within `HERO_DIMENSION_TOLERANCE_PX` (100px, either dimension) of 1920×1080 or 1600×900 renders full-bleed (`image`), any other size still uses the photo but in a two-column split layout instead (`imageSplit`, text left/photo right — the same shell `illustration` uses, with the real photo on the desktop side). No hero photo at all deterministically gets `illustration` (`lib/ai/generate-preview.ts` no longer asks OpenAI to pick a hero style at all). On mobile, `image` and `imageSplit` both render the theme illustration by default, same as `illustration` — unless `PreviewTheme.heroImageUrlMobile` is set (2026-07-20; from `Business.heroPhotoUrlMobile`, a manual-only slot with no auto-fallback chain — see "Photo slot assignment" below), in which case that photo renders on mobile instead, independent of whatever `heroStyle`/`heroImageUrl` resolved for desktop; the admin-facing Photos card surfaces a dimension-mismatch warning for the desktop hero slot so this is visible before generating. `gradient`/`pattern`/`solid` are legacy-only values — no new preview produces them, but previews already saved with one keep rendering exactly as before at every viewport size, industry watermark (`template/industry-icons.tsx`, `getHeroIcon(industry)`, `lucide-react`) included. Legacy previews saved before `heroStyle` existed at all are inferred as `image` (if `heroImageUrl` is set) or `illustration` (upgraded from the old `solid` inference — a pure visual improvement, since illustration is now the preferred no-photo default).
- **Theme-matched hero illustrations:** `template/hero-illustrations.ts` — `getHeroIllustration(themeName)`, a static `Record<ThemeName, string>` lookup over 10 hand-designed PNGs at `public/hero_illustrations/{themeName}.png` (one per Brand Theme preset, colored to that preset's own primary/accent/surface palette; falls back to `DEFAULT_THEME_NAME`'s image for legacy previews with no stored `themeName`, mirroring `resolveThemePalette`'s own legacy fallback). `GeneratedHero.tsx`'s `illustration` branch is structurally distinct from the other four styles, not another case in the single-background-layer chain: on `lg:`+ it's a true full-bleed two-column split (no `max-w-6xl` wrapper, unlike every other section) — light background, no dark overlay, text left/image right. On mobile the image is `position: absolute`, cropped to a right-anchored slice of the screen (tuned interactively to 35%), height-matched to the text column's own natural content height (not a fixed section height), with a gradient blending its left portion into `var(--site-background)` so text stays legible regardless of which theme's illustration is behind it.
- **Logo-as-hero cropping fix (2026-07-22):** an admin can pick the business's own logo (`Business.logoUrl`) as the hero photo (desktop or mobile slot) via the Photo Assignment picker's existing "reuse an uploaded photo" mechanism. A circular/badge-style logo is usually edge-to-edge artwork (e.g. text running around the rim), which the normal `object-cover` treatment crops into whenever the container isn't the logo's own aspect ratio — most visibly in `HeroCornerImage`'s `'imageSplit'` panel, where a roughly-square logo in a tall/landscape card had its top and bottom sliced off. `GeneratedHero.tsx` now receives `logoUrl` (threaded from `section-registry.tsx`'s `ctx.logoUrl`, already used by the header) and compares it against the resolved `heroImageUrl`/`heroImageUrlMobile` per breakpoint; whichever breakpoint's image matches renders through a new `LogoFrame` — `object-contain` on a `V.surface` backdrop, padded — instead of `object-cover`, so the whole logo is always visible. Non-logo photos are completely unaffected (still cropped to fill, as before); the full-bleed legacy `'image'` style never triggers for a logo in practice, since a logo essentially never matches the 1920×1080/1600×900 hero-dimension tolerance, so only the split/corner-image path needed this.
- Industry-specific seed content generated by `createSeedPreviewAction` in the admin, including a default CTA derived from the business's phone/email (`buildDefaultCta()` in `cta-defaults.ts`) — never defaults to generic phrases like "Get a Quote"
- **Template polish and manual social links (2026-07-19):** five items from direct UI feedback.
  - **Hero split-image panel** (`GeneratedHero.tsx`'s `HeroCornerImage`, shared by the `'illustration'`/`'imageSplit'` styles and `'image'`'s mobile rendering) floats as a fully rounded (`rounded-2xl`), shadowed (`shadow-xl`) card inset from the section's top/right/bottom edges (`inset-y-4 right-4` mobile, `lg:my-8 lg:mr-8 xl:mr-12` desktop) instead of a flat, unshaded edge-to-edge fill — **but only when the image actually showing is a real photo** (2026-07-21 revision, `desktopIsPhoto`/`mobileIsPhoto` props, set independently per breakpoint by each `GeneratedHero` branch). The theme illustration fallback deliberately keeps its original flush, edge-to-edge look at whichever breakpoint it's rendering on — direct feedback that the polished card treatment shouldn't apply to the "no photo" color-theme fallback. Only the left edge of a rounded/photo panel stays flush against the text column, blended via the existing gradient overlay rather than gapped, so it still reads as one continuous section.
  - **`ServicesGrid` caps rendering at 5 full cards** (`MAX_FULL_SERVICES`) — services beyond the 5th render as name-only pills (no card, no description) below the grid; each full card's description is also `line-clamp-4`'d so one long description can no longer stretch a whole row's height.
  - **`ContactSection` switched from a fixed 3-column grid to a centered `flex flex-wrap`** row with fixed-width cards — fixes cards sitting left-aligned instead of centered whenever fewer than 3 of phone/email/address are present (e.g. a business with no email).
  - **`/admin/scans` groups by business** in the unfiltered view — one row per business (its latest scan, plus a "· N scans" count), linking to the existing `?businessId=...` filtered view (previously only reachable from a business's own detail page) for full history. The `?businessId=...` view itself is unchanged — still the full, un-grouped list for one company.
  - **`Business.socialLinks?: string[]`** — a new admin-editable field (Social Links textarea on the Business Details card, one URL per line, validated/deduped via `sanitizeAndDedupeSocialLinks` — now exported from `lib/firecrawl/normalize.ts` — max 6). Fixes a real gap: the Social Links section showed "enabled" in the admin Website Sections list but never rendered for any business generated via the manual "Generate Website" path (no Firecrawl scrape → `PreviewContent.socialLinks` always empty), and there was no way to manually add links at all. `generatePreviewContent` (`lib/ai/generate-preview.ts`) now prefers `Business.socialLinks` outright and only falls back to the Firecrawl enrichment snapshot when it's empty — the same "Business is canonical" precedent `theme`/`cta` already established. Still not editable inline on a single `SitePreview` (`SectionConfigForm.tsx`'s `NO_EDITOR_SECTIONS` keeps `socialLinks` out of the per-preview content editor) — same durable-business-level-field pattern as `theme`/`cta`, not a per-preview override.
- **Mobile hero photo + social-links live-preview sync (2026-07-20):** two follow-ups from direct feedback.
  - **`Business.heroPhotoUrlMobile?: string` / `PreviewTheme.heroImageUrlMobile?: string`** — a real, admin-chosen photo can now render on the mobile hero instead of always falling back to the theme illustration. Manual-only, deliberately with no automatic upload-order fallback chain (`resolvePhotoSlot(business.heroPhotoUrlMobile)` called with zero fallback args) — unlike the four existing photo slots, silently defaulting an unset mobile slot to an arbitrary uploaded photo risked a bad, nobody-chose-this crop, which is exactly why real mobile photos were deferred in the first place. Independent of the desktop `heroPhotoUrl`/`heroStyle` resolution: a business can show a real photo on mobile while desktop still uses the illustration, or vice versa. Threaded through `GeneratedHero.tsx`'s three real-photo-capable branches (`'illustration'`, `'imageSplit'`, `'image'`'s mobile sub-render) as `heroImageUrlMobile ?? illustrationSrc`/`getHeroIllustration(themeName)` — no changes needed to `HeroCornerImage` itself, since its existing "two different `<Image>`s, gradient-blended left-to-right" branch (built for the illustration) is agnostic to what's actually rendered underneath. Admin UI: a new "Mobile hero image" `PhotoPickerField` in `PhotosForm.tsx`, right after "Desktop hero image," wired through `updatePhotosAction`'s existing per-slot/dual-write machinery (`SLOT_UPLOAD_FIELDS`, `resolveThemePhotoPatch`) exactly like the other four slots. See "Photo slot assignment" and "Hero presentation" above.
  - **Social-links dual-write:** `updateBusinessDetailsAction` previously only wrote `Business.socialLinks` — nothing patched the already-generated `SitePreview.content.socialLinks` the public page actually renders from (`generatePreviewContent()` only runs on "Generate Website"/"Enrich Website," not a plain Business Details save), so an admin who added social links and enabled the section still saw nothing on "Review draft." Fixed by adding the same "dual-write" pattern `updateThemeAction`/`updatePhotosAction` already use — after `putBusiness`, patch the business's most recent `SitePreview.content.socialLinks` in place via `putSitePreview` (validated through `PreviewContentSchema.parse`). Deliberately **one-directional and additive-only**: only patches when the admin has non-empty `socialLinks` to apply, never clears `content.socialLinks` when the business-level field is empty — `updateBusinessDetailsAction` runs on every Business Details save (not just when `socialLinks` changes), so a "clear when empty" version would silently destroy legitimate Firecrawl-sourced social links on an unrelated field edit. Fully clearing an existing preview's social links still requires a regeneration.

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
| `Business` | `businessId`, `slug`, `name`, `industry`, `status`, `source`, `websiteUrl?`, `googlePlaceId?`, `scores?`, `currentPreviewId?`, Stripe IDs, optional Stage 11 website-generation inputs (`servicesOffered?`, `serviceAreas?`, `description?`, `differentiators?`, `brandTone?`, `notes?`), asset references (`logoUrl?`, `photoUrls?`), photo-slot overrides (`heroPhotoUrl?`, `aboutPhotoUrl?`, `whyChooseUsPhotoUrl?`, `servicesPhotoUrl?` — see "Photo slot assignment" below), `theme?` (the stored Brand Theme System preset), Stage 11.x section-eligibility signals (`googleRating?`, `googleReviewCount?`, `testimonials?`, `faqItems?`, `processSteps?` — see "Configurable Website-Section System" below), `websiteSections?` (the stored per-business section configuration), and Stage 13 enrichment disposition (`enrichmentStatus?`, `manualApprovalReason?`, `manualApprovalNote?` — see "Firecrawl Website Enrichment" below) |
| `SitePreview` | `previewId`, `businessId`, `slug`, `version` (monotonic), `status`, `templateId`, `content` (strict shape, includes optional `cta` — see `PreviewCtaConfig`), `theme` (`PreviewTheme.themeName` — see "Brand Theme System"), `generationMetadata?` (now includes `source?: 'seed' \| 'manual_ai' \| 'firecrawl_enriched'` and `scanId?` — Stage 13 provenance) |
| `ScanEvent` | Redesigned in Stage 13 (its first real caller — Stage 12 creates none): `scanId`, `businessId`, `provider` (`'firecrawl'`), `operation` (`'scrape'`), `status` (`queued`\|`running`\|`completed`\|`failed`\|`manual_approval_required`), `sourceUrl?`, `finalUrl?`, `httpStatus?`, `failureCategory?` (`ScanFailureCategory`, 14 values), `failureMessage?`, `attempt`, `retryOfScanId?`, `rawArtifactKey?`, `extractedArtifactKey?`, `images?` (`ScanImageAsset[]`), `generatedPreviewId?`, `scores?`, `storageKeys?` (reserved for Stage 14), `startedAt?`, `completedAt?` |
| `Postcard` | `postcardId`, `businessId`, `previewId`, `provider`, `campaignCode`, `qrDestination`, `status`, `mailedAt?`, `deliveredAt?` |

All records extend `MutableTimestampedRecord` → `createdAt` + `updatedAt` (ISO 8601 UTC strings).

`domain/models/website-enrichment.ts` (Stage 13) defines `WebsiteEnrichmentSnapshot` and `domain/models/scan-image.ts` defines `ScanImageAsset` — both transient/embedded shapes (the snapshot is stored as an S3 artifact and referenced by `ScanEvent.extractedArtifactKey`; `ScanImageAsset[]` is embedded directly on `ScanEvent.images`). Neither is a standalone DynamoDB record and neither has its own factory, for the same reason `domain/models/google-places.ts`'s shapes don't (see "Google Places Discovery Boundary" below) — nothing ever writes one to its own table.

`domain/models/google-places.ts` (Stage 12) additionally defines `GooglePlaceSearchResult` and `DuplicateSignal` — transient shapes, not persisted records. They don't extend `MutableTimestampedRecord` and have no factory, since nothing ever writes one to DynamoDB as-is; see "Google Places Discovery Boundary (Stage 12)" above.

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
scans/{businessId}/{scanId}/extracted.json
scans/{businessId}/{scanId}/images/{imageId}.{ext}
scans/{businessId}/{scanId}/desktop.png
scans/{businessId}/{scanId}/mobile.png
previews/{businessId}/{previewId}/...
postcards/{businessId}/{postcardId}/...
businesses/{businessId}/assets/logo.{ext}
businesses/{businessId}/assets/photos/{n}.{ext}
```

`crawl.json` (Stage 13) is the sanitized raw Firecrawl response (markdown/links/images/structured-extraction JSON/metadata — `html`/`rawHtml` are never requested, so there's nothing to strip there; no secrets are ever present in a Firecrawl response). `extracted.json` (Stage 13) is the validated `WebsiteEnrichmentSnapshot`. `images/{imageId}.{ext}` (Stage 13) holds accepted/review-required website images discovered by Firecrawl, fetched and rehosted server-side — see "Firecrawl Website Enrichment" below.

Two prefixes have a public-facing read path, both through `app/api/assets/[...key]/route.ts` (the app's first Route Handler) — no other prefix is ever proxied, and the raw bucket itself stays fully private:
- `businesses/{businessId}/assets/...` (added in the Stage 11 foundation work) — admin-uploaded logo/photos, unconditionally.
- `scans/{businessId}/{scanId}/images/...` (added in Stage 13) — accepted/review-required scan-derived images only. The sibling `crawl.json`/`extracted.json` artifacts in the same scan folder are deliberately **not** matched by the route's `SCAN_IMAGE_KEY_PATTERN` regex and stay private, admin-viewable only via a short-lived `getSignedAssetUrl`.

Both paths stream via `getAsset()` with a one-year `Cache-Control`.

The `retain=false` object tag is *not yet written by anything* — Stage 9 only provisions the lifecycle rule. Stage 13 does not set it either (scan artifacts are kept indefinitely, matching `SitePreview`'s own "never delete history" convention); Stage 14 (screenshots) and 22 (postcards) remain expected future adopters.

### Application-side access

- `web/lib/s3/client.ts` — `server-only` singleton `S3Client`, same region/credential pattern as `web/lib/db/client.ts` (`AWS_REGION`, `AWS_PROFILE` locally, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` on Vercel). `getAssetsBucketName()` reads `ASSETS_BUCKET_NAME`.
- `web/lib/s3/assets.ts` — `server-only` generic helpers: `putAsset`, `getAsset` (returns `null` on `NoSuchKey`), `getSignedAssetUrl` (short-lived signed URL, 300s default, for private admin viewing). All three reject keys outside the `scans/`, `previews/`, `postcards/`, `businesses/` prefixes before calling S3.
- `ScanEvent.storageKeys` (Stage 14 screenshots) and any `Postcard` creative-file field remain unpopulated — Stage 13 only ever writes `ScanEvent.rawArtifactKey`/`extractedArtifactKey`/`images[].s3Key`, not `storageKeys`.

### IAM

The `webpresa-vercel-dev` IAM user's inline policy (see `deployment.md`) grants `s3:GetObject`/`PutObject`/`DeleteObject`/`ListBucket` scoped to the assets bucket only. Stage 13 runs entirely inside existing Next.js Server Actions on Vercel — no dedicated Lambda or execution role was introduced, so it reuses this existing broad grant rather than a prefix-scoped one. Future Lambda execution roles (Stage 14 screenshot capture, Stage 22 postcard service) should still be scoped further, to their own prefix only, rather than the whole bucket — not yet created since those roles don't exist yet.

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
- `getOpenAiSecret()` got its first real caller in Stage 11 (see "AI / OpenAI integration" below); `getGooglePlacesSecret()` in Stage 12; `getFirecrawlSecret()` in Stage 13 (see "Firecrawl Website Enrichment" above) — the real API key was populated via the standard `aws secretsmanager put-secret-value` pattern (see `deployment.md`), no infra change needed since the secret was already provisioned in Stage 10. Stripe and Lob remain foundation-only for their respective later stages. Never log a secret's parsed value or raw `SecretString`.

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

- **Firecrawl re-detection**: when a scan discovers an existing logo/branding, compare it against the current theme and auto-switch + regenerate if it differs significantly. Still not implemented — genuinely out of Stage 13's actual scope (which deliberately never auto-changes `theme`/colors/typography — see "Themes and images" in `implementation.md`, Stage 13), not merely deferred for lack of a stage to attach it to.
- Logo color detection is an average-pixel approximation, not a true dominant-color histogram; good enough for family classification (which hue band a logo falls into), not exact-shade matching.

---

## Photo slot assignment

**Implemented 2026-07-14.** Uploaded business photos (`Business.photoUrls`) are auto-assigned to four template image slots by upload order — hero background, About Us section, WhyChooseUs section, and the featured service card — each preferring a distinct photo and falling back to reusing an earlier one when fewer than four were uploaded. This is a positional guess with no way to know whether a given photo actually suits a given slot (e.g. an odd crop that works for "About Us" can look awkward as a full-bleed hero background).

- `resolvePhotoSlot(override, ...autoFallbacks)` (`lib/ai/generate-preview.ts`) is the single resolution point: an explicit override wins outright; the reserved value `'none'` forces that slot's non-photo fallback (hero's gradient/pattern, About/WhyChooseUs's decorative box, or Services' `picsum` `DEV_FIXTURE`) even though photos exist; otherwise the first defined value in the automatic upload-order chain is used.
- `Business.heroPhotoUrl` / `aboutPhotoUrl` / `whyChooseUsPhotoUrl` / `servicesPhotoUrl` — optional per-slot overrides, each either a URL from the business's own `photoUrls` or the literal `'none'`. Left unset ("Auto"), the automatic assignment applies.
- Admin UI: `PhotosForm.tsx`'s "Photo Assignment" section — a numbered thumbnail grid of the business's uploaded photos plus one `<select>` per slot (labeled "Desktop hero image" / "About Us section" / "Why Choose Us section" / "Featured service card"; Auto / No photo / each numbered photo). Only rendered once at least one photo exists (i.e. practically only after at least one photo has already been uploaded, since overrides reference photos that must already have URLs) so admins can correct a specific bad auto-pick without re-architecting the whole upload flow. Reachable from both the wizard's step 2 (`onboarding/photos/page.tsx`, which now stays on itself after an upload specifically so this section becomes visible before advancing to step 3 — see "Admin application" above) and the detail page's "Photos" card. The desktop hero slot shows a static sizing hint plus a live amber warning whenever the currently-*selected* photo isn't within 100px of 1920×1080 or 1600×900px — see "Hero presentation" below for what that means for rendering. `lib/image/hero-dimensions.ts`'s `describeHeroDimensionWarningsForPhotos()` checks every uploaded photo up front at page-render time (not just whichever is currently saved as the override), returning a `Record<photoUrl, warning | null>`; `PhotosForm.tsx` (a client component) tracks the select's current value in local state and looks up that map on every `onChange`, so the warning updates instantly when the admin changes the selection — no save/reload needed, and no photo is ever left unchecked.
- `AboutSection.tsx` (the section literally titled "About Us") previously never rendered any photo at all — it and `WhyChooseUs.tsx` both trace back to the same historically-misnamed `PreviewTheme.aboutImageUrl` field (which actually only ever fed `WhyChooseUs`). Fixed by adding a distinct `aboutSectionImageUrl` field for the literal About section rather than renaming the existing field (avoids another breaking schema change on top of the Brand Theme System's).
- **`Business.heroPhotoUrlMobile` (2026-07-20)** — a fifth photo slot, structurally alongside the four above (`PhotoPickerField` in `PhotosForm.tsx`, `uploadFieldName="heroPhotoFileMobile"`, dual-write in `updatePhotosAction`), but deliberately **not** part of the automatic upload-order assignment chain: `resolvePhotoSlot(business.heroPhotoUrlMobile)` is called with zero auto-fallback arguments, so an unset slot never silently picks an arbitrary uploaded photo for the mobile crop — it falls back to the theme illustration instead, exactly as mobile behaved before this field existed. Independent of the desktop `heroPhotoUrl`/`heroStyle` resolution — a business can show a real photo on mobile with the desktop hero on illustration, or vice versa. See "Hero presentation" above for how `PreviewTheme.heroImageUrlMobile` renders.

- **Logo & Photos manager (2026-07-21):** the Photos card's top-of-form Logo/Business-photos file inputs (`PhotosForm.tsx`) were replaced by a unified `PhotoManager.tsx` — one thumbnail-grid UI, above the Photo Assignment section, that both displays the current logo (a real thumbnail via `PhotoThumbnail`, not just a "view" text link) and lets an admin upload/replace the logo, add new photos, and delete any photo, all instantly (no "Save" click, no redirect). Fixes three real bugs: the logo never rendered as an image anywhere in the admin; uploading additional photos via the old bulk `photos` field silently *replaced* `Business.photoUrls` instead of appending to it; and the underlying S3 keys were positional (`photos/{n}.ext`), so a re-upload — or, once delete existed, a photo deleted then a later upload — could collide with and overwrite a still-referenced S3 object at the same key. New photo uploads (`appendBusinessPhotos()`, `lib/s3/business-assets.ts`) now key every file with `crypto.randomUUID()` instead of a position, applied everywhere a photo lands in `photoUrls` — the manager's own uploads, the five per-slot direct-upload inputs in `updatePhotosAction`, and `promoteScanImage`'s scan-image-approval path (`enrichment-actions.ts`) — since `Business.photoUrls` is treated as an opaque list of URLs everywhere it's consumed (`resolvePhotoSlot()` never parses a filename), this required no migration. Three new instant Server Actions in `actions.ts` — `addBusinessPhotosAction`, `deleteBusinessPhotoAction`, `updateBusinessLogoAction` (return type `PhotoManagerState = { message?; photoUrls?; logoUrl? }`, since none of them redirect) — dispatched via `useActionState` from `PhotoManager.tsx`, following the same no-redirect, immediately-client-consistent convention `autoSaveWebsiteSectionsAction` already established. `updatePhotosAction` itself narrowed back to its original scope (Photo Assignment slot overrides only) now that bulk logo/photo upload lives in the new actions instead; `lib/s3/business-assets.ts`'s old `uploadBusinessAssets()` (which replaced `photoUrls` wholesale) was removed entirely. Deleting a photo (`deleteBusinessPhotoAction`) also clears any of `heroPhotoUrl`/`heroPhotoUrlMobile`/`aboutPhotoUrl`/`whyChooseUsPhotoUrl`/`servicesPhotoUrl`/`logoUrl` that pointed at it (falling back to Auto), deletes the S3 object (new `deleteAsset()` in `lib/s3/assets.ts` — the `webpresa-vercel-dev` IAM policy already granted `s3:DeleteObject`, confirmed live, so no infra change was needed), and dual-writes the business's latest `SitePreview.theme` for exactly the slot(s) just cleared, mirroring `updatePhotosAction`'s existing dual-write block, so a deleted photo never keeps rendering on the live preview. `PhotosForm.tsx` now holds `photoUrls`/`logoUrl` as local state fed only by `PhotoManager`'s callbacks (never re-synced from props after mount) and keys each Photo Assignment `PhotoPickerField` by its own current server value, so a slot a delete just cleared visually resets instead of silently re-submitting a now-deleted URL on the next "Save Photos".

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

### Inline section content editing (2026-07-17)

Each row in the admin "Website Sections" card (`SectionConfigForm.tsx`) now has a chevron — for every section except `header`/`footer` (page chrome) and `trustStrip`/`reviews` (no editable content; see below) — that expands a per-section content editor (`SectionContentEditor.tsx`) directly beneath the row. This is additive to the enable/reorder system above, not a replacement: a section still has to be enabled and available to render publicly, independent of whether its content has been hand-edited.

- `PreviewContent` (`domain/models/site-preview.ts`) gained optional per-section fields for copy that was previously a hardcoded literal in its template component: `servicesSection`, `whyChooseUsSection`, `aboutSection` (`{ quote }` only — `tagline`/`aboutText` already served as that section's headline/description), `serviceAreasSection`, `gallerySection` (heading plus a curated `images: GalleryImage[]` list), `ctaBannerSection` — all optional, additive, normalized at render time (absence renders the exact prior hardcoded copy), matching the same backward-compatible pattern `cta`/`heroStyle` already established. `GallerySection.tsx` now renders this curated list (falling back to `business.photoUrls.map(url => ({ url }))` when uncurated) instead of the raw upload list directly, so photos can be selected/ordered/captioned independently of upload order; `lib/website-sections/availability.ts`'s `gallery` check prefers the curated list's length when present.
- Two dispatch server actions in `[businessId]/actions.ts`, each following `updatePreviewCtaAction`'s established in-place-edit pattern (fetch → shallow-spread → patch touched keys → re-validate the whole schema → save, no new version/record):
  - `updateSectionContentAction(businessId, previewId, section, ...)` — the 8 sections backed by `SitePreview.content` (hero, services, whyChooseUs, about, serviceAreas, gallery, ctaBanner, contact).
  - `updateBusinessListFieldAction(businessId, field, ...)` — the 3 durable `Business` list fields (`testimonials`/`faqItems`/`processSteps`), which had no admin write path at all before this (see "Section eligibility signals" above) but persist across regenerations like `theme` and the photo-slot overrides.
- **Photo edits apply immediately, not just on next regeneration:** `updatePhotosAction` was extended to, after writing the `Business`-level slot override (unchanged), also patch the matching `theme.*ImageUrl` field on the business's most recent `SitePreview` in place (re-validated via the now-exported `PreviewThemeSchema`) whenever a slot is explicitly set to a specific photo or "no photo" — leaving a slot on "Auto" makes no live change, since there's no specific new photo to apply. Every inline per-section photo control (`SectionPhotoEditor` in `SectionContentEditor.tsx`) reuses this same action, carrying the other three slots' current values as hidden inputs so editing one slot can never clobber the others.
- `RepeatableListEditor.tsx` (generic add/remove/reorder editor for same-shaped item lists) and `form-list.ts`'s `parseIndexedList()` (its matching `FormData` parser, reading `${prefix}.${index}.${key}` fields) are shared across every list-shaped section: services, differentiators, service areas, testimonials, FAQ, process steps. Gallery gets a dedicated editor instead (thumbnails, captions, and a picker limited to already-uploaded business photos — uploading a new photo file still only happens via the Photos card).
- **`SectionConfigForm.tsx` no longer wraps its rows in a native `<form>`** — a per-row chevron needed to reveal an independent content-editing `<form>` beneath each row, and HTML forms cannot nest. The enable/reorder state (`enabledByType`/`orderedTypes`) is now the sole source of truth; "Save Sections" builds a `FormData` from that state and calls the `useActionState` dispatch function directly (a fully supported, typed call in React 19 — its signature is `(payload) => void`, not form-submission-only).
- **Scope, confirmed with the user before implementation:** Reviews (rating/count) got no editor — reserved for real Google Places data, since an admin hand-typing a rating would risk looking like a genuine Google rating. Trust Strip stays fully static (enable/disable only) — its badges are an intentional anti-fabrication guardrail, not missing content.

### Deferred

- No variant picker in the admin UI (nothing to pick — every section has exactly one variant today).
- Order editing is a plain number input (computed from row position) per the objective's explicit scope limit, not drag-and-drop.
- Rule-based/AI section *selection* (auto-approval, confidence scoring) is explicitly out of scope for this stage — only manual admin control plus an on-demand, admin-triggered deterministic recommendation exist today.
- No admin UI to enter `googleRating`/`googleReviewCount` — reserved for Stage 12 (Google Places), not manual entry.

---

## Google Places Discovery Boundary (Stage 12)

**Implemented 2026-07-17.** Manual, admin-triggered search and selective import only — see `build_log.md`, "Stage 12 — Google Places Discovery" for the full implementation record, and `implementation.md`, Stage 12, for requirements, field mapping, and acceptance criteria.

- **Admin UI:** `app/admin/(dashboard)/discover/` — `DiscoverPanel.tsx` (client component, two independent `useActionState` forms: search, then import) rendered from `page.tsx`. Linked from `AdminSidebar.tsx` as "Discover"; covered by the existing `/admin/*` wildcard in `proxy.ts`, no route-protection change needed.
- **Server-only calls.** `web/lib/google-places/client.ts`'s `searchPlacesText()` follows the same pattern as every other third-party integration in this codebase: a `server-only` function reads its API key from `getGooglePlacesSecret()` (`web/lib/secrets/index.ts`) and is only ever invoked from the `discover/actions.ts` Server Actions, which independently verify the admin session before doing anything — never from a client component, never from a public endpoint. It calls Places API (New) `places:searchText` with an `X-Goog-FieldMask` limited to identity/contact/review fields — no photo field is ever requested.
- **Secret already provisioned.** The `webpresa-{env}-google-places` secret (`{ apiKey }`) was created in Stage 10 (`infra/lib/stacks/data-stack.ts`, `WebpresaSecret` construct) and is already granted to `webpresa-vercel-dev`'s IAM policy and readable via `GOOGLE_PLACES_SECRET_NAME`. Stage 12 is its first real caller — no new secret, IAM grant, or environment variable was needed for the key itself.
- **Existing model and repository, no new table.** Imported records become ordinary `Business` records via the existing `web/lib/db/businesses.ts` repository (`putBusiness`, `resolveUniqueSlug`, plus two new read helpers — see below). No separate `Prospect` aggregate or DynamoDB table was introduced. `Business.source` gained a fourth enum value, `'google_places'` (`BUSINESS_SOURCES`, `domain/models/business.ts`) — the one deliberate, minimal domain-model change this stage required.
- **Duplicate detection (`web/lib/google-places/duplicates.ts`):** `getBusinessByGooglePlaceId()` (new repository function) queries the existing `google-place-id-index` GSI (`webpresa-dev-businesses`, provisioned in Stage 6) — the fast-path, definitive check. `listAllBusinesses()` (new repository function, paged `ScanCommand`, dev-scale only) backs the domain/phone/name+address/name+city checks, which have no dedicated GSI. `checkDuplicatesAgainstList()` is the pure comparison function; `findDuplicateSignalsForBatch()` loads the business list once per search or import rather than once per result. Re-run server-side, as a fresh batch, immediately before every import — never trusted from what was shown during review.
- **Transient search results.** `GooglePlaceSearchResult` (`domain/models/google-places.ts`) exists only in server memory and the review UI's `useActionState` result until an admin explicitly selects and imports it. Nothing is written to DynamoDB or S3 during search or review — only at the moment of a selective import. Each result round-trips to the import action as a hidden `JSON.stringify()`'d form field, re-validated by `GooglePlaceSearchResultSchema` before use (this app has no session-scoped server cache to hold results between requests).
- **No Google photo retrieval.** Google Places photo binaries are never retrieved or stored — `web/lib/google-places/client.ts`'s field mask has no photo entry, and no code path in `web/lib/google-places/` reads or writes one. `businesses/{businessId}/assets/` (Stage 9) remains reserved for admin-uploaded or otherwise explicitly approved business assets only — Stage 12 never writes to it. `scans/{businessId}/{scanId}/` remains reserved for Stage 13's Firecrawl artifacts and Stage 14's Playwright artifacts; Stage 12 writes no scan artifacts and does not write to that prefix.
  - **Considered and rejected (2026-07-17): downloading Google Place Photos as a fallback for businesses with no website** (since Firecrawl has nothing to crawl for them). Rejected because Google's Places API policy prohibits pre-fetching/caching/storing Places API content beyond narrow allowed exceptions (`place_id` is explicitly exempt; photo *references* are explicitly non-cacheable and can expire) — see [Policies and attributions for Places API](https://developers.google.com/maps/documentation/places/web-service/policies) and [Place Photos (New)](https://developers.google.com/maps/documentation/places/web-service/place-photos). Permanently rehosting a downloaded photo in our own S3 bucket, as every other business asset in this system works, would very likely violate that policy, and any photo carrying an `authorAttributions` value requires attribution to be displayed wherever it's shown — no template component currently renders one. No-website businesses continue to rely on the existing theme-matched illustration hero (see "Theme-matched hero illustrations" above) and admin-uploaded photos (Stage 9/11) — both already fully support this case; no new work was needed.
- **No `ScanEvent`.** A Google Places search/import is not a scan — Stage 12 does not create a `ScanEvent` record. `ScanEvent` remains reserved for Stage 13 (crawl) and Stage 14 (screenshot) provider runs against a business's own website.
- **Source-attributed provider facts.** `importSelectedPlacesAction` copies `rating`/`userRatingCount` onto `Business.googleRating`/`googleReviewCount` only when present — Google-sourced facts, not manually entered reviews or generic testimonials — see "Section eligibility signals" above.
- **Section recommendations stay deterministic and admin-triggered.** Stage 12 populating `googleRating`/`googleReviewCount` only changes what `computeSectionAvailability`'s `reviews` check (and therefore `recommendWebsiteSections`) returns. Stage 12 itself never calls that function, never writes `Business.websiteSections`, and never lets external Google data directly choose a React component — the same registry-only principle established in "Configurable Website-Section System" above applies to every future data source, not only AI output.
- **No status queue.** An imported business's `status` is the existing `'pending'` value from `BUSINESS_STATUSES` (`domain/models/business.ts`) — `createBusiness()`'s ordinary default, unchanged by `importSelectedPlacesAction`. There is no `READY_FOR_SCAN` or `READY_FOR_ENRICHMENT` status anywhere in the model. Starting Stage 13 enrichment remains a distinct, explicit admin action on the business detail page, not a queue or status Stage 12 populates.
- **Industry mapping.** Google's `primaryType`/`types` taxonomy doesn't line up 1:1 with the fixed `INDUSTRIES` enum, and `Business.industry` is required — `web/lib/google-places/industry-map.ts`'s `GOOGLE_TYPE_TO_INDUSTRY` table provides a best-match guess, and the admin review UI always shows an editable `<select>` (defaulting to that guess, blank when nothing matched) so the admin confirms or overrides it per result before import.

---

## Firecrawl Website Enrichment

**Implemented 2026-07-18.** Manual, admin-triggered single-page Scrape and generation only — see `build_log.md`, "Stage 13 — Firecrawl Website Enrichment" for the full implementation record, and `implementation.md`, Stage 13, for requirements and acceptance criteria.

### Ownership boundaries

`Business` remains the single canonical record. Firecrawl output is evidence, stored as scan artifacts (`ScanEvent` + S3), never auto-written onto `Business` — the only `Business` fields Stage 13 ever sets are its own pipeline-disposition fields (`enrichmentStatus`, `manualApprovalReason`, `manualApprovalNote`). `ScanEvent` tracks the execution and outcome of each attempt. `SitePreview` stores the generated output and which scan/generation source produced it (`generationMetadata.source`/`scanId`).

### REST client, not the `firecrawl` npm SDK

`web/lib/firecrawl/client.ts`'s `scrapeWebsite()` is a plain `server-only` `fetch` call against `POST https://api.firecrawl.dev/v2/scrape` (`Authorization: Bearer <apiKey>` from `getFirecrawlSecret()`), mirroring `lib/google-places/client.ts`'s established pattern rather than adding the `firecrawl` SDK as a dependency. Confirmed against the installed `firecrawl@4.30.1` SDK source (not just docs) that this is the actual wire contract. Two deliberate reasons for REST over the SDK: (1) the SDK wraps every error in its own `SdkError`, discarding the raw HTTP response — this app needs the raw `Retry-After` header for bounded retry, which the SDK doesn't expose; (2) it avoids adding `axios` (the SDK's HTTP layer) as a dependency the rest of the codebase doesn't otherwise use. `FirecrawlApiError` categorizes failures (`auth`/`rate_limit`/`timeout`/`provider_error`/`unreachable`/`unknown`), mapped to `ScanFailureCategory` in `enrich-business.ts`.

### Structured extraction inside the one Scrape call

The request's `formats` array includes `['markdown', 'links', 'images', { type: 'json', schema, prompt }]` — the `json` entry runs Firecrawl's own extraction LLM as part of the single Scrape call (confirmed via the SDK's `JsonFormat` type). This is still the single-page **Scrape** operation, never Search/Extract/Crawl, and it means this app's own OpenAI usage stays limited to the existing Stage 11 generation call — no second app-side LLM call does raw-page → structured-fields extraction.

### Normalized enrichment snapshot

`web/lib/firecrawl/normalize.ts`'s `normalizeFirecrawlResponse()` is the only place Firecrawl's untrusted `json` extraction result is trusted at all: parsed with a permissive Zod shape, then capped (array lengths, string lengths), sanitized (HTML/control-character stripping, malformed-URL rejection, deduplication), and re-validated against `WebsiteEnrichmentSnapshotSchema` (`domain/schemas/website-enrichment.schema.ts`) before ever being stored or used. Deterministic — no AI call of its own. Social links are derived both from the model's own `socialLinks` output and from discovered page links matching known social domains.

### Merge precedence

`web/lib/firecrawl/generation-context.ts`'s `buildGenerationContext({ business, snapshot })` is the one explicit merge function: the business's own `servicesOffered`/`serviceAreas`/`differentiators`/`description` win outright whenever non-empty; the snapshot fills in only what the business left blank. `business` is never mutated. This is what lets a Stage 12–imported business (which typically has no Stage 11 inputs filled in yet) get its *first* preview directly from Stage 13, without completing Stage 11 manually first — `lib/ai/generate-preview.ts`'s "no services" guard now checks the merged context, not `business.servicesOffered` alone.

**`differentiators` fallback (2026-07-21):** `WebsiteEnrichmentSnapshot.differentiators` (`string[]`, capped at 8) was added to the same structured-extraction JSON schema/prompt described above — Firecrawl's extraction LLM pulls short "why choose us" phrases (years in business, family-owned/local, licensed/insured, 24/7 availability, awards/certifications, guarantees) only when literally stated on the page, same "do not infer" constraint as every other extracted field. `buildGenerationContext()` now falls back to it exactly like `servicesLines`/`serviceAreaLines` — previously `differentiatorLines` had no snapshot fallback at all (an explicit, now-superseded design choice), which meant a business enriched via Firecrawl but with no manually-typed `Business.differentiators` always got an empty Why Choose Us section regardless of what its own website actually said about itself. Businesses enriched before this change need "Enrich Website"/"Retry" run again to pick up the new field, since their stored `extracted.json` predates it.

### SSRF guard

`web/lib/firecrawl/url-validation.ts`'s `validateOutboundUrl()` is applied to three inputs: the business's website URL before ever calling Firecrawl, Firecrawl's reported final URL before it's trusted as metadata, and every discovered image URL before it's fetched. Requires `http`/`https`, rejects embedded credentials, resolves the hostname via `dns.promises.lookup`, and rejects loopback/RFC1918-private/link-local/the AWS metadata endpoint (`169.254.169.254`)/other reserved ranges for every resolved address (a bare IP literal in the URL is checked directly, without a DNS round trip).

### Website image ingestion

`web/lib/firecrawl/images.ts`'s `ingestScanImages()`: takes Firecrawl's discovered `images` array (capped to 15 candidates), skips anything matching a tracking-pixel/icon URL pattern without fetching it, re-validates each URL through the same SSRF guard, fetches server-side with a manually-followed (max 3 hops, each re-validated) redirect chain, an 8s timeout, and an 8MB size cap enforced via both `Content-Length` and actual bytes read, restricts content type to `image/jpeg` (`image/jpg` is also accepted and normalized to `image/jpeg` — several real-world CDNs send the non-standard value; caught during manual verification, see `build_log.md`)/`png`/`webp`, reads real pixel dimensions via `sharp` (already a dependency — same pattern as `lib/image/hero-dimensions.ts`), and rejects anything under 80px on either dimension as a likely icon/tracking pixel. Role classification (`WebsiteImageRole`: `logo`/`hero`/`service`/`gallery`/`team`/`location`/`unknown`) is a deterministic URL-keyword heuristic — never AI, mirroring `lib/website-sections/availability.ts`'s "no AI" convention. Images at or above 400×300px (or classified `logo`) are `accepted`; smaller real photos are `review_required`; everything else is `rejected` (never fetched/stored at all — the only status with no S3 object). **Both `accepted` and `review_required` images are uploaded** to `scans/{businessId}/{scanId}/images/{imageId}.{ext}` — `review_required` only means "not automatically used by generation," not "discarded," since an admin needs to actually see and potentially promote it (see "Scan-image promotion" below). Capped at 8 auto-*accepted* images per scan (uncapped for `review_required`, bounded only by the 15-candidate ceiling). A single bad candidate never fails the whole scan or the batch.

Every stored image (both statuses) gets a stable public URL via the *existing* asset proxy (`/api/assets/scans/{businessId}/{scanId}/images/...` — see "S3 asset storage" above) rather than a raw bucket or a new public path — the same trust boundary as today's admin-uploaded business photos. Never hotlinks the original discovered URL. Never downloads Google Places photos (Stage 12 never even discovers a photo reference to download). Never *automatically* writes to `Business.photoUrls` — `accepted` images are only ever offered to `generatePreviewContent()` as a lowest-priority photo-slot fallback tier, after admin-uploaded `Business.photoUrls`, via the same `resolvePhotoSlot()` chain Stage 11 already uses (see "AI / OpenAI integration" below). `review_required` images are never auto-used at all.

### Scan-image promotion

**Implemented 2026-07-18**, in response to real usage: after a scan completes, an admin needs an actual way to review and use the images Firecrawl found — not just see that some exist. `promoteScanImage(businessId, scanId, imageId)` (`app/admin/(dashboard)/businesses/[businessId]/enrichment-actions.ts`, an internal helper — not itself a Server Action) is the one shared implementation that promotes a single scan image (`accepted` or `review_required` — `rejected` images have no stored bytes to promote) into the canonical Business photo library:

1. Loads the `Business` and `ScanEvent`, locates the image by `imageId`.
2. Idempotency/limit guards: already-promoted (`image.promotedPhotoUrl` set) short-circuits without duplicating; a business already at the 6-photo cap (matching `BusinessSchema`'s `photoUrls` max) is refused.
3. Fetches the object's bytes from its scan-artifact location via `getAsset()`, then **copies** them (not merely re-points a URL) into `businesses/{businessId}/assets/photos/{n}.{ext}` via `putAsset()` — the same physical prefix and numbering convention (`photos/${photoUrls.length}.${ext}`) `updatePhotosAction`'s direct uploads already use. This keeps every `Business.photoUrls` entry's provenance and lifecycle identical regardless of whether it came from an admin upload or a promoted scan image, rather than leaving some `photoUrls` entries secretly backed by the `scans/` prefix.
4. Appends the new `/api/assets/businesses/...` URL to `Business.photoUrls` and persists via `putBusiness()`.
5. Records the resulting URL back onto the `ScanImageAsset.promotedPhotoUrl` field (persisted on the `ScanEvent`) so the UI can show "already added" and never double-promote.

Returns a plain result (`'added'|'already_added'|'limit_reached'|'not_found'`) rather than redirecting itself, so it can be called from two public Server Actions: `approveScanImageAction` (single image, redirects immediately) and `approveScanImagesAction` (**batch — implemented 2026-07-18**, same day, in response to real usage: reviewing five-plus images one click at a time was tedious). The batch action reads every checked `"{scanId}::{imageId}"` pair from the submitted `FormData` and calls `promoteScanImage` on each **sequentially, never in parallel** — necessary because each call re-fetches `Business` fresh and appends to `photoUrls` by current array length, so a parallel batch would race and silently drop entries. Stops adding once the 6-photo cap is hit but keeps counting the rest as `skipped` rather than erroring the whole batch out.

`ScanImageApprovalGrid.tsx` (client component, shared by both surfaces below) renders the checkbox grid: a "Select all"/"Select none" pair that toggles checkbox `.checked` directly via a form ref (no React-controlled state — the checkboxes stay plain uncontrolled inputs, simpler than lifting per-checkbox state) plus one "Add Selected to Photos" submit. Surfaced in two places, both binding the same `approveScanImagesAction`: the scan detail page (`/admin/scans/[scanId]`, every stored image in the grid) and the business detail page's Photos card (`ScanImageReview.tsx`, listing every not-yet-promoted image across *all* of that business's scans, not just the latest) — an admin can review from whichever page they're already on. The Photos `CollapsibleCard` auto-opens (`defaultOpen`) whenever a business has at least one unpromoted scan image, so a freshly completed enrichment doesn't hide new images behind a click.

### Business logo assignment from Photo Assignment

**Implemented 2026-07-18**, in response to real usage: a business logo discovered via Firecrawl (promoted into `photoUrls` like any other scan image — see above) had no way to actually become `Business.logoUrl`, since the logo has always been a single dedicated field set only by direct file upload (`uploadBusinessAssets`), never derived from `photoUrls`. `PhotosForm.tsx`'s "Photo Assignment" section gained a fifth picker, "Business logo" (`logoPhotoUrl`), reusing the exact same `PhotoPickerField` component as the four existing section slots — but with different semantics: there's no automatic upload-order fallback for a logo the way there is for hero/about/etc., so "Auto" here means "leave the current logo unchanged," not "pick one for me." `resolveLogoUrl()` (`[businessId]/actions.ts`) implements this: unset → keep existing `logoUrl`; `'none'` → clear it; any other value (a URL from `photoUrls`) → become the new `logoUrl`. A fresh logo *file* upload (the existing "Logo" field at the top of the Photos card) still always wins over the picker selection, matching the same precedence the four section-slot pickers already establish for their own direct-upload fields.

### Found-contact-info promotion

**Implemented 2026-07-18**, in response to real usage: a business missing `email` (common for Google Places imports, which have no email field) had its Firecrawl-found email visible only inside the scan detail page's raw "Contact found on page" listing — nothing carried it onto `Business.email` itself, and no code path even used it as a *generation* fallback. Two related fixes:

1. **Generation fallback** (`lib/firecrawl/generation-context.ts`): `buildGenerationContext()` now also resolves `contact: { phone?, email?, address? }` — each field independently business-wins-else-snapshot's-first-found-value, exactly like `servicesLines`/`serviceAreaLines`/`description` already worked. `lib/ai/generate-preview.ts`'s `contact` object (used for both `content.contact` and `buildDefaultCta()`'s channel selection) is now simply `generationContext.contact` instead of being built directly from `business.phone`/`email`/`address` — so a generated preview correctly shows/uses a found email or phone when the business record itself has none, matching the documented merge-precedence rule ("Firecrawl may contribute information absent from the canonical generation context") that the original contact-building code had missed. This is generation-input only; it still never writes back to `Business`.
2. **Explicit promotion to Business** (`applyFoundContactFieldAction(businessId, field, value, redirectTo)`, `enrichment-actions.ts`): mirrors scan-image promotion's pattern for contact fields — `updateBusiness(businessId, { [field]: value })` for exactly one of `phone`/`email`/`address`, only ever from a deliberate admin click. `FoundContactInfo.tsx` (rendered inside the Business Details card) compares the latest completed scan's snapshot's first phone/email/address against the corresponding `Business` field and shows an "Apply" (or "Overwrite," if the business already has a different value) button per differing field; fields that already match are hidden. The Business Details card auto-opens when there's a found value worth reviewing, mirroring the Photos card's `hasPendingScanImageReview` pattern. `lib/firecrawl/snapshot.ts`'s `getLatestSnapshotForBusiness()` (shared helper, reads the most recent `completed` scan's `extracted.json`) backs both this feature and could back future evidence surfaces without re-reading S3 redundantly.

### `/admin/scans`

**Implemented 2026-07-18** (was a Stage-9-era static placeholder). `app/admin/(dashboard)/scans/page.tsx` lists every `ScanEvent` across every business (`lib/db/scan-events.ts`'s `listAllScans()` — plain `ScanCommand` + application-code sort, the same dev-scale tradeoff `listAllBusinesses()` already documents, since no GSI supports a global "every scan, newest first" query). `app/admin/(dashboard)/scans/[scanId]/page.tsx` is the detail view: scan metadata, failure category/message when applicable, the full image grid (real thumbnails for every stored image, "Add to Photos" per image), the complete extracted `WebsiteEnrichmentSnapshot` rendered field-by-field, and signed-URL links to the raw `crawl.json`/`extracted.json` artifacts (`viewRawArtifactAction`, session-checked, key-prefix-checked) since those stay outside the public image proxy.

### No-website and no-usable-images paths

A `Business` with no `websiteUrl` never calls Firecrawl at all: `enrichBusinessWebsite()` immediately writes a `manual_approval_required` `ScanEvent` (`failureCategory: 'missing_website'`) and sets `Business.enrichmentStatus`/`manualApprovalReason`/`manualApprovalNote` to the exact required admin-facing copy. A website that scrapes successfully but yields zero accepted images still completes normally (`enrichmentStatus: 'enrichment_completed'`) — `manualApprovalReason: 'no_usable_images'` is a non-blocking note alongside a real success, not a failure state; generation proceeds with the existing Stage 11 image-free fallback (theme-matched illustration hero).

### Retry semantics

Two tiers, matching the "never retry the same ScanEvent" requirement: (1) bounded inline retry *within* one `running` `ScanEvent` attempt (`lib/firecrawl/retry.ts` — exponential backoff + jitter, honors a numeric or HTTP-date `Retry-After`, capped at `MAX_AUTOMATIC_RETRIES` = 2, only for `firecrawl_rate_limit`/`firecrawl_timeout`/`firecrawl_provider_error`) — this never creates a new `ScanEvent`; (2) `retryEnrichmentScan()`, the admin-triggered cross-attempt retry, which always creates a brand-new `ScanEvent` (`retryOfScanId` + `attempt + 1`) and never transitions the prior `failed` `ScanEvent` back to `running` — enforced by never calling `putScanEvent` on the old record again after it's marked `failed`.

### Concurrency

`hasActiveScan()` queries `listScansForBusiness()` and rejects a new `enrichBusinessWebsite()`/`retryEnrichmentScan()` call (`status: 'conflict'`) whenever a `queued` or `running` `ScanEvent` already exists for that business — checked before any DynamoDB write for the new attempt.

### Admin UI

`EnrichmentSection.tsx` on the business detail page is a plain server component — no client JS needed, since active-scan/retry eligibility is fully determined server-side from already-loaded `scans`/`business` data. Both actions (`enrichment-actions.ts`) redirect back to the detail page with an `?enrichmentResult=` query param rather than returning `useActionState` feedback, since enrichment can take several seconds and has more distinct terminal outcomes (completed, manual approval, conflict, failed) than a simple inline message suits.

---

## AI / OpenAI integration

**Implemented in the Stage 11 foundation work.** Live-tested against the real OpenAI API — real usage costs apply per generation.

- `web/lib/ai/client.ts` — `server-only` singleton `OpenAI` client, built from `getOpenAiSecret()` (fetched once, cached for the process lifetime via the Secrets layer's own caching). Model is read from `OPENAI_MODEL` (env var, default `gpt-4o-mini`) rather than hardcoded.
- `web/lib/ai/generate-preview.ts` — `generatePreviewContent(business, options?)` makes one structured-output request (`chat.completions.parse` + the `openai/helpers/zod` `zodResponseFormat` helper) covering hero copy, services, tagline, about text, differentiators, CTA button *labels*, font, and hero-style choice, run in parallel with the Brand Theme System's `resolveBusinessTheme(business)` (see above) — theme selection is a separate, independent OpenAI concern that never shares a response schema with content generation.
  - **Design invariant:** contact info, service areas, and CTA *type/destination* are always derived in code from the verified `Business` record — never trusted from the model. The model only supplies CTA labels, which are merged into a type/destination structure computed by `buildDefaultCta()` (same phone-first/email-fallback/hidden-CTA priority used by the CTA system's admin default). An uploaded photo always wins over the model's hero-style pick. Brand colors are never trusted from the model either — see "Brand Theme System" above.
  - Output is re-validated against `PreviewContentSchema` / the theme schema before being returned — defense in depth beyond the API's own schema enforcement.
  - **Stage 13 addition:** the optional second argument, `options.enrichment?: { snapshot, scanImages, scanId }`, is the only change to this function for Firecrawl enrichment — when absent, behavior is byte-for-byte identical to the original Stage 11 path (existing call sites are unaffected). When present, `buildGenerationContext()` (see "Firecrawl Website Enrichment" above) fills prompt-input gaps and `generationMetadata.source` becomes `'firecrawl_enriched'` (vs. the now-explicit `'manual_ai'` default) with `scanId` set. Photo-slot resolution (`resolvePhotoSlot`) gains a third, lowest-priority fallback tier of scan-accepted images, after admin-uploaded `business.photoUrls`.
- `generateWebsiteAction` (`app/admin/(dashboard)/businesses/[businessId]/actions.ts`) — soft-capped at 3 real generations per business; always saves the result as a `draft` `SitePreview`, never auto-published.
- `enrichWebsiteAction`/`retryEnrichmentAction` (`app/admin/(dashboard)/businesses/[businessId]/enrichment-actions.ts`, Stage 13) — call `generatePreviewContent` with enrichment context via `lib/firecrawl/enrich-business.ts`; not subject to the `MAX_AI_GENERATIONS` cap (a separate, unbounded admin action, matching the spec's silence on capping Stage 13 specifically — worth revisiting if real usage warrants a cap later).
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
- `web/app/admin/(dashboard)/discover/actions.ts` — `searchPlacesAction`, `importSelectedPlacesAction` (Stage 12)
- `web/app/admin/(dashboard)/businesses/[businessId]/enrichment-actions.ts` — `enrichWebsiteAction`, `retryEnrichmentAction` (Stage 13) — kept in their own module rather than added to the already 1200+ line `actions.ts`; both redirect back to the business detail page with an `?enrichmentResult=` query param the page reads to show a result banner, rather than returning inline `useActionState` feedback

All actions validate input with Zod and verify the admin session before any DynamoDB call. No raw DynamoDB code in UI components — all reads and writes go through the repository layer.

The one exception to the Server Action pattern: `web/app/api/assets/[...key]/route.ts` is a Next.js Route Handler (not a Server Action) — it needs to be a real HTTP `GET` endpoint so `<Image>`/`<img>` tags can address it directly by URL. It's intentionally public (no session check) but scoped to only the `businesses/` S3 prefix and, as of Stage 13, `scans/{businessId}/{scanId}/images/` — see "S3 asset storage" above.

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
    businesses.ts        Business repository — list, listAll, get, getByGooglePlaceId, put, update, resolveUniqueSlug
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
  google-places/
    client.ts              searchPlacesText — server-only Places API (New) Text Search — Stage 12
    normalize.ts            phone/domain/name normalization, addressComponents → Address
    industry-map.ts         Google type → Industry mapping, search-query labels
    map-result.ts           raw API result → transient review shape
    duplicates.ts           checkDuplicatesAgainstList, findDuplicateSignals(ForBatch)
    search.ts               searchGooglePlaces — search orchestration
  firecrawl/
    client.ts               scrapeWebsite — server-only Firecrawl v2 REST Scrape client — Stage 13
    url-validation.ts       validateOutboundUrl — SSRF guard (source URL, final URL, image URLs)
    normalize.ts            normalizeFirecrawlResponse — raw response → validated WebsiteEnrichmentSnapshot
    images.ts               ingestScanImages — validate/fetch/classify/rehost discovered website images
    generation-context.ts   buildGenerationContext — the one explicit Business+snapshot merge function
    retry.ts                isRetryableFailureCategory, computeAutomaticRetryDelayMs — bounded backoff
    enrich-business.ts      enrichBusinessWebsite, retryEnrichmentScan — orchestration
    snapshot.ts             getLatestSnapshotForBusiness — shared latest-completed-scan snapshot reader
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
