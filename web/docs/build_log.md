# Webpresa Homepage — Build Log

**Date:** 2026-07-10  
**Project:** `webpresa/web` — Next.js 15/16 App Router  
**Scope:** Production-ready homepage for Webpresa (Website-as-a-Service for local businesses)

---

## Overview

Built a full-page marketing homepage from scratch inside the existing Next.js project at `/home/mudge/apps/webpresa/web`. The project already had Next.js 16.2.10, React 19, and Tailwind CSS v4 installed. All other dependencies, components, config updates, and the page composition were created as part of this build.

---

## 1. Dependencies Installed

```bash
npm install framer-motion lucide-react clsx tailwind-merge
```

| Package | Purpose |
|---|---|
| `framer-motion` | Scroll-triggered fade-ins, hover animations, floating badges, FAQ accordion |
| `lucide-react` | Icon set (Check, X, Minus, Wifi, Search, Shield, etc.) |
| `clsx` | Conditional class composition |
| `tailwind-merge` | Merges conflicting Tailwind classes without duplication |

---

## 2. Config Files Modified.

### `app/globals.css`

- Extended the existing Tailwind v4 `@theme` block with brand design tokens:
  - `--color-brand: #11455E` → utility classes `bg-brand`, `text-brand`
  - `--color-brand-dark: #0c3245`
  - `--color-brand-light: #1a5f80`
  - `--color-brand-muted: #e8f2f7` (light tint for backgrounds/badges)
  - `--color-accent: #CE9059` → `bg-accent`, `text-accent`
  - `--color-accent-dark: #b87a45`
  - `--color-surface: #FAFAFA`
  - `--color-border: #e5e7eb`
- Added `html { scroll-behavior: smooth; }` for anchor navigation
- Updated `font-family` to use the Geist font variable already configured in layout

### `app/layout.tsx`

- Updated `<title>` to `Webpresa — Your online presence, automated.`
- Added `description` meta tag
- Added `openGraph` metadata block (title, description, siteName, type)

---

## 3. New Utility File

### `lib/utils.ts`

Created a `cn()` utility function combining `clsx` and `tailwind-merge` — the standard shadcn/ui-style pattern for conditional class merging used throughout the components.

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 4. Components Created

All components live in `app/components/`. Components that require browser APIs (scroll listeners, `useState`, `useInView`) are marked `"use client"`. Static layout components (Features, Footer) remain server components.

### `Navbar.tsx` — `"use client"`

- Sticky, fixed position with `z-50`
- Transparent on load → `bg-white/80 backdrop-blur-md shadow-sm` after 12px scroll (detected via `window.scrollY`)
- Padding shrinks from `py-4` to `py-2` on scroll
- Logo uses `next/image` pointing to `/public/webpresa_logo.png`
- Desktop: nav links (How It Works, Examples, Pricing, About) + ghost "Log In" + primary "Get My Website" button
- Mobile: hamburger toggle opens a slide-down drawer with all links and both CTAs
- All CTA/contact links point to `#contact` (placeholder)
- Framer Motion `whileHover` / `whileTap` scale on primary button

### `Hero.tsx` — `"use client"`

- Full-viewport centered layout (`min-h-screen`, `pt-24` for navbar offset)
- Subtle radial gradient blobs in the background (brand-muted + accent tint)
- **Left column:**
  - Small badge: "Website as a Service for Local Business"
  - `<h1>` headline with brand-colored word
  - Subheadline paragraph
  - Two CTAs: "Get My Website" (brand primary) + "See Examples" (ghost border)
  - Three trust items with `CheckCircle2` icons (No design skills / Hosting included / Maintenance handled)
- **Right column (desktop only):** `WebsiteMockup` sub-component — a fully JSX-constructed fake local business website (plumbing company) featuring:
  - Browser chrome (traffic-light dots + fake URL bar)
  - Fake nav with CTA button
  - Brand-gradient hero block with text stubs and CTA
  - 3-column service cards with icon placeholders
  - Star-rating testimonial snippet
- **Floating status badges:** 3 cards (`Mobile Optimized`, `SEO Ready`, `Hosted by Webpresa`) using Framer Motion looping `y` keyframe animation for a gentle float effect
- Staggered fade-up entrance animation for all hero elements via `fadeUp` Variants + `custom` index delays

### `ProblemSection.tsx` — `"use client"`

- Background: `#FAFAFA`
- Centered large headline
- 4-card grid (1→2→4 cols at breakpoints):
  1. Outdated Design — `Paintbrush` icon
  2. Poor Mobile Experience — `Smartphone` icon
  3. Hard to Update — `PenLine` icon
  4. Not Bringing in Customers — `TrendingDown` icon
- Cards: white, rounded-2xl, soft shadow, brand-muted icon badge
- Staggered scroll-triggered `useInView` fade-up via `containerVariants` + `cardVariants`

### `HowItWorks.tsx` — `"use client"`

- Section `id="how-it-works"` for navbar anchor
- 3-step horizontal cards with large ghost step numbers (`01`, `02`, `03`) as decorative background text
- Desktop connector line: CSS `absolute` horizontal rule between cards
- Each card: icon badge + heading + paragraph
- Framer Motion `whileHover={{ y: -4 }}` lift
- Staggered scroll-triggered entrance

### `ExamplesSection.tsx` — `"use client"`

- Section `id="examples"` for navbar anchor
- 6 fake industry website preview cards in a responsive 3→2→1 grid:
  - Plumbing (Austin, TX)
  - Bakery (Denver, CO)
  - HVAC (Nashville, TN)
  - Landscaping (Phoenix, AZ)
  - Auto Repair (Chicago, IL)
  - Dental Office (Seattle, WA)
- Each card: gradient preview block (simulated website layout with nav/hero stubs), industry label, city, "View Website" link
- Hover: `y: -6, scale: 1.01` lift with shadow deepening
- Staggered scroll-triggered entrance

### `FeaturesSection.tsx` — server component

- 3-column feature grid on `#FAFAFA` background:
  - **Website:** Professional design, Mobile optimized, Fast loading, Contact forms
  - **SEO:** Local search optimization, Analytics dashboard, Google indexing, Content structure
  - **Management:** Managed hosting, Security monitoring, Ongoing maintenance, Unlimited updates, Monthly analytics
- Each column: white card with `CheckCircle2` icons in brand color

### `ComparisonSection.tsx` — `"use client"`

- Centered comparison table (max-w-5xl) with 4 columns: Feature | Traditional Agency | DIY Builder | Webpresa
- 6 comparison rows: Upfront Cost, Maintenance, Setup Time, Technical Skills, Ongoing Updates, SEO Foundation
- Cell types: `good` (green Check), `bad` (red X), `neutral` (gray Minus) — using Lucide icons
- Webpresa column highlighted with `bg-brand-muted/20` background tint throughout
- `cn()` utility for conditional cell styling

### `PricingSection.tsx` — `"use client"`

- Section `id="pricing"` for navbar anchor
- Single centered pricing card (max-w-lg)
- Brand-colored 2px border + gradient top accent bar
- Price: `$149/month`
- 12-month agreement note
- 8-item feature checklist with `CheckCircle2` icons
- "Get My Website" CTA → `#contact`
- "Talk to us first" secondary text link

### `FutureSection.tsx` — `"use client"`

- 6-card product roadmap grid (3→2→1 cols):
  1. Website — **Live** badge (brand color)
  2. Local SEO — Coming Soon
  3. Reviews — Coming Soon
  4. Google Business — Coming Soon
  5. AI Agents — Coming Soon
  6. CRM — Coming Soon
- "Coming Soon" cards use muted icon colors and 70% opacity
- Live card uses brand-muted icon badge

### `FounderSection.tsx` — `"use client"`

- Section `id="about"` for navbar anchor
- 2-column split layout (1 col on mobile):
  - **Left:** Large portrait placeholder card (`w-80 h-96`) with brand gradient, circle placeholder for portrait, subtle geometric decoration, floating accent square
  - **Right:** Veteran-Owned badge (Shield icon + text), large bold headline, 2 paragraphs of founder copy, arrow link to `#contact`
- Slide-in from left/right on scroll

### `FAQSection.tsx` — `"use client"`

- 6-item accordion in a white card
- Questions: What is Webpresa? / Do I own my domain? / Can I request changes? / Is hosting included? / What happens after 12 months? / Can you redesign my existing website?
- Per-item open/close state via `useState`
- Smooth height animation using Framer Motion `AnimatePresence` with `height: 0 → "auto"`
- Plus/Minus Lucide icons toggle on open/close

### `CTASection.tsx` — `"use client"`

- Section `id="contact"` — the placeholder target for all CTAs across the page
- Full-width brand gradient card (`from-brand to-brand-light`) inside a white section
- Decorative semi-transparent circles
- Large white headline
- Two buttons: "Get My Website" (accent gold) + "See Examples" (white/10 ghost)
- Email link: `hello@webpresa.com`

### `Footer.tsx` — server component

- `#FAFAFA` background, top border
- 3-column grid: Brand column (logo, tagline, Veteran-Owned badge) + 2 link columns
- **Company links:** How It Works, Pricing, About
- **Resources links:** Privacy Policy, Terms of Service, Contact — all point to `#contact`
- Bottom bar: © 2026 Webpresa · tagline

---

## 5. Page Composition

`app/page.tsx` rewritten to compose all sections in order:

```
Navbar
└── main#main-content
    ├── Hero
    ├── ProblemSection
    ├── HowItWorks
    ├── ExamplesSection
    ├── FeaturesSection
    ├── ComparisonSection
    ├── PricingSection
    ├── FutureSection
    ├── FounderSection
    ├── FAQSection
    └── CTASection
Footer
```

---

## 6. TypeScript Fix

Framer Motion's `Variants` type requires `ease` to be the `Easing` union type, not `string` or `number[]`. Two patterns triggered this:

- **Custom bezier arrays** `[0.22, 1, 0.36, 1]` were inferred as `number[]` → replaced with `"easeOut"` via `sed` across all components
- **Function variant members** (e.g., `visible: (i) => ({...})`) caused TypeScript to widen `"easeOut"` to `string` — fixed by adding `as const` in the two affected Variants definitions (`fadeUp` in Hero, `cardVariants` in ProblemSection)

---

## 7. Build Result

```
✓ Compiled successfully in 14.1s
✓ Finished TypeScript in 7.4s
✓ Collecting page data using 3 workers
✓ Generating static pages (4/4)
✓ Finalizing page optimization

Route (app)
┌ ○ /
└ ○ /_not-found

○ (Static) prerendered as static content
```

Zero errors. The homepage is statically prerendered — no server-side data fetching.

---

## 8. Design Decisions

| Decision | Rationale |
|---|---|
| Tailwind v4 `@theme` for brand tokens | Project uses Tailwind v4 (CSS-first config) — no `tailwind.config.js` exists or is needed |
| No shadcn/ui CLI initialization | Tailwind v4 + shadcn requires specific setup; hand-crafted Button/Accordion patterns used instead |
| `"use client"` only where needed | Navbar, animated sections hydrate on the client; static layout components (FeaturesSection, Footer) remain server-rendered |
| JSX hero mockup (no images) | Avoids placeholder image dependencies; the fake website is constructed entirely from divs |
| All CTAs → `#contact` | Placeholder per spec — points to the CTASection until a real form/route exists |
| `"easeOut" as const` in Variants | Framer Motion's `Easing` type is a string literal union, not `string` — `as const` prevents TypeScript from widening the type |

---

## 9. Files Changed / Created

```
webpresa/web/
├── app/
│   ├── globals.css              MODIFIED — brand tokens, scroll-behavior
│   ├── layout.tsx               MODIFIED — metadata
│   ├── page.tsx                 REPLACED — now composes all sections
│   └── components/              NEW DIRECTORY
│       ├── Navbar.tsx
│       ├── Hero.tsx
│       ├── ProblemSection.tsx
│       ├── HowItWorks.tsx
│       ├── ExamplesSection.tsx
│       ├── FeaturesSection.tsx
│       ├── ComparisonSection.tsx
│       ├── PricingSection.tsx
│       ├── FutureSection.tsx
│       ├── FounderSection.tsx
│       ├── FAQSection.tsx
│       ├── CTASection.tsx
│       └── Footer.tsx
├── lib/
│   └── utils.ts                 NEW — cn() utility
├── docs/
│   └── build_log.md             NEW — this file
└── package.json                 MODIFIED — 4 new dependencies
```

---

## 10. Next Steps (not yet built)

- Replace `#contact` placeholder links with a real contact form, route (`/contact`), or external form URL (Typeform, etc.)
- Replace portrait placeholder in `FounderSection` with an actual photo
- Add real example screenshots once client sites are live
- Wire up nav anchor links with proper `id` attributes on each section (already set on `#how-it-works`, `#examples`, `#pricing`, `#about`, `#contact`)
- Implement dark mode (CSS variables are already structured for it in `globals.css`)
- Add `robots.txt` and `sitemap.xml` for production SEO

---

---

# Webpresa — GTM Repositioning & Homepage Refinement

**Date:** 2026-07-10  
**Scope:** Strategic messaging overhaul + two new sections + visual polish pass

---

## Overview

Repositioned the entire homepage around Webpresa's actual go-to-market strategy: direct-mail postcards. Visitors arrive having already received a postcard with a QR code — they are verifying legitimacy and deciding whether to claim a preview site that may already be built for them. All copy, CTAs, section order, and new sections were updated to support this flow. Visual depth (alternating backgrounds, subtle gradients, improved mockups) was improved throughout. No redesign of the overall component architecture or visual identity.

---

## 1. Messaging Changes

| Element | Before | After |
|---|---|---|
| Hero badge | "Website as a Service for Local Business" | "Managed Website Service for Local Businesses" |
| Hero headline | "Your online presence, automated." | "We replace outdated websites for local businesses." |
| Hero subhead | Agency/automation framing | "A professional, managed website — built, hosted, and maintained for you. Everything included. No agency process required." |
| Primary CTA (all) | "Get My Website" | "Claim Your Website" |
| Secondary CTA | "See Examples" → `#examples` | "See How It Works" → `#how-it-works` |
| Trust items | "No design skills required / Hosting included / Maintenance handled" | "Hosting included / Unlimited updates / No technical skills needed" |
| How It Works headline | "Simple. Professional. Done." | "An effortless process, start to finish." |
| How It Works steps | "We Learn / We Build / We Keep It Working" | "Tell Us About Your Business / We Prepare Your Website / We Keep It Running" |
| Features headline | "One subscription. Everything you need." | "One plan. Everything managed." |
| Features column names | "Website / SEO / Management" | "Your Website / Search & Visibility / Ongoing Management" |
| Comparison headline | "Why Webpresa makes sense." | "A simpler path to a professional website." |
| CTA headline | "Your business deserves a better online presence." | "Ready to see what your website could look like?" |
| Future section headline | "More than a website." | "Your website is just the beginning." |
| Problem section headline | *(existing)* | "An outdated website costs you more than you think." |

**Words removed throughout:** custom, handcrafted, dedicated designer, consultation, automated  
**Words added throughout:** professional, managed, ready, included, maintained, hosted, reliable, simple, everything handled

---

## 2. New Sections

### `WhyStartFromScratch.tsx` — `"use client"`

New section placed after ProblemSection:

- Headline: "Why start from scratch?"
- Supporting copy about outdated websites
- Side-by-side browser mockup comparison:
  - **Before:** simulated outdated website (grey tones, table-style layout, no mobile consideration) with 3 red-dot bullet problems
  - **After:** modern brand-gradient website mockup with 3 green-dot bullet wins
- Arrow between mockups (inline on desktop, rotated 90° below the first on mobile)
- Both mockups are pure JSX — no images
- Section background: `bg-white`

### `PreviewSection.tsx` — `"use client"`

New section placed after HowItWorks; targets postcard recipients directly:

- Navy gradient background (`from-[#0c3245] via-[#11455E] to-[#1a5f80]`) with subtle amber radial overlay
- Headline: "Sometimes we build your website before you ask."
- Copy explains the postcard-preview model — tasteful and confident, not spammy
- Left column: browser mockup showing a preview page with an amber "Preview — not yet published" badge
- Right column: "For Postcard Recipients" badge, headline, two copy paragraphs
- CTAs: "View My Preview" (accent gold) + "How It Works" (ghost white)

---

## 3. Existing Components Updated

| Component | Change |
|---|---|
| `Hero.tsx` | All copy updated; added postcard note: "Received a postcard? Your preview may already be ready." with link |
| `HowItWorks.tsx` | Steps rewritten; added subtitle paragraph; background changed to `#F8FAFC` |
| `ProblemSection.tsx` | Headline and all four card descriptions sharpened |
| `ExamplesSection.tsx` | Replaced flat gradient preview cards with full browser mockups (chrome + nav + hero + service cards + star rating); added real business names and industry badges; gap increased to `gap-8`; section now `#F8FAFC` |
| `FeaturesSection.tsx` | Background `bg-white` → `bg-[#F8FAFC]`; "custom" language removed; column names updated |
| `ComparisonSection.tsx` | Background `bg-[#FAFAFA]` → `bg-white` |
| `PricingSection.tsx` | Background `bg-white` → `bg-[#F8FAFC]`; "custom-designed" → "managed"; "Dedicated support" → "Priority support"; CTA → "Claim Your Website" |
| `CTASection.tsx` | Headline and sub-copy updated for postcard context; CTA → "Claim Your Website" |
| `FutureSection.tsx` | Removed "AI Agents" card (contradicts no-AI positioning); replaced with "Reputation" (automated review requests); headline updated |
| `FAQSection.tsx` | Added first FAQ: "I received a postcard. What does that mean?"; "redesign" → "replace" throughout |
| `FounderSection.tsx` | Background `bg-white` → `bg-[#F8FAFC]` for alternating rhythm |
| `Navbar.tsx` | Both desktop and mobile CTAs → "Claim Your Website" |

---

## 4. Page Flow — Updated

```
Navbar
└── main#main-content
    ├── Hero                    bg-white
    ├── ProblemSection          bg-[#F8FAFC]
    ├── WhyStartFromScratch     bg-white          ← NEW
    ├── HowItWorks              bg-[#F8FAFC]
    ├── PreviewSection          bg navy gradient  ← NEW
    ├── ExamplesSection         bg-[#F8FAFC]
    ├── FeaturesSection         bg-[#F8FAFC]
    ├── ComparisonSection       bg-white
    ├── PricingSection          bg-[#F8FAFC]
    ├── FounderSection          bg-[#F8FAFC]
    ├── FutureSection           bg-[#FAFAFA]
    ├── FAQSection              bg-[#FAFAFA]
    └── CTASection              bg brand gradient
Footer                          bg dark
```

---

## 5. Runtime Fixes

**Image Optimization error (`next.config.ts`):**  
Added `images: { unoptimized: true }` — required because `output: 'export'` disables the Next.js Image Optimization API; static exports need unoptimized images.

**Next.js Image aspect-ratio warning (`Navbar.tsx`):**  
Added `style={{ width: "auto" }}` to the `<Image>` component — when CSS overrides one dimension (via `h-8`), Next.js requires the other to be explicitly set to `"auto"`.

---

## 6. Files Created / Modified

```
web/
├── app/
│   ├── page.tsx                       MODIFIED — new section order + 2 new imports
│   └── components/
│       ├── Navbar.tsx                 MODIFIED — CTA text, style={{ width: "auto" }}
│       ├── Hero.tsx                   MODIFIED — full copy rewrite + postcard note
│       ├── ProblemSection.tsx         MODIFIED — headline + card copy
│       ├── HowItWorks.tsx             MODIFIED — steps rewrite + bg change
│       ├── WhyStartFromScratch.tsx    NEW — before/after browser mockup section
│       ├── PreviewSection.tsx         NEW — postcard-recipient preview section
│       ├── ExamplesSection.tsx        MODIFIED — full browser mockup redesign
│       ├── FeaturesSection.tsx        MODIFIED — copy + bg change
│       ├── ComparisonSection.tsx      MODIFIED — bg change + headline
│       ├── PricingSection.tsx         MODIFIED — copy + bg change
│       ├── CTASection.tsx             MODIFIED — headline + copy
│       ├── FutureSection.tsx          MODIFIED — removed AI Agents, headline
│       ├── FAQSection.tsx             MODIFIED — postcard FAQ added
│       └── FounderSection.tsx         MODIFIED — bg change
└── next.config.ts                     MODIFIED — images: { unoptimized: true }
```

---

---

# Stage 5 — Domain Data Model

**Date:** 2026-07-10  
**Scope:** Canonical TypeScript models, Zod schemas, factories, and tests. No database infrastructure.

---

## Overview

Created the complete domain data layer for the Webpresa platform. Pure TypeScript — no AWS, no React, no Next.js dependencies. All application code in subsequent stages imports from `@/domain/models`, `@/domain/schemas`, and `@/domain/factories`.

**Note on location:** Files live at `web/domain/` (not `web/src/domain/`) because the existing `tsconfig.json` path alias `@/*` → `./` requires domain files directly under the web root to resolve as `@/domain/…`.

---

## 1. Dependencies Installed

```bash
npm install zod@^3.22.0
npm install -D vitest@^3.0.0
```

| Package | Version installed | Purpose |
|---|---|---|
| `zod` | 3.25.76 | Runtime validation — all domain record validation |
| `vitest` | 3.2.7 | Test runner — domain model test suite |

Scripts added to `web/package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## 2. Constants

### `domain/constants/industries.ts`

Single source of truth for all canonical industry values. TypeScript union type and Zod enum both derive from this one array.

```typescript
export const INDUSTRIES = [
  'plumbing', 'hvac', 'electrical', 'roofing', 'landscaping',
  'painting', 'cleaning', 'restaurant', 'bakery', 'salon',
  'law_firm', 'accounting',
] as const;

export type Industry = (typeof INDUSTRIES)[number];
```

---

## 3. Models (`domain/models/`)

Pure TypeScript interfaces — no runtime dependencies.

| File | Exports |
|---|---|
| `common.ts` | `Address`, `TimestampedRecord`, `MutableTimestampedRecord` |
| `business.ts` | `Business`, `BUSINESS_STATUSES`, `BUSINESS_SOURCES`, `BusinessStatus`, `BusinessSource`, `BusinessScores` |
| `site-preview.ts` | `SitePreview`, `SITE_PREVIEW_STATUSES`, `SitePreviewStatus`, `PreviewContent`, `PreviewHero`, `PreviewService`, `PreviewContact`, `PreviewTheme`, `GenerationMetadata` |
| `scan-event.ts` | `ScanEvent`, `SCAN_STATUSES`, `ScanStatus`, `ScanScores`, `ScanStorageKeys` |
| `postcard.ts` | `Postcard`, `POSTCARD_STATUSES`, `POSTCARD_PROVIDERS`, `PostcardStatus`, `PostcardProvider` |
| `index.ts` | Re-exports all of the above |

**Key design decisions:**
- All main records extend `MutableTimestampedRecord` — `createdAt` and `updatedAt` are inherited, not redeclared
- `Business.websiteUrl` and `Business.googlePlaceId` are explicitly optional — a Business is valid without either
- `SitePreview.version` is a monotonically increasing integer — regeneration creates a new record with `version + 1`, old previews are never overwritten
- `PreviewContent` has no arbitrary keys — AI output must conform to this exact shape before storage
- No secrets, API keys, or credentials on any model

---

## 4. Schemas (`domain/schemas/`)

Zod schemas for runtime validation. Schemas import status/source arrays from models (not the reverse) — models remain Zod-free.

| File | Key schemas |
|---|---|
| `common.schema.ts` | `AddressSchema`, `IsoTimestampSchema` (`z.string().datetime()`), `ScoreSchema` (`z.number().int().min(0).max(100)`) |
| `business.schema.ts` | `BusinessSchema` — `businessId` validated against `/^biz_[uuid]$/`; `z.enum(INDUSTRIES/BUSINESS_STATUSES/BUSINESS_SOURCES)` |
| `site-preview.schema.ts` | `SitePreviewSchema`, `PreviewContentSchema` — strict length limits on all AI-generated text fields; `version: z.number().int().min(1)` |
| `scan-event.schema.ts` | `ScanEventSchema` — `sourceUrl: z.string().url()`; ScoreSchema on all score fields |
| `postcard.schema.ts` | `PostcardSchema` — `qrDestination: z.string().url()`; prefix regex on `postcardId` |
| `index.ts` | Barrel export |

---

## 5. Factories (`domain/factories/`)

| File | Function | Initial status | Notes |
|---|---|---|---|
| `utils.ts` | `generateId(prefix)`, `nowIso()` | — | `crypto.randomUUID()` global — no polyfill needed in Node 14.17+ |
| `business.factory.ts` | `createBusiness(input)` | `'pending'` | Auto-slugifies name via `slugify()` if no slug provided |
| `site-preview.factory.ts` | `createSitePreview(input)` | `'draft'` | Accepts `previousVersion?` — sets `version = (previousVersion ?? 0) + 1`; always generates new `previewId` |
| `scan-event.factory.ts` | `createScanEvent(input)` | `'pending'` | Sets `startedAt` to current time |
| `postcard.factory.ts` | `createPostcard(input)` | `'pending'` | — |
| `index.ts` | Barrel export | — | — |

All factories call `Schema.parse()` before returning — invalid input throws a `ZodError`.

ID prefixes: `biz_` · `preview_` · `scan_` · `postcard_`

---

## 6. Tests

### `domain/__tests__/domain.test.ts` — 34 tests, all passing

| Group | Tests |
|---|---|
| Unique IDs | All 4 record types generate unique IDs across two calls |
| `createdAt` | All 4 record types have a truthy `createdAt` |
| `updatedAt` | All 4 mutable record types have `updatedAt` equal to `createdAt` on creation |
| Status validation | All 4 schemas reject invalid status strings |
| Score validation | Rejects > 100, < 0, and non-integers; accepts 0 and 100 |
| Business optional fields | Valid without `websiteUrl`; valid without `googlePlaceId`; valid without both simultaneously |
| AI content guard | Rejects missing `hero.headline`; rejects empty `services` array; rejects headline > 120 chars; rejects invalid hex theme colors |
| Versioning | First preview = version 1; regenerated = version 2 with new `previewId` and same `businessId`; 3-version chain works |
| ID prefix format | All 4 record types have the correct prefix |

### `vitest.config.ts`

```typescript
resolve: { alias: { '@': path.resolve(__dirname, '.') } }
```

Mirrors the tsconfig `@/*` alias so `@/domain/…` imports resolve correctly in test runs without the Next.js bundler.

---

## 7. Result

```
✓ TypeScript: 0 errors (npx tsc --noEmit)
✓ Lint: 0 errors (npm run lint)
✓ Tests: 34 passed (npm test)
✓ Build: production static export succeeds (npm run build)
```

---

## 8. Files Created / Modified

```
web/
├── domain/
│   ├── constants/
│   │   └── industries.ts              NEW
│   ├── models/
│   │   ├── common.ts                  NEW
│   │   ├── business.ts                NEW
│   │   ├── site-preview.ts            NEW
│   │   ├── scan-event.ts              NEW
│   │   ├── postcard.ts                NEW
│   │   └── index.ts                   NEW
│   ├── schemas/
│   │   ├── common.schema.ts           NEW
│   │   ├── business.schema.ts         NEW
│   │   ├── site-preview.schema.ts     NEW
│   │   ├── scan-event.schema.ts       NEW
│   │   ├── postcard.schema.ts         NEW
│   │   └── index.ts                   NEW
│   ├── factories/
│   │   ├── utils.ts                   NEW
│   │   ├── business.factory.ts        NEW
│   │   ├── site-preview.factory.ts    NEW
│   │   ├── scan-event.factory.ts      NEW
│   │   ├── postcard.factory.ts        NEW
│   │   └── index.ts                   NEW
│   └── __tests__/
│       └── domain.test.ts             NEW
├── vitest.config.ts                   NEW
└── package.json                       MODIFIED — zod, vitest, test scripts
```

---

---

# Stage 6 — AWS CDK Infrastructure

**Date:** 2026-07-11  
**Scope:** DynamoDB data layer deployed to development AWS account via CDK. No application logic.

---

## Overview

Created a standalone CDK TypeScript project in `infra/` that provisions four DynamoDB tables in the `webpresa` development AWS account. Architecture is environment-aware — the same constructs deploy to production using `--context env=prod --profile webpresa-prod` without any code changes.

---

## 1. AWS Account & Deployment Details

| | |
|---|---|
| **Profile** | `webpresa` (SSO) |
| **Account ID** | `539898341083` |
| **Region** | `us-east-1` |
| **Stack name** | `WebpresaDevDataStack` |
| **Stack ARN** | `arn:aws:cloudformation:us-east-1:539898341083:stack/WebpresaDevDataStack/9abb40d0-7d1e-11f1-86b2-0affc428ba97` |
| **Bootstrap** | Completed — `CDKToolkit` stack created |

---

## 2. Infrastructure Architecture

```
EnvironmentConfig (dev / prod)
          ↓
WebpresaTable construct   ← reusable; encapsulates all common DynamoDB config
          ↓
WebpresaDataStack         ← single stack; one per environment
    ├── Businesses
    ├── SitePreviews
    ├── ScanEvents
    └── Postcards
```

---

## 3. Environment Configuration (`infra/lib/config/environments.ts`)

Both environments are defined in code. Only `dev` is deployed in Stage 6.

| Setting | dev | prod |
|---|---|---|
| Suffix | `dev` | `prod` |
| Billing mode | `PAY_PER_REQUEST` | `PAY_PER_REQUEST` |
| Point-in-time recovery | disabled | **enabled** |
| Deletion protection | disabled | **enabled** |
| Removal policy | `DESTROY` | `RETAIN` |

To deploy production (future):
```bash
cdk deploy WebpresaProdDataStack --context env=prod --profile webpresa-prod
```

---

## 4. Reusable `WebpresaTable` Construct (`infra/lib/constructs/webpresa-table.ts`)

Every table automatically gets:
- Full table name: `webpresa-{suffix}-{tableName}`
- Billing mode, encryption (AWS-managed), removal policy, PITR, deletion protection — all from `EnvironmentConfig`
- All GSIs with `ProjectionType.ALL`
- Two CloudFormation outputs: `TableName` and `TableArn`

Adding a future table requires only:
```typescript
new WebpresaTable(this, 'Claims', {
  config,
  tableName: 'claims',
  partitionKey: { name: 'claimId', type: STRING },
  globalSecondaryIndexes: [ ... ],
});
```

---

## 5. DynamoDB Tables Deployed

### `webpresa-dev-businesses`

| | |
|---|---|
| Partition key | `businessId` (S) |
| GSIs | `slug-index` (PK: slug) · `google-place-id-index` (PK: googlePlaceId) · `status-index` ⚠ |

### `webpresa-dev-site-previews`

| | |
|---|---|
| Partition key | `previewId` (S) |
| GSIs | `slug-index` (PK: slug) · `business-id-index` (PK: businessId, SK: createdAt) · `status-index` ⚠ |

### `webpresa-dev-scan-events`

| | |
|---|---|
| Partition key | `scanId` (S) |
| GSIs | `business-id-index` (PK: businessId, SK: createdAt) · `status-index` ⚠ |

### `webpresa-dev-postcards`

| | |
|---|---|
| Partition key | `postcardId` (S) |
| GSIs | `business-id-index` (PK: businessId, SK: createdAt) · `campaign-code-index` (PK: campaignCode) · `provider-postcard-id-index` (PK: providerPostcardId, sparse) · `status-index` ⚠ |

**createdAt sort key:** The `business-id-index` on SitePreviews, ScanEvents, and Postcards uses `createdAt` as the sort key, enabling chronological queries and newest-first pagination for all records belonging to one business.

**Sparse index:** `provider-postcard-id-index` only contains items where `providerPostcardId` is set (i.e. after submission to a mailing provider).

> ⚠ **Pre-production note — status GSIs:** `status` is a low-cardinality attribute (4–6 values). At production write volumes, a GSI with a low-cardinality partition key creates hot partitions. These indexes must be reassessed before production deployment. Options: filter expressions on a higher-cardinality index, composite keys (`status#YYYY-MM`), or DynamoDB Streams.

---

## 6. CloudFormation Outputs

| Export name | Value |
|---|---|
| `webpresa-dev-businesses-name` | `webpresa-dev-businesses` |
| `webpresa-dev-businesses-arn` | `arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-businesses` |
| `webpresa-dev-site-previews-name` | `webpresa-dev-site-previews` |
| `webpresa-dev-site-previews-arn` | `arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-site-previews` |
| `webpresa-dev-scan-events-name` | `webpresa-dev-scan-events` |
| `webpresa-dev-scan-events-arn` | `arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-scan-events` |
| `webpresa-dev-postcards-name` | `webpresa-dev-postcards` |
| `webpresa-dev-postcards-arn` | `arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-postcards` |

---

## 7. Tags Applied to All Resources

| Tag | Value |
|---|---|
| `Project` | `Webpresa` |
| `Environment` | `Dev` (or `Prod` for the production stack) |
| `ManagedBy` | `CDK` |

Tags are applied inside `WebpresaDataStack` via `cdk.Tags.of(this)` — they propagate to all resources and appear in test synthesis without needing to pass them as `StackProps`.

---

## 8. Tests (`infra/test/data-stack.test.ts`) — 26 tests, all passing

| Group | Tests |
|---|---|
| Table count | 4 tables created |
| Billing mode | PAY_PER_REQUEST (dev + prod) |
| Partition keys | All 4 tables |
| GSI names | All expected indexes per table |
| `createdAt` sort key | SitePreviews, ScanEvents, Postcards `business-id-index` each have `createdAt` as `RANGE` key |
| Businesses has no `business-id-index` | Verified |
| Dev removal policy | `DeletionPolicy: Delete` + `UpdateReplacePolicy: Delete` |
| CloudFormation outputs | Exactly 8 outputs |
| Tags | Project / Environment / ManagedBy on all tables |
| Prod config (in-memory) | `DeletionPolicy: Retain`, PITR enabled, `prod` suffix on all table names, `Environment=Prod` tag |
| GSI projection | All GSIs use `ProjectionType.ALL` |

No AWS credentials required — CDK assertion tests synthesize in memory via `Template.fromStack()`.

---

## 9. CDK App Entry Point

```typescript
// infra/bin/webpresa.ts
const envName = app.node.tryGetContext('env') ?? 'dev';
const config = getEnvironmentConfig(envName);
const label = envName[0].toUpperCase() + envName.slice(1); // 'Dev' | 'Prod'

new WebpresaDataStack(app, `Webpresa${label}DataStack`, { config, env: {...} });
```

Stack name is derived at runtime: `WebpresaDevDataStack` or `WebpresaProdDataStack`.

---

## 10. Result

```
✓ Tests: 26 passed (npm test)
✓ Synth: WebpresaDevDataStack template generated, no errors
✓ Bootstrap: CDKToolkit created in 539898341083 / us-east-1
✓ Deploy: WebpresaDevDataStack deployed in 60.6s
```

---

## 11. Files Created

```
infra/
├── bin/
│   └── webpresa.ts                    NEW — CDK app entry point
├── lib/
│   ├── config/
│   │   └── environments.ts            NEW — dev + prod EnvironmentConfig
│   ├── constructs/
│   │   └── webpresa-table.ts          NEW — reusable DynamoDB construct
│   └── stacks/
│       └── data-stack.ts              NEW — WebpresaDataStack
├── test/
│   └── data-stack.test.ts             NEW — 26 CDK assertion tests
├── cdk.json                           NEW — CDK app config
├── package.json                       NEW — aws-cdk-lib, constructs, vitest
├── tsconfig.json                      NEW — CommonJS target for CDK
├── vitest.config.ts                   NEW — test runner config
└── .gitignore                         NEW
```


---

# Stage 7 — Manual Admin Dashboard

**Date:** 2026-07-12  
**Scope:** Protected admin dashboard with sign-in, business CRUD, server-side DynamoDB repositories, and route protection.

---

## Overview

Built the full manual admin dashboard.  No new AWS infrastructure was provisioned — the existing four DynamoDB tables from Stage 6 are reused.  Key changes: removed `output: 'export'` (static export incompatible with Server Actions / proxy.ts), added JWT-based authentication, created server-only DynamoDB repositories, and implemented full Business CRUD.

---

## 1. Dependencies Installed

```bash
npm install jose server-only @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb bcryptjs
npm install --save-dev @types/bcryptjs
```

| Package | Purpose |
|---|---|
| `jose` | JWT session signing and verification |
| `server-only` | Build-time guard — throws if a server module is imported in a client bundle |
| `@aws-sdk/client-dynamodb` | DynamoDB low-level client |
| `@aws-sdk/lib-dynamodb` | DynamoDB DocumentClient (marshals JS objects to/from DynamoDB format) |
| `bcryptjs` | Admin password hashing — pure JS, no native deps |
| `@types/bcryptjs` | TypeScript definitions for bcryptjs |

---

## 2. Config Changes

### `next.config.ts`

Removed `output: 'export'`.  Server Actions and `proxy.ts` are incompatible with static export.  Homepage pages are still statically prerendered by Next.js at build time (`○` routes).

### `amplify.yml`

Changed `artifacts.baseDirectory` from `out` to `.next`.  The Amplify app must be switched to **Next.js SSR** platform in the Amplify Console before the next production build.  See `deployment.md` for step-by-step instructions.

---

## 3. Authentication

### `web/lib/auth/session.ts` — `server-only`

- JWT signed with HS256 using `jose`
- 7-day expiry, HTTP-only cookie (`SameSite=lax`)
- Cookie is `Secure` in production only
- Functions: `encryptSession`, `decryptSession`, `createSession`, `getSession`, `deleteSession`

### `web/lib/auth/actions.ts` — `'use server'`

- `signIn`: validates FormData against Zod schema, compares username with `timingSafeEqual`, verifies password with `bcrypt.compare`, creates session, redirects
- `signOut`: deletes session cookie, redirects to sign-in
- Always runs bcrypt on the supplied password even for invalid usernames (prevents timing-based username enumeration)

### `web/proxy.ts` (replaces `middleware.ts` — renamed in Next.js 16)

- Runs on all `/admin/:path*` requests
- Decrypts session cookie
- Unauthenticated → redirect to `/admin/sign-in?next=<path>`
- Authenticated on sign-in page → redirect to `/admin/businesses`

---

## 4. DynamoDB Repositories

All files in `web/lib/db/` import `server-only`.

| File | Key functions |
|---|---|
| `client.ts` | `getDynamoDBClient()` singleton; `TABLE_*` accessors reading env vars |
| `businesses.ts` | `listBusinesses` (scan + cursor pagination), `getBusinessById`, `getBusinessBySlug`, `putBusiness`, `updateBusiness`, `resolveUniqueSlug` |
| `site-previews.ts` | `getSitePreviewById`, `listPreviewsForBusiness`, `putSitePreview` |
| `scan-events.ts` | `getScanEventById`, `listScansForBusiness`, `putScanEvent` |
| `postcards.ts` | `getPostcardById`, `listPostcardsForBusiness`, `putPostcard` |

All repositories re-validate records through Zod schemas before writes.  Pagination uses DynamoDB `LastEvaluatedKey` encoded as a base64url JSON cursor.

---

## 5. Admin Routes

### Route structure

```
app/
  admin/
    sign-in/
      page.tsx        → /admin/sign-in  (public — root layout only)
    (dashboard)/      ← route group; shared admin layout
      layout.tsx      → sidebar + sign-out; server component reads session
      page.tsx        → /admin → redirect to /admin/businesses
      businesses/
        page.tsx      → /admin/businesses (list)
        new/
          page.tsx    → /admin/businesses/new (create form)
        [businessId]/
          page.tsx    → /admin/businesses/[id] (detail)
          edit/
            page.tsx  → /admin/businesses/[id]/edit (edit form)
      previews/
        page.tsx      → /admin/previews (placeholder)
      scans/
        page.tsx      → /admin/scans (placeholder)
      postcards/
        page.tsx      → /admin/postcards (placeholder)
```

### Admin layout

Server component.  Reads session and redirects if missing (defense-in-depth behind proxy.ts).  Shows: brand, nav links, signed-in username, sign-out button.

### Business list (`/admin/businesses`)

- Scans the businesses table with cursor pagination (50 per page)
- Table: name + city/state, industry, status badge, source, created date
- Links to detail page; "New business" button
- Error and empty states handled

### Business detail (`/admin/businesses/[businessId]`)

- Shows all available fields: identity, contact, address, scores, Stripe IDs, timestamps
- Preview, scan, and postcard history (newest-first; shows last 3 per category)
- "Edit" button; disabled/placeholder action bar for future stages

### Business form (shared `BusinessForm.tsx` — `'use client'`)

- `useActionState` for server action integration + `useFormStatus` for submit button pending state
- Sections: Identity, Contact (phone, email, website, Google Place ID), Address, Admin (source, status on edit)
- Inline field errors from Zod
- URL normalization: `https://` prepended before validation so users can type without scheme

### Server actions (`businesses/actions.ts` — `'use server'`)

- `createBusinessAction`: validates → resolves unique slug → creates record via factory → persists → redirects
- `editBusinessAction`: validates → loads existing record → merges → validates full record → persists → redirects
- Both independently verify admin session before any DB call

---

## 6. Tests

### `web/lib/db/__tests__/businesses.test.ts` — 14 tests

DynamoDB client mocked with `vi.mock`.  Covers: `getBusinessById` (found / not found / invalid record), `getBusinessBySlug`, `putBusiness` (valid / invalid), `resolveUniqueSlug` (free / taken / multi-suffix), `listBusinesses` (no cursor / with cursor), `updateBusiness` (success / not found).

### `web/app/admin/(dashboard)/businesses/__tests__/actions.test.ts` — 12 tests

DB and auth mocked with `vi.hoisted` (required for vitest hoisting of `vi.mock`).  Covers: `createBusinessAction` — validation errors (name / industry / email / URL), success flow (saves correct record / URL normalization / slug resolution), auth guard, DB failure.  `editBusinessAction` — success flow, not-found, auth guard.

---

## 7. Verification Results

```
✓ Lint:        0 errors  (npm run lint)
✓ TypeCheck:   0 errors  (npx tsc --noEmit)
✓ Tests:       60 passed — 34 domain + 14 DB + 12 actions  (npm test)
✓ Build:       production build succeeds  (npm run build)
✓ CDK tests:   26 passed  (cd infra && npm test)
✓ CDK synth:   WebpresaDevDataStack synthesises cleanly
```

Build output:
```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /admin
├ ƒ /admin/businesses
├ ƒ /admin/businesses/[businessId]
├ ƒ /admin/businesses/[businessId]/edit
├ ƒ /admin/businesses/new
├ ƒ /admin/postcards
├ ƒ /admin/previews
├ ƒ /admin/scans
└ ○ /admin/sign-in

ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

---

## 8. Files Created / Modified

```
webpresa/
├── amplify.yml                                                  MODIFIED
└── web/
    ├── next.config.ts                                           MODIFIED — removed output: 'export'
    ├── proxy.ts                                                 NEW — route protection
    ├── .env.local.example                                       NEW — env var documentation
    ├── lib/
    │   ├── auth/
    │   │   ├── session.ts                                       NEW
    │   │   └── actions.ts                                       NEW
    │   └── db/
    │       ├── client.ts                                        NEW
    │       ├── businesses.ts                                     NEW
    │       ├── site-previews.ts                                 NEW
    │       ├── scan-events.ts                                   NEW
    │       ├── postcards.ts                                     NEW
    │       └── __tests__/
    │           └── businesses.test.ts                          NEW
    ├── app/
    │   └── admin/
    │       ├── sign-in/
    │       │   └── page.tsx                                     NEW
    │       └── (dashboard)/
    │           ├── layout.tsx                                   NEW
    │           ├── page.tsx                                     NEW
    │           ├── businesses/
    │           │   ├── page.tsx                                 NEW
    │           │   ├── BusinessForm.tsx                        NEW
    │           │   ├── actions.ts                              NEW
    │           │   ├── new/
    │           │   │   └── page.tsx                            NEW
    │           │   ├── [businessId]/
    │           │   │   ├── page.tsx                            NEW
    │           │   │   └── edit/
    │           │   │       └── page.tsx                        NEW
    │           │   └── __tests__/
    │           │       └── actions.test.ts                     NEW
    │           ├── previews/
    │           │   └── page.tsx                                NEW
    │           ├── scans/
    │           │   └── page.tsx                                NEW
    │           └── postcards/
    │               └── page.tsx                                NEW
    └── docs/
        ├── build_log.md                                        MODIFIED
        ├── architecture.md                                     MODIFIED
        └── deployment.md                                       MODIFIED
```

---

## 9. Deployment Gate

**Not deployed.**  The following is required before the next production build can succeed:

1. Switch the Amplify app from "Static web hosting" to "Next.js SSR" platform in the Amplify Console.
2. Add environment variables: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `AWS_REGION`, `BUSINESSES_TABLE_NAME`, `SITE_PREVIEWS_TABLE_NAME`, `SCAN_EVENTS_TABLE_NAME`, `POSTCARDS_TABLE_NAME`.
3. Attach an IAM policy to the Amplify execution role granting DynamoDB read/write on the four dev tables.
4. Explicit approval required before running `amplify push` or triggering a manual build.

See `deployment.md` for detailed steps.


---

# Hosting Migration — Amplify to Vercel

**Date:** 2026-07-12
**Scope:** Replace AWS Amplify hosting with Vercel. No application code changes.

## Reason

AWS Amplify WEB_COMPUTE (SSR) requires a platform-specific deployment adapter that
generates a deploy-manifest.json file. With a custom amplify.yml and a Next.js 16
app, Amplify did not automatically inject the NEXT_ADAPTER_PATH environment variable
needed to produce this file. Multiple attempts to configure the artifacts directory
(.next, .amplify-hosting) all failed with the same error. Vercel natively supports
Next.js 16 SSR with zero configuration beyond a rootDirectory setting.

## Files changed

| File | Change |
|---|---|
| amplify.yml | Deleted |
| vercel.json | Created -- { "rootDirectory": "web" } |
| web/lib/db/client.ts | Comment updated (IAM role -> IAM user for Vercel) |
| web/.env.local.example | Added AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY fields |
| web/docs/architecture.md | Replaced Amplify references with Vercel; fixed scrypt command |
| web/docs/deployment.md | Replaced Amplify section with Vercel + IAM user setup |
| web/docs/implementation.md | Stage 4 marked superseded; global rules updated |

## Pending action (before first Vercel deploy)

1. Create IAM user webpresa-vercel-dev with inline DynamoDB policy (see deployment.md)
2. Import GitHub repo at vercel.com/new, set root directory to web
3. Add all environment variables in Vercel dashboard
4. Connect production domain


---

# Stage 8B — Premium Generated Website Template

**Date:** 2026-07-12
**Scope:** Replace monolithic LocalBusinessTemplate with a componentized, premium local-service website template. Extend PreviewContent and PreviewTheme schemas with optional fields. Update seed data generator with industry-specific content.

## Schema extensions (backward-compatible, all optional)

| Addition | Type | Location |
|---|---|---|
| `PreviewContent.serviceAreas` | `string[]` | Cities/areas served |
| `PreviewContent.differentiators` | `{ title, description }[]` | Why-choose-us bullets |
| `PreviewContent.hours` | `string` | Formatted hours display string |
| `PreviewTheme.heroImageUrl` | `string` | Hero background image URL |
| `PreviewTheme.aboutImageUrl` | `string` | About/team image URL |

Existing DynamoDB records remain valid — all new fields are optional.

## Component architecture

`app/b/[slug]/LocalBusinessTemplate.tsx` deleted.
`app/b/[slug]/template/` created with 11 components:

| Component | Role |
|---|---|
| `tokens.ts` | `buildSiteTokens()` helper — sets `--site-primary`, `--site-accent` CSS vars |
| `GeneratedSiteHeader` | Sticky nav with mobile hamburger, phone pill, quote CTA |
| `GeneratedHero` | 88vh full-viewport, `next/image` background, gradient overlay |
| `TrustStrip` | Compact factual-only trust badges (no invented credentials) |
| `ServicesGrid` | Asymmetric layout: featured first card + smaller card grid |
| `WhyChooseUs` | 2-col image + differentiator list (conditional — hidden when no data) |
| `AboutSection` | Tagline + story with decorative accent block |
| `ServiceAreaSection` | Pill grid (conditional) |
| `ContactSection` | Phone/email/address cards |
| `FinalCTA` | Full-width brand-color CTA band |
| `GeneratedSiteFooter` | Full footer with services, areas, copyright |
| `MobileCallBar` | Sticky bottom bar on mobile only (hidden at md+) |

## Seed data

`createSeedPreviewAction` updated with industry-specific fixtures for `plumbing`, `hvac`, `roofing`, `landscaping`. Other industries fall back to generic 4-service seed. All fixtures marked `DEV_FIXTURE`; images from `picsum.photos`.

`next.config.ts` updated with `remotePatterns` for `picsum.photos` and `images.unsplash.com`.

## Verification

```
Lint: 0 errors
TypeCheck: 0 errors
Tests: 69 passed
Build: clean — /b/[slug] renders as ƒ (dynamic SSR)
```

---

# Cascade Delete — Business Admin

**Date:** 2026-07-12
**Scope:** Allow admins to permanently delete a business and all downstream records from the admin dashboard.

## New functions

| Function | File |
|---|---|
| `deleteBusinessById` | `lib/db/businesses.ts` |
| `deletePreviewById` | `lib/db/site-previews.ts` |
| `deleteScanEventById` | `lib/db/scan-events.ts` |
| `deletePostcardById` | `lib/db/postcards.ts` |
| `deleteBusinessAction` | `app/admin/(dashboard)/businesses/[businessId]/actions.ts` |

## Cascade delete flow

1. Fetch all SitePreviews, ScanEvents, Postcards for the businessId (concurrent)
2. Delete all downstream records (concurrent)
3. Delete the business record
4. Redirect to `/admin/businesses`

## UI

`DeleteBusinessButton.tsx` — client component on the business detail page.
- Red "Delete" button alongside the Edit button
- Confirmation dialog shows exact counts of downstream records to be deleted
- Requires explicit confirmation before deletion proceeds
- Pending state shown during deletion

## Fix: server action binding

`createSeedPreviewAction` changed from accepting a full `Business` object to accepting only `businessId: string` (fetches business server-side). Passing large serialized objects through Next.js server action `.bind()` closure caused 500 errors on Vercel.

---

# IAM Fix — Add dynamodb:DeleteItem to webpresa-vercel-dev

**Date:** 2026-07-12
**Scope:** The `webpresa-vercel-dev` IAM user policy was missing `dynamodb:DeleteItem`, which caused `AccessDeniedException` when the cascade delete action ran on Vercel.

## Fix applied

```bash
aws iam put-user-policy \
  --user-name webpresa-vercel-dev \
  --policy-name webpresa-dev-dynamodb \
  --policy-document '{ ... "dynamodb:DeleteItem" added to Action list ... }' \
  --profile webpresa
```

`deployment.md` updated to include `dynamodb:DeleteItem` in the canonical policy block.

---

# Stage 9 — S3 Assets and Scan Storage

**Date:** 2026-07-12
**Scope:** Private, encrypted S3 bucket for scan artifacts, preview assets, and postcard files, plus a minimal server-side upload/download/signed-URL helper layer. No scan/screenshot/postcard workflow logic — that lands in Stages 13, 14, and 22.

## Overview

Provisioned a single environment-aware S3 bucket (`webpresa-{env}-assets`) via a new `WebpresaBucket` CDK construct, wired into the existing `WebpresaDataStack` alongside the four DynamoDB tables. Chose one bucket with key prefixes (`scans/`, `previews/`, `postcards/`) over three separate buckets — matches the exact key structure already documented in `implementation.md` and keeps IAM/lifecycle management centralized, confirmed with the user before implementation.

## 1. Infra changes (`infra/`)

### New construct — `infra/lib/constructs/webpresa-bucket.ts`

Mirrors `WebpresaTable`: takes `{ config, bucketName }`, computes `fullBucketName = webpresa-{suffix}-{bucketName}`, exposes `bucket` and `fullBucketName`.

Automatically configured per environment:

| Setting | dev | prod |
|---|---|---|
| Encryption | S3-managed (SSE-S3) | S3-managed (SSE-S3) |
| Public access | fully blocked | fully blocked |
| SSL enforcement | required | required |
| Versioning | disabled | **enabled** |
| Removal policy | DESTROY | RETAIN |
| Auto-delete objects | enabled (only safe when policy is DESTROY) | disabled |
| Lifecycle | abort incomplete multipart uploads after 7 days; expire `retain=false`-tagged objects after 90 days | same |

### `infra/lib/stacks/data-stack.ts`

Added one `WebpresaBucket` instance (`bucketName: 'assets'`) inline in the existing constructor. No new stack, no `bin/webpresa.ts` changes.

### IAM

Added a second inline policy (`webpresa-dev-s3-assets`) to the existing `webpresa-vercel-dev` IAM user: `GetObject`/`PutObject`/`DeleteObject`/`ListBucket` scoped to the assets bucket ARN and its objects. Documented (not created) that future Lambda roles for Stages 13/14/22 should get their own prefix-scoped policies instead of reusing this one.

### Tests — `infra/test/data-stack.test.ts` (extended)

Added a `describe('assets bucket', ...)` block: bucket count, naming, encryption, public-access block, SSL-enforcing bucket policy, both lifecycle rules, dev-vs-prod versioning and removal policy, tags. Updated the CloudFormation outputs count assertion from 8 to 10 (added `BucketName`/`BucketArn`).

## 2. Web application changes (`web/`)

### Dependencies

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### `web/lib/s3/client.ts` — `server-only`

Singleton `S3Client`, same region/credential-chain pattern as `web/lib/db/client.ts` (`AWS_REGION`, `AWS_PROFILE` locally, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` on Vercel). `getAssetsBucketName()` reads `ASSETS_BUCKET_NAME`, throwing if unset.

### `web/lib/s3/assets.ts` — `server-only`

Generic helpers, intentionally not tied to any one domain type:

- `putAsset(key, body, contentType)`
- `getAsset(key)` — returns `null` on `NoSuchKey`
- `getSignedAssetUrl(key, expiresInSeconds = 300)` — short-lived signed URL for private admin viewing

All three validate the key starts with `scans/`, `previews/`, or `postcards/` before calling S3.

### Tests — `web/lib/s3/__tests__/assets.test.ts`

8 tests, S3 client and presigner mocked (`vi.mock`, same pattern as `web/lib/db/__tests__/businesses.test.ts`). Covers: put success, get success, get-missing returns `null`, signed URL with custom and default expiry, invalid-prefix rejection on all three functions before any SDK call.

### Explicitly out of scope

- No changes to `ScanEvent`/`Postcard`/`SitePreview` domain models or Zod schemas — `ScanEvent.storageKeys` already exists and stays unpopulated until Stage 13/14; a `Postcard` creative-file field is deferred to Stage 22.
- `/admin/scans` and `/admin/postcards` remain placeholders.
- No Lambda functions or Step Functions (Stages 13–16).

### Env vars

Added `ASSETS_BUCKET_NAME=webpresa-dev-assets` to `.env.local.example`, reusing existing AWS credential vars.

## 3. Verification Results

```
✓ Infra tests:  41 passed (npm test) — 26 table tests + 15 new bucket tests
✓ Infra synth:  cdk synth --profile webpresa clean
✓ Web lint:     0 errors (npm run lint)
✓ Web typecheck: 0 errors (npx tsc --noEmit)
✓ Web tests:    77 passed (npm test) — includes 8 new S3 asset tests
✓ Web build:    production build succeeds (npm run build)
```

## 4. Files Created / Modified

```
infra/
├── lib/
│   ├── constructs/
│   │   └── webpresa-bucket.ts         NEW — WebpresaBucket construct
│   └── stacks/
│       └── data-stack.ts              MODIFIED — added Assets bucket
└── test/
    └── data-stack.test.ts             MODIFIED — bucket test coverage, output count 8→10

web/
├── package.json                       MODIFIED — @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
├── lib/
│   └── s3/
│       ├── client.ts                  NEW — S3Client singleton
│       ├── assets.ts                  NEW — putAsset / getAsset / getSignedAssetUrl
│       └── __tests__/
│           └── assets.test.ts         NEW — 8 tests
├── .env.local.example                 MODIFIED — ASSETS_BUCKET_NAME
└── docs/
    ├── build_log.md                   MODIFIED — this entry
    ├── architecture.md                MODIFIED — S3 asset storage section
    ├── deployment.md                  MODIFIED — IAM policy, env var, new-prefix runbook
    └── implementation.md              MODIFIED — Stage 9 marked complete in development
```

## 5. Deployment Gate

**Deployed.** `cdk diff` was shown and explicitly approved before `cdk deploy WebpresaDevDataStack --profile webpresa` ran. See the Stage 9 deploy record below for verification details — the assets bucket is live at `webpresa-dev-assets` in `539898341083/us-east-1`.

---

# Stage 10 — Secrets Management

**Date:** 2026-07-12
**Scope:** AWS Secrets Manager secrets for the five third-party integrations used by later stages (OpenAI, Firecrawl, Google Places, Stripe, Lob), plus a minimal cached server-side retrieval layer. No integration logic — that lands in Stages 11, 12, 13, 18, and 22 respectively.

## Overview

Provisioned five environment-aware Secrets Manager secrets via a new `WebpresaSecret` CDK construct, wired into the existing `WebpresaDataStack` alongside the tables and the assets bucket. Each secret is created with a securely-generated random placeholder value (via Secrets Manager `GenerateSecretString`) — no real credential is ever written into a CDK synth output, a CloudFormation template, or Git history. Real values get set out-of-band with `aws secretsmanager put-secret-value` when each owning stage is actually implemented.

## 1. Infra changes (`infra/`)

### New construct — `infra/lib/constructs/webpresa-secret.ts`

Mirrors `WebpresaTable`/`WebpresaBucket`: takes `{ config, secretName, description, jsonKeys }`, computes `fullSecretName = webpresa-{suffix}-{secretName}`. The first entry in `jsonKeys` gets a random generated placeholder; remaining entries are seeded as empty-string placeholders in the `SecretStringTemplate`. `removalPolicy` follows `EnvironmentConfig` (DESTROY dev / RETAIN prod) exactly like the table/bucket constructs.

### `infra/lib/stacks/data-stack.ts`

Added five `WebpresaSecret` instances:

| Secret | jsonKeys | Owner |
|---|---|---|
| `openai` | `['apiKey']` | Stage 11 |
| `firecrawl` | `['apiKey']` | Stage 13 |
| `google-places` | `['apiKey']` | Stage 12 |
| `stripe` | `['secretKey', 'webhookSecret']` | Stage 18 |
| `lob` | `['apiKey']` | Stage 22 |

### IAM

Added a third inline policy (`webpresa-dev-secrets`) to the existing `webpresa-vercel-dev` IAM user: `secretsmanager:GetSecretValue` scoped to the five dev secret ARNs. Documented that future Lambda roles (Stages 13, 18, 22) should get their own single-secret-scoped policy instead of reusing this one.

### Tests — `infra/test/data-stack.test.ts` (extended)

Added a `describe('secrets', ...)` block: secret count, per-secret naming (dev + prod suffix), `GenerateSecretString` shape for both single-key and two-key (Stripe) secrets, confirmation that no secret has a plaintext `SecretString` property, dev-vs-prod `DeletionPolicy`, tags. Updated the CloudFormation outputs count assertion from 10 to 15 (5 new `SecretArn` outputs). 54 infra tests total, all passing.

## 2. Web application changes (`web/`)

### Dependencies

```bash
npm install @aws-sdk/client-secrets-manager
```

### `web/lib/secrets/client.ts` — `server-only`

Singleton `SecretsManagerClient`, same region/credential-chain pattern as `web/lib/db/client.ts` and `web/lib/s3/client.ts`. `getSecretJson(secretName)` fetches and JSON-parses a secret's `SecretString`, caching indefinitely per process lifetime (matches Vercel's serverless instance reuse — a cold start re-fetches; automated rotation is deferred work). `SECRET_OPENAI()`/`SECRET_FIRECRAWL()`/etc. read the secret name from env vars, mirroring the `TABLE_*` accessor pattern.

### `web/lib/secrets/index.ts` — `server-only`

Typed wrappers: `getOpenAiSecret()`, `getFirecrawlSecret()`, `getGooglePlacesSecret()`, `getStripeSecret()`, `getLobSecret()`. No caller code exists yet — foundation only.

### Tests — `web/lib/secrets/__tests__/client.test.ts`

5 tests: env var validation for secret-name resolution, JSON parsing, caching (second call for the same secret name does not re-hit AWS), and the missing-`SecretString` error path. 82 web tests total, all passing.

### Explicitly out of scope

- No OpenAI/Firecrawl/Google Places/Stripe/Lob client wrappers or integration logic — those belong to Stages 11, 12, 13, 18, and 22.
- No new Lambda execution roles — none of those runtimes exist yet.

### Env vars

Added to `.env.local.example` and `.env.local`: `OPENAI_SECRET_NAME`, `FIRECRAWL_SECRET_NAME`, `GOOGLE_PLACES_SECRET_NAME`, `STRIPE_SECRET_NAME`, `LOB_SECRET_NAME` — all deterministic names (`webpresa-dev-*`), reusing existing AWS credential vars.

## 3. Verification Results

```
✓ Infra tests:  54 passed (npm test) — 39 prior tests + 15 new secret tests
✓ Infra synth:  cdk synth --profile webpresa clean
✓ Web lint:     0 errors (npm run lint)
✓ Web typecheck: 0 errors (npx tsc --noEmit)
✓ Web tests:    82 passed (npm test) — includes 5 new secrets tests
✓ Web build:    production build succeeds (npm run build)
```

## 4. Deployment

`cdk diff` was shown (5 new secrets, bucket policy unaffected, no changes to existing tables) and explicitly approved before `cdk deploy WebpresaDevDataStack --profile webpresa` ran. Deployed cleanly in `539898341083/us-east-1`.

`webpresa-dev-secrets` IAM policy attached to `webpresa-vercel-dev`, confirmed via `aws iam get-user-policy`.

### End-to-end verification

1. **Retrieval + caching** (throwaway script against the real deployed secret, deleted after use): fetched `webpresa-dev-openai` twice through the same in-process cache path used by `getSecretJson` — confirmed only one `GetSecretValue` API call was made.
2. **Least-privilege boundary** (`aws iam simulate-custom-policy` — read-only, no new IAM identity or credentials created): simulated a policy scoped to `secretsmanager:GetSecretValue` on the OpenAI secret ARN only. Result: `allowed` against the OpenAI secret, `implicitDeny` against the Stripe secret. Creating a real temporary IAM user + live access key for this check was attempted first but blocked by the session's auto-mode safety classifier as outside the scope of "proceed with everything"; the read-only simulation proves the same boundary without that risk.

## 5. Files Created / Modified

```
infra/
├── lib/
│   ├── constructs/
│   │   └── webpresa-secret.ts         NEW — WebpresaSecret construct
│   └── stacks/
│       └── data-stack.ts              MODIFIED — added 5 secrets
└── test/
    └── data-stack.test.ts             MODIFIED — secret test coverage, output count 10→15

web/
├── package.json                       MODIFIED — @aws-sdk/client-secrets-manager
├── lib/
│   └── secrets/
│       ├── client.ts                  NEW — SecretsManagerClient singleton + getSecretJson
│       ├── index.ts                   NEW — typed per-integration wrappers
│       └── __tests__/
│           └── client.test.ts         NEW — 5 tests
├── .env.local.example                 MODIFIED — 5 *_SECRET_NAME vars
└── docs/
    ├── build_log.md                   MODIFIED — this entry
    ├── architecture.md                MODIFIED — Secrets Manager section
    ├── deployment.md                  MODIFIED — IAM policy, put-secret-value runbook, new-secret runbook
    └── implementation.md              MODIFIED — Stage 10 marked complete in development
```

---

# Template Visual Refresh — Navy/Orange Theme + Featured Service Image

**Date:** 2026-07-13
**Scope:** Rebrand the `local-business-v1` template's default color theme from teal/gold to navy/orange, and give the oversized first service card a picture background on large screens. Application-layer only — no infra changes.

## Theme colors

`SEED_THEME()` in `app/admin/(dashboard)/businesses/[businessId]/actions.ts` — the single source of the theme every seeded preview gets — updated:

| Token | Before | After |
|---|---|---|
| `primaryColor` | `#11455E` (teal) | `#0F356B` (navy) |
| `accentColor` | `#CE9059` (gold) | `#ED7023` (orange) |

Because every section already reads color exclusively through `var(--site-primary)` / `var(--site-accent)` (see `tokens.ts`), no component changed — the new colors apply everywhere `V.primary`/`V.accent` is used (hero, headings, nav, CTA buttons, footer) automatically.

Card/section backgrounds that used Tailwind's `bg-slate-50` (`#f8fafc`, an approximation) were changed to the exact requested light-gray `bg-[#F4F7FA]` in `ContactSection`, `ServiceAreaSection`, `ServicesGrid`, `TrustStrip`, and `WhyChooseUs`. `bg-white` was left unchanged (`#FFFFFF` is already exact).

The pre-existing teal/gold hex values in the public marketing homepage (`app/components/Hero.tsx`, `ExamplesSection.tsx`, `WhyStartFromScratch.tsx`, `PreviewSection.tsx`, `FounderSection.tsx`) were **not** touched — those are the Webpresa marketing site's own branding, not the generated business template, and were out of scope.

## Featured service card — picture background

`ServicesGrid.tsx`: the oversized first ("featured") service card now shows a background photo on `lg:` screens and up, with a flat dark overlay for text contrast; below `lg:` it renders identically to the other cards (`bg-[#F4F7FA]`, dark text) instead of a solid navy block, so there's no unstyled/empty state on mobile.

The photo is a hardcoded `picsum.photos` placeholder (`DEV_FIXTURE`, matching the existing convention for `heroImageUrl`/`aboutImageUrl` in `INDUSTRY_SEEDS`) — there is no per-service image field in `PreviewService` yet. Intentionally deferred rather than adding a new domain field now: Stage 13 (Firecrawl website capture) is expected to eventually supply a real per-service photo, at which point the placeholder constant is swapped for real data with no template changes needed.

## Verification

```
Lint: 0 errors
TypeCheck: 0 errors
Tests: 82 passed (no new tests — presentational change only)
Build: clean
```

## Files Modified

```
web/
├── app/
│   ├── admin/(dashboard)/businesses/[businessId]/actions.ts   MODIFIED — SEED_THEME() colors
│   └── b/[slug]/template/
│       ├── ContactSection.tsx        MODIFIED — bg-slate-50 → bg-[#F4F7FA]
│       ├── ServiceAreaSection.tsx    MODIFIED — bg-slate-50 → bg-[#F4F7FA]
│       ├── ServicesGrid.tsx          MODIFIED — bg-[#F4F7FA] + featured-card picture background
│       ├── TrustStrip.tsx            MODIFIED — bg-slate-50 → bg-[#F4F7FA]
│       └── WhyChooseUs.tsx           MODIFIED — bg-slate-50 → bg-[#F4F7FA]
```

---

# Configurable CTA System

**Date:** 2026-07-13
**Scope:** Replace the template's hardcoded CTA phrases ("Get a Quote", "Get a Free Quote", "Request Service", "Request a Free Estimate") with an admin-configurable primary/secondary call-to-action model, without building a hosted form system. No new template, no redesign, no CRM integration, no deployment/infra changes.

## Domain model + schema (`domain/`)

`domain/models/site-preview.ts` — added:

```ts
export const CTA_ACTION_TYPES = ['phone', 'email', 'sms', 'external_url', 'none'] as const;
export type CtaActionType = (typeof CTA_ACTION_TYPES)[number];

export interface PreviewCta {
  type: CtaActionType;
  label: string;
  value?: string; // destination override; required for external_url
}

export interface PreviewCtaConfig {
  primary: PreviewCta;
  secondary?: PreviewCta;
}
```

Added as `cta?: PreviewCtaConfig` on `PreviewContent` — **optional**, so existing DynamoDB records (which only have legacy `hero.ctaText`) remain valid with no migration.

`domain/schemas/site-preview.schema.ts` — `PreviewCtaSchema` requires a non-empty `label` unless `type` is `"none"`, and requires `external_url` CTAs to carry a `value` that passes a new exported `isHttpsUrl()` check (parses with the `URL` constructor, rejects anything whose protocol isn't `https:` — blocks `http:`, `javascript:`, `data:`, etc.).

## Resolver (`app/b/[slug]/template/cta.tsx` — new)

Single source of truth for turning configured CTAs into renderable links — no component constructs a `tel:`/`mailto:`/`sms:`/external href itself.

- `resolvePreviewCta({ cta, contact, variant })` — resolves one CTA. Phone/SMS/email fall back to `contact.phone`/`contact.email` when `cta.value` is unset; `external_url` re-validates `isHttpsUrl` at render time (defense-in-depth against stored data written before this validation existed). Returns `null` whenever the action can't be resolved (missing destination, unsafe URL, `type: "none"`) — callers never render a broken button.
- `resolvePreviewCtaConfig(content)` — resolves the full `{ primary, secondary }` config content-wide. When `content.cta` is present it's used directly; when absent (**legacy previews**), `normalizeLegacyCtaConfig()` derives one from `hero.ctaText` (kept as the label) and `contact` (phone destination if present, else email, else the CTA is hidden entirely) — no destructive migration required. Also collapses `secondary` to `null` when it resolves to the same action type + destination as `primary`.
- `getMobileBarActions(primary, secondary)` — pure array helper (`[]` / `[one]` / `[both]`) that the mobile sticky bar uses to decide single-vs-split-width rendering.
- `CtaIcon` / `externalLinkAttrs` — shared per-type icon and `target="_blank" rel="noopener noreferrer"` attributes for external links.

## Template wiring

`index.tsx` calls `resolvePreviewCtaConfig(content)` once and passes `{ primary, secondary }` down. Updated to read from resolved CTAs instead of hardcoded copy: `GeneratedSiteHeader` (desktop pill + accent button, mobile drawer), `GeneratedHero` (primary/secondary CTA buttons), `WhyChooseUs`, `AboutSection`, `ServiceAreaSection` (all primary-only), `FinalCTA` (primary + secondary), `MobileCallBar` (primary + secondary — a lone resolved CTA now spans the full bar width instead of leaving an empty half).

**Explicitly excluded**, per requirements: `ContactSection`'s phone/email contact cards and `GeneratedSiteFooter`'s contact block stay tied directly to `contact.phone`/`contact.email` — they are not routed through the CTA system. They were only touched to reuse the newly-centralized safe link builders (`toMailtoHref`, `toTelHref` — the footer previously built `mailto:`/`tel:` hrefs by hand).

`tokens.ts` — added `toSmsHref` and `toMailtoHref` alongside the existing `toTelHref`.

## Admin (`app/admin/(dashboard)/businesses/[businessId]/`)

- `cta-defaults.ts` (new) — `buildDefaultCta(contact)`: phone present → primary `{phone, "Call Now"}` (+ secondary `{email, "Email Us"}` if email also present); email-only → primary `{email, "Contact Us"}`; neither → primary `{none, ""}`. Deliberately never defaults to "Get a Quote"/"Get a Free Quote"/"Request an Estimate"/"Request Service" — those phrases only appear when an admin explicitly types them. Kept in its own module, not `actions.ts`, because Next.js requires every export of a `'use server'` file to be an async Server Action — this is a plain sync helper.
- `actions.ts` — `buildSeedContent` now calls `buildDefaultCta` and sets both `content.cta` and the legacy `hero.ctaText` (kept in sync with the new primary label, since some code paths still read it as a fallback). New `updatePreviewCtaAction(previewId, prevState, formData)` Server Action: Zod-validates the submitted primary/secondary fields (label required unless `none`, `https://` required for `external_url`), merges the resulting `PreviewCtaConfig` into the preview's `content`, re-validates with `PreviewContentSchema`, and `putSitePreview`s it **in place** — this edits presentation config, not generated content, so it does not create a new preview version.
- `CtaConfigForm.tsx` (new, client component) — reuses the existing `useActionState`/`useFormStatus` form pattern from `BusinessForm.tsx`. Primary CTA (type, label, destination) always shown; secondary CTA behind an enable checkbox. Destination field hides entirely for `none`, shows "uses the preview phone/email by default" helper text for `phone`/`sms`/`email`, and is marked required for `external_url`.
- `page.tsx` — added a "Preview CTA" card on the business detail page, editing the most recent preview version (`previews[0]`, since `listPreviewsForBusiness` returns newest-first). Form defaults to the preview's stored `content.cta`, or `buildDefaultCta(contact)` when the preview predates this feature.

## Tests

- `app/b/[slug]/template/__tests__/cta.test.ts` (new, 26 tests) — `resolvePreviewCta` for phone (contact fallback, override, sanitization, missing destination), email, sms, external_url (valid, `javascript:`, plain `http:`, missing value), `none`/undefined; `resolvePreviewCtaConfig` for one/two resolved CTAs, dedup of identical primary+secondary, distinct-destination non-dedup, legacy `hero.ctaText` normalization (phone fallback, email fallback, fully-hidden case); `getMobileBarActions` for 0/1/2 resolved actions.
- `app/admin/(dashboard)/businesses/[businessId]/__tests__/actions.test.ts` (new, 11 tests) — `updatePreviewCtaAction` validation (missing label, non-https external URL, unsafe protocol, secondary validated only when enabled), success flow (primary-only, primary+secondary with overrides, secondary omitted when disabled, rest of `content` left untouched), auth, and preview-not-found.

## Verification

```
Lint: 0 errors
TypeCheck: 0 errors
Tests: 119 passed (37 new — 82 prior + 26 cta.test.ts + 11 admin actions.test.ts)
Build: clean
```

## Files Created / Modified

```
web/
├── domain/
│   ├── models/site-preview.ts                              MODIFIED — CtaActionType, PreviewCta, PreviewCtaConfig, content.cta
│   └── schemas/site-preview.schema.ts                       MODIFIED — PreviewCtaSchema, isHttpsUrl export
├── app/
│   ├── b/[slug]/template/
│   │   ├── cta.tsx                                           NEW — resolver, icons, mobile-bar helper
│   │   ├── tokens.ts                                         MODIFIED — toSmsHref, toMailtoHref
│   │   ├── index.tsx                                         MODIFIED — resolves CTAs once, threads to sections
│   │   ├── GeneratedSiteHeader.tsx                           MODIFIED
│   │   ├── GeneratedHero.tsx                                 MODIFIED
│   │   ├── WhyChooseUs.tsx                                   MODIFIED
│   │   ├── AboutSection.tsx                                  MODIFIED
│   │   ├── ServiceAreaSection.tsx                            MODIFIED
│   │   ├── FinalCTA.tsx                                      MODIFIED
│   │   ├── MobileCallBar.tsx                                 MODIFIED — single-CTA full-width fix
│   │   ├── ContactSection.tsx                                MODIFIED — toMailtoHref reuse only
│   │   ├── GeneratedSiteFooter.tsx                           MODIFIED — toTelHref/toMailtoHref reuse only
│   │   └── __tests__/cta.test.ts                             NEW — 26 tests
│   └── admin/(dashboard)/businesses/[businessId]/
│       ├── cta-defaults.ts                                   NEW — buildDefaultCta
│       ├── actions.ts                                        MODIFIED — default cta wiring, updatePreviewCtaAction
│       ├── CtaConfigForm.tsx                                  NEW — admin CTA editor
│       ├── page.tsx                                          MODIFIED — Preview CTA card
│       └── __tests__/actions.test.ts                          NEW — 11 tests
└── docs/
    ├── build_log.md                                          MODIFIED — this entry (+ theme refresh entry)
    ├── architecture.md                                       MODIFIED — CTA system, theme, admin, API boundaries
    └── implementation.md                                     MODIFIED — Stage 8 status pointer, Stage 11 forward-note
```

---

# Stage 11 Foundation — Website Generation Inputs, Assets, and Manual AI Generation

**Date:** 2026-07-14
**Scope:** Implement the plan from the prior session's `implementation.md` rewrite — extend the `Business` domain model and creation form to capture website-generation inputs and uploaded assets (Stages 5, 7, 9), and build the real "Generate Website" pipeline against the live OpenAI API (Stage 11). Stage 13 (Firecrawl enrichment) remains out of scope — it depends on this being stable first.

## Domain model (`domain/`)

- `domain/constants/brand-tone.ts` (new) — `BRAND_TONES` (`professional`, `friendly`, `luxury`, `modern`, `traditional`, `bold`, `warm`), mirroring `industries.ts`'s `as const` array + derived union pattern.
- `domain/models/business.ts` — new optional `Business` fields: `servicesOffered`, `serviceAreas`, `differentiators` (multi-line free text — one item per line, parsed only at prompt-construction time, never rendered directly), `description`, `brandTone`, `notes`, `logoUrl`, `photoUrls`. All optional; existing records remain valid.
- `domain/models/site-preview.ts` — `HERO_STYLES = ['image', 'gradient', 'pattern', 'solid']` + `HeroStyle` type, added as optional `PreviewTheme.heroStyle` (legacy previews without it are inferred as `'image'` when `heroImageUrl` is set, else `'solid'`); optional `PreviewContent.seo: { title, description }`.
- Corresponding Zod schema updates in `business.schema.ts` and `site-preview.schema.ts` (length caps on the new free-text fields, `photoUrls` capped at 6, `seo.title`/`seo.description` capped at 60/160 chars for SEO-tag length limits).

## Form + asset uploads (`app/admin/(dashboard)/businesses/`)

- `BusinessForm.tsx` — new **Website Generation** section (services offered / service areas / description / differentiators as `<textarea>`, brand tone as a `<select>` over `BRAND_TONES`, notes) and **Assets** section (`<input type="file">` for logo, `multiple` for photos), placed between the existing Address and Admin sections. New `TextareaField`/`FileField` helpers alongside the existing `Field`/`SelectField`.
- `actions.ts` — `createBusinessAction`/`editBusinessAction` extended: new Zod fields (shared `WEBSITE_GENERATION_FIELDS` object spread into both the create and edit schemas), and a new `uploadBusinessAssets(businessId, formData)` helper that reads `File` entries from `FormData`, converts via `file.arrayBuffer()` → `Buffer`, and calls `putAsset()`. Edit preserves the existing `logoUrl`/`photoUrls` when no new file is chosen (upload only replaces what's actually re-submitted).
- `lib/s3/assets.ts` — added `'businesses/'` to `ALLOWED_PREFIXES`. Keys: `businesses/{businessId}/assets/logo.{ext}`, `businesses/{businessId}/assets/photos/{n}.{ext}`.
- `app/api/assets/[...key]/route.ts` (new) — the app's **first Route Handler** (everything else is Server Actions/pages). Public `GET` proxy: streams the object via the existing `getAsset()` with a one-year `Cache-Control`, but only for keys under `businesses/` — scans/previews/postcards stay private. This is what `logoUrl`/`photoUrls` actually point at (never a raw S3 URL, since the bucket has no public/CDN path).

## OpenAI client (`lib/ai/client.ts`)

`npm install openai`. Singleton `OpenAI` client built from `getOpenAiSecret()` (Stage 10's secrets layer — its first real caller), mirroring the exact singleton pattern used by `lib/s3/client.ts` / `lib/secrets/client.ts`. Model is read from `OPENAI_MODEL` (new env var, default `gpt-4o-mini`) rather than hardcoded, per Stage 11's explicit requirement.

## Generation pipeline (`lib/ai/generate-preview.ts`, `[businessId]/actions.ts`)

- `generatePreviewContent(business)` — one structured-output call (`chat.completions.parse` + `zodResponseFormat`) returns hero copy, services, tagline, about text, differentiators, CTA *labels*, theme colors/font, and hero-style choice. **Contact info, service areas, and CTA type/destination are always code-derived from the verified `Business` record, never trusted from the model** — `buildDefaultCta()` (from the CTA-system work) was extended to accept optional `labels`, so the model only supplies copy while code retains sole authority over which contact channel becomes primary/secondary. An uploaded photo always wins over the model's hero-style pick. Output is re-validated against `PreviewContentSchema`/the theme schema before being returned (defense in depth beyond the model's own schema guarantee).
- `generateWebsiteAction(businessId)` (new) — auth check, precondition check (must have at least one service listed, checked before calling OpenAI), 3-generation soft cap (counts previews with `generationMetadata` set — the free seed action is unaffected), creates a new `SitePreview` via the existing `createSitePreview` factory. **Status stays `draft`** — never auto-published, unlike the seed action.
- `GenerateWebsiteButton.tsx` (new) — admin UI, `useActionState` + pending state, disabled once the cap is hit. `page.tsx` also gained a "Review draft" link when the latest preview is unpublished.
- `GeneratedHero.tsx` — now branches on `theme.heroStyle`: `image` (existing photo + overlay), `gradient` (CSS `linear-gradient` between primary/accent via `color-mix()`), `pattern` (CSS radial-gradient dot grid, also via `color-mix()`), `solid` (existing flat fallback). No new image assets for gradient/pattern.
- `/b/[slug]/page.tsx` — `generateMetadata` prefers `content.seo.title`/`description` when present, falling back to the existing hero-derived defaults.

## Tests

158 total (was 119, +39 new): domain tests for the new `Business`/theme/content fields; `lib/s3/__tests__/assets.test.ts` gained a `businesses/` prefix case; new `app/api/assets/[...key]/__tests__/route.test.ts` (4 tests — content-type inference, 404 on missing object, prefix rejection); new `lib/ai/__tests__/client.test.ts` (3) and `generate-preview.test.ts` (8 — precondition, contact/CTA derivation from the business record not the model, hero-image override, model-failure handling); extended `businesses/__tests__/actions.test.ts` (uploads, website-generation fields) and `[businessId]/__tests__/actions.test.ts` (`generateWebsiteAction` success/validation/cap/auth, including a test asserting a raw OpenAI error message is never leaked to the admin-facing response).

## Verification

```
Lint: 0 errors
TypeCheck: 0 errors
Tests: 158 passed (39 new)
Build: clean — new routes: /api/assets/[...key] (ƒ)
```

## Files Created / Modified

```
web/
├── domain/
│   ├── constants/brand-tone.ts                                NEW — BRAND_TONES
│   ├── models/business.ts                                     MODIFIED — website-generation + asset fields
│   ├── models/site-preview.ts                                 MODIFIED — HeroStyle, PreviewTheme.heroStyle, PreviewContent.seo
│   ├── schemas/business.schema.ts                              MODIFIED
│   └── schemas/site-preview.schema.ts                          MODIFIED
├── lib/
│   ├── s3/assets.ts                                            MODIFIED — businesses/ prefix
│   └── ai/
│       ├── client.ts                                           NEW — OpenAI singleton, OPENAI_MODEL
│       ├── generate-preview.ts                                 NEW — generatePreviewContent
│       └── __tests__/{client,generate-preview}.test.ts         NEW — 11 tests
├── app/
│   ├── api/assets/[...key]/
│   │   ├── route.ts                                            NEW — public businesses/ asset proxy
│   │   └── __tests__/route.test.ts                             NEW — 4 tests
│   ├── admin/(dashboard)/businesses/
│   │   ├── BusinessForm.tsx                                    MODIFIED — Website Generation + Assets sections
│   │   ├── actions.ts                                          MODIFIED — new fields, uploadBusinessAssets
│   │   ├── __tests__/actions.test.ts                           MODIFIED
│   │   └── [businessId]/
│   │       ├── cta-defaults.ts                                 MODIFIED — buildDefaultCta labels param
│   │       ├── actions.ts                                      MODIFIED — generateWebsiteAction
│   │       ├── GenerateWebsiteButton.tsx                       NEW
│   │       ├── page.tsx                                        MODIFIED — Generate Website button, draft link
│   │       └── __tests__/actions.test.ts                       MODIFIED
│   └── b/[slug]/
│       ├── page.tsx                                            MODIFIED — SEO metadata
│       └── template/GeneratedHero.tsx                          MODIFIED — heroStyle branching
└── .env.local(.example)                                        MODIFIED — OPENAI_MODEL
```

---

# Bug Fixes — Live Generation Testing

**Date:** 2026-07-14
**Scope:** Two real bugs surfaced by manually testing Stage 11 end-to-end against the live OpenAI API and a real business record — neither was caught by the mocked test suite, since both depend on real external-system behavior no mock reproduces.

## Fix 1 — Asset URLs rejected by strict `.url()` validation

`Business.logoUrl`/`photoUrls` and `PreviewTheme.heroImageUrl`/`aboutImageUrl` were validated with plain `z.string().url()`, which requires a full absolute URL (protocol + host). The asset-proxy upload flow (see above) actually produces root-relative paths like `/api/assets/businesses/{id}/assets/logo.png` — the bucket has no public/CDN path, so there's no absolute URL to point at. Every business-asset upload or AI-generated hero image would have failed schema validation at save time.

Added `UrlOrPathSchema` to `domain/schemas/common.schema.ts` — accepts either a full `https?://` URL (e.g. existing `picsum.photos` seed fixtures) or a string starting with `/`. Applied to all four fields in place of `.url()`.

## Fix 2 — OpenAI strict structured-output schema rejected the font-family enum

First live generation attempt failed with:
```
400 Invalid schema for response_format 'webpresa_generated_website': In context=('properties', 'fontFamily'), " is not allowed in string literals for structured outputs (strict=true).
```
`FONT_STACKS` in `lib/ai/generate-preview.ts` used double-quoted font names (`'system-ui, ..., "Segoe UI", sans-serif'`) — OpenAI's strict JSON-schema mode for structured outputs rejects `"` characters inside enum literal values. Switched to single-quoted font names (CSS accepts either quote style identically), with a comment explaining why double quotes are off-limits there specifically.

## Known gap — not fixed here

AI-selected `primaryColor`/`accentColor` have **no contrast or saturation constraint** beyond "is a valid 6-digit hex code" (`^#[0-9a-fA-F]{6}$`). The prompt's only guidance is "pick a primaryColor/accentColor pair that is harmonious, readable as white text over primaryColor, and fits the brand tone" — free-text instruction, not a verified constraint. Live testing produced a washed-out light-blue/light-yellow pair for `brandTone: 'professional'`. Selection is also non-deterministic — the same business/tone regenerated can yield a different palette. Documented as a Stage 11 deferred item (see `implementation.md`); not addressed in this session.

## Verification

Both fixes covered by the existing domain test suite (`UrlOrPathSchema` exercised via the `logoUrl`/`photoUrls` and theme tests added in the Stage 11 Foundation entry above) and confirmed against the live API — a real `generateWebsiteAction` run completed successfully after both fixes, producing a published-ready draft `SitePreview` with a working hero image from an uploaded photo.

---

# Brand Theme System

**Date:** 2026-07-14
**Scope:** Replaces free-form AI-generated hex colors with 10 curated, professionally designed theme presets. Neither OpenAI nor any admin form can invent, blend, or free-type a color anymore — the only decision made anywhere in the app is *which preset name* to use. Resolves the "Known gap" documented in the Bug Fixes entry above (no contrast/saturation guardrail, non-deterministic palette selection) by removing free-form color generation entirely rather than constraining it further.

## 1. Dependencies installed

```bash
npm install sharp
```

| Package | Purpose |
|---|---|
| `sharp` | Server-side image processing — used only to downsample an uploaded logo to a single average-color pixel for theme-family classification (`lib/theme/logo-color.ts`). |

## 2. New domain constants and library

- `domain/constants/themes.ts` — `THEME_NAMES` (10 approved identifiers: `classicBlue`, `premiumNavy`, `contractor`, `modern`, `green`, `orange`, `modernDark`, `warmPremium`, `purple`, `red`) and `DEFAULT_THEME_NAME` (`'classicBlue'`). Mirrors the existing `industries.ts` / `brand-tone.ts` single-source-of-truth pattern.
- `lib/themes.ts` — `THEMES: Record<ThemeName, BrandTheme>`, the actual palettes (exact hex values as specified — `primary`, `accent`, `background`, `surface`, `text`, `mutedText`, `border`, `success`, `warning`, `danger` per preset), plus `displayName`/`bestFor` metadata, `getTheme()`, `isThemeName()`, `THEME_OPTIONS` (array form for UI), and `resolveThemePalette(theme)` — the one render-time function allowed to read a preview's colors. It resolves `themeName` directly for new previews, or falls back to the default preset's neutrals with legacy `primaryColor`/`accentColor` substituted in for previews saved before this system existed.

## 3. Domain model / schema changes

- `PreviewTheme` (`domain/models/site-preview.ts`) gains `themeName?: ThemeName` — the new source of truth. `primaryColor?`/`accentColor?` remain on the type and schema, now marked `@deprecated`, solely for backward compatibility with previews generated before this change (this is a dev-only breaking change in practice — the field shape changed, but nothing is silently migrated or destroyed; old previews keep rendering via the legacy fallback in `resolveThemePalette`).
- `PreviewThemeSchema` (`domain/schemas/site-preview.schema.ts`) uses `.refine()` to require either `themeName` or both legacy hex fields — a theme with neither is rejected.
- `Business.theme?: ThemeName` (`domain/models/business.ts` + `business.schema.ts`) — the resolved preset persisted on the business record, so regeneration reuses it instead of re-deriving it (spec Step 3), and so an admin's manual override sticks.

## 4. Selection logic (`lib/theme/`)

- `logo-color.ts` — `detectLogoThemeFamily(logoUrl)`: reads the logo from S3 (`getAsset`), flattens transparency onto white with `sharp`, downsamples to a 1×1 pixel to get an average RGB, converts to HSL, and classifies the hue/saturation/lightness into the closest preset family via the exported `classifyHsl()`. Returns `null` (never a guess) when the asset is missing, unreadable, or too neutral to signal a brand family — hue bands: red/burgundy 345–15°, orange 15–50°, green 50–170°, teal 170–195°, blue/navy 195–255°, purple 255–345°; very-low-saturation colors split on lightness into `modernDark` (dark) or `null` (light/no signal).
- `industry-defaults.ts` — `INDUSTRY_THEME_DEFAULTS`, a deterministic `Industry → ThemeName` map derived from each preset's documented "best for" industries, used only by the free seed path so it never needs an OpenAI call.
- `select-theme.ts`:
  - `pickStoredOrLogoTheme(business)` — Steps 3 + 1, shared by both callers below.
  - `pickThemeViaOpenAi(business)` — Step 2. One structured-output call (`zodResponseFormat` against a `z.object({ theme: z.enum(THEME_NAMES) })` schema) fed brand personality signals (industry, description, brand tone, differentiators, notes) plus each preset's name and `bestFor` list — the model can only return one of the 10 approved names.
  - `resolveBusinessTheme(business)` — full path for real AI generation (stored/logo, else OpenAI).
  - `resolveBusinessThemeForSeed(business)` — free-path version (stored/logo, else the deterministic industry map, else `DEFAULT_THEME_NAME`) — never calls OpenAI.

## 5. Wiring into generation and the admin UI

- `lib/ai/generate-preview.ts` — `GenerationOutputSchema` no longer has `primaryColor`/`accentColor` fields, and the prompt's color-pairing instruction was removed. `generatePreviewContent()` now runs the content-generation OpenAI call and `resolveBusinessTheme(business)` concurrently (`Promise.all`) since they're independent concerns, and sets `theme.themeName` from the latter.
- `app/admin/(dashboard)/businesses/[businessId]/actions.ts` — `generateWebsiteAction` and `createSeedPreviewAction` (via a new `buildSeedTheme()` helper using `resolveBusinessThemeForSeed`) both persist the resolved theme onto `Business.theme` via `updateBusiness()` when it wasn't already stored.
- `app/admin/(dashboard)/businesses/BusinessForm.tsx` — new "Theme" field (a `<select>` with an "Auto" option plus the 10 named presets, each showing its `bestFor` industries). Wired through `businesses/actions.ts`'s `WEBSITE_GENERATION_FIELDS`/`websiteGenerationFields()` and persisted on both create and edit.

## 6. Template rendering (`app/b/[slug]/template/`)

- `tokens.ts` — `buildSiteTokens()` now resolves the full `BrandTheme` palette via `resolveThemePalette()` and sets 10 CSS custom properties (`--site-primary/accent/background/surface/text/muted/border/success/warning/danger`) instead of 2. The `V` shorthand object grew matching entries.
- Root wrapper (`template/index.tsx`) now sets `bg-(--site-background) text-(--site-text)` instead of leaving those to per-section hardcoded colors.
- All 11 template components audited and every hardcoded neutral (`bg-white`, `bg-[#F4F7FA]`, `text-gray-900/700/500/400`, `border-slate-100`/`border-gray-100`, `bg-slate-200`) replaced with the corresponding `--site-*` CSS variable via Tailwind v4's `bg-(--site-*)`/`text-(--site-*)`/`border-(--site-*)` CSS-variable shorthand. White-on-color decorative elements (translucent badges/circles over a colored hero or CTA band) were deliberately left as `white` — they're a contrast choice, not a hardcoded brand color, and read correctly against every preset.
- Fixed a latent bug in `WhyChooseUs.tsx` found while touching this code: `` `${V.primary}1A` `` string-concatenation for a 10%-opacity icon background doesn't work once `V.primary` is a CSS `var()` reference rather than a raw hex string (it already was, before this change, so this predates the Brand Theme System but produced invalid CSS). Replaced with `color-mix(in srgb, var(--site-primary) 10%, transparent)`.

## 7. Tests added / updated

- `lib/__tests__/themes.test.ts` — every preset has all 10 required colors as valid hex, correct `name`/`displayName`/`bestFor`, `getTheme`/`isThemeName`/`resolveThemePalette` behavior including the legacy-hex fallback path.
- `lib/theme/__tests__/logo-color.test.ts` — `classifyHsl` across all hue bands and the achromatic branch; `detectLogoThemeFamily` with `sharp` and `getAsset` mocked (missing asset, corrupt image, non-proxy URL, successful classification).
- `lib/theme/__tests__/select-theme.test.ts` — stored-theme reuse, logo fallback, OpenAI fallback (mocked), and the seed path's industry-default fallback, all with the OpenAI client mocked.
- `domain/__tests__/domain.test.ts` — `PreviewThemeSchema` accepts `themeName`, rejects a theme with neither `themeName` nor legacy colors, rejects an unapproved preset name; same three cases added for `BusinessSchema.theme`.
- `lib/ai/__tests__/generate-preview.test.ts` — updated to mock `resolveBusinessTheme`; new assertion that `theme.themeName` is set and `primaryColor`/`accentColor` are absent from generated output.
- `app/admin/(dashboard)/businesses/[businessId]/__tests__/actions.test.ts` — `updateBusiness` mocked; new tests confirming `generateWebsiteAction` persists a newly resolved theme only when `business.theme` was previously unset.
- `app/admin/(dashboard)/businesses/__tests__/actions.test.ts` — new tests confirming an explicit theme override is saved and that leaving the field on "Auto" persists no `theme` value.

## 8. Verification

```
✓ Lint:        0 errors  (npm run lint)
✓ TypeCheck:   0 errors  (npx tsc --noEmit)
✓ Tests:       220 passed  (npm test)
✓ Build:       production build succeeds  (npm run build)
✓ Infra tests: 54 passed, unaffected — no infrastructure changes in this session
```

## 9. Deferred

- **Firecrawl re-detection** (Stage 13, not yet built): detect a logo discovered by a website crawl, compare it against the currently stored theme, and auto-switch + regenerate if branding differs significantly. The spec's Step 4 — intentionally out of scope until Stage 13 exists.
- Logo color detection is an average-pixel approximation (resize-to-1×1), not a true dominant-color histogram — sufficient for classifying which hue family a logo belongs to, not for extracting an exact brand shade.

## 10. Files changed / created

```
web/
├── domain/
│   ├── constants/themes.ts                                     NEW — THEME_NAMES, ThemeName, DEFAULT_THEME_NAME
│   ├── models/business.ts                                      MODIFIED — theme? field
│   ├── models/site-preview.ts                                   MODIFIED — PreviewTheme.themeName, deprecated legacy fields
│   ├── schemas/business.schema.ts                               MODIFIED — theme enum
│   ├── schemas/site-preview.schema.ts                            MODIFIED — PreviewThemeSchema refine
│   └── __tests__/domain.test.ts                                 MODIFIED — new theme schema tests
├── lib/
│   ├── themes.ts                                                NEW — 10 curated presets + resolveThemePalette
│   ├── __tests__/themes.test.ts                                 NEW
│   ├── theme/
│   │   ├── logo-color.ts                                        NEW
│   │   ├── industry-defaults.ts                                 NEW
│   │   ├── select-theme.ts                                      NEW
│   │   └── __tests__/{logo-color,select-theme}.test.ts          NEW — 25 tests
│   └── ai/
│       ├── generate-preview.ts                                  MODIFIED — removed color generation, added theme selection
│       └── __tests__/generate-preview.test.ts                   MODIFIED
├── app/
│   ├── admin/(dashboard)/businesses/
│   │   ├── BusinessForm.tsx                                     MODIFIED — Theme field
│   │   ├── actions.ts                                           MODIFIED — theme persisted on create/edit
│   │   ├── __tests__/actions.test.ts                            MODIFIED
│   │   └── [businessId]/
│   │       ├── actions.ts                                       MODIFIED — theme resolution + persistence
│   │       └── __tests__/actions.test.ts                        MODIFIED
│   └── b/[slug]/template/
│       ├── tokens.ts                                            MODIFIED — full CSS variable palette
│       ├── index.tsx                                            MODIFIED — themed root background/text
│       ├── GeneratedSiteHeader.tsx                               MODIFIED — themed colors
│       ├── TrustStrip.tsx                                        MODIFIED
│       ├── ServicesGrid.tsx                                      MODIFIED
│       ├── WhyChooseUs.tsx                                       MODIFIED — themed colors + color-mix fix
│       ├── AboutSection.tsx                                      MODIFIED
│       ├── ServiceAreaSection.tsx                                MODIFIED
│       └── ContactSection.tsx                                   MODIFIED
└── package.json                                                 MODIFIED — sharp
```

---

# Bug Fixes — Brand Theme System Live Testing

**Date:** 2026-07-14
**Scope:** Three real bugs surfaced by generating a real business website end-to-end after the Brand Theme System landed. All three were reported by a user testing locally, not caught by the mocked test suite.

## Fix 1 — Tailwind CSS-variable syntax: bracket vs. parentheses

Every template component converted to theme CSS variables in the Brand Theme System change used Tailwind's *bracket* arbitrary-value syntax (`bg-[--site-background]`), following what looked like an established pattern in `BusinessForm.tsx` (`focus:ring-[--color-brand]`). In Tailwind v4.3.2 (this project's version), bracket syntax treats the bracketed content as a literal CSS value — it does **not** wrap it in `var()`. Confirmed by inspecting the compiled output: `bg-[--site-background]` generated `background-color:--site-background`, which is invalid CSS and silently dropped by the browser. The correct Tailwind v4 syntax for referencing a custom property is *parentheses*: `bg-(--site-background)` correctly compiles to `background-color:var(--site-background)` (verified the same way).

Because every themed section's background rule was invalid and dropped, every section fell through to whichever background was actually painted underneath — in this case `body`'s `background: var(--background)` (`app/globals.css`), which resolves to `#0a0a0a` (near-black) under `@media (prefers-color-scheme: dark)`. This is why the generated site rendered with a solid black background regardless of which theme preset was selected (navy, in the report) — none of the preset's actual colors were ever reaching the page; the browser was just showing through to the dark-mode page background.

Fixed by converting every `[--site-*]` bracket reference to `(--site-*)` parentheses across all template components (`GeneratedSiteHeader.tsx`, `TrustStrip.tsx`, `ServicesGrid.tsx`, `WhyChooseUs.tsx`, `AboutSection.tsx`, `ServiceAreaSection.tsx`, `ContactSection.tsx`, `index.tsx`). Verified against the actual compiled CSS output (`background-color:var(--site-background)`), not just visually.

**Known related issue, not fixed here:** the same broken bracket syntax (`text-[--color-brand]`, `ring-[--color-brand]`, `bg-[--color-brand]`) appears throughout the admin dashboard (`BusinessForm.tsx`, `CtaConfigForm.tsx`, business list/detail pages, sign-in page) — the admin app's brand-blue color and focus rings have likely never actually rendered. Pre-existing, unrelated to the Brand Theme System, and out of scope for this fix — flagged for a follow-up pass.

## Fix 2 — Uploaded logo never rendered anywhere

`Business.logoUrl` was captured on upload and (as of the Brand Theme System change) used for logo-color theme detection, but no template component ever rendered it as an image — the header always showed the business name as plain text. Added an optional `logoUrl` prop threaded through `/b/[slug]/page.tsx` → `GeneratedWebsite` (`template/index.tsx`) → `GeneratedSiteHeader.tsx`: when present, the header renders the logo image in place of the text business name via `next/image`; falls back to the text name exactly as before when absent.

## Fix 3 — Featured service card ignored uploaded photos

`ServicesGrid.tsx`'s featured-service picture background was unconditionally a hardcoded `picsum.photos` `DEV_FIXTURE`, even when the business had real uploaded photos already available (the hero and about sections already reused `business.photoUrls[0]`/`[1]`, but nothing wired a third slot to the services grid). Added `PreviewTheme.servicesImageUrl` (mirrors `heroImageUrl`/`aboutImageUrl`), populated in `generatePreviewContent()` from `business.photoUrls[2] ?? photoUrls[1] ?? photoUrls[0]` (reuses an earlier photo rather than falling back to the picsum placeholder whenever at least one real photo exists), and threaded through `ServicesGrid`'s new `featuredImageUrl` prop. The picsum fixture now only appears when the business has uploaded zero photos at all.

## Verification

```
✓ Lint:        0 errors  (npm run lint)
✓ TypeCheck:   0 errors  (npx tsc --noEmit)
✓ Tests:       223 passed  (npm test) — 3 new assertions for the photo-reuse fallback chain
✓ Build:       production build succeeds  (npm run build)
✓ Compiled CSS manually inspected to confirm `bg-(--site-background)` now emits `var(...)`, not a literal
```

## Files changed

```
web/
├── app/b/[slug]/
│   ├── page.tsx                                                MODIFIED — passes business.logoUrl through
│   └── template/
│       ├── index.tsx                                           MODIFIED — logoUrl + servicesImageUrl wiring, parens syntax
│       ├── GeneratedSiteHeader.tsx                              MODIFIED — renders logo image, parens syntax
│       ├── ServicesGrid.tsx                                     MODIFIED — featuredImageUrl prop, falls back to picsum only when unset
│       ├── TrustStrip.tsx                                       MODIFIED — parens syntax
│       ├── WhyChooseUs.tsx                                      MODIFIED — parens syntax
│       ├── AboutSection.tsx                                     MODIFIED — parens syntax
│       ├── ServiceAreaSection.tsx                                MODIFIED — parens syntax
│       └── ContactSection.tsx                                   MODIFIED — parens syntax
├── domain/
│   ├── models/site-preview.ts                                   MODIFIED — PreviewTheme.servicesImageUrl
│   └── schemas/site-preview.schema.ts                            MODIFIED — servicesImageUrl schema field
└── lib/ai/
    ├── generate-preview.ts                                      MODIFIED — servicesImageUrl derivation
    └── __tests__/generate-preview.test.ts                       MODIFIED — 3 new tests
```

---

# Photo Slot Assignment + Admin CSS Bracket-Syntax Sweep + Input Text Color Fix

**Date:** 2026-07-14
**Scope:** Follow-up from live testing after the Brand Theme System fixes. Four items: a repo-wide sweep of the same Tailwind bracket-syntax bug found in the template, an unreadable-input-text bug with the same root cause, a clarification on `brandTone`'s actual effect, and a new photo-slot-assignment feature addressing "About Us has no image", "only 3 of 5 uploaded photos get used", and "the hero image crop looks awkward".

## 1. Admin-wide Tailwind bracket-syntax sweep

The same `[--color-brand]` bracket-syntax bug fixed in the template (see the prior "Brand Theme System Live Testing" entry) was present throughout the admin dashboard — `BusinessForm.tsx`, `CtaConfigForm.tsx`, the business list/detail/edit pages, `previews/page.tsx`, and `sign-in/page.tsx`. Converted every occurrence (`text-`, `ring-`, `bg-`, `border-` variants of `--color-brand`/`--color-brand-dark`/`--color-border`) from `[--color-*]` to `(--color-*)`. The admin's brand-blue buttons, links, and focus rings likely never actually rendered blue before this fix.

## 2. Unreadable input text (same root cause as the black background)

`Field` and `TextareaField` in `BusinessForm.tsx`, the plain label/destination `<input>`s in `CtaConfigForm.tsx`, and the sign-in page's username/password inputs never set an explicit text/background color. Without one they inherit `color: var(--foreground)` from `<body>` (`app/globals.css`) — near-white (`#ededed`) under `prefers-color-scheme: dark` — making typed text and placeholders unreadable in a dark-mode browser. Added explicit `bg-white text-gray-900` to all of them.

## 3. Brand Tone — clarified, not changed

Confirmed `Business.brandTone` is included as one free-text line (`Brand tone: ${business.brandTone}`) in both OpenAI prompts (`lib/ai/generate-preview.ts` content generation and `lib/theme/select-theme.ts` theme selection) — it's a soft stylistic hint the model may or may not lean into, not a hard constraint on copy, CTA logic, or theme choice. No code change; reported to the user for awareness.

## 4. Photo slot assignment

Real bugs found via live testing with 5 uploaded photos:

- **`AboutSection.tsx` (titled "About Us") never rendered any photo**, always showing a static decorative box + hardcoded quote regardless of uploads. Root cause: `PreviewTheme.aboutImageUrl` — despite its name and doc comment ("about/why-choose-us section image") — was only ever wired into `WhyChooseUs.tsx`, never `AboutSection.tsx`. Fixed by giving `AboutSection` its own `imageUrl` prop (rendered with a dark-to-transparent scrim over the photo so the quote stays legible, falling back to the original decorative box when absent) fed by a **new** `PreviewTheme.aboutSectionImageUrl` field — added rather than renaming the existing (if confusingly-named) `aboutImageUrl`, to avoid another breaking schema change so soon after the Brand Theme System's.
- **Only 3 of 5 uploaded photos were ever used** — the hero/about(WhyChooseUs)/services slots pulled from `photoUrls[0/1/2]` only, with no 4th slot. Adding the About section's own image slot (`photoUrls[3]`, falling back to `[1]`/`[0]`) bumped usable slots from 3 to 4.
- **Awkward crops/cut-off heads**: `WhyChooseUs`'s photo container used `object-cover` with default (center) positioning, which can crop a person's head out of frame in a portrait-oriented photo. Changed to `object-cover object-top` for `WhyChooseUs` and the new `AboutSection` image. The hero's crop was deliberately left alone — see below.
- **Hero image "awkwardness"** (a photo with no real "hero" composition, forced into a full-bleed wide/short background): discussed with the user as a design question rather than silently tweaked, since the root problem is that photos are assigned to slots purely by upload position with no way to know if a photo actually *suits* that slot. Presented three options (cheap crop tuning only / full manual per-photo role picker / hybrid). **User chose the hybrid: keep automatic upload-order assignment as the default, add optional per-slot overrides.**

### Hybrid override implementation

- `Business` gains four optional fields: `heroPhotoUrl`, `aboutPhotoUrl`, `whyChooseUsPhotoUrl`, `servicesPhotoUrl`. Each is either a URL from the business's own `photoUrls`, or the reserved literal `'none'` (forces that slot's non-photo fallback — e.g. the hero's existing gradient/pattern/solid styles — even though photos exist), or unset (`'Auto'`, keep the automatic pick). Schema: `PhotoSlotOverrideSchema = z.union([UrlOrPathSchema, z.literal('none')]).optional()`.
- `resolvePhotoSlot(override, ...autoFallbacks)` (`lib/ai/generate-preview.ts`) is the single point every slot's URL is resolved through — override wins, `'none'` forces `undefined`, otherwise the first defined value in the automatic upload-order fallback chain.
- `BusinessForm.tsx` — new "Photo Assignment" section: a numbered thumbnail grid of the business's uploaded photos, plus one `<select>` per slot (Hero background / About Us section / Why Choose Us section / Featured service card), each offering Auto / No photo / one option per uploaded photo. Only rendered once `defaults?.photoUrls` has entries — practically only on the edit form, since an override has to reference a photo that's already been uploaded and has a URL (the create form can't offer this in the same submission that uploads the photos).
- `businesses/actions.ts` — `createBusinessAction`/`editBusinessAction` persist the four override fields (empty select value → `undefined`, i.e. "Auto").

## Verification

```
✓ Lint:        0 errors  (npm run lint)
✓ TypeCheck:   0 errors  (npx tsc --noEmit)
✓ Tests:       230 passed  (npm test) — 7 new tests (override pinning, 'none' sentinel, schema validation, form persistence)
✓ Build:       production build succeeds  (npm run build)
```

## Deferred

- No composition-quality awareness beyond `object-top` — a photo can still be a poor fit for a slot; the override lets an admin fix it manually, nothing automatic detects it.

## Files changed

```
web/
├── app/admin/
│   ├── (dashboard)/businesses/
│   │   ├── BusinessForm.tsx                                    MODIFIED — parens syntax, input text color, PhotoSlotField + Photo Assignment section
│   │   ├── actions.ts                                          MODIFIED — PHOTO_SLOT_FIELDS parsed + persisted, parens syntax
│   │   ├── __tests__/actions.test.ts                           MODIFIED — 2 new tests
│   │   ├── page.tsx                                            MODIFIED — parens syntax
│   │   └── [businessId]/
│   │       ├── CtaConfigForm.tsx                                MODIFIED — parens syntax, input text color
│   │       ├── page.tsx                                        MODIFIED — parens syntax
│   │       └── edit/page.tsx                                    MODIFIED — parens syntax
│   ├── (dashboard)/previews/page.tsx                             MODIFIED — parens syntax
│   └── sign-in/page.tsx                                         MODIFIED — parens syntax, input text color
├── app/b/[slug]/template/
│   ├── AboutSection.tsx                                        MODIFIED — renders imageUrl, scrim, decorative fallback preserved
│   ├── WhyChooseUs.tsx                                          MODIFIED — object-top crop
│   └── index.tsx                                                MODIFIED — aboutSectionImageUrl wiring
├── domain/
│   ├── models/business.ts                                      MODIFIED — 4 photo-slot override fields
│   ├── models/site-preview.ts                                   MODIFIED — PreviewTheme.aboutSectionImageUrl
│   ├── schemas/business.schema.ts                               MODIFIED — PhotoSlotOverrideSchema
│   ├── schemas/site-preview.schema.ts                            MODIFIED — aboutSectionImageUrl field
│   └── __tests__/domain.test.ts                                 MODIFIED — 3 new tests
└── lib/ai/
    ├── generate-preview.ts                                      MODIFIED — resolvePhotoSlot(), override-aware slot derivation
    └── __tests__/generate-preview.test.ts                       MODIFIED — 2 new tests
```

---

# Hero Industry Watermark Icon

**Date:** 2026-07-14
**Scope:** Improves the hero's no-photo fallback (gradient/pattern/solid) with a large, low-opacity industry-specific icon, per user decision after weighing it against per-industry stock photography (rejected: licensing overhead, and — since this app's actual customer base is competing local businesses in the same city/industry receiving postcards — the real risk of two competitors ending up with the identical stock photo).

- `app/b/[slug]/template/industry-icons.tsx` — `INDUSTRY_HERO_ICONS: Record<Industry, LucideIcon>` (Wrench/plumbing, Fan/hvac, Zap/electrical, HardHat/roofing, Trees/landscaping, PaintRoller/painting, SprayCan/cleaning, UtensilsCrossed/restaurant, Croissant/bakery, Scissors/salon, Scale/law_firm, Calculator/accounting), `getHeroIcon(industry)` with a `Sparkles` default. Uses `lucide-react`, already a dependency.
- `GeneratedHero.tsx` — new optional `industry` prop; when there's no hero photo (`!showImage`, i.e. gradient/pattern/solid styles), renders the mapped icon as a large (`32rem`) `text-white/10` watermark, positioned off the right edge, hidden below `lg:` to avoid mobile clutter. Rendered via `createElement` rather than a JSX `<Icon />` tag — assigning a dynamically-selected component to a capitalized variable and using it as a JSX element trips ESLint's `react-hooks/static-components` rule (a known false positive for "select one of several static components," but `createElement` sidesteps the JSX-tag pattern it matches on cleanly).
- Wired `business.industry` through `/b/[slug]/page.tsx` → `GeneratedWebsite` (`template/index.tsx`) → `GeneratedHero`.

## Verification

```
✓ Lint:        0 errors  (npm run lint)
✓ TypeCheck:   0 errors  (npx tsc --noEmit) — Record<Industry, LucideIcon> is exhaustive by construction
✓ Tests:       230 passed  (npm test)
✓ Build:       production build succeeds  (npm run build)
```

## Files changed

```
web/
└── app/b/[slug]/
    ├── page.tsx                                                 MODIFIED — passes business.industry through
    └── template/
        ├── industry-icons.tsx                                   NEW
        ├── GeneratedHero.tsx                                     MODIFIED — industry prop, watermark icon via createElement
        └── index.tsx                                             MODIFIED — industry prop wiring
```

---

# Stage 11.x — Configurable Website-Section System

**Date:** 2026-07-15
**Scope:** Foundation stage inserted before Stage 12 (Google Places discovery), per explicit instruction. Replaces the permanently fixed page layout in `template/index.tsx` with a stored, per-business section configuration that a controlled component registry renders from. An admin can now enable/disable optional sections and reorder them; required sections (Header, Hero, Services, Contact, Footer) can never be disabled. A deterministic, non-AI recommendation function proposes a configuration from currently-stored business data. Explicitly **not** implemented here: Google Places (Stage 12), Firecrawl, AI section selection/approval, AI-generated testimonials/reviews, drag-and-drop, or a full CMS — see "Remaining limitations" below.

## Why business-level, not preview-level

`WebsiteSectionConfig`/`sectionConfigVersion` is stored on `Business.websiteSections`, not on `SitePreview`. Section layout is a durable presentation choice (which optional sections a business wants shown, and in what order) — conceptually the same kind of setting as `Business.theme`, which already persists across every preview regeneration rather than living on the versioned `SitePreview` record. Putting it on `Business` means: (1) an admin's section choices survive re-running "Generate Website," (2) the future client dashboard (Cognito-authenticated) edits one business-scoped setting rather than reasoning about preview versions, and (3) it mirrors the exact precedent the Brand Theme System already established for this codebase.

## Fixed component catalog (`domain/constants/website-sections.ts`)

`WEBSITE_SECTION_TYPES` — 15 identifiers exactly matching the objective's recommended enum (`header`, `hero`, `trustStrip`, `services`, `about`, `whyChooseUs`, `reviews`, `testimonials`, `gallery`, `faq`, `serviceAreas`, `process`, `ctaBanner`, `contact`, `footer`). `REQUIRED_SECTION_TYPES` (`header`, `hero`, `services`, `contact`, `footer`) and `SECTION_CONFIG_VERSION = 1` sit alongside. `WEBSITE_SECTION_CATALOG: Record<WebsiteSectionType, …>` is the single source of truth for `required`, `defaultEnabled`, `defaultVariant`, `variants` (every entry is `['default']` today — no section has more than one layout yet, but the schema/registry are variant-ready), and `defaultOrder` (10-point increments: header 10 → footer 100, with room between existing values for future insertions). This lives in `domain/`, not `lib/`, because the Zod schema needs it to validate `variant` per `component` at parse time — unlike the Brand Theme System's palette split (schema only needs theme *names*, not hex values), the section catalog's variant list is itself validation-relevant.

## Data model (`domain/models/website-sections.ts`, `domain/models/business.ts`)

```ts
interface WebsiteSectionConfig { component: WebsiteSectionType; enabled: boolean; order: number; variant: string; }
interface WebsiteSectionsConfig { sectionConfigVersion: number; sections: WebsiteSectionConfig[]; }
```

`Business.websiteSections?: WebsiteSectionsConfig` — optional, absent on every business created before this stage. Also added, optional and currently unpopulated by any write path (see "Remaining limitations"): `Business.googleRating`, `Business.googleReviewCount` (reserved ahead of Stage 12, mirroring how `googlePlaceId`/`googleMapsUrl` were reserved ahead of their own stage), `Business.testimonials: {author, quote}[]`, `Business.faqItems: {question, answer}[]`, `Business.processSteps: {title, description}[]` — manually-verified content fields with no generation path. `domain/schemas/business.schema.ts` validates all of them (length/count caps matching the existing free-text field conventions).

## Validation (`domain/schemas/website-sections.schema.ts`)

Two Zod schemas: `WebsiteSectionConfigSchema` (item-level — `component` restricted to the catalog enum, `enabled` boolean, `order` a bounded non-negative integer, `variant` checked against that specific component's `WEBSITE_SECTION_CATALOG[component].variants`) and `WebsiteSectionsConfigSchema` (whole-config — `sectionConfigVersion` not newer than `SECTION_CONFIG_VERSION`, no duplicate `component` entries, every `REQUIRED_SECTION_TYPES` entry present *and* `enabled: true`). `Business.websiteSections` is wired into `BusinessSchema` via the second schema, so nothing invalid can reach DynamoDB through the normal repository write path (`putBusiness`/`updateBusiness` both call `BusinessSchema.parse()`).

## Defaults and backward compatibility (`domain/factories/website-sections.factory.ts`)

`createDefaultWebsiteSectionsConfig()` builds a full 15-entry config straight from the catalog's `defaultEnabled`/`defaultOrder`/`defaultVariant`. The defaults were chosen to exactly reproduce the pre-existing fixed template's appearance: `header`/`hero`/`trustStrip`/`services`/`whyChooseUs`/`about`/`serviceAreas`/`ctaBanner`/`contact`/`footer` default `enabled: true` (the old `template/index.tsx` always attempted to render all of these, several already gated by their own data-presence checks); `reviews`/`testimonials`/`gallery`/`faq`/`process` default `enabled: false` since the old template never rendered them at all. No migration was needed or run — `Business.websiteSections` being absent is a fully valid, expected state that the render path (below) falls back from on every request, so every existing business/preview keeps rendering exactly as before with zero data changes.

## Section logic (`lib/website-sections/`, not `domain/` — mirrors the `lib/theme/` split)

- `availability.ts` — `computeSectionAvailability({business, content, hasCta})` — deterministic, no AI, content-presence checks per section (`services`/`about`/`whyChooseUs`/`serviceAreas` read the generated preview's `PreviewContent`; `gallery` reads the existing `Business.photoUrls` upload — genuinely functional today, unlike the Stage-12-reserved fields; `reviews`/`testimonials`/`faq`/`process` read the new, currently-always-empty `Business` fields above; `header`/`hero`/`trustStrip`/`contact`/`footer` are always available; `ctaBanner` mirrors the caller-supplied `hasCta`). Also exports `hasResolvableCta(business, content?)`, a conservative phone/email/CTA-value check used when no `SitePreview` exists yet to resolve against (the authoritative renderer path uses `resolvePreviewCtaConfig` instead — see below).
- `resolve.ts` — `resolveStoredOrDefaultSections(stored)`: the lenient, render-safe pipeline — falls back to the computed default when configuration is absent or its version is newer than this build understands; drops individually malformed or unsupported-variant entries while keeping the rest (defense in depth beyond what `BusinessSchema.parse()` on read already guarantees); deduplicates by `component`, keeping the first occurrence; backfills any missing required section from the catalog and force-enables any stored-disabled required section; sorts by `order`. `resolveRenderableSections(stored, availability)` layers the availability gate on top (required sections always pass; optional sections must also be `enabled` *and* available). `resolveSectionWarnings(sections, availability)` surfaces the inverse — enabled-but-unavailable optional sections — for the admin UI.
- `recommend.ts` — `recommendWebsiteSections({business, content, hasCta})`: the non-AI, rule-based "Apply Recommended Sections" function. Required sections always recommended `enabled: true`; every optional section's recommendation reuses the exact same `computeSectionAvailability` predicate that gates public rendering — deliberately DRY, since the objective's own rule list ("Reviews: enable when a valid rating or review count is available," etc.) *is* the availability check. Order/variant always come from catalog defaults; this stage doesn't recommend custom ordering.

## Rendering architecture (`app/b/[slug]/template/`)

- `section-registry.tsx` (new) — `SectionRenderContext` (business, content, theme, businessName, logoUrl, industry, isClaimed, phone, email, primary/secondary resolved CTA) and `sectionRegistry: Record<WebsiteSectionType, (ctx) => ReactNode>`, one small adapter per catalog entry mapping the shared context onto each existing component's actual (heterogeneous) prop shape. This is the only place a `WebsiteSectionType` string is ever turned into a real component — no dynamic import, no string-keyed `require`, nothing database-controlled ever reaches `React.createElement` directly.
- `index.tsx` (`GeneratedWebsite`, rewritten) — computes `content`/`theme`/resolved CTA exactly as before, then: `computeSectionAvailability(...)` → `resolveRenderableSections(business.websiteSections, availability)` → maps the resulting ordered list through `sectionRegistry`. `MobileCallBar` stays outside the loop (not a catalog section — a persistent mobile-only overlay, unchanged). A disabled section is simply absent from the mapped array — no conditional wrapper, no empty `<section>` shell, so there's never a layout gap.
- Five new, minimal template components join the registry: `GallerySection.tsx` (renders `Business.photoUrls` — real data, works today), `ReviewsSection.tsx`, `TestimonialsSection.tsx`, `FaqSection.tsx` (native `<details>`/`<summary>`, no client JS), `ProcessSection.tsx` — all gated by the same availability check as everything else, so on every business today except `gallery` (once photos exist) they simply don't render until their data source is populated.
- `app/b/[slug]/page.tsx` — now also passes the full `business` object through to `GeneratedWebsite` (previously only `businessName`/`logoUrl`/`industry` were destructured out).

## Admin workflow (`app/admin/(dashboard)/businesses/[businessId]/`)

New "Website Sections" card on the business detail page, below the existing Preview/CTA cards. `SectionConfigForm.tsx` (client component, `useActionState`, mirrors `CtaConfigForm.tsx`'s pattern) renders one row per resolved section: required sections show a disabled, checked checkbox and a "Required" badge; optional sections show a live checkbox; every row has a numeric `order` input; an enabled-but-unavailable optional section shows an inline amber warning ("Enabled, but hidden on the public preview — no content available yet") computed server-side via `resolveSectionWarnings`. Two plain-bind quick-action buttons sit above the form: **Apply Recommended Sections** (`applyRecommendedSectionsAction`, uses the business's most recent preview content when one exists, `resolveStoredOrDefaultSections`'d as its own action) and **Reset to Defaults** (`resetWebsiteSectionsAction`, pure catalog defaults, no business-data awareness — deliberately distinct from "recommended"). Saving (`saveWebsiteSectionsAction`) reconstructs the full 15-entry array server-side from form fields, **force-enables required sections regardless of what was submitted** (defense against a tampered/bypassed disabled-attribute request — verified manually, see below), validates strictly against `WebsiteSectionsConfigSchema`, and rejects the whole save with the Zod error message on any violation rather than partially persisting.

## Tests

64 new tests (294 total, was 230): `domain/__tests__/website-sections.test.ts` (19 — default-config content/version/schema-validity, item- and config-level schema rejection cases including unsupported component/variant/negative-order/duplicate/missing-required/future-version, `Business.websiteSections` optionality and validation); `lib/website-sections/__tests__/availability.test.ts` (15), `recommend.test.ts` (7), `resolve.test.ts` (15 — malformed-entry dropping, dedup, required backfill/force-enable, sort, availability filtering, warnings); `app/admin/.../[businessId]/__tests__/website-sections-actions.test.ts` (8 — auth, persistence, required force-enable, invalid-order rejection without persisting, business-not-found, recommend/reset flows).

## Manual verification

Full lint/typecheck/test/build pass (see below). Additionally live-tested end-to-end against the real dev DynamoDB (`--profile webpresa`) and a temporary local-only dev server: signed in via a locally-generated throw-away credential set (process env only — `.env.local` untouched, nothing persisted after the session), then drove every admin flow via raw HTTP against Next's server-action no-JS form encoding (no browser available in this environment):

- Every existing business's detail page renders the new card with the expected default checkbox/badge states (required sections locked+checked; trustStrip/whyChooseUs/about/serviceAreas/ctaBanner checked; reviews/testimonials/gallery/faq/process unchecked) — confirmed across all 6 businesses in the dev table, `200 OK`, zero server-log errors or warnings.
- Disabling Trust Strip and saving: persisted (re-fetched form shows unchecked), and the public preview (`/b/tims-fart-factory`) immediately stopped rendering any Trust Strip content — no layout gap, no error.
- **Apply Recommended Sections** on a business with real uploaded photos: correctly enabled `gallery` (real `photoUrls` data) while leaving `reviews`/`testimonials`/`faq`/`process` disabled (no data) — the public preview then rendered a working "Our Work" gallery section in its correct catalog position between Services and About.
- **Reset to Defaults**: reverted `gallery` back to disabled, ignoring the fact that photos exist — confirming it's data-blind by design, distinct from "recommended."
- Submitting an invalid `order` value (`-5`): rejected with `200` (no redirect) and the exact Zod message ("Number must be greater than or equal to 0") surfaced in the admin alert box; nothing persisted.
- Submitting a save with every `enabled_*` field omitted (simulating a client that bypassed the `disabled` attribute on required checkboxes): required sections were still force-enabled server-side; public preview kept rendering with no errors.
- **Apply Recommended Sections** on a business with zero `SitePreview` records at all (`content: undefined`): completed without error, confirming the admin action's optional-content handling.

Not verified in this pass (no browser available in this environment — see the note below): actual visual rendering at desktop/mobile breakpoints, hydration-warning console output, and drag/keyboard interaction with the form. The new section components reuse the same Tailwind responsive patterns (`grid`, `sm:`/`lg:` breakpoints, `<details>`/native form controls) already shipping in every other template component, so this is a reasoned inference rather than a pixel-verified one.

```
Lint:      0 errors   (npm run lint)
TypeCheck: 0 errors   (npx tsc --noEmit)
Tests:     294 passed (npm test) — 64 new
Build:     clean      (npm run build) — no new routes, all existing routes unchanged
```

## How Stage 12 (Google Places) will feed these rules

Stage 12 is expected to populate `Business.googleRating`/`Business.googleReviewCount` from the Places Details API. The moment those fields carry real values, `computeSectionAvailability`'s `reviews` check flips to `true` for that business with **zero code changes** — the same is true for `recommendWebsiteSections`, since it reuses the identical predicate. `gallery` already works today off `Business.photoUrls`; Stage 12/13 (Firecrawl) could similarly populate `testimonials`/`faqItems`/`processSteps` once a real, verified source for that content exists (Stage 12 itself doesn't supply testimonials/FAQs/process steps — those would need their own future stage or an admin-entry UI, neither built here). No renderer, registry, or schema change is anticipated to be necessary for Stage 12 to start driving section eligibility — this was the explicit goal of building the availability/recommendation layer against the data model now rather than later.

## Remaining limitations

- No admin UI to manually enter `testimonials`/`faqItems`/`processSteps` content yet — those fields exist and validate, but nothing currently writes to them, so those three sections cannot show real content until a future stage adds either an entry UI or an automated (verified, non-AI-fabricated) source.
- `googleRating`/`googleReviewCount` are inert until Stage 12 exists.
- Variant support is structural only — every section has exactly one (`'default'`) variant; no admin UI exists to pick a variant because there's nothing to pick yet.
- Order editing is a plain number input, not drag-and-drop, per the objective's explicit scope limit.
- No visual/browser verification was possible in this environment (see "Manual verification" above).

## Files created / modified

```
web/
├── domain/
│   ├── constants/website-sections.ts                           NEW — WEBSITE_SECTION_TYPES, catalog, version
│   ├── models/website-sections.ts                               NEW — WebsiteSectionConfig, WebsiteSectionsConfig
│   ├── models/business.ts                                       MODIFIED — websiteSections + googleRating/googleReviewCount/testimonials/faqItems/processSteps
│   ├── models/index.ts                                          MODIFIED — export website-sections
│   ├── schemas/website-sections.schema.ts                       NEW — item + config Zod schemas
│   ├── schemas/business.schema.ts                                MODIFIED — new field validation
│   ├── schemas/index.ts                                         MODIFIED — export website-sections.schema
│   ├── factories/website-sections.factory.ts                    NEW — createDefaultWebsiteSectionsConfig
│   ├── factories/index.ts                                       MODIFIED — export website-sections.factory
│   └── __tests__/website-sections.test.ts                       NEW — 19 tests
├── lib/website-sections/
│   ├── availability.ts                                          NEW — computeSectionAvailability, hasResolvableCta
│   ├── recommend.ts                                              NEW — recommendWebsiteSections
│   ├── resolve.ts                                                NEW — resolveStoredOrDefaultSections, resolveRenderableSections, resolveSectionWarnings
│   └── __tests__/{availability,recommend,resolve}.test.ts        NEW — 37 tests
├── app/b/[slug]/
│   ├── page.tsx                                                  MODIFIED — passes business prop
│   └── template/
│       ├── section-registry.tsx                                  NEW — SectionRenderContext, sectionRegistry
│       ├── GallerySection.tsx                                    NEW
│       ├── ReviewsSection.tsx                                    NEW
│       ├── TestimonialsSection.tsx                                NEW
│       ├── FaqSection.tsx                                        NEW
│       ├── ProcessSection.tsx                                    NEW
│       └── index.tsx                                             MODIFIED — renders from resolved config via registry
└── app/admin/(dashboard)/businesses/[businessId]/
    ├── actions.ts                                                MODIFIED — saveWebsiteSectionsAction, applyRecommendedSectionsAction, resetWebsiteSectionsAction
    ├── SectionConfigForm.tsx                                     NEW
    ├── page.tsx                                                  MODIFIED — Website Sections card
    └── __tests__/website-sections-actions.test.ts                 NEW — 8 tests
```

---

# Admin Onboarding Flow — 3-Step Wizard + Inline Editing

**Date:** 2026-07-15
**Scope:** UX fix, prompted by direct user feedback that the "Add business" flow was clunky (enter everything in one form, then bounce between the business detail page and a separate edit page to configure CTA/sections/photos) and that clicking "Edit" navigated away to a whole other page. Two changes:

1. **"Add business" is now a 3-step wizard**: Business Details (text) → Photos → Website Sections, each its own page. Submitting step 1 immediately creates the `Business` record (`status: 'pending'`) and redirects to the photos step — photo uploads need an existing `businessId` to key their S3 path off of, so a single atomic create-with-everything submit was never actually possible once assets were involved. If an admin abandons the wizard partway through, the business already exists and is fully editable from its detail page (see point 2) — there's no special "resume" mode, because that page already shows everything the wizard would have asked for.
2. **The standalone `/edit` page is gone.** Every field it contained is now inline, editable directly on the business detail page — no navigation required to change anything. The Preview actions card moved to the bottom of the page, after CTA and Website Sections, since it's the last thing an admin should look at once everything above it is configured.

## Why two narrow actions, not one big one

The old edit page saved the entire `Business` record from one monolithic form/schema. Splitting the UI into a "Business Details" card and a "Photos" card meant a naive reuse of that one big action would have been dangerous: submitting the Details card (which no longer has file inputs) through the old action would silently overwrite `logoUrl`/`photoUrls`/photo-slot fields with `undefined`, since the old action always wrote every field from its schema. Instead, `updateBusinessDetailsAction` and `updatePhotosAction` (`[businessId]/actions.ts`) are genuinely separate: each does its own `getBusinessById` → merge its own field subset → `putBusiness()`, so saving one card can never clobber the other's data. Both take a bound `redirectTo` parameter so the exact same action/form pair serves both the wizard step (redirects to the next step) and the detail page's inline card (redirects back to itself).

## New shared form components

`BusinessForm.tsx` (the old monolithic form) is deleted. In its place:

- `FormFields.tsx` — the field-level building blocks (`Field`, `TextareaField`, `SelectField`, `FileField`, `ThemeField`, `PhotoSlotField`, `PhotoThumbnail`, `SubmitButton`), extracted so both new forms and the wizard steps share one implementation instead of copy-pasting markup.
- `BusinessDetailsForm.tsx` — identity, contact, address, Stage 11 website-generation inputs, and admin source/status (status only shown when editing an existing record — a brand-new business is always `pending`). Used by wizard step 1 (`createBusinessAction`) and the detail page's "Business Details" card (`updateBusinessDetailsAction`).
- `PhotosForm.tsx` — logo/photo upload plus the existing photo-slot assignment UI. Used by wizard step 2 and the detail page's "Photos" card (both via `updatePhotosAction`).
- `lib/s3/business-assets.ts` (new) — `uploadBusinessAssets`, extracted from the old `businesses/actions.ts` into a plain (non-`'use server'`) module so both `businesses/actions.ts` and `[businessId]/actions.ts` can import it. A `'use server'` file's every export must itself be a valid Server Action, so a shared upload helper can't live inside one directly.

Also added a `legalName` field to `Business Details` — the `Business` model already had a `legalName` field (shown read-only on the old detail page) with no way to actually set it from any form; closed while already rebuilding this exact form.

## Wizard steps (`[businessId]/onboarding/`)

- `photos/page.tsx` — `PhotosForm` bound to `updatePhotosAction(businessId, '.../onboarding/sections')`. "Skip for now" link goes straight to the sections step.
- `sections/page.tsx` — `SectionConfigForm` (reused unchanged, given an optional new `submitLabel` prop — "Finish setup →" here vs. "Save Sections" on the detail page). Pre-fills with `recommendWebsiteSections(...)` rather than plain catalog defaults when the business has no stored configuration yet, since step 2 (photos) likely just ran and gallery availability may have changed — reuses the exact same deterministic, non-AI recommendation logic Stage 11.x already built. "Skip — use these →" link goes straight to the business detail page; since an unset `Business.websiteSections` already falls back to computed defaults at render time (Stage 11.x's own backward-compatibility design), skipping is always safe.
- `saveWebsiteSectionsAction` (unchanged) already redirects to the business detail page, which is exactly "Finish" — no new redirect-parameter plumbing needed for step 3.

## Business detail page (`[businessId]/page.tsx`)

Reordered top to bottom: Business Details (form) → Photos (form) → Timestamps/Scores/Billing (read-only, 3-column row) → Previews/Scans/Postcards history (read-only, 3-column row) → Preview CTA (form, if a preview exists) → Website Sections (form) → **Preview actions (moved to the bottom)** → deferred-actions note. The header's "Edit" button/link is gone — "Delete" is the only header action now. The now-unused `Empty`/`StatusRow` sub-components (only ever used by the read-only Identity/Contact/Address cards this replaces) were removed along with them.

## Tests

`businesses/__tests__/actions.test.ts` trimmed to `createBusinessAction` only (asset-upload and `editBusinessAction` tests removed — that functionality moved to `updatePhotosAction`/`updateBusinessDetailsAction`); new `[businessId]/__tests__/business-details-actions.test.ts` (12 tests) covers both new actions, including the specific regression the split-action design exists to prevent: saving the Details card never touches photo fields and vice versa. Net test count: 298 (was 294; +12 new, -8 removed).

## Bug fix along the way — stale `.next` build cache

While investigating a separately-reported "Edit gives a 404" issue, found that a prior verification session's `npm run build` (a production build) had overwritten the same `.next` directory the user's `npm run dev` was using, leaving it in a state dev mode doesn't understand. `rm -rf .next` + restart resolved it. Documented here because it directly motivated *not* running `npm run build` again against the shared directory for this change's own verification — instead verified via `tsc --noEmit` (clean), `npm run lint` (clean), the full test suite (298 passed), and unauthenticated `curl` checks confirming every touched route still resolves (redirects to sign-in, not a 404) against the user's live dev server. A second, fully authenticated verification pass (throwaway credentials, isolated dev server) was attempted but aborted immediately on realizing two concurrent `next dev` processes would share — and could corrupt — the same `.next` directory the user's real session depends on; the user was asked to click through the new flow directly instead, since they already had an authenticated session open.

## Verification

```
Lint:      0 errors   (npm run lint)
TypeCheck: 0 errors   (npx tsc --noEmit)
Tests:     298 passed (npm test)
Build:     not re-run against the shared dev directory (see above) — tsc/lint/tests are the verification signal for this change
```

## Files created / modified / deleted

```
web/
├── next.config.ts                                                MODIFIED — comment update (editBusinessAction → updatePhotosAction)
├── lib/s3/business-assets.ts                                     NEW — uploadBusinessAssets (moved out of businesses/actions.ts)
└── app/admin/(dashboard)/businesses/
    ├── BusinessForm.tsx                                          DELETED
    ├── FormFields.tsx                                            NEW — shared field building blocks
    ├── BusinessDetailsForm.tsx                                   NEW
    ├── PhotosForm.tsx                                            NEW
    ├── actions.ts                                                MODIFIED — createBusinessAction trimmed to text fields + legalName, redirects to onboarding/photos; editBusinessAction removed
    ├── __tests__/actions.test.ts                                 MODIFIED — trimmed to createBusinessAction
    ├── new/page.tsx                                              MODIFIED — wizard step 1
    └── [businessId]/
        ├── actions.ts                                            MODIFIED — updateBusinessDetailsAction, updatePhotosAction added
        ├── page.tsx                                              MODIFIED — inline Business Details + Photos cards, Edit button removed, Preview card moved to bottom
        ├── SectionConfigForm.tsx                                 MODIFIED — optional submitLabel prop
        ├── edit/page.tsx                                         DELETED
        ├── __tests__/business-details-actions.test.ts            NEW — 12 tests
        └── onboarding/
            ├── photos/page.tsx                                   NEW — wizard step 2
            └── sections/page.tsx                                 NEW — wizard step 3
```

---

# Website Sections Reorder UI — Up/Down Controls + Catalog Renumbering

**Date:** 2026-07-16
**Scope:** UX fix, prompted by direct user feedback on the Website Sections admin card ("this is not user friendly, i have no idea how to update the order of components"). The raw `<input type="number">` per row required knowing the neighboring rows' exact order values to move anything — replaced with up/down arrow buttons, per the original Stage 11.x spec's own allowance ("simple numeric order inputs **or** move-up and move-down controls" — no heavy drag-and-drop dependency). Bundled in the same change: the user's explicit ask that Gallery default to sitting after Service Areas instead of between Services and Why Choose Us.

## Catalog renumbering (`domain/constants/website-sections.ts`)

`WEBSITE_SECTION_CATALOG`'s `defaultOrder` values and the `WEBSITE_SECTION_TYPES` array declaration order were both renumbered to the same ascending sequence (previously the two didn't match, and `recommendWebsiteSections`'s `Object.entries()` output relied on that coincidental alignment without ever sorting — a fragile, undocumented invariant): header(10), hero(20), trustStrip(30), services(40), whyChooseUs(50), about(60), reviews(70), testimonials(80), serviceAreas(90), **gallery(100)**, process(110), faq(120), ctaBanner(130), contact(140), footer(150). Gallery moved from its old position (45, between services and whyChooseUs) to right after serviceAreas, per the request. Confirmed via research before changing: no test in the repo hardcodes any specific section's numeric order or position relative to another by number — every order-assertion is either derived dynamically from the catalog or uses an arbitrary out-of-band value to test schema rules (negative/non-integer/duplicate rejection) — so this was safe to renumber freely.

## Reorder UI (`[businessId]/SectionConfigForm.tsx`, new `[businessId]/section-order.ts`)

- **Header and Footer are pinned** — always first/last, still shown (still locked-on, "Required" badge, disabled checkbox) but with no up/down arrows at all, removing the ability to create a nonsensical "Footer above Header" state.
- **The other 13 sections get ▲/▼ icon buttons** (hand-rolled inline SVG chevrons, matching the existing admin/template convention — `lucide-react` stays public-marketing-site-only, not introduced into `web/app/admin/`). Clicking a button swaps the row with its neighbor and the row visually moves immediately via client-side `useState`; order is never shown as a number to the admin — it's computed automatically from final row position on save (`(index + 1) * 10`), submitted as a hidden `order_<type>` input. **No server-side change was needed** — `saveWebsiteSectionsAction` already read `order_<type>` as a generic FormData field regardless of whether it came from a visible `<input type="number">` or a hidden one.
- New pure helper `section-order.ts` — `moveSection<T>(list, index, direction)`, a generic array-swap function extracted specifically so the reorder logic has real unit coverage: this repo's vitest config runs in a plain `node` environment (no jsdom/RTL anywhere), so `SectionConfigForm.tsx`'s own JSX/event-handler code can't be tested directly. New `__tests__/section-order.test.ts` (10 tests): swap up/down, no-op at both list boundaries, no-op on out-of-range index, doesn't mutate the input array, single-element list is always a no-op.
- Arrow buttons disable at the top/bottom of the reorderable list and while a save is in flight (`useActionState`'s third tuple element, `isPending` — supported since React 19, confirmed on the installed 19.2.4 — used directly in the parent component rather than requiring a child `useFormStatus` wrapper just for this).
- Required sections are still force-enabled server-side regardless of submitted form data (unchanged, pre-existing behavior, re-verified).

## Tests / verification

308 → 309 total (net +1: +10 new `section-order.test.ts`, existing suites unaffected — confirmed no test hardcoded a catalog order number). Lint and `tsc --noEmit` clean.

```
Lint:      0 errors
TypeCheck: 0 errors
Tests:     309 passed (10 new)
```

## Files changed

```
web/
├── domain/constants/website-sections.ts                          MODIFIED — renumbered defaultOrder, reordered declarations
└── app/admin/(dashboard)/businesses/[businessId]/
    ├── SectionConfigForm.tsx                                     MODIFIED — pinned header/footer rows, up/down buttons replace number input
    ├── section-order.ts                                          NEW — moveSection pure helper
    └── __tests__/section-order.test.ts                           NEW — 10 tests
```

---

# Admin Polish — AI Generation Cap Raised, Legacy Preview Buttons Retired

**Date:** 2026-07-16
**Scope:** Two small, user-requested tweaks to the business detail page's Preview card now that "Generate Website" (the real AI pipeline) is the primary/proven path.

- `MAX_AI_GENERATIONS` (`[businessId]/actions.ts`) raised from 3 to 10. The literal is duplicated once, in a comment-documented spot in `page.tsx` (`capReached={previews.filter(...).length >= 10}`) — the action file can't export the constant directly since every export of a `'use server'` module must itself be an async Server Action, per the existing comment explaining this same constraint.
- **"Create test preview" and "View preview" (the free, non-AI seed-preview action and its published-preview shortcut link) are commented out**, not deleted — left as inline JSX/import comments in `page.tsx` so re-enabling is a one-line uncomment if ever needed, rather than a re-implementation. `createSeedPreviewAction`'s import was correspondingly commented out to avoid an unused-import lint warning.

## Tests / verification

One existing test (`enforces the AI generation cap`) hardcoded exactly 3 prior generations to trigger the old cap — updated to seed 10. Full suite re-run clean afterward.

```
Lint:      0 errors
TypeCheck: 0 errors
Tests:     309 passed
```

## Files changed

```
web/app/admin/(dashboard)/businesses/[businessId]/
├── actions.ts                                                    MODIFIED — MAX_AI_GENERATIONS 3 → 10
├── page.tsx                                                      MODIFIED — cap literal synced, seed-preview/view-preview UI commented out
└── __tests__/actions.test.ts                                     MODIFIED — cap test seeds 10 prior generations
```

---

# Theme-Matched Illustration Hero Fallback

**Date:** 2026-07-16
**Scope:** Replaces the hero section's no-photo fallback. Previously: the OpenAI generation call itself picked one of three CSS-only backgrounds (`gradient`/`pattern`/`solid`, built from `color-mix()` over the theme's CSS variables) with a large low-opacity `lucide-react` industry icon watermarked on top (`industry-icons.tsx`). Now: a hand-designed, theme-matched illustration — one static image per Brand Theme preset, colored to that preset's own palette — renders deterministically in code, the same way `heroStyle: 'image'` was already hardcoded (never AI-chosen) whenever a hero photo exists. The color list needed to design the 10 images (primary/accent/surface per theme) was read directly from `lib/themes.ts` and handed to the user; they produced and delivered all 10 PNGs mid-session.

## Data model (`domain/models/site-preview.ts`)

`HERO_STYLES` gains `'illustration'`: `['image', 'illustration', 'gradient', 'pattern', 'solid']`. The Zod schema (`z.enum(HERO_STYLES)` in `site-preview.schema.ts`) picks it up automatically — no separate schema edit. `gradient`/`pattern`/`solid` remain valid values purely for backward compatibility — **no new generation produces them**; only previews saved before this change still carry them, and render exactly as before (`industry-icons.tsx`/lucide-react stay in the codebase, still actively serving those three legacy styles, just never reached by the new branch).

## Generation (`lib/ai/generate-preview.ts`)

`heroStyle: z.enum(['gradient', 'pattern', 'solid'])` removed from the OpenAI structured-output schema entirely — hero presentation is no longer something the model decides at all. Where `theme` is assembled, the no-photo branch changed from `{ heroStyle: output.heroStyle }` to a hardcoded `{ heroStyle: 'illustration' as const }`, mirroring the existing photo branch's already-deterministic `{ heroImageUrl, heroStyle: 'image' as const }`. `__tests__/generate-preview.test.ts` updated to match: removed the AI-selection assertions, added a test confirming a no-photo generation always produces `illustration`, deterministically.

## Assets

10 PNGs delivered by the user at `public/hero_illustrations/{themeName}.png` (note: underscore — the user's own naming, not the hyphenated path floated earlier in planning). Windows `:Zone.Identifier` download-metadata sidecar files that came along with the upload were cleaned up. Files run ~1.2–1.6MB each — heavy for a background image given `next.config.ts` has `images.unoptimized: true` (no server-side compression); flagged as a possible follow-up, not addressed here. New `app/b/[slug]/template/hero-illustrations.ts` — a static `Record<ThemeName, string>` lookup (`getHeroIllustration(themeName)`), mirroring the existing `getHeroIcon`/`INDUSTRY_HERO_ICONS` pattern in `industry-icons.tsx`; falls back to `DEFAULT_THEME_NAME`'s illustration for legacy previews with no stored `themeName`, the same graceful-fallback pattern `resolveThemePalette` already uses for legacy color-only previews.

## Rendering (`app/b/[slug]/template/GeneratedHero.tsx`, `section-registry.tsx`)

New `themeName?: ThemeName` prop, wired through `section-registry.tsx`'s `hero` entry (`themeName={ctx.theme.themeName}`). Style inference changed from `heroStyle ?? (heroImageUrl ? 'image' : 'solid')` to `heroStyle ?? (heroImageUrl ? 'image' : 'illustration')` — legacy previews saved before `heroStyle` existed at all now upgrade to the nicer illustration fallback instead of a flat color, a pure visual improvement with no compatibility risk.

`resolvedStyle === 'illustration'` is a genuinely distinct early-return branch, not squeezed into the single-background-layer chain that serves the legacy styles:

- **Desktop (`lg:`)**: a true full-bleed two-column split. No `max-w-6xl` wrapper on the outer grid (every other section sits inside one) — the illustration column reaches the actual browser edge. Light background, no dark readability scrim (today's overlay exists only because text sits *on top of* a busy image; here text sits on a plain panel). Text column top-aligned (not vertically centered against the illustration's height — centering was tried first and left a large empty gap above the eyebrow whenever the illustration was tall) with its own `lg:pl-12 xl:pl-20` padding; image column full-bleed via `next/image` `fill`/`object-cover`.
- **Mobile**: went through several iterations based on live feedback against the user's own reference screenshots before landing on the final design — (1) image as its own banner block above the text: rejected, looked "sandwiched"; (2) image as a uniform 30%-opacity watermark behind the whole text block: rejected outright. **Final**: full-color image, `position: absolute`, cropped to the right ~35% of the screen (user-tuned in the editor after trying 25/40/60%), bleeding off the right edge; height matches the text column's own natural content height exactly via `inset-y-0` against a `relative` wrapper whose height is driven purely by the text (the earlier watermark attempt's artificial `min-h-[520px]` floor was removed — that's what had let the image overshoot below the CTAs). A gradient-fade div, sharing the *exact same box* as the image (not a separately-sized sibling — an earlier version mismatched the two boxes' widths, which silently faded the gradient out to nothing before it ever reached the image's actual edge, producing a hard seam instead of a blend), blends the image's left portion into `var(--site-background)` so text stays legible regardless of which theme's specific illustration is behind it. Headline/subheadline capped to `max-w-[75%]`, the CTA button row to a tighter `max-w-[60%]` (button borders read worse touching the image edge than plain text does) — both mobile-only, reset at `lg:`. One regression caught and fixed along the way: widening the image to 60% without narrowing the CTA cap let the secondary button's opaque `border-2` extend into the image and draw a visible line through it — confirmed by inspecting the actual source PNG (no seam baked into the art) before concluding it was a CSS overlap, not an asset defect.

## Tests / verification

309 tests throughout (no test logic touched by the mobile CSS iterations — pure JSX/Tailwind). `generate-preview.test.ts` changes covered above. Confirmed via the running dev server (not a rebuild): all 10 `/hero_illustrations/*.png` paths return 200; a business with an existing uploaded photo renders completely unaffected (the `image` branch, untouched). Visual correctness of the mobile crop/gradient/sizing was verified interactively against the user's own screenshots across ~6 rounds of adjustment — not something `vitest`/`tsc` can check, since this repo has no jsdom/RTL component-rendering test infrastructure.

```
Lint:      0 errors
TypeCheck: 0 errors
Tests:     309 passed
Build:     not run (see below)
```

Consistent with the rest of this session: no `npm run build` and no second `next dev` process was run against the shared `web/` directory at any point during this change — both had caused real, user-visible problems earlier in the session (a stale-`.next` 404 bug, and a near-miss where two concurrent dev servers would have shared/corrupted the same build cache). Every iteration here was verified via lint/typecheck/tests plus the user's own live dev server and screenshots.

## Files changed

```
web/
├── domain/models/site-preview.ts                                 MODIFIED — HERO_STYLES gains 'illustration'
├── lib/ai/
│   ├── generate-preview.ts                                       MODIFIED — heroStyle removed from AI schema, deterministic in code
│   └── __tests__/generate-preview.test.ts                        MODIFIED — assertions updated for deterministic illustration
├── public/hero_illustrations/{ten theme}.png                     NEW — user-supplied assets
└── app/b/[slug]/template/
    ├── hero-illustrations.ts                                     NEW — getHeroIllustration lookup
    ├── section-registry.tsx                                      MODIFIED — themeName wired to the hero entry
    └── GeneratedHero.tsx                                         MODIFIED — new 'illustration' branch (desktop full-bleed split + mobile cropped/gradient treatment)
```

---

# Wizard Photo Assignment Timing + Desktop Hero Image Classification

**Date:** 2026-07-16
**Scope:** Two related fixes, requested directly by the user. (1) The "Add business" wizard's step 2 (photo upload) always redirected straight to step 3, so the Photo Assignment section inside `PhotosForm` — which only renders once `photoUrls` exist — never actually appeared during the wizard even though photos were just uploaded; admins only ever saw it later, on the business detail page. (2) No classification of hero photo dimensions existed — any uploaded hero photo always rendered as a full-width background, regardless of its actual size or crop-worthiness.

## 1. Wizard step 2 — show Photo Assignment before advancing

`onboarding/photos/page.tsx` now computes its own redirect target from the freshly-fetched `business` record on each render, mirroring the self-redirect pattern the business detail page's "Photos" card already used: `redirectTarget` is the photos page itself (stay put) when `business.photoUrls` is still empty, or the sections step once photos exist. The submit button label follows the same signal ("Upload Photos" → "Continue →"). No change to `updatePhotosAction`, `PhotosForm`'s existing conditional rendering of the assignment section, or `SubmitButton` — this was purely a caller-side redirect-target/label computation. The "Skip for now" link is unaffected (always jumps straight to the sections step).

## 2. Desktop hero image dimension classification

New `HeroStyle` value `'imageSplit'`, added alongside `'image'`/`'illustration'`/legacy `'gradient'`/`'pattern'`/`'solid'` in `HERO_STYLES`. A resolved hero photo (auto-picked `photoUrls[0]`, or the `heroPhotoUrl` override — same resolution semantics `resolvePhotoSlot` already used) now only renders full-bleed (`'image'`) when it's exactly 1920×1080 or 1600×900px; any other size still gets used as the hero photo, but in a new two-column split layout (`'imageSplit'` — text left, photo right) reusing the shell already built for the no-photo `'illustration'` fallback.

New `lib/image/hero-dimensions.ts` — `checkHeroPhotoDimensions(photoUrl)` mirrors `lib/theme/logo-color.ts`'s established S3-proxy-URL → `getAsset()` → pixel-read pattern, but uses `sharp(buffer).metadata()` (a header-only read, not `detectLogoThemeFamily`'s full pixel decode) so it's cheap enough to call on every relevant page render, not just at generation time. `describeHeroDimensionWarning(check)` turns the result into a short admin-facing message. `lib/ai/generate-preview.ts` calls the same helper at generation time to decide `heroStyle` fresh on every run — never cached — so the admin-facing warning (below) and the actual rendered result can never disagree.

**Admin-facing warning:** computed at page-render time in both `onboarding/photos/page.tsx` and `[businessId]/page.tsx` (not inside `updatePhotosAction` — that action always ends in `redirect()`, which discards the function's return value before `useActionState` ever sees it, making a warning returned alongside a redirect unreachable dead code) and passed into `PhotosForm` as `heroPhotoWarning`. Warns on the *resolved* hero photo regardless of whether it was auto-picked or explicitly overridden, since most admins never touch the override. Rendered as an amber info box (this codebase's existing FYI/pending convention) below the Hero field, which is relabeled "Desktop hero image" (UI copy only — `Business.heroPhotoUrl` is not renamed, per this codebase's established never-rename-a-stored-field convention) and gained a static hint about the two accepted sizes (`FormFields.tsx`'s `PhotoSlotField` gained a `hint` prop for this).

**No mobile hero image field this session** — confirmed with the user: mobile hero photo selection is fully out of scope, deferred to a future session. Per the user's explicit instruction, mobile now always renders the no-photo illustration treatment regardless of which desktop hero style is chosen, including for `'image'` (previously `'image'` showed the real photo at every viewport size).

**`GeneratedHero.tsx` restructuring:** extracted `HeroCornerImage({ desktopSrc, mobileSrc })` (renders one `<Image>` when the two sources are equal — the `'illustration'` case, byte-identical to before — or two breakpoint-gated `<Image>`s when they differ) and `SplitHeroSection({ ...text/CTA props, desktopImageSrc, mobileImageSrc })` (the full two-column shell, composing `HeroCornerImage`) out of the former single `'illustration'`-only branch. `'illustration'` now calls `SplitHeroSection` with both sources equal to the theme illustration (provably unchanged output). New `'imageSplit'` branch calls it with the real photo on desktop and the theme illustration on mobile. The legacy single-`<section>` chain (`'gradient'`/`'pattern'`/`'solid'`, and `'image'`'s own desktop rendering) is untouched, computed once into a local `legacySection`; the `'image'` branch now renders `legacySection` at `lg:`+ only and `SplitHeroSection` (both sources = theme illustration) at mobile only, via `hidden`/`lg:hidden` wrapper divs.

## Verification

```
Lint:      0 errors   (npm run lint)
TypeCheck: 0 errors   (npx tsc --noEmit)
Tests:     320 passed (npm test) — 11 new (9 hero-dimensions, 1 generate-preview imageSplit case, 1 domain schema-acceptance)
Build:     not run — a `next dev` process was already live against this shared `web/` directory (same reasoning as the two prior entries above); verified instead via lint/typecheck/tests plus unauthenticated curl checks confirming touched routes still resolve (200 on `/`, 307 admin redirect-to-sign-in on `/admin/businesses/new`). Full manual click-through (photo upload → assignment → hero dimension warning → generated preview at both breakpoints) requires the user's authenticated session — see the plan file's verification section for the exact steps.
```

## Files changed / created

```
web/
├── domain/models/site-preview.ts                                                MODIFIED — HERO_STYLES gains 'imageSplit', heroStyle JSDoc updated
├── domain/__tests__/domain.test.ts                                              MODIFIED — schema-acceptance test for 'imageSplit'
├── lib/image/
│   ├── hero-dimensions.ts                                                       NEW — checkHeroPhotoDimensions, describeHeroDimensionWarning
│   └── __tests__/hero-dimensions.test.ts                                        NEW — 9 tests
├── lib/ai/
│   ├── generate-preview.ts                                                      MODIFIED — heroStyle decision uses checkHeroPhotoDimensions
│   └── __tests__/generate-preview.test.ts                                       MODIFIED — mocked helper, new imageSplit case
├── app/b/[slug]/template/GeneratedHero.tsx                                       MODIFIED — HeroCornerImage + SplitHeroSection extraction, imageSplit branch, image mobile-split
└── app/admin/(dashboard)/businesses/
    ├── FormFields.tsx                                                           MODIFIED — PhotoSlotField gains hint prop
    ├── PhotosForm.tsx                                                           MODIFIED — relabel, hint, heroPhotoWarning box
    └── [businessId]/
        ├── page.tsx                                                             MODIFIED — heroPhotoWarning computed, passed to PhotosForm
        └── onboarding/photos/page.tsx                                           MODIFIED — conditional redirect target/submitLabel, heroPhotoWarning
```

---

# Bug Fix — Hero Dimension Warning Only Ever Checked the Saved Photo, No Tolerance

**Date:** 2026-07-16
**Scope:** Direct user report on the desktop hero classification work above: "the hero size checker is only checking the first photo that was uploaded... if i select a different photo the photo pixels don't change." Root cause confirmed by re-reading the prior implementation: the admin-facing warning was computed purely server-side from the *saved* `Business.heroPhotoUrl` on page render — changing the "Desktop hero image" `<select>` in the browser is a plain uncontrolled form field with no submit yet, so nothing recomputed until the form was saved and the page reloaded. Effectively, only whichever photo was already persisted as the resolved hero pick was ever dimension-checked at all; every other uploaded photo looked "unchecked" until explicitly selected and saved. Also requested: a ±100px tolerance instead of requiring an exact pixel match.

## Fix 1 — Tolerance

`lib/image/hero-dimensions.ts` gains `HERO_DIMENSION_TOLERANCE_PX = 100`. `checkHeroPhotoDimensions()`'s eligibility check changed from an exact `d.width === width && d.height === height` match to `Math.abs(d.width - width) <= 100 && Math.abs(d.height - height) <= 100` against each of the two target sizes. `describeHeroDimensionWarning()`'s copy and the static hint in `PhotosForm.tsx` updated to say "within 100px" instead of "exactly".

## Fix 2 — Check every uploaded photo up front, make the warning live

New `describeHeroDimensionWarningsForPhotos(photoUrls)` (`lib/image/hero-dimensions.ts`) runs `checkHeroPhotoDimensions` + `describeHeroDimensionWarning` over *every* uploaded photo (bounded — `photoUrls` is capped at 6), returning `Record<photoUrl, warning | null>`. Both `onboarding/photos/page.tsx` and `[businessId]/page.tsx` now compute this map once per render (replacing the old single-photo `heroPhotoWarning` computation) and pass it to `PhotosForm` as `heroPhotoWarnings`.

`PhotosForm.tsx` (already a client component) tracks the Desktop hero image select's value in local `useState`, initialized from `defaults?.heroPhotoUrl`, and looks up the live warning from `heroPhotoWarnings` using the same Auto/`'none'`/explicit-URL resolution semantics `resolvePhotoSlot` already uses elsewhere — so the warning now updates the instant the admin picks a different photo, no save/reload required. `FormFields.tsx`'s `PhotoSlotField` gained a passthrough `onChange` prop (the field itself stays uncontrolled via `defaultValue` for form submission; `onChange` is purely for this side-channel live lookup) to wire the select's native change event to that state update.

## Verification

```
Lint:      0 errors   (npm run lint)
TypeCheck: 0 errors   (npx tsc --noEmit)
Tests:     325 passed (npm test) — 5 new (3 tolerance boundary cases, 2 for describeHeroDimensionWarningsForPhotos)
```

## Files changed

```
web/
├── lib/image/
│   ├── hero-dimensions.ts                                                       MODIFIED — HERO_DIMENSION_TOLERANCE_PX, tolerance-based eligibility, describeHeroDimensionWarningsForPhotos
│   └── __tests__/hero-dimensions.test.ts                                        MODIFIED — 5 new tests
└── app/admin/(dashboard)/businesses/
    ├── FormFields.tsx                                                           MODIFIED — PhotoSlotField gains onChange passthrough
    ├── PhotosForm.tsx                                                           MODIFIED — heroPhotoWarnings map + client-side live lookup on selection change
    └── [businessId]/
        ├── page.tsx                                                             MODIFIED — computes heroPhotoWarnings map instead of single warning
        └── onboarding/photos/page.tsx                                           MODIFIED — computes heroPhotoWarnings map instead of single warning
```

---

# Business Detail Page Redesign — Mobile Nav, Card Reorg, Inline Section Content Editing

**Date:** 2026-07-17
**Scope:** Direct user request to turn the admin business detail page into a preview of the future client dashboard — every rendered section editable inline, defaulting to collapsed, plus a mobile-responsive admin sidebar and a few small card/layout changes. Full design (including three explicit scope decisions confirmed with the user beforehand — dual-write photo edits, Testimonials/FAQ/Process editors in scope but Reviews out, Trust Strip staying fully static) is recorded in the approved plan.

## Mobile-responsive admin sidebar

`layout.tsx`'s `<aside>` was a fixed `w-56` sidebar with no responsive behavior — on mobile it consumed roughly half the screen. Extracted into a new client component, `AdminSidebar.tsx`, mirroring the existing hamburger pattern already used by the public site's `Navbar.tsx` (`useState` open/close, `lucide-react`'s `Menu`/`X`, `framer-motion` slide-in drawer — both already project dependencies, no new ones added). Renders the unchanged fixed sidebar at `md:`+ (`hidden md:flex`) and a slim top bar + backdrop + slide-in drawer at mobile widths (`md:hidden`), closing on link click or backdrop click. `layout.tsx` itself stays a server component — it still does the session fetch/redirect, just delegates the nav markup to `<AdminSidebar signedInAs={session.sub} />`.

## Duplicated preview link + card reorganization

- The "Review draft (vN) ↗" link (previously only in the bottom "Preview" card, and only when the latest preview is a draft) is now factored into a shared `PreviewLink` component and rendered a second time in the page header, to the left of the Delete button — so it's visible immediately on opening the page, without scrolling. The bottom card's copy is unchanged (this is a duplicate, not a move).
- New shared `CollapsibleCard.tsx` (chevron toggle, `defaultOpen` prop) wraps Business Details, Photos, and Preview CTA — all now start collapsed.
- `BusinessDetailsForm.tsx` trimmed to stop after "Additional notes" — the `ThemeField` and the entire "Admin" section (source/status) were removed from it and given their own narrow cards: new `ThemeForm.tsx` / `updateThemeAction` (touches only `Business.theme`) and `AdminFieldsForm.tsx` / `updateAdminFieldsAction` (touches only `source`/`status`), following the same "one action, one slice of fields" convention `updateBusinessDetailsAction`/`updatePhotosAction` already established. `updateBusinessDetailsAction`'s schema/handler narrowed to match (no longer reads/writes `theme`/`source`/`status`).

## Inline section content editing — the main feature

**Core idea:** the existing "Website Sections" card (`SectionConfigForm.tsx`) already lists every catalog section in order with enable/reorder controls — the natural place to add a per-row expand toggle revealing that section's actual content, rather than building a second, separate editing surface.

**`SectionConfigForm.tsx` refactor:** the outer native `<form action={formAction}>` was replaced with a plain `<div>` — a per-row expand chevron needed to reveal a section's own content-editing `<form>` directly beneath the row, and HTML forms cannot nest. `enabledByType` (checkboxes) and `orderedTypes` (existing reorder state) are now the only source of truth; a "Save Sections" button builds a `FormData` object from that state directly and calls `formAction(fd)` — valid and typed in React 19's `useActionState` (the returned dispatch function's signature is `(payload) => void`, callable directly, not only via a `<form>`'s `action` prop). A chevron expand toggle was added to every row except `header`/`footer` (page chrome, already had no reorder controls either) and `trustStrip`/`reviews` (no content editor exists for either — Trust Strip stays fully static by design, per the confirmed scope decision; Reviews has no admin entry path, reserved for a future Google Places integration).

**New domain fields (additive only — `web/domain/models/site-preview.ts` / `site-preview.schema.ts`):** `PreviewContent` gained optional per-section heading overrides for the sections whose copy was previously a hardcoded literal in its template component — `servicesSection`, `whyChooseUsSection`, `aboutSection` (just `{ quote }`; `tagline`/`aboutText` already served as the section's editable headline/description), `serviceAreasSection`, `gallerySection` (heading plus the new curated `images: GalleryImage[]` list), `ctaBannerSection`. All optional and normalized at render time — absence renders the exact same hardcoded copy as before, so no migration was needed for any existing preview. `PreviewThemeSchema` was also exported (previously module-private) so the new photo dual-write action (below) can reuse it.

**Template components updated to consume the new fields, falling back to their existing hardcoded copy when absent:** `ServicesGrid`, `WhyChooseUs`, `AboutSection`, `ServiceAreaSection`, `GallerySection` (also switched from rendering raw `business.photoUrls` strings to the curated `GalleryImage[]` shape, with a per-photo caption overlay; `section-registry.tsx` normalizes an absent `gallerySection.images` to `business.photoUrls.map(url => ({ url }))` so behavior is unchanged until an admin curates it), `FinalCTA`. `lib/website-sections/availability.ts`'s `gallery` check now prefers `content.gallerySection.images.length` when a curated list is stored, falling back to `business.photoUrls.length` otherwise, so removing every curated photo correctly hides the section instead of leaving a stale "available" signal.

**New server actions (`[businessId]/actions.ts`):**
- `updateSectionContentAction(businessId, previewId, section, ...)` — one dispatch action (mirrors `section-registry.tsx`'s per-type mapping philosophy) covering the 8 sections backed by `SitePreview.content` (hero, services, whyChooseUs, about, serviceAreas, gallery, ctaBanner, contact). Follows `updatePreviewCtaAction`'s exact established pattern: fetch the preview, shallow-spread `preview.content`, patch only the touched keys, re-validate the whole `PreviewContentSchema`, `putSitePreview` in place (same `previewId`/version, no new snapshot).
- `updateBusinessListFieldAction(businessId, field, ...)` — one dispatch action covering the 3 durable Business list fields (`testimonials`/`faqItems`/`processSteps`) that had zero admin write path before this stage (the model/schema fields were already reserved). These stay on `Business`, not `SitePreview`, so they persist across regenerations exactly like `theme` and the photo-slot overrides already do.
- `updatePhotosAction` extended for the confirmed dual-write behavior: after writing the `Business`-level slot override (unchanged, persists for future regenerations), it now also fetches the business's most recent `SitePreview` and patches the matching `theme.*ImageUrl` field in place (re-validated via `PreviewThemeSchema`), so a photo change is visible on the *current* live preview immediately, not only after the next "Generate Website" run. Only applies when a slot was explicitly set to a specific photo or "No photo" — leaving a slot on "Auto" makes no change to an already-generated preview, since there's no specific new photo to apply.
- `parseIndexedList(formData, prefix, keys)` (new `form-list.ts`) — the shared parser for every repeatable-list field (services, differentiators, service areas, gallery captions, testimonials, FAQ, process steps): reconstructs an ordered array of objects from `FormData` fields named `${prefix}.${index}.${key}`, the exact shape `RepeatableListEditor.tsx` (new, generic add/remove/reorder list editor, reused across 6 of the list-shaped sections) submits.

**New `SectionContentEditor.tsx`** — the per-row dispatch component, analogous to `section-registry.tsx` on the public-render side: switches on `WebsiteSectionType` to render the right small form. Hero/Services/WhyChooseUs/About each render two independent sibling `<form>`s (never nested) — the text-content form bound to `updateSectionContentAction`, and a `SectionPhotoEditor` mini-form bound to the (now dual-writing) `updatePhotosAction`, carrying the other three photo slots' current values as hidden inputs so saving one slot can never clobber the other three. Gallery gets a dedicated `GalleryImageEditor` (thumbnail + caption + remove/reorder per curated photo, plus a dropdown to add any already-uploaded business photo not yet in the curated list — uploading a *new* photo file still happens via the Photos card, not duplicated here). Testimonials/FAQ/Process route through `BusinessListEditor`, sharing `RepeatableListEditor`. A section with no generated preview yet (only possible for the 8 preview-backed sections) shows "Generate a website first..." instead of a broken form.

## Scope decisions (confirmed with the user before implementation)

1. Photo edits: dual-write (immediate + persisted `Business` override) — see `updatePhotosAction` above.
2. Testimonials/FAQ/Process got full editors; Reviews did not (reserved for real Google Places data — an admin hand-typing a star rating would risk looking like a real Google rating).
3. Trust Strip stays fully static — enable/disable only, no content editor, preserving the existing anti-fabrication guardrail.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     326 passed  (npm test) — 1 new test added (theme/source/status isolation on updateBusinessDetailsAction);
                          2 pre-existing tests updated to match the intentional narrowing of updateBusinessDetailsAction
                          and the new listPreviewsForBusiness dependency in updatePhotosAction's dual-write path.
Build:     next build succeeds — all admin/business-detail routes still compile and prerender correctly.
Manual:    Dev server started against the real dev DynamoDB tables (AWS SSO session already active); signed in
           programmatically (session JWT minted locally with the app's own SESSION_SECRET — same signing code as
           lib/auth/session.ts — since the plaintext admin password wasn't available in this session; no token or
           secret value was ever printed). Confirmed via curl against real business records: business detail pages
           render 200 with the new Business Details / Theme / Admin / Photos / Preview CTA cards present, chevron
           expand controls present on exactly the 11 sections expected to have a content editor (15 catalog sections
           minus header/footer/trustStrip/reviews) and absent from the other 4, and section content editors are not
           present in the initial server-rendered HTML while collapsed (confirms lazy client-mounting, not just
           CSS-hidden). Did not verify interactive behavior (clicking a chevron, editing and saving a section, the
           mobile drawer opening) in a real browser — no headless browser was available in this environment and the
           user asked not to install Playwright now ("that's a later stage"). Recommend a follow-up manual click-through
           once browser tooling is available, per the plan's verification section.
```

## Files changed / created

```
web/
├── domain/models/site-preview.ts                                                MODIFIED — SectionHeading, GalleryImage types; per-section heading/gallery fields on PreviewContent
├── domain/schemas/site-preview.schema.ts                                        MODIFIED — matching Zod schemas; PreviewThemeSchema exported
├── lib/website-sections/availability.ts                                         MODIFIED — gallery availability prefers curated gallerySection.images length
├── app/b/[slug]/template/
│   ├── section-registry.tsx                                                    MODIFIED — wires new heading/gallery props through to each component
│   ├── ServicesGrid.tsx                                                         MODIFIED — sectionHeadline/sectionSubheadline props, fallback to existing copy
│   ├── WhyChooseUs.tsx                                                         MODIFIED — sectionHeadline prop
│   ├── AboutSection.tsx                                                        MODIFIED — quote prop
│   ├── ServiceAreaSection.tsx                                                  MODIFIED — sectionHeadline/sectionSubheadline props
│   ├── GallerySection.tsx                                                      MODIFIED — GalleryImage[] shape + captions, heading props
│   └── FinalCTA.tsx                                                            MODIFIED — sectionHeadline/sectionSubheadline props
└── app/admin/(dashboard)/
    ├── layout.tsx                                                               MODIFIED — delegates nav markup to AdminSidebar
    ├── AdminSidebar.tsx                                                         NEW — responsive sidebar + mobile hamburger drawer
    └── businesses/
        ├── CollapsibleCard.tsx                                                 NEW — shared chevron-collapse card wrapper
        ├── ThemeForm.tsx                                                       NEW — bound to updateThemeAction
        ├── AdminFieldsForm.tsx                                                 NEW — bound to updateAdminFieldsAction
        ├── BusinessDetailsForm.tsx                                             MODIFIED — trimmed to stop after Notes (theme/admin fields removed)
        └── [businessId]/
            ├── actions.ts                                                       MODIFIED — updateThemeAction, updateAdminFieldsAction, updateSectionContentAction,
            │                                                                        updateBusinessListFieldAction, dual-write updatePhotosAction; narrowed
            │                                                                        updateBusinessDetailsAction
            ├── form-list.ts                                                     NEW — parseIndexedList shared FormData-array parser
            ├── RepeatableListEditor.tsx                                         NEW — generic add/remove/reorder list editor
            ├── SectionContentEditor.tsx                                         NEW — per-section dispatch editor UI
            ├── SectionConfigForm.tsx                                           MODIFIED — controlled (non-form) state, per-row expand/collapse dispatch
            ├── page.tsx                                                         MODIFIED — header PreviewLink, collapsible/split cards, SectionConfigForm props
            ├── onboarding/sections/page.tsx                                     MODIFIED — passes new SectionConfigForm props
            └── __tests__/business-details-actions.test.ts                      MODIFIED — updated for the narrowed action + dual-write mock wiring
```

---

# Bug Fixes — Direct User Testing of the Inline Content Editor

**Date:** 2026-07-17
**Scope:** Direct user report after clicking through the redesign above in a real dev session against real data: chevron contrast, a save that silently discarded reordering and crashed with a hooks-count error, the content editor collapsing itself after every save, an unreadable "Photo 1/Photo 2" photo picker, CTA config resetting on every regeneration, and — the core issue — no clear separation between "generate a fresh AI draft" and "preview what I've already saved," so clicking Generate after making manual edits appeared to silently discard them.

## Root cause — `formAction()` called outside a transition

The user's console showed React's own diagnostic verbatim: *"An async function with useActionState was called outside of a transition."* `SectionConfigForm.tsx`'s "Save Sections" button was calling the `useActionState` dispatch function (`formAction(formData)`) directly from a plain `onClick` handler — valid to call imperatively, but only inside `startTransition()`; called bare, React can't track pending state or hand the action off to Next.js's redirect-interception machinery correctly. This one bug explained three of the reported symptoms: reordering sections and clicking Save appeared to do nothing (the save didn't take effect, so the page reverted to the last real save on reload); a follow-up interaction then threw "Rendered more hooks than during the previous render" in the browser console; and it likely contributed to unpredictable behavior generally. Fix: wrap the call in `startTransition(() => formAction(formData))` — the exact remedy React's own warning names.

## Content editor collapsing itself after every save

Saving a section's content (or its photo) redirects back to the same page — and a Server Action's `redirect()` always produces a fresh render of the destination page, which discarded the client-only `expandedTypes` state that tracked which row was open. Fixed by carrying the edited section through the redirect as a URL query param (`?expandedSection=hero`) instead of relying on client memory: `updateSectionContentAction` and `updateBusinessListFieldAction` now append it to their redirect target (mapping the business-list `field` back to its section type where needed), `page.tsx` reads it from `searchParams` and passes it to `SectionConfigForm` as `initialExpandedSection`, which seeds `expandedTypes` with it on mount. The inline photo mini-form (`SectionPhotoEditor`, bound to `updatePhotosAction`) gets the same treatment via a `photoRedirectTo` computed in `SectionContentEditor.tsx`. The section reopens already-expanded on the very first paint (server-rendered, not a post-hydration client toggle) — verified via a direct request to `?expandedSection=hero` returning the Hero editor's fields already present in the HTML.

## Photo picker overhaul

`PhotoSlotField` (a `<select>` listing "Photo 1", "Photo 2", ...) forced an admin to scroll back up to the Photos card to know what they were about to pick. Replaced with `PhotoPickerField` (`FormFields.tsx`) — an actual thumbnail grid (plus "Auto"/"No photo" buttons), backed by a hidden input for the selected value so it still posts through existing form-based actions unchanged. Used everywhere `PhotoSlotField` was (`PhotosForm.tsx`, `SectionContentEditor.tsx`'s `SectionPhotoEditor`); `PhotoSlotField` itself was deleted, not left dead. The Gallery section's "add a photo" control (a similar text dropdown) got the same treatment — one click on a thumbnail adds it, no separate Add button needed.

## Chevron contrast

Both expand chevrons (`CollapsibleCard.tsx`'s card-level toggle, `SectionConfigForm.tsx`'s per-row toggle) were `text-gray-400` — too light against a white card per direct feedback. Changed to `text-gray-800`/`hover:text-black`.

## CTA reset on every regeneration

`generatePreviewContent()` always built a brand-new `cta` from the model's freshly generated labels, discarding whatever the admin had configured on the Preview CTA card the moment "Generate Website" ran again — the admin had no way to make a CTA choice durable, unlike `theme` (which already persists to `Business.theme` and is reused on every regeneration). Fixed by adding `Business.cta?: PreviewCtaConfig` (`domain/models/business.ts` / `business.schema.ts`, reusing the newly-exported `PreviewCtaConfigSchema`) as the same kind of durable, business-level override:
- `generatePreviewContent()` now uses `business.cta` verbatim when set, only falling back to `buildDefaultCta()` + the model's labels when the business has none yet.
- `generateWebsiteAction`/`createSeedPreviewAction` seed `Business.cta` from the freshly generated content the first time (mirroring the existing `if (!business.theme ...)` pattern), so even a business that never manually edited its CTA gets a durable one after its first generation.
- `updatePreviewCtaAction` now always persists the edited CTA to `Business.cta` (not just seeds it once) — an explicit edit is a deliberate decision, not a value to preserve only-if-absent.

## Generate vs. Preview — separating "fresh AI draft" from "what's currently saved"

The core complaint: after saving inline edits and reordering sections, clicking "Generate Website" produced a version that didn't include any of it — which is actually correct (each generation is a fresh AI draft built from `Business` fields, not a re-save of the previous version's edited `PreviewContent`), but nothing in the UI made that distinction clear, so it read as data loss. Rather than merging AI regeneration with manual edits (a much larger, unrequested change to what "regenerate" means), the fix is UI clarity plus a safety net:
- The `PreviewLink` (header + "Preview" card) is no longer gated to `status === 'draft'` — it now shows for any viewable preview (draft/ready/published; archived previews 404 for everyone including admins, so those are excluded), labeled contextually ("Review draft", "View live site", or "Preview"), so there's always an obvious, low-friction way to see exactly what's currently saved — including every inline edit and reorder, which already apply immediately with no regeneration involved.
- The "Preview" action card was split into two clearly-labeled halves: "Preview" (with copy explaining it reflects saved changes immediately) and "Generate Website (AI)" (with copy warning that text edits and reordering since the last generation are not carried over, but theme/CTA/photo assignments are preserved).
- `GenerateWebsiteButton.tsx` now requires a confirmation dialog before regenerating whenever a preview already exists (mirroring `DeleteBusinessButton`'s modal pattern) — first-time generation (nothing to lose) skips it. The dialog names the next version number and spells out exactly what does and doesn't carry over.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     328 passed  (npm test) — 3 new (CTA persisted on first generation, CTA not overwritten once stored,
                          Business.cta reused verbatim in generatePreviewContent, explicit CTA edit persists to
                          Business.cta); 1 pre-existing test corrected (the old "theme already stored → updateBusiness
                          never called" assertion needed the fixture to also have a stored CTA, now that CTA-seeding
                          is a second independent reason updateBusiness might legitimately be called).
Build:     next build succeeds.
Manual:    Verified server-side against the same live business record from the user's own bug report
           (biz_953451ea...), via the same session-minting + curl approach as the prior round (no secrets printed).
           Confirmed: PhotoSlotField is fully gone from every rendered page; the new chevron color class is present;
           the Generate button correctly reads "Generate New Draft (v6)" against a business already at v5; the
           Preview link duplicates correctly; and — critically — requesting the page with
           `?expandedSection=hero` returns the Hero content editor already expanded in the server-rendered HTML
           (Sub-Headline field, Save Content, Save Photo all present), confirming the redirect-preserves-expanded-
           section fix actually works end-to-end, not just in isolated logic. A dev server appeared to already be
           connected to a real browser (hydration warning attributable to a browser extension, unrelated to this
           change) during this session, so no further interactive/mutating checks were performed to avoid
           disrupting that session — the startTransition fix, the reorder-persists-on-save behavior, and the
           Generate confirmation dialog's appearance still warrant a real click-through.
```

## Files changed

```
web/
├── domain/models/business.ts                                                    MODIFIED — Business.cta field
├── domain/schemas/business.schema.ts                                             MODIFIED — cta schema field
├── domain/schemas/site-preview.schema.ts                                         MODIFIED — PreviewCtaConfigSchema exported
├── lib/ai/generate-preview.ts                                                    MODIFIED — reuses business.cta when set
├── lib/ai/__tests__/generate-preview.test.ts                                     MODIFIED — 1 new test
└── app/admin/(dashboard)/businesses/
    ├── CollapsibleCard.tsx                                                       MODIFIED — darker chevron color
    ├── FormFields.tsx                                                            MODIFIED — PhotoSlotField replaced with PhotoPickerField (thumbnail grid)
    ├── PhotosForm.tsx                                                            MODIFIED — uses PhotoPickerField
    └── [businessId]/
        ├── actions.ts                                                            MODIFIED — CTA persistence (generate/seed/update actions), expandedSection
        │                                                                             query param on redirect
        ├── SectionConfigForm.tsx                                                 MODIFIED — startTransition fix, initialExpandedSection prop
        ├── SectionContentEditor.tsx                                              MODIFIED — PhotoPickerField, gallery add-photo thumbnails, photoRedirectTo
        ├── GenerateWebsiteButton.tsx                                             MODIFIED — confirmation dialog, dynamic label
        ├── page.tsx                                                              MODIFIED — searchParams → initialExpandedSection, always-visible PreviewLink,
        │                                                                             split Preview/Generate card copy
        └── __tests__/actions.test.ts                                             MODIFIED — 2 new tests, 1 corrected
```

---

# Bug Fixes + Features — Second Round of Direct User Testing

**Date:** 2026-07-17
**Scope:** Further direct user testing surfaced: theme changes requiring a full AI regeneration to take visible effect; a hero photo swap via the inline editor silently not appearing on the live preview; an enabled section's checkbox reverting after saving its content; a photo picker request for per-section direct upload; a request for theme color swatches; and two content bugs (CTA card title, swapped CTA button copy).

## Theme dual-write

Same gap the photo-slot dual-write closed last round: `updateThemeAction` only ever wrote `Business.theme`, which is read at the *next* "Generate Website" run — the currently live preview's `theme.themeName` never changed, so picking a new theme appeared to do nothing without a fresh AI regeneration (which the user should not need for a color choice). Fixed by patching the business's most recent `SitePreview.theme.themeName` in place too, the same dual-write shape `updatePhotosAction` already uses. Picking "Auto" makes no live change, same reasoning as the photo slots — there's no specific new theme to apply retroactively.

## Hero photo swap not appearing — stale `heroStyle`

Root cause, not just a caching issue: `GeneratedHero.tsx` branches entirely differently depending on `theme.heroStyle` (`'illustration'` ignores `heroImageUrl` completely — it's a structurally different layout, not a fallback path that also checks the URL). The photo dual-write from last round patched `heroImageUrl` but never touched `heroStyle`, so a preview generated with no hero photo (`heroStyle: 'illustration'`) kept rendering the illustration forever after — the new photo was saved correctly, it was simply never rendered. Fixed: `updatePhotosAction`'s dual-write now recomputes `heroStyle` from the new photo's actual dimensions (`checkHeroPhotoDimensions`, the same helper `generatePreviewContent` already used) whenever the hero slot changes, including resetting to `'illustration'` when the slot is cleared to "No photo".

## Section checkbox reverting after saving content — auto-save

The reported repro (check FAQ's box, expand it, fill in a question, click "Save Content") exposed a real design gap: enabling a section and saving its content are two *separate* actions (`autoSaveWebsiteSectionsAction`/`saveWebsiteSectionsAction` vs. `updateBusinessListFieldAction`/`updateSectionContentAction`), and checking the box alone only updated transient client state until a separate, explicit "Save Sections" click — which the user's workflow never reached before reloading via the content save's own redirect. Rather than teach the user a two-step save order, removed the step entirely: `SectionConfigForm.tsx` now persists every checkbox toggle and every reorder click immediately (wrapped in the same `startTransition` as the manual path), via a new `autoSaveWebsiteSectionsAction` that shares `saveWebsiteSectionsAction`'s validation/persist logic (extracted into `persistWebsiteSections()`) but never redirects — a redirect on every single click would reload the whole page, which defeats the point of "immediate." The manual "Save Sections" button and its redirect are unchanged for the onboarding wizard's "Finish setup" step (`autoSaveAction` prop is only passed from the business detail page).

## Photo picker: theme swatches + per-section direct upload

- `ThemeField` (`FormFields.tsx`) converted from a `<select>` (browsers can't render swatches inside `<option>`) to a custom radio-style list — one row per preset, three small `rounded-sm` color squares (primary/accent/surface — the three fields that actually vary meaningfully per preset; background/text/border are near-identical across all ten) sized to sit inline with the theme name text, backed by a hidden input so it still posts through the existing form action unchanged.
- `PhotoPickerField` gained an optional `uploadFieldName` prop — a compact file input that uploads a brand-new photo straight into that specific section slot, so a forgotten hero image (or any other slot) can be added without leaving the section editor or going back to the main Photos card. `updatePhotosAction` now handles the four new fields (`heroPhotoFile`/`aboutPhotoFile`/`whyChooseUsPhotoFile`/`servicesPhotoFile`): uploads via a newly-exported `uploadBusinessAsset()`/`fileExtension()` (`lib/s3/business-assets.ts`, previously private), appends the result to `Business.photoUrls` (capped at the schema's existing 6-photo limit), and — a direct upload always wins over whatever that slot's picker buttons had selected. Wired into both the wizard's `PhotosForm.tsx` (its "Photo Assignment" section no longer requires photos to already exist before it's useful) and the inline `SectionContentEditor.tsx`'s `SectionPhotoEditor`.

## Content fixes

- Renamed the "Preview CTA — vN" card to "Call to Action Buttons" (`page.tsx`) — the version number wasn't meaningful to what the card does.
- Fixed CTA button copy landing on the wrong channel (a phone-icon button reading "Get a Free Estimate", an email-icon button reading "Call Now"): the model was never told which label slot (`primaryCtaLabel`/`secondaryCtaLabel`) would actually be attached to which contact channel — that mapping is decided entirely in code (`buildDefaultCta`, phone always wins primary when present) *after* the model responds, so its creative label choice had a coin-flip chance of matching the channel it landed on. `generate-preview.ts`'s prompt now states explicitly which channel each label slot serves (e.g. "primaryCtaLabel is the button text for a phone call action") whenever that's knowable from the business's verified contact fields.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     328 passed  (npm test) — 3 test files needed a new `@/lib/image/hero-dimensions` mock (a real new
                          dependency of actions.ts, previously only reachable through the already-mocked
                          generate-preview.ts) and an extended `@/lib/s3/business-assets` mock for the two newly
                          exported helpers; no test assertions changed.
Build:     next build succeeds.
Manual:    A dev server had been running for ~40 minutes under the user's own session when this round started;
           left it alone rather than restart it (Turbopack picks up file changes via its own watcher). Verified
           read-only against it: "Call to Action Buttons" title present, "Changes save automatically." auto-save
           indicator present, and the theme picker rendering 10 distinct sets of real hex colors (confirming the
           swatch feature, not just the text). No mutating requests were made against the shared dev database this
           round, to avoid touching whatever state the user's own session was mid-edit on.
```

## Files changed

```
web/
├── lib/ai/generate-preview.ts                                                    MODIFIED — prompt states which
│                                                                                       channel each CTA label serves
└── app/admin/(dashboard)/businesses/
    ├── FormFields.tsx                                                             MODIFIED — ThemeField swatches,
    │                                                                                   PhotoPickerField uploadFieldName
    ├── PhotosForm.tsx                                                             MODIFIED — per-slot upload inputs,
    │                                                                                   assignment section always shown
    └── [businessId]/
        ├── actions.ts                                                             MODIFIED — theme dual-write,
        │                                                                              heroStyle recomputation,
        │                                                                              autoSaveWebsiteSectionsAction,
        │                                                                              per-slot upload handling in
        │                                                                              updatePhotosAction
        ├── SectionConfigForm.tsx                                                  MODIFIED — auto-save on
        │                                                                              toggle/reorder
        ├── SectionContentEditor.tsx                                               MODIFIED — per-slot upload wiring
        ├── page.tsx                                                               MODIFIED — CTA card title,
        │                                                                              autoSaveAction wiring
        └── __tests__/*.test.ts                                                    MODIFIED — new mocks for
                                                                                         hero-dimensions/business-assets
```

---

# Autofill Test Data + Removed picsum.photos Fallbacks

**Date:** 2026-07-17
**Scope:** Direct user request: a dev-only "autofill" button on the new-business wizard to speed up repeated manual testing, and removal of every remaining `picsum.photos` placeholder-image fallback — "that was a relic of initial site setup."

## Autofill test data button

`BusinessDetailsForm.tsx` gained an optional `showAutofillButton` prop (only passed from `businesses/new/page.tsx` — never the business detail page's reuse of this same form, since that's editing a real business, not entering test data). The button is a plain `type="button"` inside the form; on click it walks the form's own `HTMLFormElement.elements` and sets `.value` directly on each named field (`Field`/`TextareaField`/`SelectField` are all uncontrolled `defaultValue`-based inputs, so this is a normal, safe way to bulk-fill them without restructuring the form to be controlled). Fills every field the wizard's step 1 has, with a randomized name/email suffix each click so repeated test runs don't collide, and a random industry/brand tone pick.

## Removed picsum.photos fallbacks

Three remaining places still fell back to `picsum.photos` placeholder images — all relics of the very first seed/dev-fixture work, predating the theme-matched illustration system that's since become the real "no photo" treatment everywhere else:

- **`ServicesGrid.tsx`** (the one still live in production rendering) — the featured service card's picture background fell back to a hardcoded `picsum.photos` URL when no real photo existed for that slot. Now: with no photo, the featured card renders identically to every other (non-featured) service card — no picture background, no white-text override — matching the same "default no photo" look used elsewhere, instead of any placeholder image at all.
- **`createSeedPreviewAction`'s `INDUSTRY_SEEDS`/`DEFAULT_SEED`** (`actions.ts`) — the disabled/legacy "Create test preview" dev-fixture path set `heroImageUrl`/`aboutImageUrl` to per-industry `picsum.photos` URLs. Removed entirely; a seeded preview with no uploaded photos now falls through to the same themed illustration/decorative fallback a real AI-generated preview with no photos already uses — no special-cased placeholder path.
- **`next.config.ts`** — the `images.remotePatterns` entry allowlisting `picsum.photos` is now unused by any code path, so it was removed.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     328 passed  (npm test) — no test changes needed (no test referenced picsum.photos).
Build:     next build succeeds.
Manual:    Confirmed read-only against the user's own already-running dev server that the "Autofill test data"
           button renders on /admin/businesses/new. Did not run a real "Generate Website" call or click through
           the featured-service-card no-photo rendering interactively, to avoid touching the user's live session.
```

## Files changed

```
web/
├── next.config.ts                                                                MODIFIED — removed unused picsum.photos remote pattern
├── app/b/[slug]/template/ServicesGrid.tsx                                         MODIFIED — featured card falls back to the plain default look, not a placeholder image
└── app/admin/(dashboard)/businesses/
    ├── BusinessDetailsForm.tsx                                                    MODIFIED — showAutofillButton + autofill logic
    ├── new/page.tsx                                                               MODIFIED — passes showAutofillButton
    └── [businessId]/actions.ts                                                    MODIFIED — removed picsum URLs from seed-preview fixture data
```

---

# Wizard Fixes — Photo Assignment Gating Regression + Generate-on-Finish

**Date:** 2026-07-17
**Scope:** Two direct user reports on the onboarding wizard: the Photo Assignment section (step 2) was showing before any photo had been uploaded — a regression from the same day's earlier per-section-upload feature — and step 3's "Finish setup" button only saved section config, leaving the admin to separately find and click "Generate Website" on the detail page afterward.

## Photo Assignment gating regression

Earlier the same day, `PhotosForm.tsx`'s "Photo Assignment" section was changed from conditional (`photoUrls.length > 0`) to always-rendered, specifically so the new per-slot direct-upload inputs would be reachable even before any photo existed. That inadvertently broke the wizard's step 2, which relies on that exact conditional to stay hidden until the first "Upload Photos" submission actually populates `photoUrls` (see the `hasPhotos` gate already in `onboarding/photos/page.tsx`, unchanged) — instead it now appeared on the very first page load, before anything had been uploaded. Reverted to the original `photoUrls.length > 0` gate; the per-slot upload inputs (`uploadFieldName`) stay in place for once the section *does* become visible, so "forgot to upload a hero image" is still solved as soon as at least one photo exists in the pool.

## Wizard step 3 now generates the first draft on finish

New `finishOnboardingAction` (`actions.ts`) replaces `saveWebsiteSectionsAction` as the wizard's step-3 form action: it persists the section configuration (same `persistWebsiteSections` helper the auto-save path already uses) and then immediately calls a newly extracted `runWebsiteGeneration(businessId)` — the actual OpenAI generation logic, factored out of `generateWebsiteAction` so both callers share the same cap check, theme/CTA seeding, and error handling without duplication. This matches the intended workflow (add business → wizard → generate website) in one click, rather than leaving generation as a separate, easy-to-miss step on the detail page afterward. The button was relabeled "Generate Website →" (from "Finish setup →"), with "Generating…" shown while pending (`SectionConfigForm` gained a `pendingLabel` prop so this doesn't say the generic "Saving…" during a real, multi-second AI call) and explanatory copy added above the section list. `generateWebsiteAction` itself (the detail page's own "Generate Website" button) is behaviorally unchanged — it now just calls the shared `runWebsiteGeneration` helper internally.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     328 passed  (npm test) — no test changes needed (both fixes sit above/around already-tested action logic;
                          runWebsiteGeneration extraction is behavior-preserving, confirmed by the existing
                          generateWebsiteAction test suite passing unchanged).
Build:     next build succeeds.
Manual:    Confirmed read-only, against the user's own already-running dev server, that an existing business's
           onboarding/sections page renders the new "Generate Website →" label and explanatory copy. Did not
           actually submit the wizard's finish step (would trigger a real, billed OpenAI call and count against
           the business's generation cap) or create a throwaway business to test the step-2 gating fix end-to-end,
           to avoid side effects on shared dev data; the gating revert restores the exact prior, already-proven
           conditional, so this is low-risk.
```

## Files changed

```
web/app/admin/(dashboard)/businesses/
├── PhotosForm.tsx                                                                MODIFIED — restored photoUrls.length > 0 gate on Photo Assignment
└── [businessId]/
    ├── actions.ts                                                                MODIFIED — runWebsiteGeneration extracted, finishOnboardingAction added
    ├── SectionConfigForm.tsx                                                     MODIFIED — pendingLabel prop
    └── onboarding/sections/page.tsx                                              MODIFIED — finishOnboardingAction, relabeled button, explanatory copy
```

---

# Stage 12 — Google Places Discovery

**Date:** 2026-07-17
**Scope:** Manual Google Places search, review, and selective import into the existing `Business` model, per the finalized architecture documented earlier the same day in `implementation.md`/`architecture.md`/`deployment.md`. No Firecrawl, Playwright, OpenAI, scoring, preview generation, or Google photo retrieval — Stage 12 ends at import.

## Overview

Implemented the full manual discovery-to-import workflow: admin enters an industry (from the existing `INDUSTRIES` enum) and a free-text location, the server calls Google Places API (New) Text Search with an economical field mask, results are shown for review with duplicate indicators, and only explicitly checked results are imported as ordinary `Business` records via the existing repository. Duplicate detection re-runs server-side immediately before persistence regardless of what was shown during review, and partial batch failures never roll back already-successful imports in the same submission.

## Domain-model change

`BUSINESS_SOURCES` (`domain/models/business.ts`) gained a fourth value, `'google_places'` — the contradiction flagged in the same-day documentation task (the old Stage 12 draft referenced this value before it existed). `BusinessSchema`'s `source` field derives its `z.enum` from the same array, so no separate schema edit was needed.

## New domain layer

- `domain/models/google-places.ts` — `GooglePlaceSearchResult` (the transient review-shape — never persisted as-is) and `DuplicateSignal`/`DUPLICATE_SIGNAL_TYPES`/`DUPLICATE_SIGNAL_CONFIDENCE`.
- `domain/schemas/google-places.schema.ts` — `GooglePlaceApiResultSchema`/`GooglePlacesTextSearchResponseSchema` (validates the raw Google API response) and `GooglePlaceSearchResultSchema` (validates the result after it round-trips through the import form's hidden fields — client-controlled input, so it's treated like any other external input, not trusted search output).

## `web/lib/google-places/`

- `client.ts` — `server-only` `searchPlacesText()`: POSTs to Places API (New) `places:searchText` with `X-Goog-Api-Key` (from `getGooglePlacesSecret()`) and an `X-Goog-FieldMask` limited to identity/contact/review fields — no photo field is ever requested. Non-2xx responses are categorized into a small `GooglePlacesErrorCategory` enum (`invalid_key`/`permission_denied`/`quota_exceeded`/`invalid_request`/`unknown`) via `GooglePlacesApiError`, so the calling action can show a safe, generic admin-facing message without leaking the raw provider error.
- `normalize.ts` — pure helpers: `normalizePhone` (digits-only, strips a leading US/Canada country-code `1` so `+1 512-555-0100` and `(512) 555-0100` compare equal), `normalizeDomain`, `normalizeName`, `buildAddressFromComponents` (Google `addressComponents` → the existing `Address` shape, returning `undefined` rather than a partially-guessed address when a required component is missing), `summarizeOpeningHours` (review-context-only string, never persisted).
- `industry-map.ts` — `GOOGLE_TYPE_TO_INDUSTRY` deterministic best-match table (Google `primaryType`/`types` → the fixed `INDUSTRIES` enum), `GOOGLE_SEARCH_QUERY_LABELS` (per-industry search phrasing, e.g. `plumbing` → "plumbers", used to build the Text Search query), and `isIndustry()`.
- `map-result.ts` — `mapApiResultToSearchResult()`: raw API result → `GooglePlaceSearchResult` (minus `duplicateSignals`, added separately since that requires a repository call). Never reads or maps any photo field.
- `duplicates.ts` — `checkDuplicatesAgainstList()` (pure, priority-ordered domain/phone/name+address/name+city comparison against an already-loaded business list) plus `findDuplicateSignals()`/`findDuplicateSignalsForBatch()` (the I/O wrappers — Place ID via the existing `google-place-id-index` GSI, short-circuiting since a Place ID match is definitive; the batch variant loads the full business list once per search/import rather than once per result).
- `search.ts` — `searchGooglePlaces({ industry, location })`: builds the text query, calls the client, maps every result, and annotates each with review-time duplicate signals via the batch path.

## Repository additions (`web/lib/db/businesses.ts`)

- `getBusinessByGooglePlaceId()` — queries the existing `google-place-id-index` GSI (no infrastructure change; this index has existed since Stage 6).
- `listAllBusinesses()` — pages through `ScanCommand` until exhausted or a 40-page safety cap, for the domain/phone/name+address/name+city checks that have no dedicated GSI. Documented in the code as a dev-scale-only approach — a production-scale table would need a proper index before this could run safely.

## Admin UI (`app/admin/(dashboard)/discover/`)

- `page.tsx` / `DiscoverPanel.tsx` (client component) — two independent `useActionState` forms, matching the existing one-action-one-concern convention (`updateBusinessDetailsAction`/`updatePhotosAction`) rather than one combined action: a search form (industry select + location text input) and, once results exist, an import form (one row per result with a checkbox, an industry `<select>` defaulting to the mapped guess — required when nothing mapped confidently — and, when a blocking duplicate signal exists, an explicit "Import anyway" checkbox).
- Each result row's full data round-trips to the import action as a hidden `JSON.stringify()`'d field (`resultData.{i}`) rather than being re-fetched from Google or held in server memory between requests — this Next.js app has no session-scoped server cache, and re-validating the round-tripped JSON via `GooglePlaceSearchResultSchema` before use keeps this no less safe than any other admin-editable form field.
- Added to `AdminSidebar.tsx`'s `NAV_ITEMS` as "Discover", between "Businesses" and "Previews". `/admin/discover` is covered by the existing `/admin/*` wildcard in `proxy.ts` — no route-protection change needed — and `searchPlacesAction`/`importSelectedPlacesAction` each independently call `getSession()` before doing anything, matching every other admin Server Action.

## `app/admin/(dashboard)/discover/actions.ts`

- `searchPlacesAction` — validates `industry`/`location`, calls `searchGooglePlaces()`, logs a single non-persistent structured line (query, location, result count, duration — no search-history table, per the finalized scope) on success or failure, and maps any `GooglePlacesApiError` category to one of five safe, generic admin-facing messages (`SAFE_ERROR_MESSAGES`) — the raw provider error is only ever logged server-side, never returned to the client.
- `importSelectedPlacesAction` — parses every `selected.{i}` row, JSON-parses and re-validates its `resultData.{i}` field, re-runs duplicate detection server-side as one batch immediately before persistence, and then processes each surviving candidate in its own `try`/`catch`: a blocking signal without `confirmDuplicate.{i}` is skipped and counted as a duplicate (never a hard error); a missing industry (no confident mapping and no admin override) is counted as a failure with an explicit reason; a `putBusiness()` throw is caught per-row so it can never roll back a sibling row that already succeeded. `source` is always `'google_places'`; `status` is always the factory's default `'pending'` — there is no `READY_FOR_SCAN`/`READY_FOR_ENRICHMENT` status anywhere in this path. `googlePlaceId`, `googleMapsUrl`, `googleRating`, `googleReviewCount`, and `address` are copied onto the new `Business` record only when present; nothing photo-related is ever copied.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     379 passed  (npm test) — 51 new tests across lib/google-places/__tests__/
                          (normalize, industry-map, duplicates, map-result, client) and
                          app/admin/(dashboard)/discover/__tests__/actions.test.ts, plus 4 new
                          repository tests for getBusinessByGooglePlaceId/listAllBusinesses in
                          the existing lib/db/__tests__/businesses.test.ts. All AWS/network calls
                          mocked — no real Google Places or DynamoDB calls in the test suite.
Build:     next build succeeds — /admin/discover registered as a dynamic (ƒ) route.
Infra:     infra/npm test still passes (54 tests, unchanged) — no infrastructure changes; this
           stage reuses the existing webpresa-dev-google-places secret (Stage 10) and the existing
           google-place-id-index GSI (Stage 6).
Manual:    Verified end-to-end against the real Google Places API and the real dev DynamoDB table.
           User provided a real API key, populated into webpresa-dev-google-places via
           `aws secretsmanager put-secret-value --profile webpresa` (value never written to any
           file). A throwaway test harness (deleted immediately after the run — see below) called
           the real production code paths directly: searchGooglePlaces({ industry: 'plumbing',
           location: 'Austin, TX' }) returned 20 real results with no photo-related field on any
           of them; the first result ("Radiant Plumbing, Air Conditioning, & Electrical") was
           imported via the same construction importSelectedPlacesAction uses and read back from
           DynamoDB with source: 'google_places', status: 'pending', the correct googlePlaceId,
           and googleRating/googleReviewCount (4.8 / 17,358) attached; re-running duplicate
           detection against the same candidate immediately after import correctly returned a
           single blocking place_id signal matching the just-created record. The imported test
           record was then deleted to leave no residue in the shared dev table. This also
           surfaced a real (expected, not a bug) industry-mapping miss: this particular business's
           Google primaryType mapped to 'electrical' rather than 'plumbing' since it's a
           multi-trade company — exactly the case the admin-editable industry `<select>` exists to
           catch before import. No interactive browser/UI click-through was performed (no browser
           automation tool available in this environment) — the admin page (`/admin/discover`)
           itself was not exercised through a live sign-in, but it calls the exact same
           `searchPlacesAction`/`importSelectedPlacesAction` functions this harness drove directly.
```

## Files changed

```
web/
├── domain/
│   ├── models/
│   │   ├── business.ts                                                           MODIFIED — added 'google_places' to BUSINESS_SOURCES
│   │   ├── google-places.ts                                                      NEW — transient search-result + duplicate-signal types
│   │   └── index.ts                                                              MODIFIED — export google-places
│   └── schemas/
│       ├── google-places.schema.ts                                               NEW — raw API response + round-trip validation
│       └── index.ts                                                              MODIFIED — export google-places.schema
├── lib/
│   ├── db/
│   │   ├── businesses.ts                                                         MODIFIED — getBusinessByGooglePlaceId, listAllBusinesses
│   │   └── __tests__/businesses.test.ts                                          MODIFIED — tests for the two additions
│   └── google-places/                                                            NEW DIRECTORY
│       ├── client.ts                                                             NEW — server-only Places API (New) Text Search client
│       ├── normalize.ts                                                          NEW — phone/domain/name/address normalization
│       ├── industry-map.ts                                                       NEW — Google type → Industry mapping + search-query labels
│       ├── map-result.ts                                                         NEW — raw API result → review shape
│       ├── duplicates.ts                                                         NEW — priority-ordered duplicate detection
│       ├── search.ts                                                             NEW — search orchestration
│       └── __tests__/                                                           NEW — normalize, industry-map, duplicates, map-result, client
└── app/admin/(dashboard)/
    ├── AdminSidebar.tsx                                                          MODIFIED — added "Discover" nav item
    └── discover/                                                                 NEW DIRECTORY
        ├── page.tsx                                                              NEW
        ├── DiscoverPanel.tsx                                                     NEW — client component, search + import forms
        ├── actions.ts                                                            NEW — searchPlacesAction, importSelectedPlacesAction
        └── __tests__/actions.test.ts                                             NEW
```

---

# admin/businesses: filters, search, location column, delete button — plus a real SectionConfigForm crash fix

**Date:** 2026-07-17
**Scope:** Four direct user requests on the business list page, plus a user-reported runtime crash on the Website Sections reorder controls.

## admin/businesses list page

- **Location column:** city/state, previously squeezed as small gray text next to the business name, now render in their own "Location" column.
- **Delete button per row:** `DeleteBusinessRowButton.tsx` — a lighter sibling of the detail page's `DeleteBusinessButton`. It calls the same `deleteBusinessAction` cascade delete, but skips the exact preview/scan/postcard counts in its confirmation dialog (generic warning copy instead) — fetching those counts for all 50 rows on every list-page load would mean 150 extra queries per page view just to populate a dialog most admins will never open.
- **Filters — every column, per direct user request:** status, industry, source, city, state, and a created-date range (from/to), all combinable. `FilterBar.tsx` is a plain GET `<form>` — filters live entirely in the URL (`searchParams`), so applying them needs no client JS at all; the server component re-queries with the new filters and pagination naturally resets since the form has no `cursor` field.
- **Search — name only, current page, per direct user request:** `BusinessTable.tsx` is a client component that filters the already-loaded (and already server-filtered) page of businesses by name locally. Deliberately doesn't reach beyond the loaded page — narrowing with the filter bar first is how an admin finds something further back in a large table.

### Repository: `listBusinesses` filtering (`lib/db/businesses.ts`)

No GSI supports status+industry+source+city+state+date together, so filtering happens in application code: `listBusinesses` scans in pages (`FILTERED_SCAN_PAGE_SIZE = 50`) and filters each page in JS (`matchesBusinessFilters`, exported and unit-tested standalone), accumulating matches until `limit` is reached or a `FILTERED_SCAN_SAFETY_CAP_PAGES = 40` cap stops it — the same dev-scale tradeoff already documented for Stage 12's duplicate detection (`listAllBusinesses`). The unfiltered fast path (single `Scan` + `Limit`, used when the page loads with no filters active) is unchanged, so the common case isn't slowed down.

One correctness detail worth calling out: DynamoDB applies `Limit` *before* a `FilterExpression` (irrelevant here since filtering is in JS, but the same hazard applies to a JS filter over a `Limit`-bounded page) — stopping mid-page as soon as enough matches are found would silently skip matching items later in that same already-fetched page on the next "Load more" click, since `LastEvaluatedKey` always refers to the position after the *whole* requested page, not wherever a JS loop happened to stop. `listBusinesses` always finishes filtering a full fetched page before checking whether `limit` is satisfied — the returned page can therefore occasionally hold more than `limit` items, but never silently drops one.

City/state matching is a case-insensitive substring match (free-text inputs); status/industry/source are exact matches (dropdowns); the date range compares against the `YYYY-MM-DD` prefix of `createdAt` rather than the full ISO timestamp — comparing the full timestamp against a bare date string for the "to" bound would incorrectly exclude same-day records (`"2026-07-17T23:59:00.000Z" > "2026-07-17"` is true as a plain string comparison).

## SectionConfigForm reorder crash — real bug, not a race condition

A user reported that reordering website sections (e.g. moving the CTA banner above Gallery) and then opening the draft preview never showed the new order. Investigation of the save/render pipeline (order math, `persistWebsiteSections`, `resolveStoredOrDefaultSections`, the registry-driven renderer) found nothing wrong — all of it was already correct. The user then hit the actual bug directly: a **Next.js runtime error, "Cannot update action state while rendering,"** thrown from `SectionConfigForm.tsx`'s `persist()` at the `formAction(formData)` call.

Root cause: `handleMove` and `handleToggleEnabled` both called `persist()` — which calls `startTransition(() => formAction(formData))` — **from inside** a `setState` updater function (`setOrderedTypes((current) => { ...; persist(...); return next; })`). React updater functions run during render/commit work and must stay pure; dispatching another action from inside one is exactly what this error flags. This explains the original report precisely: React threw synchronously before the action ever reached the server, so the reorder was silently never persisted, while the client's own `orderedTypes` state still visually reflected the (never-saved) move.

Both handlers had the identical anti-pattern, so checkbox toggling almost certainly had the same latent bug — just not yet hit/reported. Fixed by computing the next value first, calling `setOrderedTypes`/`setEnabledByType` with a plain value, and calling `persist()` as a separate top-level statement in the event handler — never nested inside the other state's updater. Safe to read `orderedTypes`/`enabledByType` directly (rather than via the functional-updater form) since the up/down and checkbox controls are already disabled while `isPending`, so there's no concurrent-call risk.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     389 passed  (npm test) — 10 new tests for listBusinesses filtering + matchesBusinessFilters
                          in the existing lib/db/__tests__/businesses.test.ts. The SectionConfigForm fix
                          has no new test — this repo's vitest config runs in a plain node environment
                          (no jsdom/RTL), so this specific React updater-purity crash can't be exercised
                          by a unit test; verified by full lint/typecheck/build passing and by matching
                          the user's exact reported stack trace to the fixed code path.
Build:     next build succeeds.
Manual:    Not yet re-verified in a live browser session by the user after the fix — this is a client-
           rendering bug (React throwing before the action ever reaches the server), not a data issue,
           so no dev-database inspection was needed to confirm the fix. AWS SSO session expired mid-
           session before a live-record check could be attempted; not required for this fix.
```

## Files changed

```
web/app/admin/(dashboard)/businesses/
├── page.tsx                                                                      MODIFIED — filters wired into listBusinesses, BusinessTable, FilterBar
├── FilterBar.tsx                                                                 NEW — GET-form filter bar (status/industry/source/city/state/date range)
├── BusinessTable.tsx                                                             NEW — client component: name search + table + Location column + delete
├── DeleteBusinessRowButton.tsx                                                   NEW — lighter list-page delete confirmation
└── [businessId]/SectionConfigForm.tsx                                            MODIFIED — fixed "Cannot update action state while rendering" crash

web/lib/db/
├── businesses.ts                                                                 MODIFIED — listBusinesses filtering, matchesBusinessFilters
└── __tests__/businesses.test.ts                                                  MODIFIED — filter tests
```

---

# Stage 13 — Firecrawl Website Enrichment

**Date:** 2026-07-18
**Scope:** Firecrawl single-page website enrichment for an existing or newly-imported `Business` — server-side Firecrawl v2 Scrape client, SSRF-safe URL validation, a normalized/validated enrichment snapshot, deterministic website-image discovery and rehosting, an explicit Business-wins merge function feeding the existing Stage 11 OpenAI generation pipeline, a redesigned `ScanEvent` (its first real caller), bounded/retryable failure handling, and an admin "Enrich Website" action. Per the finalized task spec (superseding the original Stage 13 stub in `implementation.md`), this stage can create a business's **first** preview, not only enrich an existing one.

## Overview

Implemented the full enrichment pipeline end to end: an admin clicks "Enrich Website" on the business detail page → the business's website URL is SSRF-validated → a `queued` `ScanEvent` is created and transitioned to `running` → Firecrawl's `/v2/scrape` is called once (single page, `formats: ['markdown','links','images',{type:'json',schema,prompt}]` — Firecrawl's own extraction LLM runs inside this one Scrape call, so no second app-side LLM call does extraction) → the sanitized raw response is stored as `crawl.json`, normalized into a validated `WebsiteEnrichmentSnapshot` and stored as `extracted.json` → candidate images are validated/fetched/dimension-checked/classified and accepted ones rehosted under `scans/{businessId}/{scanId}/images/` → `buildGenerationContext()` merges the snapshot with the canonical `Business` record (Business wins on every field) → the existing `lib/ai/generate-preview.ts` pipeline (extended with an optional third parameter, fully backward-compatible) produces a new immutable `SitePreview` version → the `ScanEvent` is marked `completed` and `Business.enrichmentStatus` updated. Every failure path is classified into one of 14 `ScanFailureCategory` values and recorded on an immutable `ScanEvent`; retries always create a brand-new `ScanEvent`, never mutate a `failed` one back to `running`.

## Key architectural decisions (see `architecture.md`, "Firecrawl Website Enrichment" for full detail)

1. **Plain `fetch` REST client, not the `firecrawl` npm SDK.** Mirrors `lib/google-places/client.ts`'s established pattern. Confirmed the real `/v2/scrape` wire contract (base URL, auth header, request/response shape) by pulling and reading the actual `firecrawl@4.30.1` SDK source, not just documentation. Chosen over the SDK specifically because the SDK discards the raw HTTP response (needed for reading `Retry-After`) and would have added an unused `axios` dependency.
2. **Structured extraction inside the one Scrape call** via a `{ type: 'json', schema, prompt }` format entry — still the single-page Scrape operation, never Search/Extract/Crawl, and keeps this app's own OpenAI usage limited to the existing Stage 11 generation call.
3. **Scan-derived images get a stable public URL via the existing `/api/assets/[...key]` proxy**, extended to also serve `scans/{businessId}/{scanId}/images/` (images only — `crawl.json`/`extracted.json` stay private, admin-viewable only via `getSignedAssetUrl`). Reuses the established asset-delivery mechanism rather than a new one, at the same trust level as today's admin-uploaded business photos.
4. **`ScanEvent` was redesigned, not defensively extended** — Stage 12 never created a real `ScanEvent` record, so this is genuinely the first real caller, with zero migration risk.
5. **`generatePreviewContent()` gained one optional third argument** (`options.enrichment?`) rather than a second parallel generator function — when absent, behavior is byte-for-byte identical to the original Stage 11 path; all existing Stage 11 tests and call sites pass unchanged.

## Domain-model changes

- `domain/models/scan-event.ts` — **rewritten**: `SCAN_STATUSES` → `queued`/`running`/`completed`/`failed`/`manual_approval_required` (was `pending`/`running`/`completed`/`failed`); added `SCAN_PROVIDERS` (`'firecrawl'`), `SCAN_OPERATIONS` (`'scrape'`), `SCAN_FAILURE_CATEGORIES` (14 values); new fields `provider`, `operation`, `finalUrl?`, `httpStatus?`, `failureCategory?`, `attempt`, `retryOfScanId?`, `rawArtifactKey?`, `extractedArtifactKey?`, `images?`, `generatedPreviewId?`; `sourceUrl`/`startedAt` now optional (`failureReason` renamed `failureMessage`).
- `domain/models/scan-image.ts` — **new**: `WebsiteImageRole` (7 values), `WebsiteImageStatus` (`accepted`/`review_required`/`rejected`), `ScanImageAsset`.
- `domain/models/website-enrichment.ts` — **new**: `WebsiteEnrichmentSnapshot` and its sub-shapes, `WEBSITE_ENRICHMENT_SCHEMA_VERSION`.
- `domain/models/business.ts` — added `EnrichmentStatus` (6 values), `ManualApprovalReason` (4 values), and `Business.enrichmentStatus?`/`manualApprovalReason?`/`manualApprovalNote?`. No "latest scan" pointer field — the admin UI derives that from `listScansForBusiness()` (already sorted newest-first) instead of a second, potentially-stale pointer.
- `domain/models/site-preview.ts` — `GenerationMetadata` gained `source?: 'seed'|'manual_ai'|'firecrawl_enriched'` and `scanId?`, both optional for backward compatibility with previews saved before this field existed.
- Matching Zod schema updates: `scan-event.schema.ts` rewritten; new `scan-image.schema.ts`/`website-enrichment.schema.ts` (the latter is the enforcement point keeping an unbounded raw Firecrawl response from ever reaching storage or the OpenAI prompt — every array/string is capped, malformed URLs rejected, HTML/control characters stripped); `business.schema.ts`/`site-preview.schema.ts` extended.
- `domain/factories/scan-event.factory.ts` — `createScanEvent()` now takes `{businessId, provider, operation, sourceUrl?, attempt?, retryOfScanId?}` and always starts `queued` (was `{businessId, sourceUrl}` → `pending`). All 6 existing call sites in `domain/__tests__/domain.test.ts` updated to pass `provider`/`operation`.

## `web/lib/firecrawl/` (new)

- `client.ts` — `scrapeWebsite()`, `FirecrawlApiError` (6-category enum), reads `Retry-After` off 429s.
- `url-validation.ts` — `validateOutboundUrl()`: protocol allowlist, no embedded credentials, `dns.promises.lookup` + IPv4/IPv6 private/reserved-range rejection (RFC1918, loopback, link-local incl. the `169.254.169.254` AWS metadata endpoint, CGNAT, benchmarking/test-net ranges, multicast, IPv4-mapped IPv6). Applied to the business website URL, Firecrawl's reported final URL, and every candidate image URL.
- `normalize.ts` — `normalizeFirecrawlResponse()`: deterministic, no AI call; caps/sanitizes/dedupes/validates into `WebsiteEnrichmentSnapshot`.
- `images.ts` — `ingestScanImages()`: candidate cap 15, accepted cap 8, 8MB size cap (`Content-Length` + actual-bytes check), 8s fetch timeout, manually-followed redirects (max 3 hops, each re-validated through the SSRF guard — deliberately not `fetch`'s automatic follow, which would bypass re-validation on a malicious redirect), `image/jpeg`/`png`/`webp` only, real pixel dimensions via `sharp`, sub-80px rejected as icon/tracking-pixel, ≥400×300px (or role `logo`) accepted, smaller real photos `review_required` (stored in metadata, never auto-used), URL-keyword role classification (deterministic, not AI).
- `generation-context.ts` — `buildGenerationContext()`: the one explicit merge function: Business's own `servicesOffered`/`serviceAreas`/`differentiators`/`description` win outright when non-empty, snapshot fills only genuinely blank fields; never mutates `Business`.
- `retry.ts` — `isRetryableFailureCategory()`, `computeAutomaticRetryDelayMs()` (bounded exponential backoff + jitter, honors `Retry-After`, `MAX_AUTOMATIC_RETRIES = 2`) — used only for `firecrawl_rate_limit`/`firecrawl_timeout`/`firecrawl_provider_error`.
- `enrich-business.ts` — `enrichBusinessWebsite()`/`retryEnrichmentScan()`: the 20-checkpoint orchestration, split into small named functions (`handleMissingWebsite`, `runAttempt`, `markFailed`, `finishFailed`, `scrapeWithBoundedRetry`, `hasActiveScan`, `mapFirecrawlErrorCategory`) rather than one monolithic action. Concurrency-guarded (rejects a new attempt while one is `queued`/`running`); every failure path writes an immutable `failed` `ScanEvent` with a safe category/message and updates only `Business.enrichmentStatus`/`manualApprovalReason`/`manualApprovalNote` — never any content field.

## `lib/ai/generate-preview.ts` (extended, backward-compatible)

Added optional `options: GeneratePreviewOptions = {}` second parameter (`{ enrichment?: { snapshot, scanImages, scanId } }`). When absent, output is identical to the pre-Stage-13 function — verified by leaving all 22 pre-existing tests in `lib/ai/__tests__/generate-preview.test.ts` unchanged and passing. When present: `buildGenerationContext()` resolves prompt inputs before `buildPrompt()` runs; the "no services" guard now checks the merged context (not `business.servicesOffered` alone) — this is what lets a Stage 12–imported business with no Stage 11 inputs get a first preview directly; `resolvePhotoSlot()` chains gained a third, lowest-priority fallback tier of scan-accepted images after `business.photoUrls`; `generationMetadata.source` is now always explicitly set (`'manual_ai'` by default, `'firecrawl_enriched'` + `scanId` when enrichment is present) — previously always implicitly absent. Removed the now-dead local `linesFrom()` helper (superseded by `generation-context.ts`'s own).

## S3 and public-asset-proxy changes

New keys under the already-provisioned `scans/` prefix (no infra change): `scans/{businessId}/{scanId}/crawl.json`, `extracted.json`, `images/{imageId}.{ext}`. `app/api/assets/[...key]/route.ts` extended with a `SCAN_IMAGE_KEY_PATTERN` regex so it also serves the `images/` sub-path publicly (unconditionally, like `businesses/`) while leaving `crawl.json`/`extracted.json` in the very same folder private — deliberately not a blanket `scans/` allow.

## Admin UI

- `app/admin/(dashboard)/businesses/[businessId]/enrichment-actions.ts` (new) — `enrichWebsiteAction`/`retryEnrichmentAction`, kept separate from the already 1200+ line `actions.ts`; both redirect back to the detail page with `?enrichmentResult=` rather than returning `useActionState` feedback.
- `app/admin/(dashboard)/businesses/[businessId]/EnrichmentSection.tsx` (new) — plain server component (no client JS needed); shows website URL, human-labeled enrichment status, latest scan status/time, latest successful enrichment time, the manual-approval/no-usable-images banner with the exact required copy, a link to the generated preview, and "Enrich Website"/"Retry" actions (disabled while a scan is active).
- `page.tsx` — wired `EnrichmentSection` in near "Generate Website (AI)"; `searchParams` now also reads `enrichmentResult`.

## Environment / secrets

No new environment variable — `FIRECRAWL_SECRET_NAME` was already set in `.env.local`/`.env.local.example` and the `webpresa-dev-firecrawl` secret already existed (Stage 10). Populated the real API key the user supplied via the standard `aws secretsmanager put-secret-value --secret-id webpresa-dev-firecrawl --profile webpresa` pattern already used for every other secret — value never written to any file, never logged, not present in this document.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     472 passed  (npm test) — 63 new tests: lib/firecrawl/__tests__/ (client 6, url-validation
                          10, normalize 9, images 9, generation-context 7, enrich-business 21),
                          domain/__tests__/stage13.test.ts (13), plus 6 new cases in the existing
                          lib/ai/__tests__/generate-preview.test.ts and 2 new cases in
                          app/api/assets/[...key]/__tests__/route.test.ts. Every external dependency
                          (DynamoDB, S3, Firecrawl, OpenAI, DNS, sharp) mocked — no real network/AWS
                          calls in the automated suite.
Build:     next build succeeds — no new routes (Stage 13 is Server Actions on the existing business
           detail page, not a new route).
Secret leak check: grepped the full `.next` build output for the literal API key (zero matches) and
           grepped `.next/static` (the client bundle) for FIRECRAWL_SECRET_NAME/getFirecrawlSecret/
           scrapeWebsite (zero matches) — confirms the key and every Firecrawl-calling identifier
           stay entirely server-side.
Manual smoke test: ran the real production code path (enrichBusinessWebsite) via a local script
           (not committed — lived only in the session scratchpad) against a throwaway dev Business
           pointed at https://www.firecrawl.dev (Firecrawl's own site — stable, scrape-friendly,
           unambiguously permitted). Real Firecrawl API returned HTTP 200; crawl.json/extracted.json
           written to the correct S3 keys; 9 candidate images discovered, 3 accepted and uploaded
           under scans/.../images/; real OpenAI call succeeded (durationMs 3719) producing a v1
           SitePreview with generationMetadata.source: 'firecrawl_enriched' and the correct scanId;
           ScanEvent completed with generatedPreviewId set; Business.enrichmentStatus:
           'enrichment_completed'. The throwaway business/preview/scan were left in the dev table
           for interactive admin-UI review (not deleted, unlike the Stage 12 smoke-test record).
```

## Deviations from the original task spec

- **S3 image path** — the spec suggested `businesses/{businessId}/scans/{scanId}/images/{imageId}.{ext}`; used `scans/{businessId}/{scanId}/images/{imageId}.{ext}` instead, staying under the `scans/` prefix already reserved for scan artifacts in `architecture.md` since Stage 9, rather than nesting under the `businesses/` prefix (which is otherwise reserved for admin-approved canonical assets).
- **"No usable images" note wording** — the spec used two slightly different strings for this note in two different sections ("No usable website images were found or downloaded..." vs. "No usable images were found on the business website..."). Picked the first (matching the dedicated section header) as canonical; used consistently in code and the admin UI.
- **`generatePreviewContent`'s optional-enrichment design and the two-tier retry model** (inline bounded retry within one `ScanEvent` attempt, separate from the admin-triggered cross-`ScanEvent` retry) were judgment calls not fully spelled out in the spec — documented with rationale in `architecture.md`.
- Firecrawl SDK vs. REST API — the spec allowed either; chose REST for parity with the existing `lib/google-places/client.ts` pattern (see "Key architectural decisions" above).

## Unresolved issues / follow-ups

- No admin workflow yet to promote a scan-derived image (`accepted` or `review_required`) into the canonical `Business` photo library — noted as deferred in `implementation.md`.
- `enrichWebsiteAction`/`retryEnrichmentAction` are not subject to any generation cap (unlike `generateWebsiteAction`'s `MAX_AI_GENERATIONS = 10`) — worth revisiting if real usage warrants bounding Stage 13 OpenAI spend per business.
- IAM for the `webpresa-vercel-dev` user was not narrowed to a Firecrawl-specific least-privilege policy — Stage 13 runs in existing Next.js Server Actions (no new Lambda role), so it reuses the existing broad S3/Secrets grants; flagged in `architecture.md` as a pre-production consideration, same as Stage 12 left it.

## Files changed

```
web/domain/
├── models/
│   ├── scan-event.ts                                                             REWRITTEN — new statuses/provider/operation/failure-category/attempt/retry fields
│   ├── scan-image.ts                                                             NEW — WebsiteImageRole, WebsiteImageStatus, ScanImageAsset
│   ├── website-enrichment.ts                                                     NEW — WebsiteEnrichmentSnapshot and sub-shapes
│   ├── business.ts                                                               MODIFIED — EnrichmentStatus, ManualApprovalReason, enrichmentStatus?/manualApprovalReason?/manualApprovalNote?
│   ├── site-preview.ts                                                           MODIFIED — GenerationMetadata.source?/scanId?
│   └── index.ts                                                                  MODIFIED — export scan-image, website-enrichment
├── schemas/
│   ├── scan-event.schema.ts                                                      REWRITTEN
│   ├── scan-image.schema.ts                                                      NEW
│   ├── website-enrichment.schema.ts                                              NEW
│   ├── business.schema.ts                                                        MODIFIED
│   ├── site-preview.schema.ts                                                    MODIFIED
│   └── index.ts                                                                  MODIFIED — export scan-image.schema, website-enrichment.schema
├── factories/
│   └── scan-event.factory.ts                                                     REWRITTEN — provider/operation/attempt/retryOfScanId, starts 'queued'
└── __tests__/
    ├── domain.test.ts                                                            MODIFIED — 6 createScanEvent call sites updated
    └── stage13.test.ts                                                           NEW — 13 tests

web/lib/firecrawl/                                                                NEW package
├── client.ts
├── url-validation.ts
├── normalize.ts
├── images.ts
├── generation-context.ts
├── retry.ts
├── enrich-business.ts
└── __tests__/
    ├── client.test.ts
    ├── url-validation.test.ts
    ├── normalize.test.ts
    ├── images.test.ts
    ├── generation-context.test.ts
    └── enrich-business.test.ts

web/lib/ai/
├── generate-preview.ts                                                           MODIFIED — optional enrichment parameter, provenance metadata
└── __tests__/generate-preview.test.ts                                            MODIFIED — 6 new Stage 13 cases, all prior cases unchanged

web/app/admin/(dashboard)/businesses/[businessId]/
├── EnrichmentSection.tsx                                                         NEW
├── enrichment-actions.ts                                                         NEW
└── page.tsx                                                                      MODIFIED — wired EnrichmentSection, enrichmentResult search param

web/app/api/assets/[...key]/
├── route.ts                                                                      MODIFIED — SCAN_IMAGE_KEY_PATTERN, serves scans/.../images/
└── __tests__/route.test.ts                                                       MODIFIED — 2 new cases

web/docs/
├── implementation.md                                                             MODIFIED — Stage 13 section rewritten to match actual behavior
├── architecture.md                                                               MODIFIED — new "Firecrawl Website Enrichment" section + related updates
├── deployment.md                                                                 MODIFIED — new Stage 13 deployment-guidance section
└── build_log.md                                                                  MODIFIED — this entry
```

---

## Bug fix — `image/jpg` content type silently dropped real website images, plus new `/admin/scans` UI

**Date:** 2026-07-18 (same day, follow-up)
**Trigger:** User ran a real enrichment against a live business website and reported that services transferred correctly but the hero image and two other homepage images did not, and that `/admin/scans` was still the Stage-9-era placeholder with no way to inspect what a scan actually found/saved.

### Root cause

`lib/firecrawl/images.ts`'s `ALLOWED_CONTENT_TYPES` allowlist only recognized `image/jpeg` — but the business's real CDN (`lirp.cdn-website.com`) serves its JPEGs with the non-standard (technically incorrect per the MIME spec, but common in the wild) `Content-Type: image/jpg` header. Every real photo on that response — including the actual 1920×1440 hero image — was silently rejected by `fetchImageBytes()`'s content-type check and simply never appeared in `ScanEvent.images` at all; only a single small `image/png` payment-method icon (167×158, correctly flagged `review_required`) made it through. Confirmed by downloading the real `crawl.json` artifact for `biz_39c2b268-36e8-48cf-9481-673921e12880` from S3 and `curl -I`-ing each discovered image URL directly — every `.jpg` on that CDN returned `content-type: image/jpg`.

### Fix

Added `'image/jpg'` as a second key in `ALLOWED_CONTENT_TYPES` (mapping to the same `jpg` extension), and normalized it to the standard `image/jpeg` before it's used as the S3 object's stored `Content-Type` or the extension-mapping lookup — so the stored asset and the file extension both stay standards-correct regardless of what the origin server sent. Added a regression test asserting `image/jpg` is accepted and normalized. Re-ran the exact same enrichment against the same real business afterward: the hero image (`432bbcb-1920w.jpg`, 1920×1440) was correctly `accepted` and uploaded to S3 this time, alongside four more real photos now correctly recorded as `review_required` (small real photos, not auto-used but visible for manual review) instead of being silently dropped.

### New `/admin/scans` list + detail UI

The placeholder `/admin/scans` page (a static "coming in a future stage" message left over from Stage 9) is now a real read-only view:

- `lib/db/scan-events.ts` — added `listAllScans()`: pages through the whole table (same dev-scale `ScanCommand` + safety-cap pattern as `listAllBusinesses()` — no GSI supports a global "every scan, newest first" query), sorted by `createdAt` descending in application code.
- `app/admin/(dashboard)/scans/page.tsx` (rewritten) — a table of every scan across every business: business name (linked), status badge, source URL, images (accepted/found counts), attempt number (flagging retries), created/completed timestamps, and a link to the detail page.
- `app/admin/(dashboard)/scans/[scanId]/page.tsx` (new) — per-scan detail: business/generated-preview links, scan metadata (URLs, HTTP status, timestamps), failure category/message when applicable, an image grid (accepted images render their actual thumbnail via the public scan-image proxy URL; `review_required`/`rejected` images show role/dimensions/note instead, matching the "never auto-use anything but accepted" rule), and the full extracted `WebsiteEnrichmentSnapshot` rendered field-by-field (services, service areas, FAQ, navigation labels, CTAs, contact, social links) with an explicit note that this is evidence, not canonical Business data.
- `app/admin/(dashboard)/scans/[scanId]/actions.ts` (new) — `viewRawArtifactAction(key)`: session-checked, key-prefix-checked, redirects to a short-lived `getSignedAssetUrl()` link for the private `crawl.json`/`extracted.json` artifacts (these are deliberately not part of the public image proxy — see `architecture.md`).

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     473 passed  (npm test) — 1 new regression test for the image/jpg fix
Build:     next build succeeds — /admin/scans/[scanId] registered as a new dynamic (ƒ) route
Manual:    Re-ran enrichBusinessWebsite against the real business (biz_39c2b268-36e8-48cf-9481-
           673921e12880) that surfaced the bug. Before the fix: 1 image recorded, 0 accepted.
           After the fix: 5 images recorded, 1 accepted (the real 1920×1440 hero image, uploaded
           to S3 and immediately usable by generation), 4 review_required. Confirmed via a direct
           DynamoDB query against webpresa-dev-scan-events (business-id-index) before and after,
           and by curl -I against each real candidate image URL to confirm the image/jpg content
           type was the actual root cause, not a fluke.
```

## Files changed

```
web/lib/firecrawl/
├── images.ts                                                                     MODIFIED — accept + normalize image/jpg
└── __tests__/images.test.ts                                                      MODIFIED — 1 new regression test

web/lib/db/
└── scan-events.ts                                                                MODIFIED — added listAllScans()

web/app/admin/(dashboard)/scans/
├── page.tsx                                                                      REWRITTEN — real list, was a static placeholder
└── [scanId]/
    ├── page.tsx                                                                  NEW — scan detail: metadata, images, extracted snapshot
    └── actions.ts                                                                NEW — viewRawArtifactAction (signed URL redirect)

web/docs/build_log.md                                                            MODIFIED — this entry
```

---

## Scan-image promotion workflow — review and add discovered images to Business Photos

**Date:** 2026-07-18 (same day, second follow-up)
**Trigger:** After the `/admin/scans` UI shipped, the user pointed out two remaining gaps: `review_required` images had no way to actually be reviewed (no thumbnail — just a "Needs review" placeholder box, since their bytes were never stored), and there was no way to move any scan-discovered image — including the one truly `accepted` hero photo — into the business's canonical Photos. They asked for review capability on both the scan detail page and the business's Photos section, with approved images landing in Photos.

### Change 1 — store `review_required` images too, not just `accepted`

`lib/firecrawl/images.ts`'s `ingestScanImages()` previously only called `putAsset()` for `status === 'accepted'` images; `review_required` images were fetched (to read dimensions) and then discarded — no S3 object, no `url`/`s3Key`, so the admin UI had nothing to show or promote. Fixed: both statuses now upload to `scans/{businessId}/{scanId}/images/{imageId}.{ext}` and get a real `url`. Only `rejected` candidates (which never reach the upload step at all) have no stored bytes. `MAX_ACCEPTED = 8` still only bounds auto-usable `accepted` images; `review_required` storage is bounded only by the existing 15-candidate ceiling.

### Change 2 — `approveScanImageAction`: promote a scan image into `Business.photoUrls`

New action in `enrichment-actions.ts` (see `architecture.md`, "Scan-image promotion" for the full step-by-step). Key decision: **copies** the object bytes into `businesses/{businessId}/assets/photos/{n}.{ext}` rather than pointing `Business.photoUrls` at the `scans/` prefix directly — keeps every `photoUrls` entry's provenance/lifecycle identical regardless of origin (admin upload vs. promoted scan image), matching the numbering convention (`photos/${photoUrls.length}.${ext}`) `updatePhotosAction`'s per-slot uploads already use. Idempotent (`ScanImageAsset.promotedPhotoUrl`, a new optional field, prevents double-promotion) and respects the existing 6-photo cap.

### Change 3 — review UI in both places the user asked for

- Scan detail page (`/admin/scans/[scanId]`): every stored image (`accepted` or `review_required`) now renders its real thumbnail (previously only `accepted` did) and gets an "Add to Photos" button; already-promoted images show a disabled "✓ Added to Photos" state. A `photoApproval` query-param result banner reports success/limit-reached/already-added/not-found.
- Business detail page: new `ScanImageReview.tsx`, rendered inside the existing Photos `CollapsibleCard`, lists every not-yet-promoted image across *all* of that business's scans (not just the most recent) with the same "Add to Photos" action. The Photos card now auto-opens (`defaultOpen`) whenever there's something to review, so a just-completed enrichment doesn't hide new images behind a collapsed card.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     478 passed  (npm test) — 5 new tests for approveScanImageAction (promotes, idempotent,
                          limit-reached, refuses a rejected/never-stored image, requires a session),
                          1 existing images.ts test updated for the new storage behavior
Build:     next build succeeds — no new routes (reuses /admin/scans/[scanId] and the business
           detail page)
Manual:    Re-ran enrichBusinessWebsite against the same real business used for the earlier bug fix
           (biz_39c2b268-36e8-48cf-9481-673921e12880). All 5 discovered images now have real S3
           objects and URLs (previously only 1 of 5 did). Verified the promotion logic itself
           against real AWS (bypassing only the getSession() cookie check, which requires a real
           browser request context a standalone script doesn't have — the action's session guard
           itself is covered by an automated test instead): promoted the real 1920×1440 hero image
           into businesses/{id}/assets/photos/0.jpg (confirmed via `aws s3api head-object`:
           image/jpeg, 201360 bytes) and onto Business.photoUrls. The remaining 4 review_required
           images were left unpromoted so the user can exercise the "Add to Photos" button
           themselves in the live admin UI.
```

## Files changed

```
web/domain/
├── models/scan-image.ts                                                          MODIFIED — added promotedPhotoUrl?
└── schemas/scan-image.schema.ts                                                  MODIFIED — added promotedPhotoUrl?

web/lib/firecrawl/
├── images.ts                                                                     MODIFIED — store review_required images too
└── __tests__/images.test.ts                                                      MODIFIED — updated the review_required test

web/lib/db/scan-events.ts                                                         MODIFIED — putScanEvent already existed; no change here (used by the new action)

web/app/admin/(dashboard)/businesses/[businessId]/
├── enrichment-actions.ts                                                         MODIFIED — added approveScanImageAction
├── ScanImageReview.tsx                                                           NEW — Photos-card review list
├── page.tsx                                                                      MODIFIED — wired ScanImageReview, photoApproval param, auto-open Photos
└── __tests__/enrichment-actions.test.ts                                          NEW — 5 tests

web/app/admin/(dashboard)/scans/[scanId]/page.tsx                                 MODIFIED — real thumbnails for review_required, Add to Photos button

web/docs/
├── architecture.md                                                               MODIFIED — "Scan-image promotion" and "/admin/scans" sections
├── implementation.md                                                             MODIFIED — Stage 13 deferred-work list updated
└── build_log.md                                                                  MODIFIED — this entry
```

---

## Batch photo approval, logo assignment from Photo Assignment, and found-contact-info promotion

**Date:** 2026-07-18 (same day, third follow-up)
**Trigger:** Three separate asks after trying the scan-image review workflow live: (1) clicking "Add to Photos" one image at a time was tedious — wanted checkboxes with select-all/none for batch approval; (2) no way to attach a Firecrawl-imported logo image to `Business.logoUrl`, only to `photoUrls`; (3) for AAA-1 Paul's Plumbing (`biz_39c2b268-36e8-48cf-9481-673921e12880`), Firecrawl found `aaa1paulsplumbing@yahoo.com` in "Contact found on page," but `Business.email` stayed blank — asked why.

### 1. Batch photo approval

Refactored `approveScanImageAction`'s body into `promoteScanImage(businessId, scanId, imageId)` — a pure helper returning `'added'|'already_added'|'limit_reached'|'not_found'`, no redirect — shared by the existing single-image action and a new `approveScanImagesAction(businessId, redirectTo, formData)`. The batch action reads every checked `"{scanId}::{imageId}"` value from the submitted form and promotes each **sequentially** (never `Promise.all` — each call re-fetches `Business` fresh and appends to `photoUrls` by current length, so parallel calls would race and silently drop entries), stopping additions at the 6-photo cap but still counting the rest as `skipped` in the result banner rather than failing the batch.

New shared client component `ScanImageApprovalGrid.tsx`: a "Select all"/"Select none" button pair that toggles checkbox `.checked` directly via a form ref (plain uncontrolled checkboxes, no lifted React state) plus one submit button. Both `/admin/scans/[scanId]` and the business detail page's Photos card (`ScanImageReview.tsx`) now render this same grid bound to the same `approveScanImagesAction`, replacing their previous one-form-per-image approach.

### 2. Business logo in Photo Assignment

Added a fifth `PhotoPickerField` to `PhotosForm.tsx`'s "Photo Assignment" section: "Business logo" (`logoPhotoUrl`). Unlike the four section slots (hero/about/whyChooseUs/services), a logo has no automatic upload-order fallback — "Auto" here means "leave the current logo untouched," not "pick one automatically." `resolveLogoUrl()` in `[businessId]/actions.ts` implements that distinction. A fresh logo *file* upload (the existing top-of-card "Logo" field) still wins over the picker, matching the same precedence the section slots already use for their own direct-upload fields. This closes the loop on scan-image promotion: promote a Firecrawl-found logo image into Photos, then use this picker to point `Business.logoUrl` at it.

### 3. Why the found email wasn't in `Business.email` — and the real gap it exposed

Two distinct issues, both fixed:

- **The generated preview itself never used it either.** `lib/ai/generate-preview.ts`'s `contact` object was built directly from `business.phone`/`email`/`address` with **no fallback to the Firecrawl snapshot at all** — unlike services/service areas/description, which already had this fallback from the original Stage 13 build. This was an inconsistency with the documented merge-precedence rule ("Firecrawl may contribute information absent from the canonical generation context") that got missed for contact fields specifically, reasoning from Stage 11's "contact info is always code-derived, never trusted from the model" invariant — which is about not trusting the *model's* guesses, not about excluding Firecrawl's actually-scraped data as a gap-filler. Fixed: `buildGenerationContext()` now also resolves `contact: { phone?, email?, address? }`, each field independently business-wins-else-first-snapshot-value; `generate-preview.ts` now just uses `generationContext.contact`. `buildPrompt()`'s CTA-channel detection (`primaryChannel`/`secondaryChannel`) was updated to match, so the model's CTA labels stay correctly wired to whichever channel(s) actually end up on the page.
- **Nothing ever wrote it onto `Business` itself**, by design — Stage 13's explicit rule is that Firecrawl evidence never auto-mutates `Business`. What was missing was the same kind of deliberate admin-promotion action scan images already got. Added `applyFoundContactFieldAction(businessId, field, value, redirectTo)` and `FoundContactInfo.tsx` (rendered inside the Business Details card): shows the latest completed scan's first found phone/email/address next to the matching `Business` field whenever they differ, with an "Apply"/"Overwrite" button. New shared helper `lib/firecrawl/snapshot.ts`'s `getLatestSnapshotForBusiness()` backs this (and could back future evidence surfaces).

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     497 passed  (npm test) — 19 new: 5 contact-fallback cases in generation-context.test.ts,
                          2 contact-fallback cases in generate-preview.test.ts, 8 new
                          enrichment-actions.test.ts cases (batch approve ×4, applyFoundContactFieldAction
                          ×4), 4 logo-picker cases in business-details-actions.test.ts
Build:     next build succeeds — no new routes
Manual:    Verified against the real business that raised this (biz_39c2b268-36e8-48cf-9481-
           673921e12880, "AAA-1 Paul's Plumbing Inc"): confirmed Business.email is genuinely blank,
           the latest scan's real snapshot contains aaa1paulsplumbing@yahoo.com, and
           getLatestSnapshotForBusiness() + the FoundContactInfo comparison correctly determine an
           "Apply" button should show for it — confirmed via a script calling the real production
           code path against real DynamoDB, without applying the value (left for the user to click
           through in the live UI themselves, since changing a business's canonical email is more
           consequential than the earlier photo-promotion demo).
```

## Files changed

```
web/app/admin/(dashboard)/businesses/[businessId]/
├── enrichment-actions.ts                                                         MODIFIED — promoteScanImage extracted, approveScanImagesAction, applyFoundContactFieldAction
├── ScanImageApprovalGrid.tsx                                                     NEW — shared checkbox grid + select all/none
├── ScanImageReview.tsx                                                           MODIFIED — uses ScanImageApprovalGrid
├── FoundContactInfo.tsx                                                         NEW — found phone/email/address review + apply
├── page.tsx                                                                      MODIFIED — wired FoundContactInfo, contactApproval param, auto-open logic
├── actions.ts                                                                    MODIFIED — logoPhotoUrl handling, resolveLogoUrl
└── __tests__/
    ├── enrichment-actions.test.ts                                                MODIFIED — 8 new tests
    └── business-details-actions.test.ts                                         MODIFIED — 4 new logo-picker tests

web/app/admin/(dashboard)/businesses/PhotosForm.tsx                              MODIFIED — Business logo picker

web/app/admin/(dashboard)/scans/[scanId]/page.tsx                                MODIFIED — uses ScanImageApprovalGrid, batch result banner

web/lib/firecrawl/
├── generation-context.ts                                                        MODIFIED — contact fallback
├── snapshot.ts                                                                   NEW — getLatestSnapshotForBusiness
└── __tests__/generation-context.test.ts                                         MODIFIED — 5 new contact-fallback tests

web/lib/ai/
├── generate-preview.ts                                                          MODIFIED — uses generationContext.contact
└── __tests__/generate-preview.test.ts                                           MODIFIED — 2 new tests

web/docs/
├── architecture.md                                                               MODIFIED — "Scan-image promotion" batch update, new logo/contact sections
└── build_log.md                                                                  MODIFIED — this entry
```

---

## Admin ergonomics pass — business detail page navigation

**Date:** 2026-07-18 (same day, fourth follow-up)
**Trigger:** Asked for a retrospective before starting Stage 14. Flagged that admin setup "felt like jumping around" and asked about improving interconnectedness between related records. Reviewed the actual current admin UI (not from memory) and confirmed three real gaps: `HistoryCard` rows were plain text with no links; the Scans "View all" link went to the global unfiltered list even from a specific business's page; `EnrichmentSection` (usually the first thing an admin does for a newly-enriched business) sat at the very bottom of the page, below Theme/Admin/Photos/CTA/Sections. Approved implementing the fix (item "A" of the review) with no further checkpoints.

### Changes (all navigational/layout — no new data, actions, or business logic)

- `NeedsAttentionStrip` (new, inline in `page.tsx`) — one amber strip under the page header, rendered only when there's something to review (pending scan-image review, pending found-contact-info, `manual_approval_required`, or a retry-eligible failed scan); each item links via in-page anchor straight to the relevant card.
- `CollapsibleCard.tsx` — added an optional `id` prop (+ `scroll-mt-20` on the wrapper) so cards can be anchor targets.
- `EnrichmentSection` relocated from the end of the page to directly after the History cards.
- `HistoryCard` rows are now links (scans → `/admin/scans/{scanId}`, previews → `/b/{slug}`, archived previews stay plain text since they 404 publicly); `EnrichmentSection`'s "Latest scan status" field is now a link to the same scan detail page.
- `/admin/scans/page.tsx` accepts an optional `?businessId=` search param, filtering the already-fetched array in memory; the business detail page's Scans "View all" link now passes it. A "for {business name} — clear filter" line replaces the generic subtitle when filtered.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     497 passed  (npm test) — unchanged; pure UI/navigation change, no new logic to test
Build:     next build succeeds — no new routes
Manual:    Started the real dev server and fetched the real business detail page
           (biz_39c2b268-36e8-48cf-9481-673921e12880) with a genuine authenticated session —
           minted a valid session JWT locally using the real SESSION_SECRET from .env.local (the
           same signing scheme lib/auth/session.ts already uses), rather than guessing the admin
           password. Confirmed HTTP 200, a full real render (149KB), and that the "Needs attention"
           strip correctly showed "Contact info found on website" and "Images awaiting review" for
           this real business's actual data, each linking to the correct anchor IDs
           (#business-details-card, #photos-card). Dev server and temporary session token file
           cleaned up afterward.
```

## Files changed

```
web/app/admin/(dashboard)/businesses/
├── CollapsibleCard.tsx                                                           MODIFIED — optional id prop
└── [businessId]/
    ├── page.tsx                                                                  MODIFIED — NeedsAttentionStrip, EnrichmentSection relocated, HistoryCard links, card ids
    └── EnrichmentSection.tsx                                                     MODIFIED — latest-scan link

web/app/admin/(dashboard)/scans/page.tsx                                          MODIFIED — businessId filter param

web/docs/
├── architecture.md                                                               MODIFIED — ergonomics-pass bullet
└── build_log.md                                                                  MODIFIED — this entry
```

---

## Contact-promotion crash fix, slug apostrophes, Theme dropdown, Social Links section

**Date:** 2026-07-18 (same day, fifth follow-up)
**Trigger:** Four-part bug/feature report: (1) a `ZodError` crash when overwriting business contact info from a found address value; (2) apostrophes in business names being hyphenated into slugs (`aaa-1-paul-s-plumbing-inc` instead of `aaa-1-pauls-plumbing-inc`); (3) a request to collapse the Theme card into a dropdown instead of always listing all 10 presets; (4) a request to surface Firecrawl-discovered social links as clickable platform icons in a selectable, default-on website section.

### 1. Contact-promotion crash fix

`applyFoundContactFieldAction` (`enrichment-actions.ts`) crashed with a Zod `invalid_type` error on `address` — `Business.address` is a structured `Address` object, but the action was calling `updateBusiness(businessId, { address: <string> })`. `CONTACT_FIELDS` is now `['phone', 'email']` only; `FoundContactInfo.tsx` still shows a found address, but as a read-only block ("Not auto-applied — addresses are structured fields...") with no Apply button.

### 2. Slug apostrophe stripping

`slugify()` (`domain/factories/business.factory.ts`) strips apostrophes (straight `'`, curly `‘’`, backtick) before the general `[^a-z0-9]+` → `-` pass, so "Paul's Plumbing" slugifies to `pauls-plumbing`, not `paul-s-plumbing`. New businesses only — existing slugs (e.g. the AAA-1 Paul's Plumbing test business, still `aaa-1-paul-s-plumbing-inc`) are not retroactively renamed.

### 3. Theme card → dropdown

`ThemeField` (`FormFields.tsx`) is now collapsed by default: a button shows the current selection (swatch chips + name, or "Auto — chosen from logo color or brand personality") with a rotating chevron; clicking opens an absolutely-positioned panel (click-outside-to-close via a `mousedown` listener) listing "Auto" plus all `THEME_OPTIONS`, each still with its swatches. No change to persisted data.

### 4. Social Links section

- `domain/constants/social-platforms.ts` (new) — `SOCIAL_PLATFORMS`/`SOCIAL_PLATFORM_LABELS`, layered under `domain/` (zero deps) per the existing `themes.ts` convention.
- `lib/social-links.ts` (new) — `classifySocialPlatform(url)`, `isSocialLink(url)`.
- `domain/models/site-preview.ts` / `site-preview.schema.ts` — `PreviewSocialLink` (`{ platform, url }`) and `PreviewContent.socialLinks?` (max 10, schema-validated).
- `domain/constants/website-sections.ts` — new `socialLinks` catalog entry, `defaultEnabled: true`, ordered between `ctaBanner` and `contact`.
- `lib/website-sections/availability.ts` — `socialLinks` available once `content.socialLinks.length >= 1`.
- `app/b/[slug]/template/SocialIcon.tsx` / `SocialLinksSection.tsx` (new) — hand-embedded single-path SVGs for Facebook/Instagram/X/LinkedIn/YouTube (confirmed via direct inspection that `lucide-react` ships no brand icons — trademark reasons — rather than adding a new npm dependency), generic `Globe` fallback for other platforms. Wired into `section-registry.tsx`.
- `lib/ai/generate-preview.ts` — derives `content.socialLinks` from `enrichment.snapshot.socialLinks` (max 6, classified per URL) at generation time. Never admin-editable — same "Firecrawl evidence, not admin-authored" precedent as `reviews`; `SectionConfigForm.tsx`'s `NO_EDITOR_SECTIONS` now includes it.
- `lib/firecrawl/normalize.ts` — added `sanitizeAndDedupeSocialLinks()`, deduping by normalized host+path instead of exact string match. A real re-run of enrichment on the AAA-1 Paul's Plumbing test business showed the same Facebook profile listed twice (`facebook.com/AAA-1-...` and `www.facebook.com/AAA-1-.../`) before this fix — verified fixed (2 → 1) with a second real run.

### 5. Bug found during verification: new optional sections were invisible on pre-existing businesses

Live-testing item 4 against the real AAA-1 Paul's Plumbing business (which already had 5 preview versions and a stored `websiteSections` config predating `socialLinks`) turned up a real gap: `resolveStoredOrDefaultSections` (`lib/website-sections/resolve.ts`) only ever backfilled *required* sections missing from a stored config — a newly-catalogued *optional* section type (like `socialLinks`) stayed permanently absent and non-toggleable for any business whose config was saved before that section type existed, even though generation, rendering, and the section registry were all correctly wired up. Fixed by backfilling any section type that's entirely absent from the raw stored data (not just required ones) using its catalog `defaultEnabled` — a type that *was* present in the raw data but got dropped by the existing malformed-entry/bad-variant cleaning steps stays absent, preserving that safety behavior exactly as before (covered by the existing "drops an entry with an unsupported variant" test, which still passes unchanged). Added a new test for the backfill case.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     515 passed  (npm test) — +1 net (social-links.test.ts x6, resolve.test.ts backfill test x1,
                        domain.test.ts slug/socialLinks schema tests, generate-preview.test.ts x2,
                        availability.test.ts x1, normalize.test.ts dedup test)
Build:     next build succeeds — no new routes
Manual:    Started the real dev server, minted a valid session JWT locally using the real
           SESSION_SECRET (lib/auth/session.ts's exact signing scheme: sub/expiresAt payload,
           webpresa_admin_session cookie), and fetched real authenticated pages for
           biz_39c2b268-36e8-48cf-9481-673921e12880 (AAA-1 Paul's Plumbing):
             - Business detail page: Theme button rendered collapsed showing "Red" + swatches +
               chevron (aria-expanded="false"), no preset names present in the initial HTML;
               found-address block rendered read-only with no Apply button; "Social Links" now
               appears as a toggleable entry in the section config UI (after the resolve.ts fix).
             - Ran enrichBusinessWebsite() twice directly against real Firecrawl output to confirm
               the social-link dedup fix (2 duplicate Facebook entries → 1).
             - Public preview page (/b/aaa-1-paul-s-plumbing-inc, viewed via admin session since
               this preview is still a draft): rendered a "Follow Us" section with a circular
               Facebook icon link, correct href and aria-label, themed border/icon colors.
           Dev server and all temporary scratchpad files (session JWT, fetched HTML, ad-hoc
           verification scripts) cleaned up afterward.
```

## Files changed

```
web/app/admin/(dashboard)/businesses/
├── FormFields.tsx                                                                MODIFIED — ThemeField as collapsed dropdown
└── [businessId]/
    ├── enrichment-actions.ts                                                     MODIFIED — CONTACT_FIELDS drops 'address'
    ├── FoundContactInfo.tsx                                                      MODIFIED — read-only address display
    └── SectionConfigForm.tsx                                                     MODIFIED — socialLinks added to NO_EDITOR_SECTIONS

web/domain/
├── constants/
│   ├── social-platforms.ts                                                       NEW — SOCIAL_PLATFORMS, labels
│   └── website-sections.ts                                                       MODIFIED — socialLinks catalog entry
├── factories/business.factory.ts                                                 MODIFIED — slugify() strips apostrophes
├── models/site-preview.ts                                                        MODIFIED — PreviewSocialLink, PreviewContent.socialLinks
└── schemas/site-preview.schema.ts                                                MODIFIED — PreviewSocialLinkSchema

web/lib/
├── social-links.ts                                                               NEW — classifySocialPlatform, isSocialLink
├── ai/generate-preview.ts                                                        MODIFIED — derives content.socialLinks
├── firecrawl/normalize.ts                                                        MODIFIED — sanitizeAndDedupeSocialLinks
└── website-sections/
    ├── availability.ts                                                           MODIFIED — socialLinks availability
    └── resolve.ts                                                                MODIFIED — backfills any missing catalog section, not just required

web/app/b/[slug]/template/
├── SocialIcon.tsx                                                                NEW — hand-embedded brand SVGs + Globe fallback
├── SocialLinksSection.tsx                                                        NEW — public "Follow Us" section
└── section-registry.tsx                                                          MODIFIED — socialLinks entry

web/docs/
├── architecture.md                                                               MODIFIED — this round's five-item bullet
└── build_log.md                                                                  MODIFIED — this entry

---

# Template polish and manual social links (2026-07-19)

**Scope:** Four direct UI-feedback items against live screenshots (hero image panel, services grid height, contact card centering, admin scans list), plus one gap found while investigating a fifth report ("Social Links shows enabled but never renders").

## 1. Hero split-image panel — visual polish

`GeneratedHero.tsx`'s `HeroCornerImage` (the shared image panel for the `'illustration'`/`'imageSplit'` styles and `'image'`'s mobile rendering) rendered the photo/illustration edge-to-edge with no rounded corners and no shading — flat compared to the rest of the template. Added `rounded-l-2xl overflow-hidden` (mobile) / `lg:rounded-l-[2.5rem] lg:overflow-hidden` (desktop) on the wrapper, and an always-on inset shadow gradient along the seam with the text column (`boxShadow: inset 24px 0 48px -24px rgba(0,0,0,0.18)`). Right/top/bottom edges stay flush with the viewport — only the inward (left) edge gets the rounded/shaded treatment, preserving the existing full-bleed design intent.

## 2. ServicesGrid — capped card height, name-only secondary services

A business with many services (up to the schema max of 10) produced an uncapped, very tall section — every service rendered as a full card with icon + name + full description, no `line-clamp`. Fixed in `ServicesGrid.tsx`:
- New `MAX_FULL_SERVICES = 5` — the existing featured-card + grid layout now operates on `services.slice(0, 5)` only.
- Services beyond the 5th (`services.slice(5)`) render as plain name-only pills (`rounded-full border ... px-4 py-2`) below the grid — no icon, no description, no card chrome.
- Each full card's description gets `line-clamp-4`, so even within the top 5 a single long description (schema allows up to 500 chars) can no longer stretch its row's siblings arbitrarily tall.

## 3. ContactSection — center cards regardless of count

`ContactSection.tsx` used a fixed `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. A business with no email (a valid, supported state — `PreviewContact.email` is optional) left exactly 2 of 3 `lg:` grid cells filled, and CSS grid's default `justify-items: start` stuck them to the left instead of centering. Replaced the grid with `flex flex-wrap justify-center gap-4`, giving each card element a fixed-ish width (`w-full sm:w-[calc(50%-0.5rem)] lg:w-60`) in place of an implicit grid-column width — any count of 1–3 visible cards now centers naturally, no per-count conditional needed. The all-missing fallback block is now `w-full` instead of a grid `col-span`.

## 4. Admin `/admin/scans` — group by business

The unfiltered `/admin/scans` view rendered one row per `ScanEvent`, so a business enriched 5 times showed 5 rows. The existing `?businessId=...` filtered view (already used by the business detail page's "View all" link — see 2026-07-18's entry above) already shows full per-business history, so only the *unfiltered* path changed: since `listAllScans()` is already sorted newest-first, a single in-memory pass keeps the first occurrence per `businessId` (`latestScanByBusiness`), giving one row per business (its latest scan) plus a computed `scanCountByBusiness` shown as "· N scans" next to the name. The business-name link in this grouped view now points at `/admin/scans?businessId=...` (full history) instead of `/admin/businesses/...`; the filtered view's own business-name link is unchanged. No new repository function — matches the existing dev-scale, in-memory-filter precedent this file already used for the `businessId` filter itself.

## 5. Business.socialLinks — manual social-links entry

**The gap:** investigating a report that the "Social Links" section showed "enabled" in the admin Website Sections list but never rendered on a real business's public preview (despite the business clearly having Instagram/Facebook links) traced to `computeSectionAvailability`'s `socialLinks` check requiring `PreviewContent.socialLinks.length >= 1` — and that field (`lib/ai/generate-preview.ts`) was populated *exclusively* from a Firecrawl `WebsiteEnrichmentSnapshot`, never set by the manual "Generate Website" path (`generateWebsiteAction` calls `generatePreviewContent(business)` with no `enrichment` option), and with no `Business` field or admin form to enter links manually at all. `enabled: true` in `WebsiteSectionsConfig` is independent of and insufficient for `computeSectionAvailability` — a real, reproducible admin-facing confusion, not a one-off.

**The fix — new durable `Business.socialLinks?: string[]` field**, following the same "Business is canonical, persists across every regeneration" precedent already established for `theme`/`cta`:
- `domain/models/business.ts` — `socialLinks?: string[]`.
- `domain/schemas/business.schema.ts` — `z.array(z.string().url()).max(6).optional()`.
- `lib/firecrawl/normalize.ts` — `sanitizeAndDedupeSocialLinks` is now exported (was a private helper) and reused by the admin action's parsing, so manually-entered and Firecrawl-discovered links get identical validation/host-dedup treatment.
- New "Social Links" section on `BusinessDetailsForm.tsx` — a `TextareaField` ("Social profile URLs", one URL per line, up to 6), wired into both `businesses/actions.ts` (`createBusinessAction`, wizard step 1) and `[businessId]/actions.ts` (`updateBusinessDetailsAction`, the inline "Business Details" card) via a shared-shape `parseSocialLinksInput()` helper (duplicated in each file, matching how `WEBSITE_GENERATION_FIELDS` is already duplicated between the two action files) that splits the textarea on newlines, trims, filters blanks, and runs the result through `sanitizeAndDedupeSocialLinks(lines, 6)`.
- `lib/ai/generate-preview.ts` — `business.socialLinks` now wins outright when non-empty; the Firecrawl enrichment snapshot is only consulted as a fallback when the business left it blank (mirrors `buildGenerationContext`'s existing "Business always wins" merge rule for the free-text generation-input fields).
- Doc-comment updates to remove the now-inaccurate "no manual admin-entry path" claim in three places: `PreviewSocialLink` (`site-preview.ts`), `SocialLinksSection.tsx`, and `SectionConfigForm.tsx`'s `NO_EDITOR_SECTIONS` comment (still correctly excludes `socialLinks` from the *per-preview* inline content editor — the durable field lives on `Business`, not `SitePreview`, same distinction `theme`/`cta` already draw).

**Test fallout:** four existing action test files (`businesses/__tests__/actions.test.ts`, `[businessId]/__tests__/actions.test.ts`, `business-details-actions.test.ts`, `website-sections-actions.test.ts`) started failing after `actions.ts` gained a real (unmocked) import of `@/lib/firecrawl/normalize`, which has a top-level `import 'server-only'` — that package's `index.js` unconditionally throws outside a bundler's `react-server` export-condition resolution (confirmed by reading `node_modules/server-only/index.js`/`package.json` directly), so importing it for real in plain Node/vitest always throws, regardless of the `environment: 'node'` vitest config. Every other `server-only`-importing module these tests touch (`lib/db/businesses.ts`, `lib/ai/generate-preview.ts`, `lib/image/hero-dimensions.ts`) was already `vi.mock()`'d for unrelated reasons, which incidentally prevented the real file (and its `server-only` import) from ever loading — `lib/firecrawl/normalize.ts` was the first module these four files pulled in for real. Fixed by adding a `vi.mock('@/lib/firecrawl/normalize', ...)` (a plain dedupe-and-cap stub, sufficient since none of these four suites test social-link parsing directly — that's `lib/firecrawl/__tests__/normalize.test.ts`'s job, already 10 passing tests, unchanged) to each of the four files.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     515 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/
├── GeneratedHero.tsx                                                             MODIFIED — HeroCornerImage rounded/shaded panel
├── ServicesGrid.tsx                                                              MODIFIED — MAX_FULL_SERVICES cap, name-only pills, line-clamp
├── ContactSection.tsx                                                            MODIFIED — flex-wrap centered layout
└── SocialLinksSection.tsx                                                        MODIFIED — doc comment only

web/app/admin/(dashboard)/
├── scans/page.tsx                                                                MODIFIED — group-by-business unfiltered view
└── businesses/
    ├── FormFields.tsx                                                            (unchanged — reused TextareaField)
    ├── BusinessDetailsForm.tsx                                                   MODIFIED — Social Links textarea section
    ├── actions.ts                                                                MODIFIED — socialLinks in create action
    ├── __tests__/actions.test.ts                                                 MODIFIED — mock @/lib/firecrawl/normalize
    └── [businessId]/
        ├── actions.ts                                                            MODIFIED — socialLinks in update action
        ├── SectionConfigForm.tsx                                                 MODIFIED — doc comment only
        └── __tests__/
            ├── actions.test.ts                                                   MODIFIED — mock @/lib/firecrawl/normalize
            ├── business-details-actions.test.ts                                  MODIFIED — mock @/lib/firecrawl/normalize
            └── website-sections-actions.test.ts                                  MODIFIED — mock @/lib/firecrawl/normalize

web/domain/
├── models/business.ts                                                            MODIFIED — Business.socialLinks field
├── models/site-preview.ts                                                        MODIFIED — PreviewSocialLink doc comment
└── schemas/business.schema.ts                                                    MODIFIED — socialLinks schema

web/lib/
├── firecrawl/normalize.ts                                                        MODIFIED — exported sanitizeAndDedupeSocialLinks
└── ai/generate-preview.ts                                                        MODIFIED — Business.socialLinks wins over enrichment

web/docs/
├── architecture.md                                                               MODIFIED — this round's entry
└── build_log.md                                                                  MODIFIED — this entry
```

---

# Mobile hero background photo + social-links live-preview sync (2026-07-20)

**Scope:** Two follow-ups from direct feedback on the 2026-07-19 hero-panel polish and social-links work.

## A. Mobile hero background photo

The hero's mobile view has never shown a real uploaded photo — `GeneratedHero.tsx` always fell back to the theme illustration on mobile regardless of whether a real desktop hero photo existed, with doc comments explicitly marking this "deferred to a future session." Added a **separate, optional mobile hero photo**, following the exact same "photo-slot override" pattern as the four existing slots (`heroPhotoUrl`/`aboutPhotoUrl`/`whyChooseUsPhotoUrl`/`servicesPhotoUrl`):

- `domain/models/business.ts` / `domain/schemas/business.schema.ts` — `Business.heroPhotoUrlMobile?: string` (`PhotoSlotOverrideSchema`). **Deliberately manual-only, no automatic upload-order fallback** — `resolvePhotoSlot(business.heroPhotoUrlMobile)` is called with zero fallback args in `lib/ai/generate-preview.ts`, unlike every other slot's `resolvePhotoSlot(override, ...autoFallbacks)` call. Silently defaulting an unset mobile slot to an arbitrary uploaded photo risked a bad, nobody-chose-this crop — exactly why real mobile photos were deferred in the first place.
- `domain/models/site-preview.ts` / `domain/schemas/site-preview.schema.ts` — `PreviewTheme.heroImageUrlMobile?: string`, written into the generated `theme` object (`lib/ai/generate-preview.ts`) alongside `heroImageUrl`/`heroStyle`, conditionally spread only when resolved.
- `app/b/[slug]/template/GeneratedHero.tsx` — new `heroImageUrlMobile` prop, threaded into the three branches capable of showing a real photo: `'illustration'` (`mobileImageSrc={heroImageUrlMobile ?? illustrationSrc}`), `'imageSplit'` (`mobileImageSrc={heroImageUrlMobile ?? getHeroIllustration(themeName)}`), and `'image'`'s `lg:hidden` mobile sub-render (both `desktopImageSrc`/`mobileImageSrc` set to `heroImageUrlMobile ?? illustrationSrc`, preserving `HeroCornerImage`'s existing "same src on both = single `<Image>`" optimization since that sub-render is never actually visible at `lg:`+ anyway). **No changes needed to `HeroCornerImage` itself** — its existing "two different `<Image>`s, each CSS-hidden per breakpoint" branch, and the gradient overlay that blends the image's left edge into the background so text stays legible, were both already built for the illustration case and are completely agnostic to what's actually rendered underneath. `app/b/[slug]/template/section-registry.tsx` passes `heroImageUrlMobile={ctx.theme.heroImageUrlMobile}` through to `GeneratedHero`.
- `app/admin/(dashboard)/businesses/PhotosForm.tsx` — new "Mobile hero image" `PhotoPickerField` right after "Desktop hero image," `uploadFieldName="heroPhotoFileMobile"`, hint clarifying both "Auto" and "No photo" fall back to the theme illustration. No dimension-warning wiring (that's a desktop full-bleed-eligibility concern; mobile is always shown cropped via `object-cover`, nothing to warn about).
- `app/admin/(dashboard)/businesses/[businessId]/actions.ts`'s `updatePhotosAction` — extended with the new slot using every existing helper unchanged: `UpdatePhotosSchema`, `SLOT_UPLOAD_FIELDS` (direct-upload support), the `raw`/`data`/`putBusiness` plumbing, and the dual-write block (`resolveThemePhotoPatch(heroPhotoUrlMobile)` → `...(heroMobile.apply ? { heroImageUrlMobile: heroMobile.url } : {})`). No `heroStyle` recomputation needed for this slot — unlike the desktop hero photo, mobile image presence doesn't decide *which* `heroStyle` branch renders, only what `mobileImageSrc` shows within whichever branch already applies.

Not added to `businesses/actions.ts` (wizard step 1 / `createBusinessAction`) — photo-slot overrides are photos-step-only, matching how `heroPhotoUrl` itself was never in the create action either.

## B. Social-links dual-write

**The bug:** an admin added `Business.socialLinks` (2026-07-19's manual-entry field) and enabled the "Social Links" section, but "Review draft" never showed it. Root cause: `updateBusinessDetailsAction` only ever wrote `Business.socialLinks` — nothing patched the *already-generated* `SitePreview.content.socialLinks` the public page actually renders from (`app/b/[slug]/template/index.tsx` reads `preview.content`, never `Business` directly). `generatePreviewContent()` (which derives `content.socialLinks` from `business.socialLinks`) only runs on "Generate Website"/"Enrich Website," never on a plain Business Details save — confirmed the only two call sites are `runWebsiteGeneration` (`actions.ts`) and `enrichBusinessWebsite` (`lib/firecrawl/enrich-business.ts`). "Review draft" (`PreviewLink` in the business detail page) is a static link to whatever the current `SitePreview.content` already holds — no regeneration, no live merge.

**The fix:** the same "dual-write" pattern `updateThemeAction`/`updatePhotosAction` already use for `theme` — after `putBusiness`, patch the business's most recent `SitePreview` in place too, so the change is visible immediately instead of only on the next regeneration. Added to `updateBusinessDetailsAction`, mirroring `updateThemeAction`'s exact shape (fetch `listPreviewsForBusiness`, take `previews[0]`, build the patched object, validate via schema, `putSitePreview`) but patching `content.socialLinks` instead of `theme.themeName`:

```ts
if (socialLinks.length > 0) {
  const previews = await listPreviewsForBusiness(businessId);
  const latest = previews[0];
  if (latest) {
    const newSocialLinks = socialLinks.map((url) => ({ platform: classifySocialPlatform(url), url }));
    const content = { ...latest.content, socialLinks: newSocialLinks };
    PreviewContentSchema.parse(content);
    await putSitePreview({ ...latest, content, updatedAt: new Date().toISOString() });
  }
}
```

Deliberately **one-directional and additive-only** — only patches when `socialLinks.length > 0`, never clears `content.socialLinks` when the business-level field is empty. `updateBusinessDetailsAction` runs on *every* Business Details save (name, phone, description — anything), not just when `socialLinks` specifically changed, so a "clear when empty" version would silently destroy legitimate Firecrawl-sourced `content.socialLinks` on a completely unrelated field edit. An admin who wants to fully clear the section from an existing preview still needs a regeneration — unchanged, not a new limitation.

**Note:** this fix is prospective. The business already stuck on the reported bug needs one more Business Details save (even re-clicking Save with the same values) to sync its current preview; no backfill script was written for one business.

## B.1 Follow-up: URLs without an explicit scheme were silently dropped

The dual-write above shipped, but the user reported the section *still* didn't render after re-entering URLs and re-saving. Root cause: `parseSocialLinksInput` (`[businessId]/actions.ts` and `businesses/actions.ts`, both copies) fed each textarea line straight into `sanitizeAndDedupeSocialLinks`, which requires a real `http://`/`https://` scheme (`isValidHttpUrl` in `lib/firecrawl/normalize.ts` calls `new URL(value)` and checks `protocol`) — unlike `websiteUrl`, which has always been scheme-normalized via `normalizeUrl()` before validation. A bare domain typed without a scheme (e.g. `facebook.com/yourbusiness`) failed `new URL()` and was silently filtered out, with no error shown — `Business.socialLinks` ended up saved as `undefined` even though the admin had visibly typed URLs in, and the dual-write's `if (socialLinks.length > 0)` guard never fired since there was nothing to apply.

**Fix:** `parseSocialLinksInput` now runs each line through the existing `normalizeUrl()` helper (auto-prepends `https://` when no scheme is present) before handing it to `sanitizeAndDedupeSocialLinks`, in both files. **Also added a validation error path** that was missing before: if the textarea had non-blank content but zero lines survived sanitization (e.g. genuinely malformed input), `updateBusinessDetailsAction`/`createBusinessAction` now return a field error ("No valid URLs found — enter one per line, e.g. https://facebook.com/yourbusiness") instead of silently saving nothing — closing off this entire class of silent-data-loss bug, not just the specific missing-scheme case.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     515 passed  (npm test)
Build:     next build succeeds — no new routes
Manual:    Not yet performed — user asked to visually verify in-browser (mobile hero photo upload/render, and social-links dual-write on "Review draft") before considering this fully done.
```

## Files changed

```
web/app/b/[slug]/template/
├── GeneratedHero.tsx                                                             MODIFIED — heroImageUrlMobile prop, threaded into 3 branches
└── section-registry.tsx                                                          MODIFIED — passes heroImageUrlMobile

web/app/admin/(dashboard)/businesses/
├── PhotosForm.tsx                                                                MODIFIED — "Mobile hero image" PhotoPickerField
├── actions.ts                                                                    MODIFIED — parseSocialLinksInput scheme-normalization + validation error
└── [businessId]/actions.ts                                                       MODIFIED — heroPhotoUrlMobile slot (updatePhotosAction) + socialLinks dual-write & scheme-normalization fix (updateBusinessDetailsAction)

web/domain/
├── models/business.ts                                                            MODIFIED — Business.heroPhotoUrlMobile field
├── models/site-preview.ts                                                        MODIFIED — PreviewTheme.heroImageUrlMobile field, heroStyle doc update
├── schemas/business.schema.ts                                                    MODIFIED — heroPhotoUrlMobile schema
└── schemas/site-preview.schema.ts                                                MODIFIED — heroImageUrlMobile schema

web/lib/ai/generate-preview.ts                                                    MODIFIED — heroImageUrlMobile resolution

web/docs/
├── architecture.md                                                               MODIFIED — this round's entry
└── build_log.md                                                                  MODIFIED — this entry
```

---

# Hero panel: rounded/shadowed card only for real photos, not the illustration fallback (2026-07-21)

**The ask:** the rounded-corner/shadow/gap card treatment applied to the hero split-image panel (2026-07-19/20 work) looked good on a real desktop hero photo, but shouldn't apply to the theme illustration ("no photo" fallback) — that should stay exactly as it originally looked (flush, edge-to-edge, no rounding, no shadow).

**Fix:** `HeroCornerImage` (`app/b/[slug]/template/GeneratedHero.tsx`) gained two new required props, `desktopIsPhoto`/`mobileIsPhoto`, decided independently per breakpoint (a business can have a real mobile photo with an illustration desktop, or vice versa — see the mobile hero photo work from 2026-07-20). The wrapper's className is now built from two mutually-exclusive branches per breakpoint instead of one fixed string:

```ts
const mobileBox = mobileIsPhoto ? 'inset-y-4 right-4 rounded-2xl overflow-hidden shadow-xl' : 'inset-y-0 right-0';
const desktopBox = desktopIsPhoto ? 'lg:rounded-2xl lg:overflow-hidden lg:shadow-xl lg:my-8 lg:mr-8 xl:mr-12' : '';
```
(Each ternary picks one *complete* set of classes rather than layering a base set + override — avoids Tailwind utility-conflict ordering issues, e.g. `inset-y-0` vs `inset-y-4` both present simultaneously.)

`SplitHeroSectionProps` threads the two booleans down from `GeneratedHero`'s three branches:
- `'illustration'`: `desktopIsPhoto={false}` (always — this branch only exists because no desktop photo resolved), `mobileIsPhoto={!!heroImageUrlMobile}`.
- `'imageSplit'`: `desktopIsPhoto` (always true — this branch only exists because a real desktop photo resolved), `mobileIsPhoto={!!heroImageUrlMobile}`.
- `'image'`'s `lg:hidden` mobile sub-render: both set to `!!heroImageUrlMobile` (this instance's own "desktop" side is never actually visible — the real desktop rendering is the separate full-bleed `legacySection` — so the flag only affects what's shown on mobile).

No change to `gradientOverlay` (the left-edge blend into the text column) — unchanged for both photo and illustration cases, exactly as before.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     515 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — desktopIsPhoto/mobileIsPhoto props gate the rounded/shadowed card treatment

web/docs/
├── architecture.md                            MODIFIED — this round's entry
└── build_log.md                               MODIFIED — this entry
```

---

# Firecrawl differentiators extraction — fixes blank Why Choose Us for enriched businesses (2026-07-21)

**The ask:** A-1 Plumbing (`biz_34eb24fd-85fc-4413-a138-c40aaa5b2185`) was enriched via Firecrawl, which scraped a real summary from its own site — "family-owned... over 40 years of industry experience... 24/7 emergency services" — but its public preview's Why Choose Us section rendered nothing.

**Root cause:** `PreviewContent.differentiators` (what `WhyChooseUs.tsx` renders from) comes from OpenAI's structured output, which only ever writes one entry per line in `GenerationContext.differentiatorLines`. That list was built solely from `Business.differentiators` (a manual admin free-text field) — unlike every other field in `buildGenerationContext()` (services, service areas, description, contact), it had no Firecrawl-snapshot fallback at all, a previously deliberate design choice (see the now-superseded comment/test: "Firecrawl has no equivalent field to fall back to"). A-1 Plumbing's scraped summary landed in `snapshot.summary` and did reach the prompt as `description`, but the model was never told it could derive `differentiators` output from anything besides an explicit list — so a business with no manually-typed differentiators always got an empty array regardless of what Firecrawl actually found.

**Fix:** gave `differentiators` the same per-field Firecrawl fallback every other enrichable field already has, rather than special-casing it in the OpenAI prompt:

- `lib/firecrawl/client.ts`: added `differentiators: string[]` to `EXTRACTION_JSON_SCHEMA` and extended `EXTRACTION_PROMPT` to ask Firecrawl's own extraction LLM for short "why choose us" phrases literally stated on the page (years in business, family-owned/local, licensed/insured, 24/7 availability, awards/certifications, guarantees) — same "only what's literally stated, never inferred" constraint as every other extracted field.
- `lib/firecrawl/normalize.ts` / `domain/models/website-enrichment.ts` / `domain/schemas/website-enrichment.schema.ts`: `WebsiteEnrichmentSnapshot.differentiators` (`string[]`, deduped/sanitized/capped at 8 — matches `PreviewContent.differentiators`'s own cap) normalized exactly like `serviceAreas`.
- `lib/firecrawl/generation-context.ts`: `buildGenerationContext()` now resolves `differentiatorLines` as business-wins-else-snapshot, folded into `usedEnrichmentFallback`, matching `servicesLines`/`serviceAreaLines`.
- `lib/ai/generate-preview.ts`: reworded the differentiators prompt line (no longer claims "verbatim from the owner," since the list may now be website-sourced) and extended the existing enrichment-fallback disclosure note to mention differentiators alongside services/service areas/description.

Businesses already enriched before this change (including A-1 Plumbing) need "Enrich Website"/"Retry" run again to pick up the new field, since their stored `extracted.json` predates it.

**Out of scope:** no new admin "found differentiators, apply?" review UI (unlike `FoundContactInfo.tsx`'s phone/email flow) — the fallback flows straight into generation input the same way services/service areas already do. `Business.differentiators` (the manual field) is unchanged and still always wins when non-empty.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     519 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/lib/firecrawl/
├── client.ts                                                      MODIFIED — differentiators added to EXTRACTION_JSON_SCHEMA + EXTRACTION_PROMPT
├── normalize.ts                                                   MODIFIED — differentiators dedup/sanitize/cap, matching serviceAreas
├── generation-context.ts                                          MODIFIED — differentiatorLines business-wins-else-snapshot fallback
└── __tests__/
    ├── normalize.test.ts                                          MODIFIED — differentiators extraction/cap tests
    └── generation-context.test.ts                                 MODIFIED — replaced "no fallback" test with fallback tests

web/lib/ai/
├── generate-preview.ts                                            MODIFIED — prompt wording no longer claims "verbatim from the owner"
└── __tests__/generate-preview.test.ts                              MODIFIED — enrichment-sourced differentiators reach the prompt

web/domain/
├── models/website-enrichment.ts                                   MODIFIED — WebsiteEnrichmentSnapshot.differentiators field
├── schemas/website-enrichment.schema.ts                            MODIFIED — differentiators validation
└── __tests__/stage13.test.ts                                       MODIFIED — fixture updated with differentiators field

web/lib/firecrawl/__tests__/enrich-business.test.ts                 MODIFIED — fixture updated with differentiators field

web/docs/
├── architecture.md                                                MODIFIED — this round's entry
└── build_log.md                                                   MODIFIED — this entry
```

---

# Scan-page business link + Logo & Photos manager redesign (2026-07-21)

**The asks:** (1) a quick "View business" link on the admin scan detail page, left of "View generated preview". (2) On the business detail page's Photos card: the uploaded logo never rendered as an image anywhere in the admin (only a plain "view" text link); uploading additional photos silently replaced the existing set instead of adding to it; and a request to redesign the top of the Photos card into a unified photo manager that shows every photo (and the logo) with upload and delete.

**Root causes, confirmed by reading the code:** `FileField`'s `currentUrl` branch (logo) only ever rendered a text link, never an `<Image>`, unlike the `currentUrls` (photos) branch which got a real `PhotoThumbnail` grid elsewhere on the page. `updatePhotosAction` replaced `Business.photoUrls` wholesale whenever the bulk "Business photos" field was used (`assets.photoUrls ?? existing.photoUrls`, not a spread/append), and the underlying S3 keys were positional (`photos/{n}.ext`), so a re-upload — or, once delete existed, a later upload after a delete — could silently overwrite a still-referenced S3 object at the same key. No delete capability existed anywhere (no S3 delete helper, no action, no UI).

**Fix — Task 1:** `app/admin/(dashboard)/scans/[scanId]/page.tsx` — added a "View business" `Link` to `/admin/businesses/{businessId}` immediately left of "View generated preview," gated on `business` being present (independent of whether a preview exists yet).

**Fix — Task 2, unified Logo & Photos manager:**
- `lib/s3/assets.ts`: new `deleteAsset(key)`, mirroring `putAsset`'s shape. No IAM change needed — the live `webpresa-vercel-dev` policy already grants `s3:DeleteObject` (verified against the real AWS account).
- `lib/s3/business-assets.ts`: removed `uploadBusinessAssets()` entirely (dead code once bulk logo/photo upload moved out of `updatePhotosAction` — confirmed no other caller). Added `appendBusinessPhotos(businessId, existingPhotoUrls, files)` — uploads each file to `photos/${crypto.randomUUID()}.${ext}` (never positional) and appends, fixing the collision risk for good since `Business.photoUrls` is treated as an opaque list of URLs everywhere it's consumed (`resolvePhotoSlot()` never parses a filename). Added `assetKeyFromUrl(url)` to recover an S3 key from a proxy URL for deletion.
- `enrichment-actions.ts`'s `promoteScanImage` (scan-image approval) gets the same `crypto.randomUUID()` key fix — it writes into the same `photoUrls`/S3 prefix, so leaving it positional would have reintroduced the identical collision bug through a second entry point.
- `actions.ts`: `updatePhotosAction` narrowed back to its original scope (Photo Assignment slot overrides only) — `photoUrls` now only ever grows via the five per-slot direct-upload inputs (switched to random keys). Three new instant, no-redirect Server Actions, dispatched via `useActionState` (same convention as `autoSaveWebsiteSectionsAction`), sharing a new `PhotoManagerState = { message?; photoUrls?; logoUrl? }` return shape (extends the usual `{ message? }` shape since there's no redirect to fall back on for conveying the mutated state to an optimistic client):
  - `addBusinessPhotosAction` — appends new photos (rejects the whole batch, not a partial truncate, if it would exceed the 6-photo cap).
  - `deleteBusinessPhotoAction` — removes a URL from `photoUrls`; clears any of `heroPhotoUrl`/`heroPhotoUrlMobile`/`aboutPhotoUrl`/`whyChooseUsPhotoUrl`/`servicesPhotoUrl`/`logoUrl` that pointed at it (falling back to Auto); best-effort deletes the S3 object (log-and-swallow on failure — the DB record is already correct); dual-writes the latest `SitePreview.theme` for exactly the slot(s) just cleared, mirroring `updatePhotosAction`'s existing dual-write block; idempotent on an already-deleted URL.
  - `updateBusinessLogoAction` — uploads a new logo file and sets `Business.logoUrl` (fixed `logo.{ext}` key, not randomized — a single dedicated slot, never appended/deleted from an array).
- `FormFields.tsx`'s `PhotoThumbnail` widened (backward compatible) with optional `label` (overrides "Photo N") and `overlay` (for a delete button), so the logo gets the exact same real-thumbnail treatment as every other photo.
- New `PhotoManager.tsx` (`'use client'`): logo row (thumbnail + "Upload logo"/"Replace logo" button) and a photo grid (thumbnail + overlay ✕ button per photo, two-click inline confirm — armed red for 3s then auto-reverts, no `window.confirm`/modal — plus an "Add photos" button, disabled at the 6-photo cap). All controls disabled while any of its three actions is pending. On a successful response, lifts the new `photoUrls`/`logoUrl` up via callback props and calls `router.refresh()` so the enclosing page recomputes everything it derives from `business` that PhotoManager doesn't own directly (hero-dimension warnings, the onboarding wizard's step-advance logic, fresh Photo Assignment defaults).
- `PhotosForm.tsx`: renders `<PhotoManager>` in place of the old top-of-form Logo/Business-photos `FileField` pair; lifts `photoUrls`/`logoUrl` into local state fed only by `PhotoManager`'s callbacks (never re-synced from props after mount, so a `router.refresh()` can't clobber a just-applied optimistic update); removed the now-redundant `PhotoThumbnail` display grid inside "Photo Assignment" (the manager above already shows every photo); each Photo Assignment `PhotoPickerField` now gets a `key` derived from its own current server value, so a slot a delete just cleared visually resets to Auto instead of silently re-submitting a now-deleted URL on the next "Save Photos" — `PhotoPickerField` only ever seeds its selection from `defaultValue` once, at mount.
- Both `[businessId]/page.tsx` and `onboarding/photos/page.tsx` (the two `PhotosForm` render sites) bind and pass the three new actions the same way `updatePhotosAction` already was.

**Tests:** new `[businessId]/__tests__/photos-actions.test.ts` (13 tests) covering all three new actions — append/cap-rejection/zero-files/auth for `addBusinessPhotosAction`; URL removal, exact-slot-clearing (and non-clearing of unrelated slots), S3 deletion, conditional dual-write, idempotency for `deleteBusinessPhotoAction`; upload/no-file/auth for `updateBusinessLogoAction`. Updated `business-details-actions.test.ts` (removed two tests whose premise — bulk logo/photo upload inside `updatePhotosAction` — no longer exists) and `actions.test.ts`/`website-sections-actions.test.ts` (mock-shape only). Updated `enrichment-actions.test.ts`'s two tests that asserted exact positional S3 keys to assert the new random-key pattern/uniqueness instead.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     530 passed  (npm test)
Build:     next build succeeds — no new routes
```

Live-verified the `webpresa-vercel-dev` IAM user's `webpresa-dev-s3-assets` policy already includes `s3:DeleteObject` (`aws iam get-user-policy --profile webpresa`) — no infra change needed for `deleteAsset()`. Dev server boot/route smoke-tested (homepage 200, `/admin/sign-in` 200, unauthenticated `/admin/businesses` redirects 307) — full interactive click-through (upload/delete flow, scan-page button) was **not** verified in a live browser this round (no browser-automation tool available, no admin credentials on hand) and should be manually checked.

## Files changed

```
web/app/admin/(dashboard)/scans/[scanId]/page.tsx                               MODIFIED — "View business" link left of "View generated preview"

web/lib/s3/
├── assets.ts                                                                   MODIFIED — new deleteAsset()
└── business-assets.ts                                                         MODIFIED — removed uploadBusinessAssets; added appendBusinessPhotos, assetKeyFromUrl

web/app/admin/(dashboard)/businesses/
├── FormFields.tsx                                                              MODIFIED — PhotoThumbnail gained label/overlay props
├── PhotoManager.tsx                                                            NEW — unified logo + photo upload/delete manager
├── PhotosForm.tsx                                                              MODIFIED — renders PhotoManager, lifts photoUrls/logoUrl state, keys Photo Assignment pickers
└── [businessId]/
    ├── actions.ts                                                              MODIFIED — updatePhotosAction narrowed; addBusinessPhotosAction/deleteBusinessPhotoAction/updateBusinessLogoAction added
    ├── enrichment-actions.ts                                                   MODIFIED — promoteScanImage random S3 key
    ├── onboarding/photos/page.tsx                                              MODIFIED — binds the three new actions
    └── __tests__/
        ├── photos-actions.test.ts                                             NEW — 13 tests for the three new actions
        ├── business-details-actions.test.ts                                   MODIFIED — removed tests for now-removed bulk-upload behavior
        ├── actions.test.ts                                                    MODIFIED — mock shape only
        ├── website-sections-actions.test.ts                                   MODIFIED — mock shape only
        └── enrichment-actions.test.ts                                         MODIFIED — random-key assertions

web/docs/
├── architecture.md                                                            MODIFIED — this round's entry
└── build_log.md                                                               MODIFIED — this entry
```

---

# Follow Us section visual prominence fix (2026-07-22)

**The ask:** the Follow Us (social links) section didn't stand out — it looked like a continuation of the About Us section above it, and the platform icons were too small.

**Root cause:** both `SocialLinksSection` and `AboutSection` used the same `bg-(--site-background)` token, so the two sections blended into one continuous white block with no visual break between them.

**Fix:** `SocialLinksSection.tsx` — switched to `bg-(--site-surface)`, alternating from `AboutSection` above it, matching the banding convention already used by `FaqSection`/`ServiceAreaSection`/`ReviewsSection`. Icon badges enlarged from `w-11 h-11` (44px) to `w-16 h-16` (64px), glyphs from `w-5 h-5` to `w-7 h-7`, given a solid `V.background` fill (previously transparent/outline-only) plus a subtle shadow so they read as distinct badges against the new surface band. Section padding increased slightly (`py-12` → `py-16`) to match the heavier visual weight.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     530 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/SocialLinksSection.tsx    MODIFIED — surface band background, larger filled icon badges

web/docs/
├── architecture.md                                MODIFIED — this round's entry
└── build_log.md                                   MODIFIED — this entry
```

---

# Featured service card contrast fix (2026-07-22)

**The ask:** same failure mode as the earlier About-section quote fix — `ServicesGrid`'s featured (first) service card overlays white heading/description text on a photo background, and on a bright photo (a white service truck) the text was hard to read.

**Root cause:** the card's dark overlay (`ServicesGrid.tsx`) was a flat `rgba(0,0,0,0.45)` — not strong enough over a bright image, and no `text-shadow` fallback existed either.

**Fix:** strengthened the overlay to `rgba(0,0,0,0.6)` and added the same `textShadow: '0 1px 3px rgba(0,0,0,0.8)'` fallback to both the heading and description (only applied when `showPicture`, i.e. only the featured card at `lg:`+ — every other card is unaffected).

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     530 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/ServicesGrid.tsx    MODIFIED — stronger overlay + text-shadow on the featured card's heading/description

web/docs/
├── architecture.md                            MODIFIED — this round's entry
└── build_log.md                               MODIFIED — this entry
```

---

# Logo-as-hero cropping fix (2026-07-22)

**The ask:** an admin picked A-1 Plumbing's own circular badge logo (text running around the rim) as the desktop hero photo. The `'imageSplit'` layout's photo panel (`HeroCornerImage`) uses `object-cover` to fill its card, which cropped the top and bottom off the circular logo, cutting off the rim text.

**Root cause:** `object-cover` always crops a source image to fill its container's aspect ratio. That's the right behavior for an environmental photo (some cropping is expected/fine), but wrong for a logo/badge — edge-to-edge artwork where any crop cuts off part of the design. Nothing in `GeneratedHero.tsx` distinguished "this hero image is a real photo" from "this hero image happens to be the business's own logo, reused."

**Fix:** `GeneratedHero.tsx` now accepts a `logoUrl` prop (threaded from `section-registry.tsx`'s `ctx.logoUrl`, which the header already used) and compares it against the resolved `heroImageUrl`/`heroImageUrlMobile`, independently per breakpoint (`heroImageIsLogo`/`heroImageMobileIsLogo`). Threaded as `desktopIsLogo`/`mobileIsLogo` through `SplitHeroSection` into `HeroCornerImage`. A new `LogoFrame` helper renders that breakpoint's image `object-contain` on a `V.surface` (theme surface color) backdrop, padded, instead of `object-cover` — so the whole logo is always visible regardless of the panel's aspect ratio. Non-logo photos are completely unaffected. The full-bleed legacy `'image'` style (exactly 1920×1080/1600×900) never needed this — a logo essentially never matches that dimension tolerance, so it always resolves to `'imageSplit'` instead, the one path this fix targets (plus the mobile-only split shell `'image'`'s own mobile rendering reuses).

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     530 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/
├── GeneratedHero.tsx                                                          MODIFIED — logoUrl prop, isLogo detection, LogoFrame (object-contain backdrop)
└── section-registry.tsx                                                       MODIFIED — passes ctx.logoUrl into GeneratedHero

web/docs/
├── architecture.md                                                            MODIFIED — this round's entry
└── build_log.md                                                               MODIFIED — this entry
```

---

# Universal hero CTA defaults + Request Service form (2026-07-22)

**The ask:** the hero (and every other section reading the shared CTA config) should show **Primary: Call Us / Secondary: Request Service** on every business page — even businesses whose preview today only has a primary CTA configured. The "Request Service" button opens a reusable form: a centered modal on desktop, a full-screen drawer on mobile. Frontend only — no lead-persistence backend yet.

**Scope note:** explicitly frontend-only per direct instruction. `RequestServiceForm`'s submission is simulated locally (a `setTimeout`, then a success state) — nothing is sent anywhere yet. Wiring it to a real lead-capture destination is deferred, tracked-later work, same as the rest of this stage's "architecture later" boundary.

## Design

- **New CTA action type — `request_service`** (`CTA_ACTION_TYPES`, `domain/models/site-preview.ts`): opens the shared dialog instead of navigating; needs no destination `value` (unlike `external_url`, which still requires one). Selectable in the admin `CtaConfigForm` alongside the existing phone/SMS/email/external-link options — nothing was removed from the admin portal, only added to it.
- **Universal secondary default, resolved at render time, not via a data migration** (`resolvePreviewCtaConfig`, `template/cta.tsx`): whenever a preview's `content.cta.secondary` is entirely unset, it now resolves to a built-in `{ type: 'request_service', label: 'Request Service' }` default. This makes the pairing apply immediately to every existing business page — including ones that today only ever configured a primary CTA — without regenerating a preview or requiring any admin action. An admin who has *explicitly* configured a secondary (including explicitly hiding it via `type: 'none'`) is still respected; only the "never configured" case gets the new default. `request_service` always resolves (no phone/email dependency), so it's a safe universal fallback.
- **`buildDefaultCta`** (`app/admin/.../cta-defaults.ts`) — primary label default changed from "Call Now" to "Call Us." Left its optional email-secondary branch alone (still reachable when a caller explicitly requests it via `labels`); the render-layer default above is what actually guarantees "Request Service" appears, so this function didn't need a structural change.
- **`RequestServiceProvider` / `useRequestService`** (new `template/RequestServiceModal.tsx`) — a client-side React Context wrapping the entire template (`template/index.tsx`), so any CTA button anywhere in the section tree can open the same dialog. Renders as a `framer-motion` `AnimatePresence` panel: `items-end` (bottom sheet, `rounded-t-3xl`, `h-[92vh]`) on mobile, `md:items-center` (centered card, `md:rounded-2xl`, `md:max-w-lg`) on desktop — one component, breakpoint-driven via Tailwind classes, not two separate implementations. Closes on Escape, backdrop click, or the `X` button; locks `document.body` scroll while open.
- **`RequestServiceForm`** (new `template/RequestServiceForm.tsx`) — reusable, business-agnostic: name (required), phone/email (at least one required), service needed, free-text details. Kept independent of the modal/drawer shell so it could be embedded elsewhere later (e.g. a dedicated `/contact` section) without change.
- **`CtaButton`** (new `template/CtaButton.tsx`, client) — the single place a resolved CTA's `type` decides "navigate" vs. "open the dialog." Renders a real `<a>` for every existing action type (unchanged behavior, including `externalLinkAttrs`' `target="_blank"` for `external_url`) or a `<button onClick={openRequestService}>` for `request_service`. Every section that renders a primary/secondary CTA (`GeneratedHero`, `GeneratedSiteHeader`, `WhyChooseUs`, `ServiceAreaSection`, `FinalCTA`, `MobileCallBar`, `AboutSection`) now renders `<CtaButton cta={...} className="...">` instead of a raw `<a>`, passing through its existing styling unchanged — server components can render this client component directly without becoming client components themselves.
- **`CtaIcon`** gained a `request_service` glyph (clipboard-check style) so the mobile sticky bar and header keep their icon+label treatment for the new type.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test) — cta.test.ts updated: 5 assertions rewritten for the new default-secondary
           behavior (secondary now resolves to Request Service instead of null when unconfigured), 2 new tests
           added (explicit `type: 'none'` still hides it; request_service resolves without contact info)
Build:     next build succeeds — no new routes
```

Not yet done: manual browser verification of the modal (desktop) / drawer (mobile) interaction — deferred at the user's request in this session. Lead submission has no backend — a real destination (email, DynamoDB, CRM, etc.) is future work.

## Files changed

```
web/domain/models/site-preview.ts                                             MODIFIED — added 'request_service' to CTA_ACTION_TYPES

web/app/b/[slug]/template/
├── cta.tsx                                                                    MODIFIED — resolves request_service; universal default secondary; new CtaIcon glyph
├── CtaButton.tsx                                                              NEW — client component: link vs. dialog-trigger per CTA type
├── RequestServiceModal.tsx                                                    NEW — RequestServiceProvider/useRequestService context + modal/drawer shell
├── RequestServiceForm.tsx                                                     NEW — reusable request-service form (frontend-only, simulated submit)
├── index.tsx                                                                  MODIFIED — wraps template in RequestServiceProvider
├── GeneratedHero.tsx                                                          MODIFIED — CtaButton in place of raw <a> (both hero styles)
├── GeneratedSiteHeader.tsx                                                    MODIFIED — CtaButton in place of raw <a> (desktop + mobile drawer)
├── WhyChooseUs.tsx                                                            MODIFIED — CtaButton in place of raw <a>
├── ServiceAreaSection.tsx                                                     MODIFIED — CtaButton in place of raw <a>
├── FinalCTA.tsx                                                               MODIFIED — CtaButton in place of raw <a>
├── MobileCallBar.tsx                                                          MODIFIED — CtaButton in place of raw <a>
├── AboutSection.tsx                                                           MODIFIED — CtaButton in place of raw <a>
└── __tests__/cta.test.ts                                                      MODIFIED — updated for the new default-secondary behavior

web/app/admin/(dashboard)/businesses/[businessId]/
├── cta-defaults.ts                                                            MODIFIED — primary label default "Call Now" → "Call Us"
└── CtaConfigForm.tsx                                                          MODIFIED — 'request_service' option, help text, hides destination field for it

web/docs/
├── architecture.md                                                            MODIFIED — this round's entry
└── build_log.md                                                               MODIFIED — this entry
```

---

# Bug fix — Request Service dialog theming (2026-07-22)

**The ask:** the Request Service modal rendered with a transparent panel and low-contrast/white text on desktop, even though the site behind it has a normal light theme.

**Root cause:** `GeneratedWebsite` (`template/index.tsx`) nested the themed wrapper `<div>` (carrying `--site-*` custom properties via inline `style={buildSiteTokens(theme)}`) *inside* `RequestServiceProvider`. `RequestServiceProvider` renders its dialog as a sibling of `{children}`, not a descendant — so in the actual DOM, the dialog ended up a **sibling** of the themed div, not nested inside it. CSS custom properties only cascade to descendants, so every `var(--site-*)`/`bg-(--site-background)`/`text-(--site-text)` reference inside the dialog resolved to nothing — transparent background, unset (browser-default/inherited) text color.

**Fix:** swapped the nesting — the themed div now wraps `RequestServiceProvider`, so the dialog (rendered inside the provider, which itself has no DOM wrapper of its own) is a true descendant of the div carrying the CSS variables and inherits them correctly.

### Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
```

Not yet manually re-verified in a live browser (deferred per this session's scope) — fix confirmed by inspection of the resulting DOM nesting.

## Files changed

```
web/app/b/[slug]/template/index.tsx    MODIFIED — swapped nesting so the themed div wraps RequestServiceProvider

web/docs/build_log.md                  MODIFIED — this entry
```

---

# Bug fix — mobile hero photo rendered as a floating card instead of full-bleed (2026-07-22)

**The ask:** a mobile-only hero photo, manually selected by an admin (`Business.heroPhotoUrlMobile` → `PreviewTheme.heroImageUrlMobile`), was rendering as a narrow inset strip with rounded corners and a shadow — the "floating card" treatment `HeroCornerImage` was built for the theme-illustration fallback and a non-hero-dimensioned *desktop* photo. The desired look (confirmed via a reference screenshot) is full-bleed, edge-to-edge, with only a dark gradient scrim behind the text — matching the desktop `'image'` style's existing full-bleed treatment elsewhere in the same file.

**Root cause:** when `heroImageUrlMobile` shipped (2026-07-20), it was threaded into the *existing* `SplitHeroSection`/`HeroCornerImage` machinery purely because that machinery was already breakpoint-aware and convenient to reuse — not because the floating-card look was a deliberate design choice for a real, deliberately-chosen photo. `HeroCornerImage`'s `mobileIsPhoto` flag was simply `!!heroImageUrlMobile` in every branch, so any real mobile photo (not just the logo-reuse case) got the same rounded/inset/shadowed treatment intended for the "no real photo, dress up the illustration" case.

**Fix (`app/b/[slug]/template/GeneratedHero.tsx`):**
- Extracted the white-text eyebrow/headline/subheadline/CTA block (previously duplicated between the photo and non-photo branches of `legacySection`) into a new `HeroOverlayContent` component.
- Added a new `FullBleedHeroSection` component: full-bleed `next/image` + the exact existing dark horizontal gradient overlay (`rgba(0,0,0,0.75)→0.45→0.15`, reused verbatim, not redesigned) + `HeroOverlayContent`. No industry watermark, no card styling.
- `legacySection`'s `showImage` branch now renders `<FullBleedHeroSection imageSrc={heroImageUrl!} .../>` instead of inline duplicate markup — desktop `'image'` style output is pixel-identical to before.
- `GeneratedHero` now computes `mobileHasPhoto = !!heroImageUrlMobile && !heroImageMobileIsLogo` — a deliberately chosen, non-logo mobile photo. When true, mobile renders `FullBleedHeroSection` with the real photo, and the existing per-`heroStyle` branch logic (unchanged) is wrapped in `hidden lg:block` to render desktop only.
- The existing per-style branches (now inside a `renderStyleSection()` closure) receive `heroImageUrlMobileForStyle = mobileHasPhoto ? undefined : heroImageUrlMobile` instead of the raw prop, so their own (now mobile-invisible) internal mobile sub-tree falls back to the cheap theme illustration rather than redundantly re-fetching the same photo through the floating-card path it's no longer actually shown through.
- **Unaffected:** desktop rendering in every `heroStyle`; the no-mobile-photo case (theme illustration, unchanged); a mobile hero photo that's the business's own logo (still gets the `LogoFrame`/floating-card treatment — a logo genuinely benefits from being contained rather than full-bleed-cropped, per the existing "Logo-as-hero cropping fix").

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test) — no existing test covers GeneratedHero/HeroCornerImage rendering; none added
Build:     next build succeeds — no new routes
```

Not yet manually re-verified in a live browser (deferred per this session's scope, matching the earlier Request Service modal fix in this same session).

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — HeroOverlayContent + FullBleedHeroSection extracted; mobileHasPhoto full-bleed fix

web/docs/
├── architecture.md                            MODIFIED — "Hero split-image panel" scoped to logo-only mobile case; new "Mobile hero photo full-bleed fix" entry
└── build_log.md                               MODIFIED — this entry
```

---

# Correction — mobile hero photo full-bleed fix over-corrected (2026-07-22)

**The follow-up:** the previous entry's fix ("mobile hero photo rendered as a floating card instead of full-bleed") over-corrected. Direct feedback with a reference screenshot showed the new full-bleed treatment filled the *entire* mobile viewport (`min-h-[88vh]`, full 100vw width), pushing the trust strip off-screen below the fold, and its CTA row rendered centered/stretched full-width buttons instead of the site's normal left-aligned, content-sized ones. The actual target (a second reference screenshot, "Summit Heating & Air") turned out to be much closer to what the app already had *before* either fix: text and CTAs left-aligned, a compact/natural-height hero (trust strip visible without scrolling), and the photo confined to roughly the right third of the screen — just without the rounded-corner/shadow/inset "card" look the very first bug report objected to.

**Fix (`app/b/[slug]/template/GeneratedHero.tsx`):**
- Removed the `mobileHasPhoto`/`FullBleedHeroSection`-on-mobile branch entirely. Mobile once again always renders through `SplitHeroSection` (left-aligned text, `max-w-[60%]`-capped non-stretched CTAs, natural content-driven height — never `min-h-[88vh]`), using the real `heroImageUrlMobile` directly, exactly as before the previous fix — this is what actually fixes the "filled the whole display" and "CTAs not left-justified" complaints.
- Fixed the *original* bug directly in `HeroCornerImage` instead: removed the `mobileIsPhoto` prop and its conditional `mobileBox` (`inset-y-4 right-4 rounded-2xl overflow-hidden shadow-xl`) entirely — mobile is now unconditionally flush/edge-to-edge (`inset-y-0 right-0`) for every image, matching what the theme illustration already looked like. A real chosen mobile photo now renders through this exact same flush treatment instead of getting a distinct floating-card look.
- `FullBleedHeroSection`/`HeroOverlayContent` (added in the previous fix) were **kept**, but now only ever render on desktop, for the `'image'` style's own full-bleed treatment — a legitimate, non-duplicative extraction of markup that already existed there, unrelated to either bug report.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

Not yet manually re-verified in a live browser (deferred per this session's scope).

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — reverted mobile full-bleed branch; mobile now unconditionally flush in HeroCornerImage

web/docs/
├── architecture.md                            MODIFIED — corrected "Hero split-image panel" / "Mobile hero photo" entries
└── build_log.md                               MODIFIED — this entry
```

---

# Polish — CTA label wrapping and mobile hero photo gradient (2026-07-22)

**Two follow-ups from direct feedback:**

1. **"Request Service" wrapping onto two lines.** `CtaButton.tsx` now always merges in `whitespace-nowrap` (in addition to whatever `className` the calling section passes) — a CTA label must never wrap inside its button/link, regardless of how narrow the surrounding container gets. Single fix point, applies everywhere a CTA renders (hero, header, mobile sticky bar, final CTA band, etc.) since they all go through `CtaButton`.
2. **Mobile hero photo gradient too aggressive.** `HeroCornerImage`'s mobile blend (`GeneratedHero.tsx`) previously faded from opaque to transparent across 60% of the image column's width (`0% → 10% opaque, transparent by 60%`), washing out most of the photo. Softened to a short blend right at the seam only — opaque at 0%, fully transparent by 25% — so the large majority of the photo now shows clearly instead of fading into the background color.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/
├── CtaButton.tsx          MODIFIED — always merges in whitespace-nowrap
└── GeneratedHero.tsx       MODIFIED — softened mobile gradientOverlay in HeroCornerImage

web/docs/build_log.md       MODIFIED — this entry
```

---

# Mobile hero photo — blur/dim/reveal treatment replaces solid-color gradient (2026-07-22)

**The ask:** direct follow-up on the mobile hero photo's edge treatment (previous entry, "Mobile hero photo gradient softened"). Two changes requested: (1) show the *entire* photo, no `object-cover` cropping; (2) replace the solid-color gradient blend with an actual blur + transparency effect on the image itself near the text/image seam, fading into the full, sharp photo moving right.

**Implementation (`GeneratedHero.tsx`):**
- New `MobileHeroPhoto({ src })` — mobile-only, used everywhere a real photo or the theme illustration would previously have rendered via a plain `<Image object-cover>`. Two stacked layers over the same `src`:
  - A sharp base layer, `object-contain` (never cropped — the whole image is always visible, letterboxed against the section's own background if the aspect ratio doesn't fill the column).
  - A blurred + dimmed copy on top (`filter: blur()`, reduced `opacity`), masked with a left-to-right `mask-image`/`WebkitMaskImage` linear-gradient — fully visible (blurred+dim) at the seam next to the text, fading to fully transparent by a tunable stop, which reveals the sharp layer beneath from that point on.
  - Three named constants at the top of the file control the look: `MOBILE_HERO_BLUR_PX` (16), `MOBILE_HERO_DIM_OPACITY` (0.6), `MOBILE_HERO_REVEAL_STOP` ('45%') — easy to hand-tune.
- `HeroCornerImage` no longer renders a single `object-cover` `<Image>` shared across breakpoints for the non-logo case — desktop and mobile are always separate elements now (desktop keeps its existing `object-cover`/floating-card treatment unchanged; mobile always goes through `MobileHeroPhoto`). The old solid-color `gradientOverlay` div is removed, superseded by the mask-based blur/dim/reveal effect.
- `LogoFrame` (a logo reused as the mobile hero) is untouched — a logo isn't blurred, still just `object-contain` on a surface backdrop.
- Desktop rendering is completely unaffected.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — MobileHeroPhoto (blur/dim/reveal mask) replaces the mobile solid-color gradient + object-cover crop

web/docs/build_log.md                          MODIFIED — this entry
```

---

# Bug fix — mobile hero photo blur/fade mask wasn't rendering (2026-07-22)

**The report:** the blur/dim/reveal treatment (previous entry) showed no visible effect at all — just the plain sharp photo, letterboxed. The letterboxing (white gaps top/bottom) was flagged as looking "cropped vertically," but confirmed via `AskUserQuestion` to be intentional and wanted (`object-contain`, whole photo visible, no cropping) — the real bug was the missing blur/fade.

**Root cause:** `MobileHeroPhoto`'s mask gradient was `linear-gradient(to right, black 0%, transparent ${MOBILE_HERO_REVEAL_STOP})`. CSS masking's default `mask-type` is **luminance**, not alpha — under luminance masking, `black` (0 luminance) reads as fully *hidden*, the opposite of the intended "fully visible" at the seam. Combined with `transparent` also being hidden (0 alpha), the blurred/dimmed top layer was invisible across virtually the whole image, so only the always-present sharp base layer ever showed.

**Fix:** changed `black` → `white` in both the `maskImage` and `WebkitMaskImage` gradient stops. `white` is visible under both luminance masking (full luminance) and alpha masking (full alpha), so it works correctly regardless of the browser's default masking interpretation — the standard, robust choice for this pattern. One-line color change; no other logic changed.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — mask gradient color: black → white

web/docs/build_log.md                          MODIFIED — this entry
```

---

# Mobile hero photo — blur alone wasn't a reliable visual effect (2026-07-22)

**The report (after the mask color fix):** still "looks like this" — same screenshot. Follow-up questions clarified the mask fix *did* work (some fading now visible near the top of the letterboxed area) but the effect was imperceptible over most of the photo. Root cause of the perceptual gap: layering a blurred copy of a photo over the same sharp photo (even reduced-opacity) is only visually distinguishable where the underlying content changes sharply at that spot — over a fairly uniform area (e.g. the light cabinet in the upper portion of this particular photo) a blurred version and the sharp version look nearly identical, so the effect reads as "not working" even though it technically is.

**Fix (`MobileHeroPhoto`, `GeneratedHero.tsx`):** added a third layer — a `var(--site-background)`-colored tint gradient, stacked on top of the (still-present) blurred layer, fading out over a shorter distance (`MOBILE_HERO_TINT_STOP`, 22%) than the blur (`MOBILE_HERO_BLUR_REVEAL_STOP`, 38%). This guarantees a real, visible color shift toward the page background at the seam regardless of what the photo looks like there — the blur alone was necessary but not sufficient. Also bumped `MOBILE_HERO_BLUR_PX` from 16 to 20 and dropped the separate `DIM_OPACITY` constant (no longer needed now that the tint layer does the "fading to background" work).

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

Playwright isn't installed in this environment, so this couldn't be visually verified in a live browser before or after the change — iterated based on the user's description of what they saw instead. Recommend a direct look once available.

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — added background-color tint layer alongside the blur; renamed/retuned constants

web/docs/build_log.md                          MODIFIED — this entry
```

---

# Mobile hero image height fix — stopped short of the full text column (2026-07-22)

**The report:** the blur/tint fade was working well, but the image itself stopped roughly halfway down the text column (around the gap between the two CTA buttons) instead of spanning the full height, leaving plain background below it.

**Root cause:** `HeroCornerImage`'s mobile wrapper was `position: absolute` with `inset-y-0` (`top:0; bottom:0`), intended to stretch it to match the height of its containing block — the `grid-cols-1` div that also holds the text column. That stretch depends on the containing block already having a definite, fully-resolved height at the point the browser computes the absolute element's `top`/`bottom` arithmetic. In practice this didn't reliably hold for this nested grid/absolute-positioning combination, so the image wrapper ended up sized to roughly its own rendered content height instead of the full row height — visually, the photo (fit via `object-contain`) filled from the top down to wherever it naturally ran out, with everything below that just plain background outside the image's box entirely (not letterboxing *within* a correctly-sized box, which was the earlier, separate, already-resolved letterboxing question).

**Fix (`HeroCornerImage`, `GeneratedHero.tsx`):** replaced `position: absolute` + `inset-y-0 right-0` with real CSS Grid placement — the wrapper is now `position: relative` (still a valid positioning context for the inner `MobileHeroPhoto`'s `absolute inset-0`), explicitly placed into the *same* grid cell as the text (`col-start-1 row-start-1`) via `self-stretch` + `justify-self-end` (instead of being pulled out of grid flow entirely). Because the image itself has no intrinsic size, it doesn't affect the row's height calculation — it purely stretches to match whatever height the text column establishes, using CSS Grid's normal, well-defined item-stretching behavior rather than absolute-position inset arithmetic against a not-yet-fully-resolved containing block. Desktop behavior is unaffected — new `lg:col-start-auto lg:row-start-auto lg:self-auto lg:justify-self-auto` classes revert to the existing normal auto-placed second-column behavior there.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

Playwright still isn't installed in this environment — this diagnosis and fix were reasoned from the user's description and CSS spec behavior (absolutely-positioned inset stretching vs. grid item stretching), not visually confirmed. Recommend a direct look once available.

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — mobile image wrapper: absolute+inset-y-0 → grid col-start-1/row-start-1 + self-stretch

web/docs/build_log.md                          MODIFIED — this entry
```

---

# Mobile hero photo — full-bleed redesign, freed from prior constraints (2026-07-22)

**The ask, verbatim direction:** "don't worry about previous constraints... tell me the best way to achieve this." A reference screenshot ("Summit Heating & Air") plus a plain description — photo fills the screen, fades from the page's background color on the left to the full photo on the right, person on the right — made clear the whole approach so far (a two-column split, image confined to a ~35%-wide side strip) was the wrong shape entirely. The desktop `'image'` style's existing full-bleed treatment (photo as background, text as normal in-flow content on top) is architecturally what was being asked for, adapted for mobile.

**Why the split-column approach kept failing:** every prior round (floating card, 88vh full-bleed, blur mask, grid-stretch height fix) was patching `HeroCornerImage`/`SplitHeroSection`'s two-column shape, which requires the image to match a *sibling* column's height — a structurally fragile problem (absolute-position/inset stretching against an auto-height ancestor, or CSS Grid item placement quirks). A single full-bleed section sidesteps this category of bug entirely: the image is `fill`+`object-cover` behind the section's own normal-flow text content, which is exactly how the desktop `'image'` style has worked, bug-free, all along.

## Implementation (`GeneratedHero.tsx`)

- **`HeroTextContent`** — extracted from `SplitHeroSection`'s previously-inline eyebrow/headline/subheadline/CTA JSX. Theme-colored (`text-(--site-text)`, `text-(--site-muted)`), deliberately kept separate from the existing white-text `HeroOverlayContent` (used over a black scrim) — a photo-fade background needs to work on *any* theme's own background color, not assume it's dark.
- **`MobileFullBleedHeroPhoto`** — new mobile-only component: full-bleed `object-cover` photo, a `var(--site-background)` gradient (solid through `MOBILE_HERO_TINT_HOLD` → transparent by `MOBILE_HERO_TINT_END`, two tunable constants) instead of a black scrim, and `HeroTextContent` on top of the solid portion. No `min-h-*` — height comes entirely from the text content, keeping it compact (trust strip stays visible, the original complaint from several rounds back).
- **`LegacyFallbackSection`** — extracted the gradient/pattern/solid legacy background (previously inlined once) since the redesign now needs it in two places (as a `mobileHasPhoto` business's *desktop* rendering, and as the original bottom-of-file fallback) — avoids duplicating it.
- **`mobileHasPhoto = !!heroImageUrlMobile && !heroImageMobileIsLogo`** in `GeneratedHero` — the single routing decision, checked before any `heroStyle` branch. When true, desktop resolves independently (its own `heroStyle`-driven section, computed once, shown only at `lg:`+) while mobile always renders `MobileFullBleedHeroPhoto`. When false, execution falls through to the original, byte-for-byte unchanged `'illustration'`/`'imageSplit'`/`'image'`/legacy branches — **per explicit instruction, the no-photo (theme illustration) fallback was not touched**, and a mobile hero photo that's the business's own logo still renders via `SplitHeroSection`/`LogoFrame`, also unchanged.
- Removed: the blur/mask `MobileHeroPhoto` component and the grid-stretch (`col-start-1`/`row-start-1`/`self-stretch`) height-matching logic from the previous two rounds — superseded, no longer reachable by any real-photo case.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

Playwright is still not installed in this environment. This redesign was driven by a concrete reference screenshot and an explicit architectural description rather than another round of guess-and-check on a narrow CSS property, which should make it far more likely to be right on the first look — but it's still unverified in an actual browser. Recommend checking it directly (mobile viewport, a business with `heroPhotoUrlMobile` set) before requesting further tuning; `MOBILE_HERO_TINT_HOLD`/`MOBILE_HERO_TINT_END` are there to hand-adjust the fade position.

## Files changed

```
web/app/b/[slug]/template/GeneratedHero.tsx    MODIFIED — HeroTextContent extraction, new MobileFullBleedHeroPhoto, LegacyFallbackSection extraction, mobileHasPhoto routing in GeneratedHero; old MobileHeroPhoto (blur/mask) and mobile grid-stretch logic removed

web/docs/
├── architecture.md                            MODIFIED — replaced prior "Mobile hero photo" entries with the final shape
└── build_log.md                               MODIFIED — this entry
```

---

# Bug fix — featured service card text-shadow leaking onto mobile (2026-07-22)

**The report:** the featured (first) service card's picture background (`ServicesGrid.tsx`) only renders on desktop (`hidden lg:block`), but its heading/description text still showed a dark drop-shadow on mobile, where there's no image behind it to justify one.

**Root cause:** the text-shadow was applied via inline `style={{ textShadow: '...' }}`, gated only on `showPicture` (truthy whenever a featured image URL exists at all, regardless of viewport) — not on the `lg:` breakpoint the actual picture background is scoped to. Inline styles can't be made responsive, so there was no way for that `style` prop to "turn off" on mobile the way the picture background itself does.

**Fix:** moved the shadow into a Tailwind arbitrary-property class scoped to `lg:` — `lg:[text-shadow:0_1px_3px_rgba(0,0,0,0.8)]` — alongside the existing `lg:text-white`/`lg:text-white/80` classes, and removed the inline `style` props entirely. Mobile now matches every other service card's plain text styling exactly; desktop is unchanged.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     534 passed  (npm test)
Build:     next build succeeds — no new routes
```

## Files changed

```
web/app/b/[slug]/template/ServicesGrid.tsx    MODIFIED — text-shadow moved from unconditional inline style to an lg:-scoped class

web/docs/build_log.md                         MODIFIED — this entry
```

---

# Stage 14 — Playwright Screenshots

**Date:** 2026-07-22
**Scope:** Full implementation per the fully-specified Stage 14 section of `implementation.md` (three planning rounds preceded this: an architecture-readiness review, then two rounds of user-driven technical refinement covering async-Lambda design, capture-token delivery, DLQ/retry configuration, and IAM). Implements both screenshot targets (`existing_site`, `generated_preview`), the project's first compute infrastructure (ECR-hosted container-image Lambda, CDK-managed), asynchronous invocation with retries disabled, a dead-letter queue as the sole failure path, and per-viewport capture results on `ScanEvent`. **Not deployed** — `cdk deploy` and the first image push are explicit follow-up steps requiring approval (see "Deployment status" below).

## Overview

An admin can trigger two independent captures from the business detail page: "Capture Existing Site Screenshots" (`Business.websiteUrl`, skipped entirely when absent) and "Capture Generated Preview Screenshots" (the business's current `SitePreview`, works even with no website). Each creates a `queued` `ScanEvent` (`provider: 'playwright'`, `operation: 'screenshot'`) and asynchronously invokes a new Lambda (`InvocationType: 'Event'`) with an identifiers-only payload — the Server Action returns immediately, never waiting on Playwright. The Lambda owns the entire capture lifecycle: it re-resolves the target URL from DynamoDB itself (never trusts a URL from the invocation payload), validates it (shared SSRF guard for `existing_site`, strict same-origin policy for `generated_preview`), launches headless Chromium, captures desktop (1440×1000) and mobile (390×844) viewports independently (`fullPage: false`), uploads each to S3, and writes per-viewport results back onto the `ScanEvent` via conditional DynamoDB updates. A `generated_preview` capture of an unpublished draft authenticates via a short-lived, single-preview HTTP-only cookie the Lambda mints itself immediately before navigating — never a URL query parameter, and never minted by the Server Action (see "Key architectural decisions" below).

## Key architectural decisions (see `implementation.md`, Stage 14 for the full spec these implement)

1. **Container-image Lambda, not a zip bundle.** Base image is Microsoft's official Playwright image (`mcr.microsoft.com/playwright:v1.49.0-noble`), which ships Chromium plus every OS-level dependency it needs — reproducing that dependency list on a bare Lambda Node.js base was exactly the packaging fragility the original Stage 14 draft warned about. `aws-lambda-ric` (the Lambda Runtime Interface Client) adapts the otherwise-ordinary container to Lambda's invocation protocol.
2. **Retries disabled, DLQ is the sole failure path.** `MaximumRetryAttempts: 0` on the Lambda's async invocation config — a `queued`→`running` ScanEvent is never silently retried by AWS into a lease conflict. A hard invocation failure (throw/timeout before any terminal write) goes to a new SQS dead-letter queue instead; the existing 10-minute stale-scan admin override (`markStaleScanFailed`) is what actually recovers a stuck `ScanEvent` — the DLQ exists purely so a permanent failure is inspectable, not silently lost.
3. **Conditional DynamoDB updates for every status transition** (`aws.ts`'s `conditionalUpdateStatus`) — `queued`→`running` only from `queued`, terminal only from `running`; a ScanEvent already in a terminal state is never re-processed (no browser launched). Guards against Lambda's rare at-least-once duplicate delivery, not against automatic retries (which are disabled).
4. **`ScanEvent.captureResults` (per-viewport), not the older reserved `storageKeys` field.** A single scan-level `failureCategory` can't say which viewport failed on a `'partial'` result (the new terminal status covering "one viewport succeeded, one failed"). `storageKeys` remains on the model, untouched, reserved for a future use.
5. **Capture token minted by the Lambda, delivered as an HTTP-only cookie.** Never by the Server Action (would break the identifiers-only payload contract and risk expiring before a delayed/redelivered invocation), never as a URL query parameter (log/history/referrer leakage). New dedicated `webpresa-{env}-capture-token` secret backs the HMAC signing key — read-only by this Next.js app (`web/lib/capture-token.ts`), mint-only by the Lambda (`infra/lambda/screenshot-capture/src/capture-token.ts`).
6. **SSRF guard relocated, not duplicated, on the web side; genuinely duplicated (documented) on the Lambda side.** `lib/firecrawl/url-validation.ts` moved to `lib/security/url-validation.ts` (Stage 13's Firecrawl code and Stage 14's web-side code both import the one copy). The Lambda package is a fully independent npm project — this repo has no workspace tooling — so its own `url-validation.ts` is a deliberate, explicitly-documented duplicate, not an oversight.
7. **`generated_preview` uses a strict same-origin policy, not the SSRF guard** — the destination is always Webpresa's own app, never genuinely untrusted, so generic outbound DNS/private-range validation would be unneeded overhead. `same-origin.ts`'s `buildPreviewUrl()` constructs the URL from only the configured `WEBPRESA_APP_BASE_URL` and the canonical `SitePreview.slug`.
8. **Least-privilege IAM, written as explicit `PolicyStatement`s where the CDK convenience grants are too broad.** `dynamodb:GetItem` (Businesses, SitePreviews) / `GetItem`+`UpdateItem` (ScanEvents) via `Table.grant()` — fine, matches the spec exactly. **S3 required a manual fix**: `Bucket.grantPut()` actually grants `PutObjectTagging`/`PutObjectLegalHold`/`PutObjectRetention`/`PutObjectVersionTagging` and an `s3:Abort*` wildcard (covering `AbortMultipartUpload`) alongside `PutObject` — confirmed via a real `cdk diff` against the dev account, not assumed. Replaced with an explicit `iam.PolicyStatement({ actions: ['s3:PutObject'], resources: [...] })` granting exactly one action.

## Domain-model changes

- `domain/models/scan-event.ts` — `SCAN_PROVIDERS` +`'playwright'`; `SCAN_OPERATIONS` +`'screenshot'`; `SCAN_STATUSES` +`'partial'`; `SCAN_FAILURE_CATEGORIES` +6 (`browser_launch_failed`, `navigation_timeout`, `page_load_failed`, `blocked_by_bot_protection`, `screenshot_failed`, `upload_failed`); new `SCAN_TARGET_TYPES` (`'existing_site' | 'generated_preview'`); `ScanEvent` gained `targetType?`, `previewId?` (distinct from the existing `generatedPreviewId` — an input reference, not Firecrawl's output field), and `captureResults?: ScanCaptureResults` (`{ desktop?, mobile? }` of `ViewportCaptureResult { status, storageKey?, failureCategory?, failureMessage? }`).
- `domain/schemas/scan-event.schema.ts` — matching Zod additions (`ViewportCaptureResultSchema`, `ScanCaptureResultsSchema`, `targetType`/`previewId` fields).
- `domain/factories/scan-event.factory.ts` — `createScanEvent()` accepts optional `targetType`/`previewId`, backward-compatible (existing Firecrawl call sites unaffected).
- `domain/__tests__/stage13.test.ts` — one pre-existing test asserted `provider: 'playwright'` was *invalid*; fixed to use a genuinely-invalid provider string now that `'playwright'` is real.
- `domain/__tests__/stage14.test.ts` — new, 7 tests covering both target types, `'partial'` + `captureResults`, every new failure category, and backward compatibility with Firecrawl scans.

## `web/lib/security/` (relocated from `web/lib/firecrawl/`)

`url-validation.ts` and its test moved via `git mv`; `lib/firecrawl/images.ts`, `lib/firecrawl/enrich-business.ts`, and their tests updated to import `@/lib/security/url-validation` instead of the old relative path. No behavior change — pure relocation plus an updated doc comment explaining why (see "Key architectural decisions" #6).

## `web/lib/capture-token.ts` (new)

Verification-only — `verifyCaptureToken(token, { previewId })` checks the JWT signature via `jose` plus every claim (`purpose`, `previewId`, `scanId` presence), returning the claims or `null`. `CAPTURE_TOKEN_COOKIE_NAME` (`__Host-webpresa_capture`) is exported for `app/b/[slug]/page.tsx` to read. New `getCaptureTokenSecret()` wrapper in `lib/secrets/index.ts` / `SECRET_CAPTURE_TOKEN` in `lib/secrets/client.ts` (reads `CAPTURE_TOKEN_SECRET_NAME`).

## `web/lib/lambda/` and `web/lib/screenshots/` (new)

- `lib/lambda/client.ts` — `server-only` singleton `LambdaClient` + `getScreenshotLambdaFunctionName()` (reads `SCREENSHOT_LAMBDA_FUNCTION_NAME`), mirroring every other AWS client in this codebase.
- `lib/screenshots/capture.ts` — `captureExistingSiteScreenshot()` / `captureGeneratedPreviewScreenshot()`: validate eligibility, check for an active scan **of that specific target** (an active `existing_site` capture never blocks a `generated_preview` one), create the `queued` `ScanEvent`, invoke the Lambda asynchronously (`InvokeCommand`, `InvocationType: 'Event'`), return immediately. `isStaleScan()` / `markStaleScanFailed()` implement the 10-minute staleness admin override. If the `InvokeCommand` call itself throws synchronously (e.g. an IAM error) — distinct from the Lambda's own async failure path — the `ScanEvent` is marked `failed` immediately rather than left stuck `queued`.

## Admin UI

- `app/admin/(dashboard)/businesses/[businessId]/screenshot-actions.ts` (new) — `captureExistingSiteAction`, `captureGeneratedPreviewAction`, `markStaleScanFailedAction`; redirect + `?screenshotResult=` query param, mirroring `enrichment-actions.ts`'s pattern. Signed-URL viewing of a completed screenshot reuses the existing `viewRawArtifactAction` (`app/admin/(dashboard)/scans/[scanId]/actions.ts`) unchanged — it already redirects to a signed URL for any key under `scans/`.
- `app/admin/(dashboard)/businesses/[businessId]/ScreenshotsSection.tsx` (new) — two independent target cards, each with its own capture button, latest-status display, per-viewport view links, and (when stale) a "Mark as failed" action. Wired into `page.tsx` immediately after `EnrichmentSection`.
- `EnrichmentSection.tsx` and `app/admin/(dashboard)/scans/page.tsx` — their `Record<ScanStatus, ...>` / `Record<ScanFailureCategory, ...>` label maps required exhaustive updates for the new `'partial'` status and six new failure categories (TypeScript's `Record<>` type requires every member even though these two Firecrawl-focused surfaces only ever display Firecrawl scans in practice).

## `app/b/[slug]/page.tsx` — capture-token cookie bypass

`resolvePreview()` restructured: published previews return immediately (admin or not); an admin session sees draft/ready as before; otherwise, a new `hasValidCaptureToken()` helper checks the `__Host-webpresa_capture` cookie against each candidate preview, additionally confirming (via `getScanEventById`) that the token's `scanId` still names an actual `queued`/`running` `generated_preview` `ScanEvent` for exactly that `previewId` — a validly-signed token for a finished scan or the wrong preview is rejected, not just a bad signature.

## Infrastructure (CDK)

- `infra/lib/stacks/data-stack.ts` — new `CaptureTokenSecret` (`webpresa-{env}-capture-token`, `{ signingKey }`); `businessesTable`/`sitePreviewsTable`/`scanEventsTable`/`assetsBucket`/`captureTokenSecret` exposed as public readonly fields for the new stack to cross-reference.
- `infra/lib/constructs/webpresa-screenshot-lambda.ts` (new) — the project's first compute construct: ECR repository (own lifecycle rule, `maxImageCount: 8`), `DockerImageFunction` (3072 MB, 180s timeout, reserved concurrency 5, **no VPC**), explicit `LogGroup` (14-day retention, vs. CDK's unbounded default), SQS dead-letter queue (14-day retention), `EventInvokeConfig` (`retryAttempts: 0`, `maxEventAge: 10m`, `onFailure` → the DLQ), and the least-privilege IAM grants described above.
- `infra/lib/stacks/screenshot-stack.ts` (new) — `WebpresaScreenshotStack`, depends on `WebpresaDataStack` via typed props (not a string-based cross-stack import), four `CfnOutput`s (function name/ARN, ECR repo URI, DLQ URL).
- `infra/bin/webpresa.ts` — instantiates both stacks; resolves `WEBPRESA_APP_BASE_URL` from the environment with a synth-only placeholder fallback so `cdk synth`/`cdk diff` never hard-fail with it unset (see "Deployment status" below — a real value is required before deploying for real).
- `infra/scripts/build-and-push-screenshot-lambda.sh` (new) — the deliberate, separate build/push step `DockerImageCode.fromEcr()` requires (chosen over `fromImageAsset`'s auto-build specifically so this stage has an explicit, inspectable image build/push step rather than CDK silently building on every `cdk deploy`).
- `infra/lambda/screenshot-capture/` (new) — the Lambda's own fully independent npm project (no workspace tooling in this repo): `Dockerfile`, `src/handler.ts` (orchestration), `src/browser.ts` (Playwright capture — `domcontentloaded`-first wait sequence, bounded fonts-ready wait, bounded best-effort `networkidle`, animation disabling, `fullPage: false`, an 8MB sanity size cap, a 403/429 bot-protection heuristic), `src/aws.ts` (thin SDK wrappers incl. the conditional-update helper), `src/capture-token.ts` (mint), `src/same-origin.ts`, `src/url-validation.ts` (documented duplicate — see decision #6), `src/types.ts` (hand-mirrored minimal record shapes, same reason as the URL-validation duplication).

## Deployment status — NOT deployed

No `cdk deploy` was run and no container image has been built/pushed to the real ECR repository. Before this stage can actually run in dev:

1. `cdk deploy WebpresaDevDataStack --profile webpresa` (adds the one new secret) — reviewed via `cdk diff`, additive only (see Verification below).
2. `cdk deploy WebpresaDevScreenshotStack --profile webpresa` (creates the ECR repo, Lambda, DLQ — the repo must exist before the first image push).
3. `./infra/scripts/build-and-push-screenshot-lambda.sh dev webpresa` — builds and pushes the image; `cdk deploy` for the screenshot stack must run again afterward if the Lambda's `imageTag` prop pins a digest rather than `latest`.
4. Populate the real `webpresa-dev-capture-token` secret value (`aws secretsmanager put-secret-value`, same pattern as every other secret).
5. Set `WEBPRESA_APP_BASE_URL` to the real deployed app URL before any `cdk deploy` of the screenshot stack (the bin/webpresa.ts fallback is a synth-only placeholder, not deployable).
6. Extend the `webpresa-vercel-dev` IAM user's policy (managed outside CDK, via `aws iam put-user-policy` — see `deployment.md`) with `lambda:InvokeFunction` scoped to the new function's ARN and `secretsmanager:GetSecretValue` on the new capture-token secret.
7. Add `SCREENSHOT_LAMBDA_FUNCTION_NAME` and `CAPTURE_TOKEN_SECRET_NAME` to Vercel's environment variables.

All of the above require explicit user approval per this project's deployment gate (`AGENTS.md`) — none were performed as part of this implementation pass.

## Verification

```
web/  Lint:      0 errors    (npm run lint)
web/  TypeCheck: 0 errors    (npx tsc --noEmit)
web/  Tests:     562 passed  (npm test) — 7 new Stage 14 domain tests, 8 capture-token
                  verification tests, 13 lib/screenshots/capture.ts tests; every
                  pre-existing test still passes after the SCAN_STATUSES/
                  SCAN_FAILURE_CATEGORIES/SCAN_PROVIDERS extensions and the
                  url-validation relocation.
web/  Build:     next build succeeds — /b/[slug] and the business detail page both
                  affected, no new routes (Stage 14 is Server Actions, like Stage 13).

infra/            Tests:     77 passed (data-stack.test.ts 55 incl. the new secret;
                  screenshot-stack.test.ts 22, new — resource shape, container
                  packaging, no-VPC, async-invoke config, ECR lifecycle, log
                  retention, and least-privilege IAM incl. the exact-action S3 fix)
infra/            TypeCheck: 0 errors  (npx tsc --noEmit)
infra/            cdk synth: succeeds for both WebpresaDevDataStack and
                  WebpresaDevScreenshotStack
infra/            cdk diff:  run against the real dev account (--profile webpresa).
                  WebpresaDevDataStack: additive only — one new secret + its
                  outputs, nothing destructive. WebpresaDevScreenshotStack: entirely
                  new (expected — stack doesn't exist yet); IAM statements reviewed
                  by hand against implementation.md's spec (this is what caught the
                  S3 grantPut over-grant — see decision #8).

infra/lambda/screenshot-capture/  TypeCheck: 0 errors (npx tsc --noEmit)
infra/lambda/screenshot-capture/  Tests:     7 passed (same-origin.ts unit tests;
                  capture-token.ts's mint path is verified via the Docker smoke
                  test below instead of Vitest — see that test file's doc comment)
infra/lambda/screenshot-capture/  Docker build: succeeds locally (multi-minute —
                  Playwright base image + apt-get build toolchain for
                  aws-lambda-ric's native component + npm ci + tsc). NOT pushed to
                  ECR. Manual runtime smoke tests inside the built image (no AWS
                  calls, no network):
                    - dist/handler.js loads, exports a function
                    - playwright-core loads
                    - mintCaptureToken() produces a real signed JWT (confirmed the
                      `new Function('return import("jose")')` workaround for
                      jose's ESM-only build actually works under plain Node,
                      after an initial attempt using a plain `await import()`
                      failed — tsc silently downlevels that back into a broken
                      require() when targeting commonjs)
                    - chromium.launch() + page.screenshot() succeeds end-to-end
                      inside the container (caught a real playwright-core/base-image
                      version mismatch first — the caret-range dependency resolved
                      1.61.1 against a v1.49.0 base image; fixed by pinning
                      playwright-core to an exact, unranged 1.49.0)
```

## Files changed

```
web/domain/
├── models/scan-event.ts                                                          MODIFIED — providers/operations/statuses/failure categories/targetType/previewId/captureResults
├── schemas/scan-event.schema.ts                                                  MODIFIED — matching Zod additions
├── factories/scan-event.factory.ts                                              MODIFIED — targetType/previewId accepted
└── __tests__/
    ├── stage13.test.ts                                                          MODIFIED — fixed the now-stale "playwright is invalid" assertion
    └── stage14.test.ts                                                          NEW — 7 tests

web/lib/
├── security/                                                                    NEW (relocated from lib/firecrawl/)
│   ├── url-validation.ts
│   └── __tests__/url-validation.test.ts
├── firecrawl/images.ts, enrich-business.ts, __tests__/*.test.ts                 MODIFIED — import path updated
├── capture-token.ts                                                             NEW — verification only
├── __tests__/capture-token.test.ts                                              NEW — 8 tests
├── secrets/client.ts, index.ts                                                  MODIFIED — SECRET_CAPTURE_TOKEN / getCaptureTokenSecret
├── lambda/client.ts                                                             NEW
├── screenshots/capture.ts                                                       NEW
└── screenshots/__tests__/capture.test.ts                                        NEW — 13 tests

web/app/
├── admin/(dashboard)/businesses/[businessId]/
│   ├── screenshot-actions.ts                                                    NEW
│   ├── ScreenshotsSection.tsx                                                   NEW
│   ├── EnrichmentSection.tsx                                                    MODIFIED — label-map exhaustiveness
│   └── page.tsx                                                                MODIFIED — wired ScreenshotsSection, screenshotResult param
├── admin/(dashboard)/scans/page.tsx                                             MODIFIED — label-map exhaustiveness
└── b/[slug]/page.tsx                                                           MODIFIED — capture-token cookie bypass

web/package.json                                                                 MODIFIED — @aws-sdk/client-lambda

infra/lib/
├── stacks/data-stack.ts                                                        MODIFIED — CaptureTokenSecret + exposed table/bucket/secret refs
├── stacks/screenshot-stack.ts                                                  NEW
└── constructs/webpresa-screenshot-lambda.ts                                    NEW

infra/bin/webpresa.ts                                                            MODIFIED — instantiates WebpresaScreenshotStack
infra/vitest.config.ts                                                           MODIFIED — excludes lambda/**, sequential file execution, longer hook timeout
infra/test/
├── data-stack.test.ts                                                          MODIFIED — 6-secret count
└── screenshot-stack.test.ts                                                    NEW — 22 tests

infra/scripts/build-and-push-screenshot-lambda.sh                               NEW

infra/lambda/screenshot-capture/                                                NEW package
├── Dockerfile, package.json, tsconfig.json
└── src/{handler,browser,aws,capture-token,same-origin,url-validation,types}.ts, __tests__/

web/docs/build_log.md                                                           MODIFIED — this entry
```

---

# Stage 14 — CDK stack-ordering fix, pre-deploy testing, and dev deployment (2026-07-22 – 2026-07-23)

**Scope:** Two follow-up sessions to the Stage 14 implementation above, closing the gap between "code-complete" and actually running in dev. This entry covers work the original implementation-session commit message documented but this file never did (a documentation gap against `AGENTS.md`'s "update `build_log.md` after completing a stage" rule), plus today's actual `cdk deploy` sequence and two real account-quota bugs found and fixed along the way.

## CDK stack-ordering fix (2026-07-22)

The original single `WebpresaScreenshotStack` held both the ECR repository and the Lambda that pulls its image. On a genuine first deploy this is broken: CloudFormation creates the Lambda before any image has been pushed (nothing has run step 4 yet), the Lambda creation fails, and CloudFormation rolls back the *entire stack* — deleting the ECR repository the same deployment just created, along with it. Fixed by splitting into two stacks:

- `infra/lib/stacks/screenshot-repository-stack.ts` (new) — `WebpresaScreenshotRepositoryStack`, just the ECR repository (`infra/lib/constructs/webpresa-screenshot-repository.ts`, new construct), deployed independently and first.
- `infra/lib/stacks/screenshot-stack.ts` — `WebpresaScreenshotStack` now takes `repository: ecr.IRepository` as a typed cross-stack prop rather than creating its own.
- `infra/bin/webpresa.ts` — instantiates `WebpresaScreenshotRepositoryStack` before `WebpresaScreenshotStack`, passing the repository through.
- `infra/test/screenshot-repository-stack.test.ts` (new, 8 tests); `screenshot-stack.test.ts` updated for the prop-based repository reference.

## Pre-deploy testing (2026-07-22, before this fix was known-good)

- `infra/lambda/screenshot-capture/src/__tests__/handler.test.ts` (new, 14 tests) — the state-machine logic (idempotency, claim races, partial results, launch-failure vs. upload-failure distinction) had zero coverage before this pass.
- Live-tested against real dev AWS resources via the Lambda Runtime Interface Emulator (local Docker container, real DynamoDB/S3, no real Lambda deployed yet): `existing_site` happy path (screenshot visually confirmed), SSRF blocking, idempotency, conflict detection, the "Lambda not deployed yet" failure path, and the stale-scan admin override — 6 of 7 planned scenarios verified this way; `generated_preview`'s round-trip was explicitly deferred (needs `dev`'s web app actually reachable, not just the Lambda). All throwaway `ScanEvent`/business rows cleaned up after each test.
- Result: `infra` typecheck clean, 82/82 tests pass, `cdk synth` succeeds for all three dev stacks, `cdk diff` against the real dev account clean and additive across all three.

## Dev deployment (2026-07-23)

Deploy sequence executed in order, each step's `cdk diff` reviewed against the real account before running, per this project's deployment gate (`AGENTS.md`):

1. `cdk deploy WebpresaDevDataStack` — additive only (capture-token secret + new cross-stack exports for the screenshot stacks to consume). Succeeded first try.
2. Real capture-token signing key generated locally (`openssl rand -base64 48`) and written via `aws secretsmanager put-secret-value`; local key file removed immediately after.
3. `cdk deploy WebpresaDevScreenshotRepositoryStack` — additive only (ECR repo + its Lambda-pull resource policy). Succeeded first try.
4. `./infra/scripts/build-and-push-screenshot-lambda.sh dev webpresa` — built and pushed `webpresa-dev-screenshot-capture:latest` (digest `sha256:7c79f406...`).
5. `cdk deploy WebpresaDevScreenshotStack` — **failed twice**, both times auto-rolled back cleanly by CloudFormation (no orphaned resources) before a fix:
   - **Attempt 1:** `'MemorySize' value failed to satisfy constraint: Member must have value less than or equal to 3008` — this AWS account's Lambda service quota caps container-image functions at the legacy 3008 MB ceiling, not the newer 10,240 MB limit some accounts get automatically. Fixed: `webpresa-screenshot-lambda.ts`'s `memorySize` lowered from `3072` to `3008` (still within implementation.md's specified 2048–3072 MB range); `screenshot-stack.test.ts`'s matching assertion updated. Typecheck clean, 83/83 tests pass after the fix.
   - **Attempt 2:** `Specified ReservedConcurrentExecutions for function decreases account's UnreservedConcurrentExecution below its minimum value of [10]` — `aws lambda get-account-settings` confirmed this account's *total* Lambda concurrency quota is exactly 10 (the account minimum; normal accounts default to 1000). AWS requires ≥10 unreserved concurrency to remain account-wide after any reservation, so with a quota of exactly 10, no `reservedConcurrentExecutions` value above 0 is possible until the account's own quota is raised — this wasn't a matter of picking a smaller number. Presented to the user as a real tradeoff (implementation.md specs reserved concurrency 2–5 partly as a backstop against a narrow duplicate-execution race, alongside conditional-transition idempotency, which stays intact either way); user chose to deploy without it now and revisit after requesting an AWS quota increase. Fixed: `reservedConcurrentExecutions` removed entirely from the construct (with an inline comment explaining why and what to do once the quota is raised); the old "sets memory, timeout, and reserved concurrency" test split into a memory/timeout test plus a new test asserting `ReservedConcurrentExecutions` is absent.
   - **Attempt 3:** succeeded. `WebpresaDevScreenshotStack` created — Lambda (`webpresa-dev-screenshot-capture`), DLQ, log group, `EventInvokeConfig`, least-privilege IAM, all as designed.

## Live testing against the real deployed Lambda (2026-07-23, same session) — 3 more real bugs

Infra-level checks passed clean on the first try: CloudWatch log group retention (14 days, correct), ECR lifecycle policy (`maxImageCount: 8`, correct). But a real end-to-end `existing_site` capture — throwaway `Business`/`ScanEvent` created directly against real dev DynamoDB, Lambda invoked asynchronously with admin credentials (`webpresa-vercel-dev` doesn't have `lambda:InvokeFunction` yet — see "Not yet done" below), polled to a terminal state, screenshot bytes fetched from S3 and verified — surfaced three real bugs the pre-deploy RIE testing above never could, because the RIE's local Docker container has a fully writable filesystem and a far less restricted process model than a genuine deployed Lambda:

1. **Chromium crashed instantly on the real Lambda** (`browserContext.newPage: Target page, context or browser has been closed`), both viewports, every time, in under half a second — far too fast to be a real navigation attempt. Root cause: AWS Lambda's real runtime filesystem is read-only except `/tmp`; the base image's default `HOME` (`/root`, running as root) isn't writable there, so Chromium crashed trying to create its profile/cache dir the instant it needed one — invisible in local Docker/RIE testing, where the whole container filesystem is writable. Fixed: `Dockerfile` — `ENV HOME=/tmp`.
2. **Still crashed identically after fix #1.** Root cause: Chromium's normal multi-process architecture (zygote + sandbox-host + renderer) can't reliably start inside Lambda's restricted process/PID namespace without `--single-process`/`--no-zygote` — the standard, widely-documented workaround every serverless-Chromium project on Lambda uses (`@sparticuz/chromium`, `chrome-aws-lambda`, etc.). Fixed: `browser.ts`'s `launchBrowser()` args gained `--single-process`, `--no-zygote`.
3. **Desktop viewport then captured a real screenshot; mobile still crashed identically.** Root cause: a single-process Chromium instance (required by fix #2) is unstable when a second `BrowserContext` is created after the first has closed — the handler was launching one `Browser` and reusing it for both viewports sequentially. Fixed: `handler.ts` restructured to launch a fresh `Browser` per viewport instead of sharing one across both (`launchBrowser()` moved inside the per-viewport loop) — costs roughly 1–2s extra per viewport, comfortably inside the 180s timeout. This also made a launch failure itself per-viewport rather than failing the whole scan outright in one shot, which is actually more consistent with every other failure mode here ("one viewport's failure never aborts the other") — the old single-launch-for-both-viewports code was a minor pre-existing inconsistency with that principle, not just a workaround for this bug. `ViewportCaptureResult` import in `handler.ts` became unused and was removed. No test changes needed — `handler.test.ts`'s existing "browser fails to launch" assertions (both viewports failed, one final conditional update, `captureViewport` never called) still hold under the new per-viewport-launch structure since the *observable* behavior for that scenario is unchanged.

Each fix required a full rebuild/push/redeploy cycle (Docker build ~2–6 min depending on layer cache, since only `src/`/`Dockerfile` changed and the `apt-get`/`npm ci` layers cache across rebuilds). **Rebuild → redeploy is not just `cdk deploy`** — the Lambda's `DockerImageCode.fromEcr(repository, { tagOrDigest: 'latest' })` embeds the literal string `...:latest` in the CloudFormation template, not a resolved digest, so CloudFormation has no way to detect that the underlying image content changed and reports "no changes" even after a real push. Confirmed the hard way (`cdk deploy` after fix #1 reported `(no changes)` despite a new image sitting in ECR). The actual mechanism that forces the running Lambda to pick up a newly-pushed `:latest` image is `aws lambda update-function-code --image-uri <repo>:latest`, followed by `aws lambda wait function-updated` — verified via `Configuration.CodeSha256` matching the just-pushed digest before each retest. `deployment.md`'s existing "Verifying the image is not stale after a code change" section already warned about a *digest-pinned* image needing a stack redeploy; a *tag-pinned* (`latest`) image needs this instead, and that gap is now documented there.

Before deciding to keep debugging live rather than stop and report, the fix-#2 attempt was explicitly confirmed with the user first, given three consecutive real bugs and multiple ~5–10 minute rebuild cycles already spent.

### Final live-test results — all passing

- **`existing_site` real end-to-end capture**: `queued` → `running` → `completed`, both viewports (`desktop`: 15,940 bytes; `mobile`: 12,715 bytes), both PNGs confirmed present and non-empty in S3, both deleted after verification.
- **DLQ delivery**: Lambda invoked with a deliberately malformed payload (bare `null` — `event.scanId` access throws a `TypeError` uncaught inside `handler()`); the async `EventInvokeConfig`'s failure destination delivered the failure record to the DLQ with `condition: "RetriesExhausted"` and `approximateInvokeCount: 1` — confirming zero automatic retries, exactly as designed. Message inspected then deleted.
- **capture-token rejected once the scan is terminal**: a token minted with a valid signature for a `ScanEvent` already in `'completed'` status is correctly rejected by `app/b/[slug]/page.tsx`'s acceptance logic (replicated inline against the real Secrets Manager-backed signing key, since the web app itself isn't deployed to `dev` yet) — signature/claims valid, but the terminal-status check correctly fails it.
- **`generated_preview`'s live round-trip** stays deferred, as before — it needs `dev`'s actual web app reachable (Stage 14's web-app code hasn't been pushed there yet), not just the Lambda.

All throwaway `Business`/`ScanEvent` DynamoDB rows and S3 objects created during testing were cleaned up; the temporary test script (`web/scripts/tmp-stage14-live-test.ts`, never committed) was deleted after use; the `node_modules/server-only/index.js` stub used to let the script run outside Next.js's bundler (which normally strips that module for server contexts) was restored to its original content.

**Not yet done at the time this section was written:** extending `webpresa-vercel-dev`'s IAM policy and adding the two env vars to Vercel. The IAM extension is done — see "webpresa-vercel-dev IAM extension" below. Only the Vercel env vars remain, plus `generated_preview`'s live round-trip (deferred until Stage 14's web-app code is pushed to `dev`) — see `architecture.md`, "Playwright Screenshots (Stage 14)" and `deployment.md`, "Stage 14", for current status.

## `webpresa-vercel-dev` IAM extension (2026-07-23, later the same day)

Two grants applied via `aws iam put-user-policy` (per `deployment.md`, "Extending `webpresa-vercel-dev`"):

1. **New policy** `webpresa-dev-screenshot-lambda-invoke` — `lambda:InvokeFunction` scoped to exactly `arn:aws:lambda:us-east-1:539898341083:function:webpresa-dev-screenshot-capture`.
2. **Extended existing policy** `webpresa-dev-secrets` (not a new one) — added `arn:aws:secretsmanager:us-east-1:539898341083:secret:webpresa-dev-capture-token-*` to the `Resource` array alongside the five existing secret ARN patterns (openai, firecrawl, google-places, stripe, lob), all preserved unchanged.

Both verified via `aws iam get-user-policy`. No Vercel CLI credentials were available in this environment (no `VERCEL_TOKEN`, no linked `.vercel` project) — adding `SCREENSHOT_LAMBDA_FUNCTION_NAME`/`CAPTURE_TOKEN_SECRET_NAME` to Vercel's environment variables remains a manual dashboard step for the user.

## Verification

```
infra/                            TypeCheck: 0 errors (npx tsc --noEmit)
infra/                            Tests:     83 passed
infra/lambda/screenshot-capture/  TypeCheck: 0 errors (npx tsc --noEmit)
infra/lambda/screenshot-capture/  Tests:     21 passed (unchanged assertions after the
                                   per-viewport-launch restructure — see above)
web/                               Lint:      0 errors (npm run lint)
web/                               TypeCheck: 0 errors (npx tsc --noEmit)
web/                               Tests:     562 passed (npm test) — unaffected by this
                                   session's infra-only changes
web/                               Build:     next build succeeds
Live (real dev AWS, account 539898341083, us-east-1):
                                   existing_site capture: both viewports completed, real
                                   screenshots verified in S3, cleaned up
                                   DLQ: forced failure delivered correctly, zero retries
                                   confirmed, cleaned up
                                   capture-token: correctly rejected once scan is terminal
```

## Files changed

```
infra/lib/constructs/webpresa-screenshot-lambda.ts   MODIFIED — memorySize 3072→3008,
                                                       reservedConcurrentExecutions removed
infra/test/screenshot-stack.test.ts                  MODIFIED — matching test updates
infra/lambda/screenshot-capture/Dockerfile            MODIFIED — ENV HOME=/tmp
infra/lambda/screenshot-capture/src/browser.ts        MODIFIED — --single-process/--no-zygote
infra/lambda/screenshot-capture/src/handler.ts        MODIFIED — per-viewport browser launch,
                                                       unused ViewportCaptureResult import removed
```

---

## Reserved concurrency restored (2026-07-23, later the same day)

AWS raised this account's Lambda concurrent-executions quota from 10 to 1000 (the user was notified directly by AWS). This removes the blocker that forced `reservedConcurrentExecutions` to be omitted entirely earlier today (see "Account-quota fixes" above) — re-added `reservedConcurrentExecutions: 5` to `webpresa-screenshot-lambda.ts` per implementation.md's 2-5 spec, with an updated inline comment. `screenshot-stack.test.ts`'s two split tests (memory/timeout, and "omits reserved concurrency") merged back into the original single "sets memory, timeout, and reserved concurrency" assertion.

`cdk diff WebpresaDevScreenshotStack` (account `539898341083`, `us-east-1`) confirmed a single, additive, non-replacing change — `ReservedConcurrentExecutions: 5` added to the already-deployed function, no image/digest involved — reviewed with the user before deploying, per the deployment gate. `cdk deploy` (no image rebuild/push needed this time, unlike every fix in the "Chromium-on-real-Lambda" round above) applied cleanly in ~12s. Confirmed live via `aws lambda get-function --query 'Concurrency'` → `{"ReservedConcurrentExecutions": 5}`.

### Verification

```
infra/  TypeCheck: 0 errors (npx tsc --noEmit)
infra/  Tests:     82 passed (down from 83 — the two split tests merged back into one)
infra/  cdk diff:  single additive change confirmed before deploy
Live:              aws lambda get-function confirms ReservedConcurrentExecutions: 5
```

### Files changed

```
infra/lib/constructs/webpresa-screenshot-lambda.ts   MODIFIED — reservedConcurrentExecutions: 5 restored
infra/test/screenshot-stack.test.ts                  MODIFIED — two tests merged back into one
```

---

## Vercel Deployment Protection bypass (2026-07-23, later the same day) — found via the first real browser-based test

## Scope

`webpresa-vercel-dev`'s IAM extension and both Vercel env vars (`SCREENSHOT_LAMBDA_FUNCTION_NAME`, `CAPTURE_TOKEN_SECRET_NAME`) were now in place, so the user tested `generated_preview` capture for the first time from the real admin UI — the actual end-to-end scenario, not a script-driven direct Lambda invoke. It failed: the captured screenshot showed Vercel's own login page, not the app.

## Diagnosis

Vercel's **Deployment Protection** (Vercel Authentication) sits in front of the *entire* non-production (`dev` git-branch) deployment at the edge — every request, authenticated or not, gets redirected to Vercel's login page unless it carries a valid session or bypass credential. This intercepts *before* any Next.js request handler runs, meaning the Lambda's server-side Playwright navigation to `/b/[slug]` never reaches the app at all — the capture-token cookie logic (which solves the separate, app-level "render an unpublished draft without an admin session" problem) never gets a chance to run. This is a platform-level gate Stage 14's design never anticipated; nothing in `implementation.md`'s original Stage 14 spec considered it, since all prior testing either ran against a local RIE emulator (no Vercel involved) or invoked the Lambda directly without exercising a real navigation to the deployed app.

Presented two options to the user: disable Deployment Protection entirely (simpler, no code change, but makes the whole `dev` deployment publicly reachable by anyone) vs. Vercel's own "Protection Bypass for Automation" (keeps `dev` protected from everyone else; a purpose-built mechanism — Vercel's own docs use Playwright as the primary example). User chose the bypass secret. Verified the exact mechanism against Vercel's live documentation before implementing (not assumed from training knowledge) — header `x-vercel-protection-bypass: <secret>`, optional companion `x-vercel-set-bypass-cookie: 'true'` for follow-up/subresource requests within the same context.

## Fix

1. **`infra/lib/stacks/data-stack.ts`** — new `WebpresaSecret`, `VercelProtectionBypassSecret` (`webpresa-{env}-vercel-protection-bypass`, `{ bypassSecret }`), modeled exactly on the existing capture-token secret; exposed as `vercelProtectionBypassSecret` for the screenshot stack to cross-reference.
2. **`infra/lib/constructs/webpresa-screenshot-lambda.ts`** — new required prop `vercelProtectionBypassSecret`; new env var `VERCEL_PROTECTION_BYPASS_SECRET_NAME`; new `grantRead()` IAM grant (GetSecretValue only) — CDK merged this into the same IAM statement as the existing capture-token grant (a `Resource` array, not two separate statements) rather than a brand-new statement, confirmed via the real `cdk diff` output.
3. **`infra/lib/stacks/screenshot-stack.ts`**, **`infra/bin/webpresa.ts`** — threaded the new secret prop through, same pattern as `captureTokenSecret`.
4. **`infra/lambda/screenshot-capture/src/browser.ts`** — `newContext()` gained an optional `vercelBypassSecret` param; when present, passed as `extraHTTPHeaders: { 'x-vercel-protection-bypass': ..., 'x-vercel-set-bypass-cookie': 'true' }` on the Playwright browser context (applies to the main navigation and every subresource request the context makes, not just the top-level HTML). `captureViewport()`'s params gained the matching optional field.
5. **`infra/lambda/screenshot-capture/src/handler.ts`** — in the `generated_preview` branch, after minting the capture token, also fetches `{ bypassSecret }` from the new secret and passes it through to `captureViewport()`. `existing_site` is unaffected — the header is meaningless there (real external business websites, never Webpresa's own deployment).
6. **Deliberately not granted to `webpresa-vercel-dev`.** Unlike the capture-token secret (which the Next.js app reads to *verify* tokens the Lambda mints), the Vercel bypass secret has no application-side reader at all — only the Lambda ever presents it, to Vercel's own edge. Adding it to the broader Vercel-identity policy would have been an unnecessary over-grant against this project's established least-privilege discipline; caught before making the change, not after.

## Deployment

1. User generated the bypass secret in Vercel's dashboard (Settings → Deployment Protection → Protection Bypass for Automation) and provided it directly.
2. `infra`/Lambda-package typecheck clean, 83/83 and 21/21 tests pass (new/updated assertions: secret count 6→7, CloudFormation outputs 16→17, a merged-statement IAM assertion, env var presence, `handler.test.ts`'s `mockGetSecretJson` mock extended to also resolve `bypassSecret`).
3. `cdk diff`/`cdk deploy WebpresaDevDataStack` — additive only (one new secret + outputs). One transient `cdk diff` failure ("Unable to resolve AWS account to use") on the first attempt, not reproduced on immediate retry — treated as an `npx`/CDK-cache flake, not a real issue (an untouched stack diffed successfully in between, isolating it to a transient condition rather than the new code).
4. Real value populated via `aws secretsmanager put-secret-value`.
5. `cdk diff`/`cdk deploy WebpresaDevScreenshotStack` — additive only (new env var + IAM grant, no image/digest involved).
6. Image rebuilt/pushed (`browser.ts`/`handler.ts` changed) and the running Lambda force-updated via `aws lambda update-function-code` — the same `:latest`-tag gap established earlier today (CDK's template references the literal tag, not a resolved digest, so `cdk deploy` alone never detects a content-only image change).

## Verification

```
infra/                            TypeCheck: 0 errors
infra/                            Tests:     83 passed (7 secrets, 17 outputs, merged IAM
                                   statement assertion, new env var assertion)
infra/lambda/screenshot-capture/  TypeCheck: 0 errors
infra/lambda/screenshot-capture/  Tests:     21 passed
cdk diff (both stacks):           additive only, reviewed before each deploy — account
                                   539898341083, us-east-1
Live:                             pending the user's retest from the real admin UI — the
                                   scenario that surfaced this bug in the first place
```

## Files changed

```
infra/lib/stacks/data-stack.ts                        MODIFIED — new VercelProtectionBypassSecret
infra/lib/constructs/webpresa-screenshot-lambda.ts     MODIFIED — new prop/env var/IAM grant
infra/lib/stacks/screenshot-stack.ts                   MODIFIED — threaded new secret prop
infra/bin/webpresa.ts                                  MODIFIED — passes dataStack.vercelProtectionBypassSecret
infra/lambda/screenshot-capture/src/browser.ts         MODIFIED — x-vercel-protection-bypass header
infra/lambda/screenshot-capture/src/handler.ts         MODIFIED — fetches + threads the bypass secret
infra/test/data-stack.test.ts                          MODIFIED — 7 secrets, 17 outputs
infra/test/screenshot-stack.test.ts                    MODIFIED — new secret wired into test stack,
                                                        merged-IAM-statement assertion, env var assertion
infra/lambda/screenshot-capture/src/__tests__/handler.test.ts  MODIFIED — bypassSecret in mock + assertion
web/docs/implementation.md                             MODIFIED — new "Platform-level access" subsection
```

---

## Admin UI polish: live status, self-dismissing banner, new-tab view links (2026-07-23, later the same day)

## Scope

After the Vercel bypass fix above, the user's next real admin-UI test surfaced three UX gaps in `ScreenshotsSection.tsx`, all stemming from the same root cause: this section is a plain Server Component rendering data fetched once at request time, with no mechanism to reflect the Lambda's out-of-band result (written straight to DynamoDB, no client-visible push) without a manual page reload.

1. After clicking Capture, the card stays on "Capturing…" indefinitely — never updates to show the finished result or the view links, even once the Lambda has actually completed.
2. The `?screenshotResult=queued` flash banner ("Screenshot capture started") never disappears — it only ever describes the *start* of a capture (the redirect fires immediately, before the Lambda runs — see `lib/screenshots/capture.ts`), so once shown it reads as a stuck/stale status forever.
3. Clicking a desktop/mobile view link navigated the current admin tab away to the signed S3 URL, losing the business detail page.

## Fix

Two new small Client Components, following this directory's existing pattern of narrowly-scoped `'use client'` files (`GenerateWebsiteButton.tsx`, `DeleteBusinessButton.tsx`, etc.) rather than converting the whole section client-side:

- **`ScreenshotAutoRefresh.tsx`** (new) — renders nothing; while `active` (any scan `queued`/`running`), polls `router.refresh()` every 3s, which re-runs the Server Component tree and picks up the Lambda's terminal write. Stops automatically once the next refresh's props report no active scan.
- **`ScreenshotResultBanner.tsx`** (new) — same copy/tone map as before, now self-dismissing: hides itself and strips `screenshotResult` from the URL (preserving any other query params) 5 seconds after mount, so a manual reload doesn't resurrect it.
- **`ScreenshotsSection.tsx`** — renders `<ScreenshotAutoRefresh active={hasActiveScan} />` (computed once, across both target cards) and swaps the old inline `ResultBanner` for `<ScreenshotResultBanner>`; the old `RESULT_BANNER_COPY`/`ResultBanner` were deleted from this file (moved into the new client component, their only remaining caller).
- **`ViewportLinks`** — added `target="_blank"` to the view-link `<form>`. Regular HTML form behavior: the POST (and the Server Action's subsequent redirect to the signed S3 URL) opens in a new tab, no client JS needed.

## Verification

```
web/  Lint:      0 errors (npm run lint)
web/  TypeCheck: 0 errors (npx tsc --noEmit)
web/  Tests:     562 passed (npm test) — unaffected, no test coverage previously existed
                  for this admin section's client-side behavior
web/  Build:     next build succeeds
```

Not yet pushed/deployed — these are local, uncommitted changes pending the user's decision on when to push `dev`.

## Files changed

```
web/app/admin/(dashboard)/businesses/[businessId]/ScreenshotAutoRefresh.tsx   NEW
web/app/admin/(dashboard)/businesses/[businessId]/ScreenshotResultBanner.tsx  NEW
web/app/admin/(dashboard)/businesses/[businessId]/ScreenshotsSection.tsx      MODIFIED
```

---

## Two more real bugs, found after pushing to dev: new-tab links didn't, hero CTA missing its icon (2026-07-23, later the same day)

## Bug 1: `target="_blank"` didn't open the view links in a new tab

After the above deployed, `target="_blank"` on the view-link `<form>` had no effect. Root cause: Next.js Server Actions are dispatched by React's client-side runtime (via the `action` prop's special handling), not a genuine browser form submission — the browser never actually POSTs and follows a redirect itself, so the HTML `target` attribute (a native browser form/link behavior) has nothing to act on. This wasn't caught by the earlier build/lint/typecheck/test pass because none of those exercise real browser form-submission semantics.

**Fix:** added a real GET route, `app/admin/(dashboard)/scans/view-artifact/route.ts` (new — `/admin/scans/view-artifact?key=...`), replicating `viewRawArtifactAction`'s exact auth check (`getSession()`) and validation (`key` must start with `scans/`) before redirecting to the same short-lived signed URL. `ScreenshotsSection.tsx`'s `ViewportLinks` now renders a genuine `<a href="..." target="_blank" rel="noopener noreferrer">` instead of a Server-Action form — a real anchor tag has no such limitation. `viewRawArtifactAction` itself is untouched and still used as-is by `scans/[scanId]/page.tsx`'s two other call sites (raw/extracted crawl artifacts), which weren't reported as broken and weren't in scope here.

## Bug 2: hero "Call Now" button missing its phone icon

Found via `Explore` agent investigation, then verified by direct read before fixing. `app/b/[slug]/template/GeneratedHero.tsx` has two near-identical hero-content renderers for different hero layouts: `HeroTextContent` (used by `SplitHeroSection`) and `HeroOverlayContent` (used by `FullBleedHeroSection`'s `heroStyle: 'image'` layout, and the legacy gradient/pattern/solid fallback). Both render a primary + secondary `CtaButton`, and both correctly render `<CtaIcon type={secondary.type} .../>` for the secondary button — but only `HeroTextContent` included the matching `<CtaIcon type={primary.type} .../>` for the *primary* button (which is the "Call Now" button, `type: 'phone'`, for nearly every business). `HeroOverlayContent` rendered `{primary.label}` alone, silently dropping the icon — any business whose hero renders via the full-bleed-image or legacy fallback path (not the split layout) got a phone-icon-less Call Now button. `CtaIcon` itself (`cta.tsx`) was never the problem — it's a correct hand-written `switch` on `CtaActionType`, not a missing lucide-react icon or similar.

**Fix:** added the missing `<CtaIcon type={primary.type} className="w-5 h-5 mr-2" />` to `HeroOverlayContent`'s primary `CtaButton`, matching `HeroTextContent`'s existing pattern exactly (same className, same position before the label).

## Verification

```
web/  Lint:      0 errors (npm run lint)
web/  TypeCheck: 0 errors (npx tsc --noEmit)
web/  Tests:     562 passed (npm test)
web/  Build:     next build succeeds — new route /admin/scans/view-artifact confirmed
                  in the route list
```

Not yet pushed — pending the user's decision on when to push `dev` again.

## Files changed

```
web/app/admin/(dashboard)/scans/view-artifact/route.ts             NEW
web/app/admin/(dashboard)/businesses/[businessId]/ScreenshotsSection.tsx  MODIFIED — real <a> link
                                                                     instead of Server-Action form
web/app/b/[slug]/template/GeneratedHero.tsx                        MODIFIED — HeroOverlayContent's
                                                                     primary CtaButton gained its icon
```

---

# Google Reviews in Testimonials (Stage 12 follow-on)

**Date:** 2026-07-23
**Scope:** Pull the individual reviews Google's Place Details API returns for a business (author, avatar, star rating, review text — capped at 5 per place, non-configurable, no pagination) and surface them in the existing Testimonials section, alongside admin-entered testimonials. Desktop shows every visible testimonial in a grid; mobile shows a one-at-a-time autoplay carousel with dot indicators. Long quotes clamp to 5 lines with a "Read more"/"Read less" toggle. Anything without a real photo (every manually-added testimonial) gets a circular first-initial avatar. Admin-only editing for this pass — no non-admin/"owner" auth exists anywhere in this app yet (Stage 17's claim flow is fully spec'd but unbuilt). Google-sourced reviews are read-only (hide/show only, never editable) per Google's API terms on not altering review content; manual testimonials stay fully editable exactly as before.

## Overview

Extended `BusinessTestimonial` with `source`/`hidden`/`rating`/`authorPhotoUrl`/`authorProfileUrl`/`googleReviewId`/`publishTimeDescription`, backward-compatible via Zod defaults (no migration). Added a new Google Place Details (New) call (`getPlaceReviews()`, reviews-only field mask) and a mapping helper (`fetchAndMapGoogleReviews()`) that fires automatically right after a business is imported via `/admin/discover`, non-fatal on failure so a reviews-fetch error never fails the business import itself. A new `enableWebsiteSection()` helper force-enables the Testimonials section whenever reviews are found, overriding even an explicitly-stored `enabled: false`. Fixed a real latent bug in `updateBusinessListFieldAction`'s testimonials branch — it previously replaced the whole `testimonials` array from form data without ever fetching the business first, which (combined with `updateBusiness()`'s shallow top-level merge) would have silently wiped every Google review the first time anyone saved the manual-testimonials form. Added a manual "Import/Refresh Google Reviews" admin action (preserves each review's hidden state across a refresh, matched by `googleReviewId`) and a per-review hide/show toggle, both surfaced in a new `GoogleReviewsPanel.tsx` alongside the existing manual-testimonials editor. Rebuilt the public `TestimonialsSection.tsx` around a new `TestimonialCard.tsx` (real photo or initial-letter avatar via a new shared `TestimonialAvatar.tsx`, star rating + "Posted on Google" attribution for Google-sourced entries, measured-overflow "Read more" toggle) and a new `TestimonialsMobileCarousel.tsx` (`framer-motion` `AnimatePresence`, ~6s autoplay, dot indicators) — the first carousel/rotator and the first line-clamp-toggle pattern in this codebase.

## Key decisions (confirmed with the user before implementation)

1. **Admin-only editing.** No new non-admin/"owner" auth was built — confirmed no such identity exists anywhere in the app (Stage 17 "Website Claim Flow" is fully spec'd in `implementation.md` but was never built; only a dismiss-only `ClaimBanner.tsx` exists).
2. **Google reviews are read-only.** Only `hidden` can be toggled (`toggleGoogleReviewVisibilityAction`) — text/author/photo are never editable through the admin UI, matching Google's API terms on not materially altering review content. Manual testimonials remain fully editable via the existing `RepeatableListEditor` form (now filtered to `source: 'manual'` items only).
3. **Automatic fetch at import time, plus a manual refresh action.** The user chose automatic-fetch-during-import; a manual "Import/Refresh Google Reviews" action was added on top since automatic-only would leave every business imported before this feature shipped with zero reviews forever.

## Domain-model changes

- `domain/models/business.ts` — `BusinessTestimonial` gained `source: 'manual' | 'google'`, `hidden?`, `rating?`, `authorPhotoUrl?`, `authorProfileUrl?`, `googleReviewId?`, `publishTimeDescription?`. New `TESTIMONIAL_SOURCES` const.
- `domain/schemas/business.schema.ts` — matching schema extension, `source`/`hidden` given `.default('manual')`/`.default(false)` so `BusinessSchema.parse()` backfills every legacy `{author, quote}`-only record on read (`getBusinessById`) — zero DynamoDB migration, same pattern `Business.websiteSections` absence already established.
- `domain/schemas/google-places.schema.ts` — new `GooglePlaceReviewSchema`/`GooglePlaceDetailsReviewsResponseSchema` validating the raw Place Details `reviews` response.

## `web/lib/google-places/`

- `client.ts` — extracted the existing non-2xx/error-categorization logic (previously inline in `searchPlacesText`) into a shared `requestPlacesApi()` helper; added `getPlaceReviews(placeId)` (`GET /v1/places/{placeId}`, `X-Goog-FieldMask: reviews.*` — no photo field, since a reviewer's own avatar is a separate, directly-hotlinkable Google CDN URL, not a Google Place Photo).
- `reviews.ts` (new) — `mapGoogleReviewToTestimonial()` (pure mapping, returns `null` for a rating-only review with no text) and `fetchAndMapGoogleReviews()` (fetch + map; lets errors throw so each caller decides fatal vs. non-fatal).

## `web/lib/website-sections/`

- `resolve.ts` — new `enableWebsiteSection(business, sectionType)`: forces one section's `enabled` to `true`, overriding even an explicitly-stored `false` (unlike `resolveStoredOrDefaultSections`, which only ever backfills a section that was never stored at all) — the same "dual-write on population" precedent `updateThemeAction`/`updatePhotosAction` already established for theme/photos.
- `availability.ts` — `testimonials` check now excludes hidden entries (`business.testimonials?.filter(t => !t.hidden)`); updated the file's header comment, which had gone stale (claimed testimonials/reviews were both always unavailable — no longer true since Stage 12 and the admin list editor already populate them).

## Admin (`app/admin/(dashboard)/`)

- `discover/actions.ts` — `importSelectedPlacesAction` now calls `fetchAndMapGoogleReviews()` right after a successful `putBusiness()`, wrapped in try/catch (non-fatal — matches the existing "one bad candidate never fails the whole batch" convention), and dual-writes `websiteSections` via `enableWebsiteSection()` when reviews were found.
- `businesses/[businessId]/actions.ts` — three changes: (1) fixed `updateBusinessListFieldAction`'s testimonials branch to fetch the business first and preserve existing `source: 'google'` rows (see "Overview" above); (2) new `importGoogleReviewsAction` (manual refresh, preserves `hidden` across a refresh by matching `googleReviewId`); (3) new `toggleGoogleReviewVisibilityAction`. Both new actions follow the existing `PhotoManagerState` convention — no redirect, return the updated `testimonials` array directly for the client to apply optimistically.
- `businesses/[businessId]/GoogleReviewsPanel.tsx` (new, client) — Import/Refresh button plus one row per Google review (avatar, rating, snippet, relative time, hide/show toggle, including already-hidden ones). Wired into `SectionContentEditor.tsx`'s testimonials-only render path, alongside the existing manual `RepeatableListEditor` form (now filtered to `source: 'manual'` items).
- `app/components/TestimonialAvatar.tsx` (new, shared) — real photo via `next/image` when present, otherwise a first-initial circle; deliberately outside `app/b/[slug]/template/` since both the admin panel and the public template use it, and the admin dashboard has no per-business `--site-*` theme (the component accepts `className`/`style` so callers theme the initials fallback rather than assuming `--site-*` exists).

## Public template (`app/b/[slug]/template/`)

- `TestimonialCard.tsx` (new, client) — avatar, author (linked to the reviewer's Google profile when present), star rating + "Posted on Google" caption for Google-sourced entries, quote clamped to 5 lines (`line-clamp-5`) with a "Read more"/"Read less" toggle that only renders when the text is actually measured as truncated (`scrollHeight` vs `clientHeight`, re-measured on resize) — not assumed from character count.
- `TestimonialsMobileCarousel.tsx` (new, client, `md:hidden`) — one testimonial at a time, `framer-motion` `AnimatePresence` cross-fade, ~6s autoplay, tappable dot indicators.
- `TestimonialsSection.tsx` (rewritten) — filters to non-hidden entries; desktop (`hidden md:grid`) renders every visible testimonial via `TestimonialCard`, no cap; mobile (`md:hidden`) renders `TestimonialsMobileCarousel`. `section-registry.tsx`'s wiring (`ctx.business.testimonials ?? []`) needed no change.

## Supporting changes

- `next.config.ts` — added `{ protocol: 'https', hostname: '*.googleusercontent.com' }` to `images.remotePatterns` for reviewer avatars.
- `web/docs/deployment.md` — noted the new Place Details `reviews` field mask sits in the same higher-cost Places API SKU tier as `rating`/`userRatingCount`/`regularOpeningHours`.
- `web/docs/architecture.md` — new "Google Reviews in Testimonials (Stage 12 follow-on)" subsection under "Google Places Discovery Boundary (Stage 12)".

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     574 passed  (npm test) — 11 new tests: lib/google-places/__tests__/reviews.test.ts (new,
                         6 tests), 3 new getPlaceReviews tests in client.test.ts, 2 new
                         enableWebsiteSection tests in lib/website-sections/__tests__/resolve.test.ts,
                         plus 1 new + 1 updated test in availability.test.ts for hidden-filtering.
                         All Google Places API calls mocked — no real network calls in the test suite.
                         Four existing admin action test files needed a new
                         vi.mock('@/lib/google-places/reviews', ...) — actions.ts now transitively
                         imports it, and the real `server-only` package throws unconditionally when
                         evaluated outside a Next.js `react-server` build (only the mocked/no-op form
                         is safe under plain Vitest); the discover/actions.ts test suite already
                         globally mocks `server-only` itself and needed no change, though it does
                         exercise the real (env-var-missing) failure path for the reviews fetch,
                         confirmed non-fatal — the business import itself still succeeds.
Build:     next build succeeds — /admin/discover and /b/[slug] both still register correctly, no
           new routes added.
Manual:    Not yet exercised in a live browser session or against the real Google Places API — no
           real googlePlaceId with actual Google reviews was available in this session. The
           end-to-end verification steps below are documented but not yet run:
           1. Real /admin/discover import against a business with real Google reviews — confirm
              reviews populate and the Testimonials section auto-enables.
           2. Business detail page: confirm GoogleReviewsPanel shows up to 5 reviews.
           3. Hide one review, confirm it disappears from /b/[slug] but stays visible (marked
              hidden) in admin; show it again, confirm it reappears.
           4. Click "Import/Refresh" again, confirm hidden/shown state survives the refresh.
           5. Add a manual testimonial and save — confirm existing Google reviews are NOT wiped
              (the key regression test for the updateBusinessListFieldAction fix).
           6. /b/[slug] desktop: all visible testimonials in a grid; Google ones show
              avatar/rating/"Posted on Google"; manual ones show an initial-circle.
           7. Mobile width: one-at-a-time carousel with dot indicators and autoplay.
           8. A long review: "Read more" appears only when actually truncated; expand/collapse works.
           9. Zero visible testimonials (none, or all hidden): section renders nothing.
```

## Files changed

```
web/domain/
├── models/business.ts                                                        MODIFIED — extended
│                                                                              BusinessTestimonial
├── schemas/business.schema.ts                                                MODIFIED — matching
│                                                                              schema + defaults
└── schemas/google-places.schema.ts                                           MODIFIED — new review
                                                                               response schemas

web/lib/
├── google-places/
│   ├── client.ts                                                             MODIFIED — extracted
│   │                                                                         requestPlacesApi(),
│   │                                                                         added getPlaceReviews()
│   ├── reviews.ts                                                            NEW — mapping + fetch
│   └── __tests__/
│       ├── client.test.ts                                                    MODIFIED — 3 new tests
│       └── reviews.test.ts                                                   NEW — 6 tests
└── website-sections/
    ├── resolve.ts                                                            MODIFIED — new
    │                                                                         enableWebsiteSection()
    ├── availability.ts                                                       MODIFIED — hidden filter
    └── __tests__/
        ├── resolve.test.ts                                                  MODIFIED — 2 new tests
        └── availability.test.ts                                             MODIFIED — 1 new test

web/app/
├── components/TestimonialAvatar.tsx                                          NEW — shared avatar
├── admin/(dashboard)/
│   ├── discover/actions.ts                                                   MODIFIED — automatic
│   │                                                                         reviews import
│   └── businesses/[businessId]/
│       ├── actions.ts                                                       MODIFIED — testimonials
│       │                                                                    fix + 2 new actions
│       ├── GoogleReviewsPanel.tsx                                           NEW
│       ├── SectionContentEditor.tsx                                        MODIFIED — wired panel in
│       └── __tests__/
│           ├── actions.test.ts                                             MODIFIED — new mock
│           ├── business-details-actions.test.ts                            MODIFIED — new mock
│           ├── photos-actions.test.ts                                      MODIFIED — new mock
│           └── website-sections-actions.test.ts                            MODIFIED — new mock
└── b/[slug]/template/
    ├── TestimonialCard.tsx                                                  NEW
    ├── TestimonialsMobileCarousel.tsx                                       NEW
    └── TestimonialsSection.tsx                                              MODIFIED — rewritten

web/next.config.ts                                                           MODIFIED — googleusercontent
                                                                               remotePattern
web/docs/architecture.md                                                     MODIFIED
web/docs/deployment.md                                                       MODIFIED
```

---

## Bug fix, found during first live test: "Failed to save imported reviews"

**Date:** 2026-07-23 (same day, immediately after the above)

Clicking "Import Google Reviews" against a real business consistently failed with the generic `importGoogleReviewsAction` error message. Root cause: `BusinessTestimonial.quote`'s Zod bound (`domain/schemas/business.schema.ts`) was `max(500)` — sized for short, hand-typed manual testimonials — but real Google reviews routinely run well past that (Google allows review text up to ~4096 characters). `updateBusiness()` calls `BusinessSchema.parse(merged)` before writing; a real review's `quote` exceeding 500 chars threw a `ZodError` there, caught by `importGoogleReviewsAction`'s outer `catch`, which only ever surfaced the generic "Failed to save imported reviews" message — the real cause was visible only in the server log (`console.error`), not reachable from the browser network tab, which is why the reported 200 response (a normal server-action response carrying the error *state*, not an HTTP failure) gave no clue.

**Fix:**
- `domain/schemas/business.schema.ts` — `quote` bound raised `max(500)` → `max(4000)`. The public card already clamps/truncates *display* via `line-clamp-5` + "Read more" (see above), so the stored value only ever needed a generous ceiling, not a display-sized one. Manual testimonials are unaffected — the admin form's own `maxLength: 500` UI hint and `updateBusinessListFieldAction`'s `.slice(0, 500)` truncation are untouched, this only widens what's *allowed*, not what the manual path writes.
- `lib/google-places/reviews.ts` — `mapGoogleReviewToTestimonial()` now defensively truncates `author`/`quote`/`publishTimeDescription` to the same bounds the schema enforces, mirroring the existing `.slice()` pattern `updateBusinessListFieldAction` already uses for manual entries — untrusted external content should degrade by truncation, not by throwing deep inside a later `BusinessSchema.parse()` call.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     574 passed  (npm test) — unchanged; the one exact-match test in reviews.test.ts uses
                         short strings well under the new bound, still passes byte-for-byte.
Manual:    Confirmed fixed against the real bug report — a real Google review exceeding 500
           characters now imports successfully instead of throwing at the BusinessSchema.parse()
           step inside updateBusiness().
```

## Files changed

```
web/domain/schemas/business.schema.ts   MODIFIED — testimonials.quote max(500) → max(4000)
web/lib/google-places/reviews.ts        MODIFIED — defensive truncation to match schema bounds
```

---

## Two direct UI follow-ups: desktop grid width, manual star ratings

**Date:** 2026-07-23 (same day, direct user feedback after seeing the live result)

1. **Desktop grid was 3×2 instead of one row.** `TestimonialsSection.tsx`'s grid was still the original fixed `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` from before this feature — never revisited when the "all visible on desktop" requirement was implemented, so 5 testimonials wrapped into two rows (3 + 2) instead of one. Fixed with a dynamic column count: `Math.min(visible.length, 5)`, mapped through a literal `DESKTOP_GRID_COLUMNS` lookup (`lg:grid-cols-1` … `lg:grid-cols-5`) rather than a template-interpolated class string — Tailwind's compiler only generates utilities it can find as literal text in source, so `` `lg:grid-cols-${n}` `` would have silently produced no CSS for whichever value wasn't already used elsewhere in the codebase. A business with fewer than 5 testimonials now gets exactly that many equal-width columns (no sparse empty grid cells); more than 5 (Google's 5 plus manual additions) wraps to a second row of the same width.
2. **Manual testimonials had no star rating**, so they looked structurally different from Google-sourced cards (which show a star row) even though `TestimonialCard.tsx` already renders stars for *any* testimonial with a `rating` set, Google or manual. Added a "Rating" `<select>` (1–5 stars, or "No rating") to the manual testimonials admin form: `RepeatableListEditor.tsx` gained a `type: 'select'` field variant (additive — every other list editor using this shared component, faq/process/services/etc., is unaffected, since `type` is optional and defaults to the existing text/textarea behavior); `SectionContentEditor.tsx`'s testimonials config wires it in; `updateBusinessListFieldAction`'s testimonials branch parses and validates the submitted value (integer 1–5, else omitted). A manually-rated testimonial now renders with the same star row as a Google review, but — correctly — without the "Posted on Google" caption or relative timestamp, since those are genuinely Google-only facts.

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     574 passed  (npm test) — unchanged; both fixes are presentational/form-handling, no new
                         pure logic warranted new test coverage beyond what already covers
                         updateBusinessListFieldAction's row-parsing pattern.
Build:     next build succeeds.
Manual:    Not yet re-verified in a live browser session — pending user confirmation on both the
           5-column desktop layout and the manual rating selector.
```

## Files changed

```
web/app/b/[slug]/template/TestimonialsSection.tsx                              MODIFIED — dynamic
                                                                                 desktop column count
web/app/admin/(dashboard)/businesses/[businessId]/RepeatableListEditor.tsx      MODIFIED — new
                                                                                 type: 'select' field
web/app/admin/(dashboard)/businesses/[businessId]/SectionContentEditor.tsx      MODIFIED — rating
                                                                                 field wired into
                                                                                 testimonials config
web/app/admin/(dashboard)/businesses/[businessId]/actions.ts                    MODIFIED —
                                                                                 updateBusinessListFieldAction
                                                                                 parses/validates rating
```

---

## Testimonial reordering — interleave manual entries between Google reviews

**Date:** 2026-07-23 (same day, direct user feedback)

**Scope:** Manual testimonials always sorted before Google reviews, with no way to place one between two Google reviews — because there was no persisted ordering concept spanning both sources: `updateBusinessListFieldAction`'s testimonials branch always rebuilt the array as `[...manual, ...google]` on every save, and `importGoogleReviewsAction` did the same as `[...manual, ...google]` on every refresh, so even if the array had ever been interleaved some other way, either action would immediately re-sort it back to source-grouped.

## Overview

Gave every `BusinessTestimonial` a stable `id` — for Google-sourced entries this is just `googleReviewId` reused (already a stable per-review identifier from Google, no need for a second one); for manual entries, a `crypto.randomUUID()` minted once at creation and round-tripped through the admin form as a new hidden field. With stable identity in place, added a pure `mergeTestimonialsPreservingOrder()` helper that both `updateBusinessListFieldAction` (content edits) and `importGoogleReviewsAction` (Google refresh) now call instead of naively concatenating: it walks the *existing* array, replaces/drops entries of the source that changed (matched by `id`), leaves the other source's entries exactly where they were, and only appends brand-new entries at the end — so a custom interleaved order survives both a manual content edit and a Google refresh. On top of that, a new **`TestimonialsOrderEditor.tsx`** (up/down arrows, auto-save, no redirect) shows the full combined list — manual and Google together — and lets an admin move any entry to any position, including between two Google reviews, via a new `reorderTestimonialsAction`.

## Key changes

- `domain/models/business.ts` / `domain/schemas/business.schema.ts` — `BusinessTestimonial.id: string` (required), `.default(() => crypto.randomUUID())` as a parse-time-only safety net for pre-existing records (application code always sets `id` explicitly at creation, since a default alone is never actually persisted by `updateBusiness()` — see "Verification" below for why that distinction matters).
- `lib/google-places/reviews.ts` — `mapGoogleReviewToTestimonial()` now sets `id: googleReviewId ?? crypto.randomUUID()`, making a Google review's identity stable across every future refresh.
- `lib/testimonials/merge.ts` (new) — `mergeTestimonialsPreservingOrder(existing, { source, items })`, pure and unit-tested (`lib/testimonials/__tests__/merge.test.ts`, 5 tests covering untouched-source preservation, in-place replacement, removal, brand-new append, and the specific "Google refresh doesn't undo a custom interleave" regression case).
- `app/admin/(dashboard)/businesses/[businessId]/actions.ts`:
  - `updateBusinessListFieldAction`'s testimonials branch now parses a hidden `id` field per row (blank → mint a new one) and calls the merge helper instead of concatenating.
  - `importGoogleReviewsAction` likewise calls the merge helper (after carrying over each review's prior `hidden` state, matched by `id` — same as before, `id` and `googleReviewId` are just the same value now).
  - New `reorderTestimonialsAction(businessId, orderedIds)` — resolves each submitted id against the business's current testimonials, rebuilds the array in that order (any id the client's snapshot somehow omitted is defensively appended at the end, never silently dropped).
  - `GoogleReviewsState` renamed `TestimonialsState` (now shared by three actions covering both sources, not just the Google-specific two).
- `RepeatableListEditor.tsx` — new `type: 'hidden'` field variant (bare `<input type="hidden">`, no visible label/wrapper) — purely additive, every other list using this shared component (faq/process/services/etc.) is unaffected.
- `SectionContentEditor.tsx` — testimonials config gains a hidden `id` field (first in the list) so the manual form round-trips each row's identity.
- `TestimonialsOrderEditor.tsx` (new, client) — reuses `section-order.ts`'s existing generic `moveSection()` pure helper and the same "compute next value first, call persist as a top-level statement, never from inside a setState updater" pattern `SectionConfigForm.tsx`'s website-sections reorder control already established (a nested-dispatch version of this exact pattern crashed there once before — see build_log.md, "admin/businesses: filters..."). Rendered above `GoogleReviewsPanel` in the testimonials section's expanded panel; hidden entirely when there are 0–1 testimonials (nothing to reorder).

## Verification

```
Lint:      0 errors    (npm run lint)
TypeCheck: 0 errors    (npx tsc --noEmit)
Tests:     579 passed  (npm test) — 5 new tests (lib/testimonials/__tests__/merge.test.ts); updated
                         the one exact-match reviews.test.ts assertion and two BusinessTestimonial
                         test fixtures (availability.test.ts) for the new required `id` field.
Build:     next build succeeds.
Manual:    Not yet re-verified in a live browser session — pending user confirmation that dragging
           a manual testimonial between two Google reviews via the new order editor, then later
           editing manual content or refreshing Google reviews, actually preserves the arrangement.
```

## Files changed

```
web/domain/models/business.ts                                                    MODIFIED — id field
web/domain/schemas/business.schema.ts                                            MODIFIED — id + default
web/lib/google-places/reviews.ts                                                 MODIFIED — id = googleReviewId
web/lib/google-places/__tests__/reviews.test.ts                                  MODIFIED — id in fixture
web/lib/testimonials/merge.ts                                                    NEW
web/lib/testimonials/__tests__/merge.test.ts                                     NEW
web/lib/website-sections/__tests__/availability.test.ts                          MODIFIED — id in fixtures
web/app/admin/(dashboard)/businesses/[businessId]/actions.ts                     MODIFIED — merge-based
                                                                                   writes, reorder action,
                                                                                   TestimonialsState rename
web/app/admin/(dashboard)/businesses/[businessId]/RepeatableListEditor.tsx        MODIFIED — type: 'hidden'
web/app/admin/(dashboard)/businesses/[businessId]/SectionContentEditor.tsx        MODIFIED — hidden id
                                                                                   field + order editor wired in
web/app/admin/(dashboard)/businesses/[businessId]/TestimonialsOrderEditor.tsx     NEW
```

# Stage 15 — AI Prospect Qualification & Website Analysis

## Scope

Full implementation per the revised Stage 15 section of `implementation.md` (rewritten this same session — see that file's Stage 15 for the full spec this build follows, including the "scope note" restricting scoring to the `existing_site` `ScanEvent` and the two deliberately-deferred pieces: outreach-channel recommendation and AI writes to `WebsiteSectionsConfig`). Depends on Stages 10, 12, 13, and 14, all already implemented. Scores a business's existing website using deterministic metrics computed by the app plus one OpenAI structured-output call (text + the Stage 14 screenshots as vision input), producing category scores, strengths/weaknesses, missing opportunities, an executive summary, confidence, lead priority, and a qualification recommendation — then applies deterministic overrides on top of the AI's own qualification. Per explicit user instruction, the scoring call uses a separate, stronger model default (`gpt-5.5`, configurable via `OPENAI_SCORING_MODEL`) than Stage 11's cost-optimized `OPENAI_MODEL`, since this output drives real sales-prioritization decisions.

## Domain model

- `domain/models/website-assessment.ts` (new) + `domain/schemas/website-assessment.schema.ts` (new) — `WebsiteAssessment` (the validated AI output: 12 category scores/explanations/suggested improvements, overall score, confidence, lead priority, qualification, strengths, weaknesses, missing opportunities, executive summary, top problems) and `WebsiteDeterministicMetrics` (the non-AI grounding metrics). Mirrors the `WebsiteEnrichmentSnapshot` precedent from Stage 13.
- `domain/models/scan-event.ts` / `.schema.ts` — `SCAN_PROVIDERS` gained `'openai'`, `SCAN_OPERATIONS` gained `'score'`, `SCAN_FAILURE_CATEGORIES` gained `invalid_ai_schema_output`/`ai_request_failed`/`ai_timeout`. `ScanEvent` gained `deterministicMetrics?`, `assessment?`, `aiResponseArtifactKey?` (S3 key for the raw, unvalidated OpenAI response — audit-only, never read back into the app), `aiMetadata?` (model/promptVersion — no `temperature`, see "Post-implementation fix" below). `ScanScores` (the old Stage-15-reserved placeholder) is now documented as superseded by `assessment`, left in place unused — same treatment `ScanStorageKeys` got from `captureResults` ahead of Stage 14.
- `domain/models/business.ts` / `.schema.ts` — new qualification-disposition fields mirroring the `enrichmentStatus` pattern from Stage 13: `qualification?`, `leadPriority?`, `websiteQualityScore?` (all AI-produced, never admin-edited directly), plus `adminReviewedQualification?`/`adminReviewedScore?` (the override — stored separately so the original AI assessment is always recoverable, per the acceptance criteria).

## Deterministic metrics and qualification overrides

- `lib/scoring/deterministic-metrics.ts` (new) — pure function computing the Stage 15 "Deterministic metrics" list from already-loaded `Business`/`ScanEvent`/`WebsiteEnrichmentSnapshot` records, no I/O of its own. Two fields are explicitly documented as heuristics rather than first-class signals, since no such signal exists yet: `firecrawlExtractionConfidence` (Firecrawl reports no confidence value — counts how many higher-signal snapshot fields came back populated) and `hoursDetected`/`contactFormDetected` (regex/keyword matching over crawled text — `Business` never persists structured hours, see Stage 12's "review context only" note).
- `lib/scoring/qualification-rules.ts` (new) — `applyQualificationOverrides()`, a pure function implementing 2 of the 6 overrides listed in the original Stage 15 spec: "no website → qualified" and "website unavailable → manual review" (keyed off the business's most recent Firecrawl failure category). The other four ("closed business", "national chain", "government organization", "invalid address") are deliberately NOT enforced — no field on `Business` persists any of those signals today (Google Places' `businessStatus` is fetched live during discovery but explicitly never persisted, per Stage 12; there is no chain/government classification anywhere in the domain model). Documented inline as a real gap, not silently dropped — the AI can still down-rank/explain those cases in `assessment.weaknesses`/`executiveSummary`, just without a code-enforced override, until one of those signals is actually captured somewhere.

## AI scoring call

- `lib/ai/client.ts` — added `getOpenAiScoringModel()` (default `gpt-5.5`, env override `OPENAI_SCORING_MODEL`), deliberately separate from `getOpenAiModel()`/`OPENAI_MODEL` (Stage 11's cost-optimized default) for the reason above.
- `lib/ai/score-website.ts` (new) — `scoreWebsite()`, mirroring `generate-preview.ts`'s shape: one `chat.completions.parse` + `zodResponseFormat` structured-output call, re-validated app-side against `WebsiteAssessmentSchema` afterward as defense in depth (same pattern as `PreviewContentSchema.parse()`). Unlike Stage 11's generation call, this one is multimodal — desktop/mobile screenshot signed URLs (when available) are sent as `image_url` content parts alongside the text prompt built from crawl content + deterministic metrics. The prompt explicitly instructs the model to base every judgment only on the supplied evidence and never invent business facts, same guardrail spirit as Stage 11's `GUARDRAILS` list.

## Orchestration

- `lib/scoring/score-business.ts` (new) — `scoreBusinessWebsite()`, mirroring `lib/firecrawl/enrich-business.ts`'s "small named steps, one ScanEvent per attempt" shape. Requires a completed Firecrawl scan to exist before running (Stage 15 evaluates evidence Stages 12–14 already gathered; it never crawls a website itself) — a missing/in-progress Firecrawl scan returns `not_eligible`. Two shortcuts skip the AI call entirely and just apply the qualification override directly: no website on file (`'completed'`, qualification forced to `'qualified'`) and a Firecrawl scan that failed as unreachable/blocked/invalid (`'manual_approval_required'`, qualification forced to `'manual_review'`). The success path stores the full `assessment` + `deterministicMetrics` on the `ScanEvent`, the raw unvalidated OpenAI response as an S3 artifact (`scans/{businessId}/{scanId}/ai-response.json`, following the `rawArtifactKey`/`extractedArtifactKey` pattern), and only the qualification-disposition rollup (`qualification`/`leadPriority`/`websiteQualityScore`) onto `Business` — never anything AI-discovered about the business itself, same "Business is canonical" boundary Stage 13 established. Failure classification (`classifyAiError`) maps a Zod validation failure to `invalid_ai_schema_output`, a timeout-shaped error to `ai_timeout`, and anything else OpenAI-side to `ai_request_failed`.
- Active-scan conflict detection is scoped to `provider: 'openai', operation: 'score'` only, so an in-progress Firecrawl or Playwright scan never blocks a scoring attempt (matches Stage 14's per-target scoping, not Stage 13's business-wide guard).

## Admin UI

- `app/admin/(dashboard)/businesses/[businessId]/scoring-actions.ts` (new) — `scoreWebsiteAction` (redirect + query-param result banner, same shape as `enrichWebsiteAction`), `overrideScoreAction`/`clearScoreOverrideAction` (admin override form handlers). `clearScoreOverrideAction` uses `putBusiness` with the two override fields omitted rather than `updateBusiness`, since `updateBusiness` builds its DynamoDB `UpdateExpression` directly from whatever values it's given and is documented as unsafe to call with an explicit `undefined` — omitting a key from a full `putBusiness` write is this codebase's established way to actually clear an optional field (same reasoning `resetWebsiteSectionsAction` follows elsewhere).
- `app/admin/(dashboard)/businesses/[businessId]/ScoringSection.tsx` (new) — mirrors `EnrichmentSection`'s plain-server-component shape: qualification/priority/score summary (with admin override shown alongside when set), latest-scan link, and — once a scored `ScanEvent` exists — executive summary, top problems, all 12 category score bars, strengths/weaknesses, missing opportunities, plus the override form itself. Wired into `page.tsx` directly below `ScreenshotsSection`, matching the natural Stage 13 → 14 → 15 reading order already established there.
- `EnrichmentSection.tsx`'s `FAILURE_CATEGORY_LABELS` (a `Record<ScanFailureCategory, string>` covering every category regardless of provider, per its own doc comment) extended with labels for the three new Stage 15 failure categories — required by TypeScript since the type is exhaustive.

## Post-implementation fix — `temperature` unsupported by the scoring model (found via live testing)

First real "Score Website" click against the live OpenAI API failed every time: `400 Unsupported value: 'temperature' does not support 0.3 with this model. Only the default (1) value is supported.` `gpt-5.5` (the `DEFAULT_SCORING_MODEL` in `lib/ai/client.ts`) is a reasoning-class model — like the `o1`/`o3`/`gpt-5` families, it only accepts the API's default `temperature` (1) and rejects any explicit override, unlike `gpt-4o-mini` (Stage 11's generation model), which accepts the full 0–2 range. This was never caught by unit tests since the OpenAI client is mocked in every test — only a real API call surfaces a provider-side parameter rejection like this.

Fixed by removing `temperature` from the scoring pipeline entirely rather than special-casing a value per model family:
- `lib/ai/score-website.ts` — no longer sends `temperature` in the `chat.completions.parse` call; `SCORING_TEMPERATURE` constant removed; a comment explains why and flags that a future `OPENAI_SCORING_MODEL` swap to a non-reasoning model would silently lose temperature control under this approach (acceptable for now — revisit only if that actually happens).
- `ScoredWebsite.metadata`, `ScanEvent.aiMetadata` (model + schema), and `lib/scoring/score-business.ts`'s persistence all dropped the `temperature` field — storing a value the app no longer controls or requests would be misleading.
- `implementation.md`'s Stage 15 "Persistence" list and this file's own "Domain model" section above updated to match.
- Test mocks in `lib/scoring/__tests__/score-business.test.ts` updated (mocked `scoreWebsite` metadata no longer includes `temperature`).

## Verification

```
web/  Lint:      0 errors, 0 warnings (npm run lint)
web/  TypeCheck: 0 errors (npx tsc --noEmit)
web/  Tests:     617 passed (npx vitest run) — 38 new tests across
                 lib/scoring/__tests__/deterministic-metrics.test.ts (12),
                 lib/scoring/__tests__/qualification-rules.test.ts (6),
                 lib/ai/__tests__/score-website.test.ts (5),
                 lib/scoring/__tests__/score-business.test.ts (15)
web/  Build:     next build succeeds
Manual: Not yet exercised against the real OpenAI API or a live admin session —
        pending user confirmation. No infra changes in this stage (no new AWS
        resources; scoring runs as a Next.js Server Action calling OpenAI and
        S3/DynamoDB directly, same execution model as Stage 13).
```

## Files changed

```
web/domain/models/website-assessment.ts                                          NEW
web/domain/schemas/website-assessment.schema.ts                                  NEW
web/domain/models/scan-event.ts                                                  MODIFIED — new provider/
                                                                                     operation/failure categories,
                                                                                     new fields
web/domain/schemas/scan-event.schema.ts                                          MODIFIED — matching validation
web/domain/models/business.ts                                                    MODIFIED — qualification
                                                                                     disposition fields
web/domain/schemas/business.schema.ts                                            MODIFIED — matching validation
web/lib/ai/client.ts                                                             MODIFIED — getOpenAiScoringModel()
web/lib/ai/score-website.ts                                                      NEW
web/lib/scoring/deterministic-metrics.ts                                         NEW
web/lib/scoring/qualification-rules.ts                                           NEW
web/lib/scoring/score-business.ts                                                NEW
web/app/admin/(dashboard)/businesses/[businessId]/scoring-actions.ts             NEW
web/app/admin/(dashboard)/businesses/[businessId]/ScoringSection.tsx             NEW
web/app/admin/(dashboard)/businesses/[businessId]/page.tsx                       MODIFIED — wired in
                                                                                     ScoringSection
web/app/admin/(dashboard)/businesses/[businessId]/EnrichmentSection.tsx          MODIFIED — 3 new failure labels
web/lib/ai/__tests__/score-website.test.ts                                       NEW
web/lib/scoring/__tests__/deterministic-metrics.test.ts                          NEW
web/lib/scoring/__tests__/qualification-rules.test.ts                           NEW
web/lib/scoring/__tests__/score-business.test.ts                                 NEW
web/docs/implementation.md                                                       MODIFIED — Stage 15 rewritten,
                                                                                     Stage 14 status corrected
                                                                                     (earlier this session)
```

# Stage 16 — Step Functions Scan and Preview Workflow

## Scope

Full implementation per the rewritten Stage 16 section of `implementation.md` (rewritten earlier this same session — see that file for the full spec, including the reconciliation against the actual Stage 11/13/14/15 code that motivated the rewrite). Connects the independently working Google Places import, Firecrawl enrichment, Playwright screenshots, and AI scoring operations into one durable, idempotent Step Functions Standard workflow, triggered manually by an admin. Postcard creation/mailing (Stage 22, unbuilt) stays outside this workflow.

Two research findings changed the shape of this implementation from the doc's first draft:

1. **No Lambda anywhere in this stack.** AWS Step Functions' `HttpInvoke` task type (backed by an EventBridge Connection for auth) can call an HTTPS endpoint directly — since every workflow task's job is "call an existing, already-tested Next.js function via an internal API route," the whole state machine calls straight into `/api/internal/scan/*` with zero new Lambda functions. This was confirmed against the real `aws-cdk-lib@2.262.0` already in `infra/package.json` before committing to the design.
2. **`ScanEvent` is per-operation, not per-workflow-run.** A new `ScanExecution` record (new DynamoDB table, new domain model/factory/db module) represents one Step Functions execution, referencing the several `ScanEvent`s (and the `SitePreview`) it produces rather than overloading `ScanEvent`'s existing meaning.

## Domain model

- `domain/models/scan-execution.ts` (new) + `domain/schemas/scan-execution.schema.ts` (new) — `ScanExecution` (`scanexec_<uuid>`), `ScanWorkflowStatus` (`queued|running|manual_review|qualified|reject|preview_ready|failed`), `ScanWorkflowStep`, and `ScanWorkflowFailure` (a coarse category rolled up from `ScanFailureCategory` via `lib/workflow/failure-mapping.ts`, not a second independent taxonomy). References prior/produced records by ID only (`crawlScanId`, `sourceScreenshotScanId`, `scoreScanId`, `previewScreenshotScanId`, `previewId`, `parentScanExecutionId`) — never a copy of their content.
- `domain/models/business.ts` / `.schema.ts` — three new denormalized rollup fields: `latestScanExecutionId?`, `scanExecutionStatus?`, `scanExecutionUpdatedAt?`. Deliberately distinct from `enrichmentStatus` (Stage-13-specific). `Business.qualification`/`leadPriority`/`websiteQualityScore`/`currentPreviewId` (Stage 15/11 fields) are reused as-is, not duplicated.
- `lib/db/scan-executions.ts` (new) — `getScanExecutionById`/`listScanExecutionsForBusiness`/`putScanExecution` follow the existing `scan-events.ts` shape exactly, plus one new function: `claimScanExecutionStatus()`, an atomic conditional `UpdateCommand` (`ConditionExpression` on current status, returns `false` rather than throwing on a lost race). Neither `putScanEvent` nor `updateBusiness` is atomic in this codebase (confirmed by reading both) — this is the first conditional-transition primitive on the Next.js side; the closest precedent is the screenshot Lambda's own `conditionalUpdateStatus` (`infra/lambda/screenshot-capture/src/aws.ts`), which lives in Lambda-land for a different reason (guarding Lambda's at-least-once delivery). `ScanExecution`'s claim exists to guard Step Functions Standard's own at-least-once task execution semantics.

## Reused vs. new — code-reuse audit

Every internal API route wraps an existing, already-tested function; nothing in `web/lib/firecrawl`, `web/lib/scoring`, or `web/lib/screenshots` was modified beyond what's noted below.

- `crawl` route → `enrichBusinessWebsite` (Stage 13) unchanged — its existing no-website branch (`handleMissingWebsite`) already returns `manual_approval_required` without calling Firecrawl, so the same route serves both the `CrawlWebsite` and `RecordNoWebsiteSignals` states in the state machine (two state *names* for observability, one underlying call).
- `score` route → `scoreBusinessWebsite` (Stage 15) unchanged — its existing no-website and website-unavailable shortcuts already self-branch correctly regardless of what the crawl step did; the route just adds a `getBusinessById` read-back so the response carries `qualification`/`leadPriority`/`websiteQualityScore` (not part of `ScoringOutcome` itself).
- `capture-screenshot` route → `captureExistingSiteScreenshot`/`captureGeneratedPreviewScreenshot` (Stage 14) unchanged, selected by a `target` request field.
- `scan-status` route (new, thin) → `getScanEventById` — lets the state machine poll for the fire-and-forget screenshot Lambda's eventual result without touching that already-deployed Lambda at all.
- `generate-preview` route → **required one small, behavior-preserving extraction**: `businesses/[businessId]/actions.ts`'s private `runWebsiteGeneration()` (the admin "Generate Website" button's pipeline — cap check, OpenAI call, persist, theme/CTA seeding) was pulled out into `lib/ai/generate-and-save-preview.ts`'s `generateAndSaveWebsite()`, since Stage 16's no-website branch needed to call the identical logic from a new context (an API route, not a bound Server Action) — neither Stage 13's no-website path nor Stage 15's no-website shortcut generates a preview today, so this is the only place that does for a business with no website to crawl. `runWebsiteGeneration` is now a two-line wrapper preserving its existing `GenerateWebsiteState` return shape; `MAX_AI_GENERATIONS` moved with it. Required updating four existing test files' `server-only` mock lists (`actions.test.ts`, `photos-actions.test.ts`, `business-details-actions.test.ts`, `website-sections-actions.test.ts` — each already had this exact pattern documented for `generate-preview.ts`, see `website-sections-actions.test.ts`'s comment) plus moving the detailed generation-pipeline tests into a new `lib/ai/__tests__/generate-and-save-preview.test.ts`, leaving `actions.test.ts` covering only the thin wrapper.
- `update-execution` route (new, thin) → `claimScanExecutionStatus` — one generic endpoint reused by many distinct Step Functions states (Initialize, recording a crawl/score/screenshot reference mid-run, every Finalize/RecordFailure/QueueManualReview variant), parameterized by `expectedCurrentStatus`/`updates` in the request body.
- `load-business` route (new, thin) → `getBusinessById` — confirms the business exists and reports whether it has a website, for the workflow's first real branch.

## Internal API authentication

No service-to-service auth convention existed in this repo to extend — confirmed by reading the screenshot Lambda's actual source: it talks to DynamoDB/S3 directly with its own IAM role and never makes an HTTP call into the Next.js app (its one cross-boundary HTTP-adjacent behavior, a headless-browser navigation with Vercel bypass headers, is a different mechanism for a different purpose). `lib/internal-auth.ts` (new) is the first one: `verifyInternalRequest()` does a `timingSafeEqual` comparison of a fixed request header (`x-webpresa-internal-secret`) against a new `internal-api` secret — the same secret is what the EventBridge Connection (see below) is configured to send, so there is nothing to keep in sync by hand between caller and verifier.

## Infrastructure (CDK)

- `infra/lib/stacks/data-stack.ts` — added the `scan-executions` DynamoDB table (5th table; PK `scanExecutionId`, GSIs `business-id-index`/`status-index`, same `WebpresaTable` construct as every other table) and the `internal-api` secret (8th secret, `WebpresaSecret` construct, `sharedSecret` key, empty placeholder — populated out-of-band like every other secret in this stack). Both exposed as new public stack fields (`scanExecutionsTable`, `internalApiSecret`).
- `infra/lib/stacks/scan-workflow-stack.ts` (new) — the orchestration stack. An `events.Connection` (API_KEY auth, header/value sourced from the `internal-api` secret via `SecretValue.secretsManager(...)`) authenticates every `tasks.HttpInvoke` call the state machine makes. A `logs.LogGroup` (14-day retention, matching every other log group in this repo) captures full execution history (`LogLevel.ALL`, `includeExecutionData: true`). The state machine itself (`sfn.StateMachineType.STANDARD`) is built entirely from CDK's native `sfn`/`tasks` constructs (`HttpInvoke`, `Choice`, `Wait`, `Pass`, `Fail`, `Succeed`) — no hand-written ASL JSON. Screenshot completion (fire-and-forget from the app's perspective) is polled via a `Wait(15s) → HttpInvoke(scan-status) → Choice` loop bounded at 40 iterations (~10 minutes, matching Stage 14's existing staleness threshold) before proceeding regardless — `scoreBusinessWebsite` already tolerates a missing/failed screenshot scan gracefully, so a stuck screenshot never blocks the whole workflow. Holds no DynamoDB/S3/other-secret IAM permissions at all — every task is an outbound HTTPS call through the one Connection, so the "must not have permission to send postcards" acceptance criterion holds trivially.
- `infra/bin/webpresa.ts` — wired `WebpresaScanWorkflowStack` in as a 4th stack (after data + the two screenshot stacks), passing `internalApiSecret` and the same `appBaseUrl` the screenshot stack already uses.
- `infra/package.json` — no new dependencies; `HttpInvoke`/`events.Connection` both ship inside the already-installed `aws-cdk-lib@2.262.0`.

## Admin trigger

- `web/lib/stepfunctions/client.ts` (new) — `getStepFunctionsClient()`/`getScanWorkflowStateMachineArn()`, same singleton-client shape as `lib/lambda/client.ts`. Requires a new `SCAN_WORKFLOW_STATE_MACHINE_ARN` Vercel env var populated from the new stack's `StateMachineArn` CfnOutput, mirroring `SCREENSHOT_LAMBDA_FUNCTION_NAME`'s existing pattern.
- `web/lib/workflow/run-scan-workflow.ts` (new) — `startScanWorkflow()`/`rerunScanWorkflow()`: create a `queued` `ScanExecution`, call `StartExecutionCommand`, persist the returned `executionArn` back onto it (still `queued` — the workflow's own `InitializeScanExecution` state claims `queued → running`). A rerun always creates a brand-new `ScanExecution` (`parentScanExecutionId` + `attemptNumber + 1`), mirroring `retryEnrichmentScan`'s existing pattern for `ScanEvent` — never resets a completed one back to `queued`. One thing found only while writing the test for this: the "is the specific execution being rerun still active" check is unreachable dead code, since the broader "is *any* execution for this business active" guard (which the specific one is drawn from the same list of) always trips first — removed rather than left in as unreachable defensive code, and `not_eligible` dropped from `StartScanWorkflowOutcome`'s status union since nothing produces it anymore.
- `app/admin/(dashboard)/businesses/[businessId]/workflow-actions.ts` (new) — `runScanWorkflowAction`/`rerunScanWorkflowAction`, same redirect + query-param shape as `enrichWebsiteAction`. The browser never calls Step Functions directly.
- `app/admin/(dashboard)/businesses/[businessId]/WorkflowSection.tsx` (new), `WorkflowAutoRefresh.tsx` (new, verbatim copy of `ScreenshotAutoRefresh.tsx`'s polling pattern), `WorkflowResultBanner.tsx` (new, verbatim copy of `ScreenshotResultBanner.tsx`'s self-dismissing-banner pattern) — placed above `EnrichmentSection` on the business detail page as the new orchestration "front door." `lib/workflow/labels.ts` (new) mirrors `lib/scoring/labels.ts`'s "single source of truth" doc-commented precedent for status badge wording/tone.

## Verification

```
web/    Lint:      0 errors, 0 warnings (npm run lint)
web/    TypeCheck: 0 errors (npx tsc --noEmit)
web/    Tests:     690 passed (npx vitest run) — 73 new/changed tests across
                   domain/__tests__/stage16.test.ts (7),
                   lib/db/__tests__/scan-executions.test.ts (10),
                   lib/__tests__/internal-auth.test.ts (4),
                   lib/workflow/__tests__/failure-mapping.test.ts (6),
                   lib/workflow/__tests__/labels.test.ts (3),
                   lib/workflow/__tests__/run-scan-workflow.test.ts (7),
                   lib/ai/__tests__/generate-and-save-preview.test.ts (10, moved from actions.test.ts),
                   app/api/internal/scan/*/__tests__/route.test.ts (7 routes, 26 tests total),
                   app/admin/.../__tests__/workflow-actions.test.ts (5),
                   app/admin/.../__tests__/actions.test.ts (simplified to thin-wrapper coverage only)
web/    Build:     next build succeeds — all 7 new /api/internal/scan/* routes present in the route manifest
infra/  TypeCheck: 0 errors (npx tsc --noEmit)
infra/  Tests:     118 passed (npx vitest run) — 31 new in test/scan-workflow-stack.test.ts,
                   data-stack.test.ts extended for the 5th table + 8th secret
infra/  Synth:     `cdk synth` (no context/credentials) succeeds for all four stacks, including
                   WebpresaDevScanWorkflowStack — confirms the full app wires together
Manual: Not deployed or exercised against a real AWS account or admin session — pending user
        confirmation. Per AGENTS.md, `cdk deploy` was not run; deploying requires showing account
        ID, region, resources, stack name, and full `cdk diff` output for explicit approval first.
```

## Files changed

```
web/domain/models/scan-execution.ts                                              NEW
web/domain/schemas/scan-execution.schema.ts                                      NEW
web/domain/schemas/index.ts                                                      MODIFIED — export scan-execution.schema
web/domain/factories/scan-execution.factory.ts                                   NEW
web/domain/models/business.ts                                                    MODIFIED — 3 new rollup fields
web/domain/schemas/business.schema.ts                                            MODIFIED — matching validation
web/lib/db/scan-executions.ts                                                    NEW
web/lib/db/client.ts                                                             MODIFIED — TABLE_SCAN_EXECUTIONS
web/lib/secrets/client.ts                                                        MODIFIED — SECRET_INTERNAL_API
web/lib/secrets/index.ts                                                         MODIFIED — getInternalApiSecret()
web/lib/internal-auth.ts                                                         NEW
web/lib/workflow/failure-mapping.ts                                              NEW
web/lib/workflow/labels.ts                                                       NEW
web/lib/workflow/run-scan-workflow.ts                                            NEW
web/lib/stepfunctions/client.ts                                                  NEW
web/lib/ai/generate-and-save-preview.ts                                          NEW — extracted from actions.ts
web/app/admin/(dashboard)/businesses/[businessId]/actions.ts                     MODIFIED — runWebsiteGeneration
                                                                                     now a thin wrapper
web/app/admin/(dashboard)/businesses/[businessId]/workflow-actions.ts            NEW
web/app/admin/(dashboard)/businesses/[businessId]/WorkflowSection.tsx            NEW
web/app/admin/(dashboard)/businesses/[businessId]/WorkflowAutoRefresh.tsx        NEW
web/app/admin/(dashboard)/businesses/[businessId]/WorkflowResultBanner.tsx       NEW
web/app/admin/(dashboard)/businesses/[businessId]/page.tsx                       MODIFIED — wired in
                                                                                     WorkflowSection
web/app/api/internal/scan/update-execution/route.ts                             NEW
web/app/api/internal/scan/load-business/route.ts                                NEW
web/app/api/internal/scan/crawl/route.ts                                        NEW
web/app/api/internal/scan/capture-screenshot/route.ts                           NEW
web/app/api/internal/scan/scan-status/route.ts                                  NEW
web/app/api/internal/scan/score/route.ts                                        NEW
web/app/api/internal/scan/generate-preview/route.ts                             NEW
web/package.json                                                                MODIFIED — @aws-sdk/client-sfn
infra/lib/stacks/data-stack.ts                                                   MODIFIED — scan-executions table,
                                                                                     internal-api secret
infra/lib/stacks/scan-workflow-stack.ts                                         NEW
infra/bin/webpresa.ts                                                           MODIFIED — wired in
                                                                                     WebpresaScanWorkflowStack
infra/test/data-stack.test.ts                                                    MODIFIED — 5-table/8-secret counts
infra/test/scan-workflow-stack.test.ts                                          NEW
web/lib/ai/__tests__/generate-and-save-preview.test.ts                          NEW — moved from actions.test.ts
web/app/admin/.../__tests__/actions.test.ts                                     MODIFIED — simplified to
                                                                                     thin-wrapper coverage
web/app/admin/.../__tests__/{photos,business-details,website-sections}-actions.test.ts
                                                                                  MODIFIED — added
                                                                                     generate-and-save-preview mock
web/domain/__tests__/stage16.test.ts                                            NEW
web/lib/db/__tests__/scan-executions.test.ts                                    NEW
web/lib/__tests__/internal-auth.test.ts                                         NEW
web/lib/workflow/__tests__/{failure-mapping,labels,run-scan-workflow}.test.ts   NEW
web/app/api/internal/scan/*/__tests__/route.test.ts                            NEW (7 files)
web/app/admin/.../__tests__/workflow-actions.test.ts                           NEW
web/docs/implementation.md                                                      MODIFIED — Stage 16 rewritten,
                                                                                     Stage 15 scope note corrected
                                                                                     (earlier this session)
```

# Stage 16 — dev deployment, and IAM migration to CDK-managed policies (2026-07-24)

## Deployment

`WebpresaDevDataStack` (adds the `scan-executions` table + `internal-api` secret) and `WebpresaDevScanWorkflowStack` (the Step Functions state machine + EventBridge Connection) deployed to dev, account `539898341083`, region `us-east-1`. Both diffs reviewed before deploy (purely additive — no changes/deletions to any existing resource) per `AGENTS.md`'s deployment gate. `appBaseUrl` set to the same real URL already baked into the deployed Stage 14 screenshot Lambda (`https://webpresa-git-dev-andrew-mudges-projects.vercel.app`, retrieved via `aws lambda get-function-configuration` rather than guessed). The `internal-api` secret's real shared-secret value was generated locally (`openssl rand -base64 48`) and populated via `aws secretsmanager put-secret-value`, same pattern as every other platform-internal secret.

## Found and fixed: a real gap in the Stage 16 IAM story

While granting `webpresa-vercel-dev` (the Vercel app's IAM identity) the two permissions Stage 16 actually needs — `states:StartExecution` on the new state machine and `secretsmanager:GetSecretValue` on the `internal-api` secret — a `put-user-policy` call failed: `LimitExceeded: Maximum policy size of 2048 bytes exceeded for user`. Confirmed via `aws service-quotas list-service-quotas --service-code iam` that this is a **hard, non-adjustable limit** on the aggregate size of all inline policies on one IAM user (unlike the Lambda concurrency quota hit in Stage 14, which *was* raisable) — usage was already at 1983/2048 bytes across the project's five hand-run inline policies before this session even started.

This surfaced a second, independent gap while investigating: **`webpresa-vercel-dev` had never been granted access to the `scan-executions` table at all** — the existing `webpresa-dev-dynamodb` inline policy only covered the four tables that existed when it was written (businesses, site-previews, scan-events, postcards). Every one of Stage 16's new `/api/internal/scan/*` routes and the admin trigger action would have hit `AccessDeniedException` on every DynamoDB call against `ScanExecution` records had this gone live as-is.

## Fix: migrated all `webpresa-vercel-dev` permissions to CDK-managed policies

Rather than patch around the 2048-byte ceiling (which would only defer the same failure to the next stage that needs a new grant — Stage 18 Stripe, Stage 22 Lob), moved every permission this identity has off inline policies entirely:

- `infra/lib/stacks/vercel-access-stack.ts` (new) — `WebpresaVercelAccessStack`. Imports the existing `webpresa-vercel-{env}` user by name (`iam.User.fromUserName`) — deliberately does **not** create or manage the user or its access keys, since a long-lived secret shouldn't flow through a CloudFormation template/output. Attaches two `iam.ManagedPolicy` resources: `webpresa-{env}-vercel-data-access` (DynamoDB — now correctly including `scan-executions` — S3 assets, all 8 secrets) and `webpresa-{env}-vercel-compute-invoke` (Lambda invoke + Step Functions StartExecution). A customer-managed policy allows 6,144 characters each (vs. 2,048 total across every inline policy combined), and a user can attach up to 10 — this isn't a limit the project will realistically hit again. Statements were transcribed exactly from the five live inline policies (fetched via `aws iam get-user-policy` before writing any code) plus the one addition (`scan-executions`) — a management-plane change, not a permissions change, aside from that one closed gap.
- `infra/lib/stacks/data-stack.ts` — exposed `postcardsTable` and all 5 third-party secrets (`openAiSecret`, `firecrawlSecret`, `googlePlacesSecret`, `stripeSecret`, `lobSecret`) as public stack fields; previously only local constants, needed so the new stack can reference their ARNs via typed cross-stack props rather than reconstructed ARN strings.
- `infra/bin/webpresa.ts` — wired in `WebpresaVercelAccessStack`, depending on `WebpresaDataStack`, `WebpresaScreenshotStack`, and `WebpresaScanWorkflowStack` (needs the screenshot Lambda's and state machine's ARNs).
- `AWS::IAM::ManagedPolicy` does not support CloudFormation-level tagging at all (confirmed against `CfnManagedPolicyProps` — no `tags` field exists) — the new stack deliberately omits the `cdk.Tags.of(this)` call every other stack has, since it would silently apply to nothing.

## Migration sequence (live account)

1. `cdk deploy WebpresaDevVercelAccessStack` — creates both managed policies, attaches them alongside the 5 existing inline policies (no access lost mid-migration; overlapping grants are harmless).
2. Verified via `aws iam list-attached-user-policies --user-name webpresa-vercel-dev`.
3. Deleted the 5 legacy inline policies (`aws iam delete-user-policy`) — exactly one source of truth going forward.

## Verification

```
infra/  TypeCheck: 0 errors (npx tsc --noEmit)
infra/  Tests:     128 passed (npx vitest run) — 10 new in test/vercel-access-stack.test.ts
infra/  Synth:     cdk synth succeeds for all five dev stacks together
infra/  Diff:      cdk diff reviewed and shown to the user before every deploy in this session,
                   per AGENTS.md's deployment gate
Manual: WebpresaDevDataStack, WebpresaDevScanWorkflowStack, and WebpresaDevVercelAccessStack all
        deployed and live in account 539898341083 / us-east-1. Vercel environment variables
        (INTERNAL_API_SECRET_NAME, SCAN_EXECUTIONS_TABLE_NAME, SCAN_WORKFLOW_STATE_MACHINE_ARN)
        still pending — outside CDK/AWS CLI reach, requires the Vercel dashboard.
```

## Files changed

```
infra/lib/stacks/vercel-access-stack.ts                                          NEW
infra/lib/stacks/data-stack.ts                                                   MODIFIED — exposed
                                                                                     postcardsTable + 5 secrets
                                                                                     as public fields
infra/bin/webpresa.ts                                                            MODIFIED — wired in
                                                                                     WebpresaVercelAccessStack
infra/test/vercel-access-stack.test.ts                                           NEW
web/docs/deployment.md                                                          MODIFIED — "AWS credentials
                                                                                     for Vercel" rewritten;
                                                                                     Stage 14/16 IAM sections
                                                                                     updated; deployment order
                                                                                     updated
web/docs/architecture.md                                                        MODIFIED — status line, stacks
                                                                                     table, S3/Secrets Manager
                                                                                     IAM notes updated
```

# Admin scan-type visibility (2026-07-24)

## Problem

Direct admin feedback: `/admin/scans` (and the "Scans" `HistoryCard` on a business detail page) showed only a scan's `status`, source URL, image counts, attempt, and timestamps — nothing said *what a scan actually did* (Firecrawl website enrichment, Playwright screenshot, or OpenAI AI scoring). That information (`ScanEvent.provider`/`operation`/`targetType`) only appeared on the individual scan detail page's subtitle, forcing a click into every row to tell them apart. The unfiltered view's caption was also stale, still describing scans as "Firecrawl website-enrichment attempts" from before Stage 14/15 added Playwright and OpenAI scans.

## Fix

- `web/lib/scans/scan-type.ts` (new) — pure functions `getScanTypeLabel()`/`getScanTypeColorClass()` deriving a human label ("Website Enrichment" / "AI Scoring" / "Screenshot — Existing Site" / "Screenshot — Generated Preview") and a Tailwind color class from `provider`+`operation`(+`targetType` for Playwright), with a generic `` `${provider} · ${operation}` `` fallback for any future/unrecognized pair — same classify-function pattern as `lib/social-links.ts`.
- `web/app/admin/(dashboard)/scans/ScanTypeBadge.tsx` (new) — small badge component wrapping the above, exported for reuse outside the `scans/` route group.
- `web/app/admin/(dashboard)/scans/page.tsx` — new "Type" column (both the grouped one-row-per-business view and the filtered per-business view share the same table), plus the stale "Firecrawl website-enrichment attempt" caption reworded to be provider-agnostic.
- `web/app/admin/(dashboard)/businesses/[businessId]/page.tsx` — the "Scans" `HistoryCard`'s per-row label changed from bare `s.status` to `` `${getScanTypeLabel(s)} · ${s.status}` ``, so the same information is visible without navigating past the card into the scan detail page.

Presentation-only — no change to `ScanEvent`, its schema, or any repository/query function; every field used already existed on the record.

## Verification

```
web/    Lint:      0 errors, 0 warnings (npm run lint)
web/    TypeCheck: 0 errors (npx tsc --noEmit)
web/    Tests:     698 passed (npm test) — 8 new in lib/scans/__tests__/scan-type.test.ts
web/    Build:     next build succeeds
Manual: Not yet exercised in a live browser session against the real dev deployment.
```

## Files changed

```
web/lib/scans/scan-type.ts                                                       NEW
web/lib/scans/__tests__/scan-type.test.ts                                        NEW
web/app/admin/(dashboard)/scans/ScanTypeBadge.tsx                                NEW
web/app/admin/(dashboard)/scans/page.tsx                                         MODIFIED — Type column,
                                                                                     stale caption fixed
web/app/admin/(dashboard)/businesses/[businessId]/page.tsx                       MODIFIED — Scans HistoryCard
                                                                                     label includes scan type
```

# Stage 15 fix — blocked/error existing-site responses were scored as real content (2026-07-24)

## Problem

Direct admin report: a business whose existing website actually returns HTTP 403 (blocked the crawler) was scored 74 / Medium / Qualified — a confident, positive assessment — instead of being flagged for manual review. The admin's own manual check confirmed the real site is good and this business should *not* be pursued, making the "Qualified" result actively wrong for postcard-targeting purposes.

Root cause: Firecrawl's own API call to `api.firecrawl.dev` succeeds (`success: true`) even when the *target site* it fetched on our behalf returned an error status — the error surfaces only inside `data.metadata.statusCode`, often alongside some markdown/title text from a bot-block or challenge page. `enrich-business.ts`'s only content check (`!data.markdown?.trim() && !data.metadata?.title`) treats any non-empty response as success, so the Firecrawl `ScanEvent` was marked `completed` with `httpStatus: 403` recorded but never acted on. Because `scoreBusinessWebsite()`'s existing "website unavailable" shortcut (`handleWebsiteUnavailable` in `lib/scoring/score-business.ts`) only triggers when the Firecrawl scan's `status === 'failed'` with a qualifying `failureCategory`, a "completed-but-actually-blocked" scan skipped that shortcut entirely and went to a real OpenAI scoring call — fed thin/garbage block-page content, with no signal anywhere in the prompt that the source was an error response. `WebsiteDeterministicMetrics` doesn't carry an HTTP-status field, and the prompt's `formatMetrics()` never mentions it.

## Fix

Root-cause fix only, scoped per direct admin confirmation — this app scores each business via a single stateless OpenAI call with no training set, fine-tuning, or few-shot memory, so there is no literal way to feed a past example back into future scoring; the closest real, systemic fix is closing the detection gap so this exact failure mode can't recur.

- `domain/models/scan-event.ts` — new `ScanFailureCategory` value `website_error_response`, distinct from `website_unreachable` (Firecrawl's own fetch failing outright): this one means Firecrawl's fetch succeeded but the target site itself returned a 4xx/5xx status.
- `lib/firecrawl/enrich-business.ts`'s `runAttempt()` — checks `data.metadata?.statusCode >= 400` **before** the existing empty-content check, so a block/challenge page with real-looking text no longer slips through as "completed." Fails the scan as `website_error_response` with the actual status recorded on `ScanEvent.httpStatus`.
- `lib/scoring/score-business.ts`'s `WEBSITE_UNAVAILABLE_FAILURE_CATEGORIES` and `lib/scoring/qualification-rules.ts`'s `WEBSITE_UNAVAILABLE_CATEGORIES` — both extended to include the new category, so it now routes through the exact same no-AI-call `manual_review` shortcut already used for `website_unreachable`/`blocked_url`/`invalid_url`. No changes needed to the shortcut logic itself, the prompt, or `runScoringAttempt()`.
- `lib/workflow/failure-mapping.ts` and `EnrichmentSection.tsx`'s `FAILURE_CATEGORY_LABELS` — both are total `Record<ScanFailureCategory, …>` maps, so TypeScript required (and got) an entry for the new category: mapped to workflow category `'validation'` (non-retryable, matching `blocked_url`'s precedent — a block is a persistent condition, not a transient network hiccup) and labeled "Website returned an error (blocked or unavailable)" for the admin UI.
- Deliberately **not** added to `lib/firecrawl/retry.ts`'s `RETRYABLE_CATEGORIES` — same reasoning, a 403 block won't resolve itself on an inline retry.

Immediate fix for the specific business the admin reported: the existing "Admin Override" on the Scoring card (`adminReviewedQualification` → `reject`) already lets the qualification be corrected today, independent of this code change — see `ScoringSection.tsx`'s `OverrideForm`.

## Verification

```
web/    Lint:      0 errors, 0 warnings (npm run lint)
web/    TypeCheck: 0 errors (npx tsc --noEmit)
web/    Tests:     703 passed (npm test) — 5 new: 3 in
                   lib/firecrawl/__tests__/enrich-business.test.ts (403, 5xx, and 200-is-unaffected cases),
                   1 in lib/scoring/__tests__/qualification-rules.test.ts,
                   1 in lib/scoring/__tests__/score-business.test.ts
web/    Build:     next build succeeds
Manual: Not yet re-run against the real reported business (biz_8f9fb88d-3db9-4a55-a91a-4bfbbdf729a0) —
        re-running "Enrich Website" then "Score Website" on it would confirm the fix live.
```

## Files changed

```
web/domain/models/scan-event.ts                                                  MODIFIED — new
                                                                                     website_error_response
                                                                                     failure category
web/lib/firecrawl/enrich-business.ts                                             MODIFIED — detects target-site
                                                                                     4xx/5xx before the
                                                                                     empty-content check
web/lib/scoring/score-business.ts                                                MODIFIED — shortcut set
                                                                                     extended
web/lib/scoring/qualification-rules.ts                                           MODIFIED — shortcut set
                                                                                     extended
web/lib/workflow/failure-mapping.ts                                              MODIFIED — new category
                                                                                     mapped to 'validation'
web/app/admin/(dashboard)/businesses/[businessId]/EnrichmentSection.tsx          MODIFIED — new category label
web/lib/firecrawl/__tests__/enrich-business.test.ts                              MODIFIED — 3 new tests
web/lib/scoring/__tests__/qualification-rules.test.ts                           MODIFIED — 1 new test
web/lib/scoring/__tests__/score-business.test.ts                                MODIFIED — 1 new test
```

# Screenshot thumbnails on the business detail page (2026-07-24)

## Problem

Direct admin feedback: the "Screenshots" card (Stage 14) only ever showed text links ("desktop ↗" / "mobile ↗") for the existing-site and generated-preview captures — an admin had to click through to a new tab to see either image, one at a time, making a quick desktop/mobile visual comparison tedious.

## Fix

`app/admin/(dashboard)/businesses/[businessId]/ScreenshotsSection.tsx`'s `ViewportLinks` (renamed `ViewportThumbnails`) now renders each completed viewport as an actual `<img>` thumbnail — shrunk down but at the real capture aspect ratio (`aspect-[1440/1000]` desktop, `aspect-[390/844]` mobile, matching `infra/lambda/screenshot-capture/src/browser.ts`'s `VIEWPORTS`) — instead of a bare link. Each thumbnail is still wrapped in the same `<a target="_blank">` to `/admin/scans/view-artifact?key=...` (the existing signed-URL redirect route, unchanged) for a full-size look; the `<img src>` points at the same URL, so the browser follows the redirect itself with no new route or server-side signing code needed. Follows `ScanImageApprovalGrid.tsx`'s existing precedent for a plain `<img>` (with its required `eslint-disable-next-line @next/next/no-img-element`) against a proxy/redirect URL rather than `next/image`, since the URL is a private, per-request signed redirect rather than a static/known-domain asset.

Presentation-only — no new data, route, or server-side signing logic; both target cards (Existing Website, Generated Preview) get the same treatment.

## Verification

```
web/    Lint:      0 errors, 0 warnings (npm run lint)
web/    TypeCheck: 0 errors (npx tsc --noEmit)
web/    Tests:     703 passed (npm test) — no test file exists for this component; unaffected
web/    Build:     next build succeeds
Manual: Not yet viewed in a live browser session against the real dev deployment.
```

## Files changed

```
web/app/admin/(dashboard)/businesses/[businessId]/ScreenshotsSection.tsx        MODIFIED — thumbnails
                                                                                     instead of text links
```

# Reviews/Testimonials merge (2026-07-25 – 2026-07-26)

## Problem

Direct admin feedback: the public template's aggregate "Reviews" section (Google rating summary only) and the separate "Testimonials" section (individual review/testimonial cards) were redundant — an admin wanted the actual testimonials to appear directly underneath the rating summary as one "Reviews" section, not as two separately-toggleable blocks lower on the page.

## Step 1 — merge testimonials into ReviewsSection (public template)

`app/b/[slug]/template/ReviewsSection.tsx` — the rating summary block (stars + "X average rating from Y reviews on Google — Business") is unchanged. Directly underneath, it now renders the business's testimonials (`Business.testimonials`, manual and/or Google-sourced) reusing `TestimonialCard`/`TestimonialsMobileCarousel` unchanged (desktop grid, mobile auto-rotating carousel — identical to what the standalone Testimonials section rendered). `section-registry.tsx`'s `reviews` entry now passes `ctx.business.testimonials` through.

Visibility widened from "rating only" to "rating OR at least one visible testimonial," so a business with testimonials but no Google rating on file still shows them — this required widening `lib/website-sections/availability.ts`'s `reviews` check the same way (`googleReviewCount >= 1 || visible testimonial exists`), since that check gates whether the section renders at all (`resolveRenderableSections`), independent of the component's own internal logic.

Deliberately left untouched in this step, per direct instruction to review before removing: the standalone `testimonials` section (component, catalog entry, registry mapping) kept rendering wherever already enabled — meaning a business with both enabled temporarily showed testimonials twice (once under the new merged Reviews, once in the old standalone section) until the admin confirmed the new placement looked right.

## Bug fix — Google reviewer avatars broken on localhost

`app/components/TestimonialAvatar.tsx`'s `next/image` now sets `referrerPolicy="no-referrer"`. Google's photo CDN (`lh3.googleusercontent.com`) was rejecting reviewer-avatar image requests that carried a `Referer: http://localhost:3000` header — visible only in local dev (a real deployed domain's referrer wasn't rejected the same way), showing as a broken-image icon on every reviewer avatar.

## Step 2 — move the admin inline content editor onto the Reviews row

The business detail page's "Website Sections" card lets an admin expand a row to edit that section's content. "Reviews" previously had no editor at all (`SectionConfigForm.tsx`'s `NO_EDITOR_SECTIONS`); "Testimonials" had the full testimonial-management editor (manual entries form, `TestimonialsOrderEditor`, `GoogleReviewsPanel`).

- `SectionConfigForm.tsx` — removed `'reviews'` from `NO_EDITOR_SECTIONS`, so its row now gets an expand chevron.
- `SectionContentEditor.tsx` — `BUSINESS_LIST_SECTIONS` gained `reviews: 'testimonials'` (mapping the `reviews` row to the same `Business.testimonials` field the `testimonials` row already used), so expanding "Reviews" shows the identical editor.
- `actions.ts`'s `updateBusinessListFieldAction` previously redirected back to re-expand a hardcoded section derived from a static `field → section` map — wrong once two different rows (`reviews` and `testimonials`) could both drive the same `field`. Changed to take the actual `section` explicitly from the caller, so saving from either row's editor re-expands that same row rather than jumping to the other one.
- "Testimonials" kept its own working editor too in this step, same "don't remove yet" instruction as Step 1.

## Step 3 — remove the standalone `testimonials` section

Once the admin confirmed the merged Reviews section looked right, the standalone section (now fully redundant) was removed:

- `domain/constants/website-sections.ts` — `'testimonials'` removed from `WEBSITE_SECTION_TYPES` and its `WEBSITE_SECTION_CATALOG` entry deleted.
- `lib/website-sections/availability.ts` — the now-orphaned `testimonials` key removed from `computeSectionAvailability`'s returned record (TypeScript forces this — the Record's key type shrank with the enum).
- `app/b/[slug]/template/section-registry.tsx` — `testimonials` registry entry and `TestimonialsSection` import removed; `TestimonialsSection.tsx` deleted outright (its logic already lives in `ReviewsSection.tsx` — nothing else imported it). `TestimonialCard.tsx`/`TestimonialsMobileCarousel.tsx` are unaffected — `ReviewsSection.tsx` still uses both directly.
- `SectionContentEditor.tsx` / `SectionConfigForm.tsx` — the now-dead `testimonials: 'testimonials'` entry removed from `BUSINESS_LIST_SECTIONS`; doc comments updated to describe the final (not transitional) state.
- Two `enableWebsiteSection(business, 'testimonials')` dual-write call sites — `app/admin/(dashboard)/discover/actions.ts` (Google Places import auto-enable) and `businesses/[businessId]/actions.ts` (the "Import/Refresh Google Reviews" action) — switched to `enableWebsiteSection(business, 'reviews')`, since there's no longer a separate section to enable.

### Backward compatibility — legacy stored `testimonials` entries

Removing a value from `z.enum(WEBSITE_SECTION_TYPES)` is not just a type-level change: `BusinessSchema`'s `websiteSections` field uses that same strict schema for both the write path (correctly rejects a new save referencing an unsupported component) and the **read** path (`BusinessSchema.parse()`, called on every DynamoDB read in `lib/db/businesses.ts`) — a business already carrying a `component: 'testimonials'` entry in its stored `websiteSections.sections` (any business the auto-enable dual-write had already touched, e.g. via Google Places import) would fail to parse *at all* once the enum shrank, throwing on every read and 500ing its detail page. `lib/website-sections/resolve.ts`'s existing render-time leniency (`resolveStoredOrDefaultSections`, documented as "must never throw") doesn't help here — it never runs on a record that failed to parse one layer earlier.

Fixed with a new `parseBusinessItem()` in `lib/db/businesses.ts`, wrapping all 6 read call sites (`getBusinessById`, `getBusinessBySlug`, `getBusinessByGooglePlaceId`, `listBusinesses` (both branches), `listAllBusinesses`): strips any `websiteSections.sections` entry whose `component` isn't in the current `WEBSITE_SECTION_TYPES` before handing the item to `BusinessSchema.parse()`, so a legacy record loads cleanly with the stale entry silently dropped — mirroring `resolveStoredOrDefaultSections`'s own leniency one layer earlier. The 2 write call sites (`putBusiness`/`updateBusiness`) intentionally keep calling `BusinessSchema.parse()` directly, unmodified — anything persisted going forward stays fully strict.

## Verification

```
web/    Lint:      0 errors, 0 warnings (npm run lint)
web/    TypeCheck: 0 errors (npx tsc --noEmit)
web/    Tests:     702 passed (npm test) — net -1 from the prior count: 2 obsolete
                   `testimonials`-availability tests removed (superseded by the widened
                   `reviews` test), 1 new test added (lib/db/__tests__/businesses.test.ts —
                   legacy websiteSections tolerance)
web/    Build:     next build succeeds
Manual: Confirmed live in a dev browser session (screenshot review) after Step 1 — rating
        summary unchanged, testimonials rendering underneath, matching the target layout.
        Steps 2–3 (inline editor move, final removal) not yet re-verified in a live browser
        session against the real dev deployment.
```

## Files changed

```
app/b/[slug]/template/ReviewsSection.tsx                                         MODIFIED — renders
                                                                                     testimonials underneath
                                                                                     the rating summary
app/b/[slug]/template/section-registry.tsx                                       MODIFIED — reviews passes
                                                                                     testimonials; testimonials
                                                                                     entry removed
app/b/[slug]/template/TestimonialsSection.tsx                                    DELETED
app/b/[slug]/template/TestimonialsMobileCarousel.tsx                             MODIFIED — doc comment only
app/components/TestimonialAvatar.tsx                                             MODIFIED — referrerPolicy fix
lib/website-sections/availability.ts                                             MODIFIED — reviews widened,
                                                                                     testimonials key removed
domain/constants/website-sections.ts                                             MODIFIED — testimonials
                                                                                     removed from catalog/type
lib/db/businesses.ts                                                             MODIFIED — parseBusinessItem()
                                                                                     read-time tolerance
app/admin/(dashboard)/businesses/[businessId]/SectionConfigForm.tsx              MODIFIED — reviews row
                                                                                     gets an editor
app/admin/(dashboard)/businesses/[businessId]/SectionContentEditor.tsx          MODIFIED — reviews→testimonials
                                                                                     field mapping
app/admin/(dashboard)/businesses/[businessId]/actions.ts                        MODIFIED — explicit section
                                                                                     param; enableWebsiteSection
                                                                                     target switched to reviews
app/admin/(dashboard)/discover/actions.ts                                       MODIFIED — enableWebsiteSection
                                                                                     target switched to reviews
lib/website-sections/__tests__/availability.test.ts                             MODIFIED — merged/removed tests
lib/website-sections/__tests__/resolve.test.ts                                  MODIFIED — testimonials→reviews
lib/website-sections/__tests__/recommend.test.ts                                MODIFIED — removed stale entry
domain/__tests__/website-sections.test.ts                                       MODIFIED — removed stale entry
lib/db/__tests__/businesses.test.ts                                             MODIFIED — new legacy-tolerance
                                                                                     test
web/docs/architecture.md                                                        MODIFIED — new "Reviews/
                                                                                     Testimonials merge" section,
                                                                                     stale references corrected
```

# CTA Banner moved between Reviews and Service Areas (2026-07-27)

## Problem

The CTA Banner section's default position was near the bottom of the page
(after FAQ), but it should appear right after Reviews and before Service
Areas for new/unconfigured businesses.

## Fix

Changed `ctaBanner`'s `defaultOrder` in `WEBSITE_SECTION_CATALOG` from `130`
to `80`, using the existing gap in the numbering scheme between `reviews`
(`70`) and `serviceAreas` (`90`). No other catalog entries needed
renumbering. Existing businesses with a stored `websiteSections` config keep
their current saved order — this only affects the default used for new or
never-customized businesses.

## Verification

```
npm run lint        — passes
npx tsc --noEmit    — passes
npm test            — 63 files, 702 tests passed
npm run build       — succeeds
```

## Files changed

```
domain/constants/website-sections.ts   MODIFIED — ctaBanner defaultOrder
                                           130 → 80
web/docs/build_log.md                  MODIFIED — this entry
```

# Larger business logo in the generated site nav bar (2026-07-27)

## Problem

The business logo in the generated site's nav bar (`GeneratedSiteHeader`)
rendered too small — h-8 (32px) on mobile, h-9 (36px) on desktop — relative
to the available space in the 64px-tall nav bar.

## Fix

Changed the logo `<Image>`'s className in `GeneratedSiteHeader.tsx` from
`h-8 sm:h-9 w-auto object-contain` to `h-10 sm:h-12 w-auto object-contain`,
raising rendered height to 40px on mobile and 48px on desktop (sm: and up).
The nav bar's own height (`h-16`, 64px, fixed at all breakpoints) was left
unchanged — the larger logo still fits with comfortable padding. `w-auto
object-contain` were kept as-is so width keeps scaling with each logo's
natural aspect ratio without cropping. This is the only nav bar component
for generated business sites, shared by the live public site and the
admin's own preview, so one edit covers both.

## Verification

```
npm run lint        — passes
npx tsc --noEmit    — passes
npm test            — 63 files, 702 tests passed
npm run build       — succeeds
```

## Files changed

```
app/b/[slug]/template/GeneratedSiteHeader.tsx   MODIFIED — logo className
                                                    h-8 sm:h-9 → h-10 sm:h-12
web/docs/build_log.md                           MODIFIED — this entry
```

# Stock image repository — curated hero-photo fallback (Phase 1) (2026-07-27)

## Problem

The automatic hero-image pick for a generated preview had only three tiers:
admin override → first uploaded business photo → any Firecrawl-discovered
image (regardless of dimensions) → theme illustration fallback. Too many
previews with no admin-uploaded photo and no usable scraped image fell all
the way to the generic illustration. There was also no first-party stock
photography — a past decision (`industry-icons.tsx`) had explicitly rejected
generic per-industry stock photos due to licensing/duplication concerns, but
that concern doesn't apply to a Webpresa-curated library used as an
intentional professional fallback tier.

## New hero auto-pick chain

1. Explicit admin override (`Business.heroPhotoUrl`, including `'none'`) —
   unchanged, highest priority. A custom hero upload through this slot is
   now auto-cropped server-side to the exact full-bleed dimensions
   (1920×1080), with a paired mobile crop (1080×1350) generated alongside it
   (`Business.heroPhotoUrlMobileAuto` — internal, never admin-set directly).
2. **New**: a Firecrawl-discovered `role: 'hero'` image whose already-stored
   dimensions are within 100px of 1920×1080 (16:9) — reuses
   `HERO_FULL_BLEED_DIMENSIONS`/`HERO_DIMENSION_TOLERANCE_PX` from
   `lib/image/hero-dimensions.ts`, checked directly against the stored
   width/height (no re-fetch).
3. **New**: a curated stock hero image matched to `Business.industry`
   (required field, so this only misses when no active stock set exists yet
   for that industry).
4. **New**: mobile hero gets an automatic fallback for the first time
   (previously manual-only), pairing with whichever tier supplied the
   desktop image — never an independent industry lookup. A Firecrawl-tier
   hero has no known mobile companion, so mobile still falls through to the
   illustration in that case unless manually overridden.
5. Theme illustration fallback — unchanged, final catch-all.

The old "first uploaded business photo" auto-fallback tier is removed from
the hero chain entirely — uploaded photos remain selectable for the hero
slot only via explicit admin override, never as an automatic default. The
about/services/aboutSection slots' own upload-order fallback chains are
unchanged.

## New infrastructure — public stock-image CDN

This project had zero CDN anywhere — all images, even business photos, are
served through a private S3 bucket behind a server-side proxy route
(`/api/assets/[...key]`). Stock photography is different: non-sensitive and
deliberately reused across many businesses, so it's served through a new,
dedicated public-via-CloudFront bucket instead (first CloudFront
distribution in the project):

- `infra/lib/stacks/stock-images-stack.ts` (`WebpresaStockImagesStack`) — a
  `WebpresaBucket` (`webpresa-{env}-stock-images`, stays fully private/
  `BLOCK_ALL` — unchanged from every other bucket) behind a CloudFront
  `Distribution` using `S3BucketOrigin.withOriginAccessControl()` (CDK
  auto-manages the OAC + bucket policy, no manual policy JSON). Also owns
  the new `stock-image-metadata` DynamoDB table (`stockImageId` PK;
  `industry-kind-index` GSI — PK `industryKind` computed as
  `"{industry|'general'}#{kind}"`, SK `createdAt`, doubling as the Phase 2
  browse/filter query; `status-index` GSI, same pre-production caveat as
  every other table). Named distinctly from the bucket — both constructs
  derive their `CfnOutput` export names from their own short name, so
  reusing `stock-images` for the table too produced a duplicate
  CloudFormation export, caught via `cdk synth` before any deploy attempt.
- `infra/lib/stacks/vercel-access-stack.ts` — new `stockImagesBucket` prop
  and a `S3StockImages` statement on `dataAccessPolicy`: `PutObject`/
  `DeleteObject`/`ListBucket` only, deliberately **no** `GetObject` — reads
  happen publicly via CloudFront, never through the app's IAM identity.
- `infra/bin/webpresa.ts` — new stack instantiated after
  `WebpresaScanWorkflowStack`, before `WebpresaVercelAccessStack` (no
  dependency on any earlier stack).
- Every object gets a fresh, never-reused key (`hero-sets/{industry}/{setId}/...`)
  with an immutable `Cache-Control` header set at upload time
  (`lib/s3/stock-images.ts`) — "replacing" a stock image is always a new
  upload + new record + archiving the old one, never an overwrite, so this
  feature never needs a CloudFront cache invalidation.
- Not deployed — `cdk synth`/`cdk diff` only, per `AGENTS.md`.

## Domain model, DB, and image processing

- `domain/models/stock-image.ts` / `domain/schemas/stock-image.schema.ts` /
  `domain/factories/stock-image.factory.ts` — new `StockImage` record
  (`stock_<uuid>`), `kind: 'hero' | 'general'` (a hero set is always a
  desktop+mobile pair; `'general'` is a single image, unused by any
  auto-pick tier today — exists so Phase 2's full browsable library has a
  broader pool without a future schema change), `industry` (optional —
  absent means the general/uncategorized pool), `status: 'active' |
  'archived'`, `isDefault` (action-enforced, not schema-enforced, same
  pattern as `MAX_BUSINESS_PHOTOS`).
- `lib/db/stock-images.ts` — repository following the existing
  `lib/db/*` conventions; `getDefaultStockHeroSet(industry)` prefers the
  active `isDefault` set, else the most-recently-uploaded active set.
- `lib/s3/stock-images.ts` — upload/delete helpers targeting the new bucket,
  returning CloudFront URLs; `uploadStockHeroSet` crops a source image into
  the desktop+mobile pair via `lib/image/crop-hero-photo.ts` (`sharp`,
  center-crop, re-encoded as JPEG — no interactive crop UI in Phase 1).
- `lib/image/resolve-hero-image.ts` — the new `resolveHeroImages()` tier
  chain described above, called from `lib/ai/generate-preview.ts` in place
  of the old inline `resolvePhotoSlot(heroPhotoUrl, photoUrls[0],
  scanHeroImageUrl)` + dimension-check block. The `acceptedScanImages`/
  `otherScanImageUrls` computation feeding the about/services/aboutSection
  slots is untouched.
- `next.config.ts` — added the stock-images CloudFront domain to
  `images.remotePatterns` (required even with `unoptimized: true` — that
  flag only skips Next/Image's optimization pipeline, not its remote
  hostname validation for absolute URLs).

## Admin UI

- New route `/admin/stock-images` (`page.tsx` + `actions.ts` +
  `StockImagesPanel.tsx`), following the existing top-level admin route
  convention (`discover/`): upload form (industry picker from `INDUSTRIES`,
  kind picker, file input), a simple industry filter over the full list,
  and per-image Archive/Delete/Set-as-default actions. New "Stock Images"
  entry in `AdminSidebar.tsx`'s `NAV_ITEMS`.
- `businesses/[businessId]/actions.ts`'s `updatePhotosAction` — the existing
  "Desktop hero image" direct-upload input (`heroPhotoFile`) now auto-crops
  the uploaded image to the desktop hero dimensions and generates the
  paired mobile auto-crop in the same save, instead of uploading the file
  verbatim. `heroPhotoUrlMobileAuto` is cleared whenever the hero slot
  changes to something other than that same-save crop (a different existing
  photo, "No photo", or reverting to Auto), so a stale pairing can never
  survive a change nobody asked for. The "pick an existing uploaded photo"
  flow and its `imageSplit` dimension warning are untouched — only the
  dedicated upload input gets auto-cropped.

## Out of scope (Phase 2, data model already accommodates it)

The full "Explore our stock photos or upload your own" browsable/filterable
picker for admin + future client use, and any client-facing (business-owner)
dashboard access, are not built in this stage. `industry-kind-index` and the
`kind: 'general'` pool exist specifically so Phase 2 only needs new UI, not
a schema change.

## Verification

```
web:
npm run lint         — passes
npx tsc --noEmit     — passes
npm test             — 64 files, 714 tests passed
npm run build        — succeeds (new /admin/stock-images route present)

infra:
npm run build (tsc)  — passes
npm test             — 6 files, 140 tests passed
cdk synth (full app) — succeeds, all 6 stacks present
```

Not deployed — no `cdk deploy` was run, per `AGENTS.md`.

## Files changed

```
domain/models/stock-image.ts                                                    NEW
domain/schemas/stock-image.schema.ts                                            NEW
domain/factories/stock-image.factory.ts                                         NEW
domain/models/index.ts                                                          MODIFIED — export stock-image
domain/schemas/index.ts                                                         MODIFIED — export stock-image.schema
domain/factories/index.ts                                                       MODIFIED — export stock-image.factory
domain/models/business.ts                                                       MODIFIED — heroPhotoUrlMobileAuto field
domain/schemas/business.schema.ts                                              MODIFIED — heroPhotoUrlMobileAuto schema
lib/db/client.ts                                                                MODIFIED — TABLE_STOCK_IMAGES
lib/db/stock-images.ts                                                          NEW
lib/s3/client.ts                                                                MODIFIED — stock-images bucket/CDN env helpers
lib/s3/stock-images.ts                                                          NEW
lib/image/crop-hero-photo.ts                                                    NEW
lib/image/resolve-hero-image.ts                                                 NEW
lib/image/__tests__/resolve-hero-image.test.ts                                 NEW
lib/ai/generate-preview.ts                                                      MODIFIED — hero resolution delegated
                                                                                     to resolveHeroImages
lib/ai/__tests__/generate-preview.test.ts                                       MODIFIED — hero tests moved to
                                                                                     resolve-hero-image.test.ts
next.config.ts                                                                  MODIFIED — stock-images CDN
                                                                                     remotePattern
app/admin/(dashboard)/AdminSidebar.tsx                                          MODIFIED — Stock Images nav entry
app/admin/(dashboard)/stock-images/page.tsx                                     NEW
app/admin/(dashboard)/stock-images/actions.ts                                   NEW
app/admin/(dashboard)/stock-images/StockImagesPanel.tsx                         NEW
app/admin/(dashboard)/businesses/PhotosForm.tsx                                 MODIFIED — hero upload hint text
app/admin/(dashboard)/businesses/[businessId]/actions.ts                        MODIFIED — hero upload auto-crop
                                                                                     + heroPhotoUrlMobileAuto
app/admin/(dashboard)/businesses/[businessId]/__tests__/actions.test.ts        MODIFIED — mock crop-hero-photo/putAsset
app/admin/(dashboard)/businesses/[businessId]/__tests__/business-details-actions.test.ts  MODIFIED — same
app/admin/(dashboard)/businesses/[businessId]/__tests__/photos-actions.test.ts  MODIFIED — same
app/admin/(dashboard)/businesses/[businessId]/__tests__/website-sections-actions.test.ts  MODIFIED — same
infra/lib/stacks/stock-images-stack.ts                                          NEW
infra/lib/stacks/vercel-access-stack.ts                                        MODIFIED — S3StockImages statement
infra/bin/webpresa.ts                                                           MODIFIED — stack wiring
infra/test/stock-images-stack.test.ts                                          NEW
infra/test/vercel-access-stack.test.ts                                        MODIFIED — S3StockImages assertion
web/docs/build_log.md                                                          MODIFIED — this entry
```

## Dev deployment (2026-07-27, same day)

Deployed `WebpresaDevStockImagesStack` and `WebpresaDevVercelAccessStack` to account
`539898341083` / `us-east-1` (profile `webpresa`), after showing account/region/
resources/`cdk diff` and getting explicit approval, per `AGENTS.md`.

A real bug was caught before this deploy: the bucket and the DynamoDB table
originally shared the short name `stock-images`, so both `WebpresaBucket` and
`WebpresaTable`'s `CfnOutput`s produced the identical export names
`webpresa-dev-stock-images-name`/`-arn` — CloudFormation would have rejected
the stack outright ("export already exists"). Confirmed via a real
`cdk synth` + inspecting `Outputs` in the synthesized template before any
deploy was attempted; fixed by renaming the table's short name to
`stock-image-metadata` (`infra/lib/stacks/stock-images-stack.ts`), and added
a regression test (`stock-images-stack.test.ts`, "never produces two
CloudFormation exports with the same name") asserting every export name in
the template is unique, so this class of bug fails fast in the test suite
next time rather than only at deploy time.

A second near-miss was caught during the pre-deploy `cdk diff`: run without
`WEBPRESA_APP_BASE_URL` set, the diff showed unrelated changes to
`WebpresaDevScreenshotStack` and `WebpresaDevScanWorkflowStack` — both would
have had their real Vercel app URL silently replaced with the synth-only
`https://REPLACE_WITH_DEV_APP_BASE_URL.invalid` placeholder had those stacks
been redeployed, breaking the screenshot Lambda's preview-capture URLs and
the scan workflow's `HttpInvoke` endpoints in production. Re-ran the diff
with `WEBPRESA_APP_BASE_URL` set to the real deployed app URL
(`https://webpresa-git-dev-andrew-mudges-projects.vercel.app`), confirming
zero differences on those two stacks before deploying only the two stacks
that actually needed to change.

Outputs from the deploy:
- `webpresa-dev-stock-images` (bucket)
- `webpresa-dev-stock-image-metadata` (table)
- `d3nlm6wbbq9owq.cloudfront.net` (CloudFront distribution domain)

Still pending: adding `STOCK_IMAGES_BUCKET_NAME`, `STOCK_IMAGES_CDN_DOMAIN`,
and `STOCK_IMAGES_TABLE_NAME` to Vercel's environment variables (manual, via
the Vercel dashboard) — needed before the app itself can read/write the new
bucket/table or resolve stock images by industry.

## Fix: missing DynamoDB grant on the stock-images table (2026-07-27, same day)

After adding the three env vars to Vercel and redeploying, the admin Stock
Images page failed with:

```
User: arn:aws:iam::539898341083:user/webpresa-vercel-dev is not authorized
to perform: dynamodb:Scan on resource:
arn:aws:dynamodb:us-east-1:539898341083:table/webpresa-dev-stock-image-metadata
because no identity-based policy allows the dynamodb:Scan action
```

Root cause: `vercel-access-stack.ts`'s `DataAccessPolicy` grants DynamoDB
access via a `tablesWithIndexes` array — the new `stock-image-metadata`
table was never added to it, even though the matching `S3StockImages`
statement for the bucket was. The `stockImagesTable` prop was missing
entirely from `WebpresaVercelAccessStackProps`.

Fix: added `stockImagesTable: dynamodb.ITable` to the props interface,
added `props.stockImagesTable` to `tablesWithIndexes` (now 6 tables instead
of 5 — `resources: tablesWithIndexes.flatMap(...)` picks it up
automatically, no new statement needed), wired
`stockImagesTable: stockImagesStack.table` from `bin/webpresa.ts`, and
updated `vercel-access-stack.test.ts`'s resource-count assertion (10 → 12
resource entries) and `buildStacks()` helper accordingly.

Deployed the fix the same way as the original deploy — `cdk diff` reviewed
first (confirmed it only added the `stock-image-metadata` table ARN +
`/index/*` to the existing `DynamoDbTables` statement, nothing else
touched), then `cdk deploy WebpresaDevVercelAccessStack` (which also pushed
one new cross-stack `Output` — the table ARN export — to
`WebpresaDevStockImagesStack` first, since `WebpresaDevVercelAccessStack`
now needs to `Fn::ImportValue` it).

### Verification

```
infra:
npm run build (tsc)  — passes
npm test             — 6 files, 141 tests passed
cdk diff             — reviewed and approved before deploy
cdk deploy WebpresaDevVercelAccessStack — succeeded
```

### Files changed

```
infra/lib/stacks/vercel-access-stack.ts   MODIFIED — stockImagesTable prop
                                              + added to tablesWithIndexes
infra/bin/webpresa.ts                     MODIFIED — stockImagesTable wiring
infra/test/vercel-access-stack.test.ts   MODIFIED — buildStacks() +
                                              resource-count assertion
                                              (10 → 12)
web/docs/build_log.md                     MODIFIED — this entry
```

## Correction: desktop and mobile hero images are independent, never cropped from each other (2026-07-27, same day)

Direct product feedback after the stock-images admin page shipped: the
Phase 1 hero-upload design was wrong. It auto-cropped a single uploaded
image into both a desktop (1920×1080) and mobile (1080×1350) variant —
both for the admin's own custom hero upload (`updatePhotosAction`'s
`heroPhotoFile` branch) and for the Stock Images admin page's "hero set"
upload (`uploadStockHeroSet`). The actual requirement: desktop and mobile
must be two **independently uploaded** images — uploading a desktop photo
must never generate or imply a mobile crop from it, and vice versa.
Clarified constraint: it's fine for mobile to simply *show* the desktop
photo as a preview when no dedicated mobile image exists — that's a
fallback-to-reuse, not a crop.

### Fix

- **Removed `lib/image/crop-hero-photo.ts` entirely** — no cropping
  anywhere in this feature anymore.
- **`updatePhotosAction`** (`businesses/[businessId]/actions.ts`) — reverted
  the `heroPhotoUrl` slot back to the same plain `uploadBusinessAsset` path
  every other slot uses. No more auto-crop, no more
  `Business.heroPhotoUrlMobileAuto` (removed from the model/schema entirely
  — this field never shipped to real data before being reverted).
- **`lib/s3/stock-images.ts`** — `uploadStockHeroSet(desktopFile, mobileFile, industry)`
  now takes two separate `File` inputs (mobile optional) and uploads each
  as-is via a new shared `uploadStockImageFile()` helper (`sharp` used only
  to read actual pixel dimensions, never to resize/crop).
- **`domain/schemas/stock-image.schema.ts`** — dropped the `.superRefine`
  that required `mobile` for `kind: 'hero'`; `mobile` is now optional
  unconditionally (a hero set may have only a desktop image).
  `domain/factories/stock-image.factory.ts`'s `createStockHeroSetInput.mobile`
  is likewise now optional.
- **`/admin/stock-images` upload form** — replaced the single "Image" file
  input with two independent inputs when `kind: 'hero'`: "Desktop image"
  (required) and "Mobile image (optional)", each posted as its own form
  field (`desktopFile`/`mobileFile`) and uploaded independently.
- **`lib/image/resolve-hero-image.ts`** — simplified the mobile-resolution
  rule uniformly across every tier: `heroPhotoUrlMobile === 'none'` forces
  no mobile photo; an explicit `heroPhotoUrlMobile` always wins; otherwise a
  tier-specific *dedicated* mobile image is used if one genuinely exists
  (only the stock tier can have one, via its own independent mobile
  upload); otherwise mobile simply reuses whatever desktop photo resolved,
  as a preview — never an independent crop, never a forced illustration
  just because no mobile-specific asset exists. This also simplified the
  Firecrawl tier, which previously (incorrectly) never offered a mobile
  preview at all.
- `PhotosForm.tsx`'s hero-photo hint text reverted to its original
  dimension-warning copy; the mobile hero field's hint updated to describe
  the new "Auto reuses the desktop photo" behavior instead of "falls back
  to the illustration."

### Verification

```
npm run lint        — passes
npx tsc --noEmit    — passes
npm test             — 64 files, 717 tests passed
npm run build        — succeeds
```

No infrastructure changed — this was entirely an application-code
correction, so no `cdk diff`/`cdk deploy` was needed.

### Files changed

```
lib/image/crop-hero-photo.ts                                                    DELETED
lib/image/resolve-hero-image.ts                                                 MODIFIED — simplified mobile rule
lib/image/__tests__/resolve-hero-image.test.ts                                 MODIFIED — rewritten for new rule
lib/s3/stock-images.ts                                                          MODIFIED — separate desktop/mobile
                                                                                     uploads, no crop
domain/models/stock-image.ts                                                    MODIFIED — doc comments
domain/schemas/stock-image.schema.ts                                            MODIFIED — mobile always optional
domain/factories/stock-image.factory.ts                                        MODIFIED — mobile optional
domain/models/business.ts                                                       MODIFIED — removed
                                                                                     heroPhotoUrlMobileAuto
domain/schemas/business.schema.ts                                              MODIFIED — removed
                                                                                     heroPhotoUrlMobileAuto
app/admin/(dashboard)/businesses/[businessId]/actions.ts                        MODIFIED — reverted
                                                                                     updatePhotosAction crop branch
app/admin/(dashboard)/businesses/PhotosForm.tsx                                MODIFIED — hint text reverted/updated
app/admin/(dashboard)/stock-images/actions.ts                                   MODIFIED — desktopFile/mobileFile
app/admin/(dashboard)/stock-images/StockImagesPanel.tsx                       MODIFIED — two file inputs
app/admin/(dashboard)/businesses/[businessId]/__tests__/actions.test.ts        MODIFIED — removed crop mocks
app/admin/(dashboard)/businesses/[businessId]/__tests__/business-details-actions.test.ts  MODIFIED — same
app/admin/(dashboard)/businesses/[businessId]/__tests__/photos-actions.test.ts  MODIFIED — same
app/admin/(dashboard)/businesses/[businessId]/__tests__/website-sections-actions.test.ts  MODIFIED — same
web/docs/build_log.md                                                          MODIFIED — this entry
```

## Stock images admin redesign: a flat photo gallery, not a dual-upload card (2026-07-27, same day)

Further direct feedback: even after removing the crop-based pairing, the
Stock Images upload UI was still "too complicated" — it presented desktop
and mobile as two fields on one card. The actual mental model wanted: a
plain photo gallery filtered **industry → hero/general → desktop/mobile**,
where admins upload a batch of photos at a time (not a paired
desktop-and-mobile set) and separately mark a default desktop photo and a
default mobile photo per industry.

### Data model change

`StockImage` no longer has `desktop`/`mobile` fields at all — every record
is exactly one uploaded image:

```ts
interface StockImage {
  stockImageId: string;
  kind: 'hero' | 'general';
  variant?: 'desktop' | 'mobile';  // required for kind:'hero', absent for 'general'
  industry?: Industry;
  image: StockImageAsset;          // s3Key/url/width/height — the one image, as uploaded
  status: 'active' | 'archived';
  isDefault: boolean;
  uploadedBy?: string;
}
```

`domain/schemas/stock-image.schema.ts`'s `.superRefine` now enforces the
`kind`↔`variant` coupling directly (variant required for `'hero'`, forbidden
for `'general'`) instead of the old desktop/mobile-pair requirement.
`domain/factories/stock-image.factory.ts` collapsed to a single
`createStockImage()` (replacing the old `createStockHeroSet`/
`createGeneralStockImage` pair).

### Independent desktop/mobile lookups, not a paired set

`lib/db/stock-images.ts`'s `getDefaultStockHeroSet(industry)` (one call
returning a desktop+mobile pair) was replaced with
`getDefaultHeroImage(industry, variant)` — two entirely independent calls.
`lib/image/resolve-hero-image.ts`'s stock tier now:

```ts
const stockDesktop = await getDefaultHeroImage(business.industry, 'desktop');
if (stockDesktop) {
  heroImageUrl = stockDesktop.image.url;
  heroStyle = isWithinHeroTolerance(...) ? 'image' : 'imageSplit';
  const stockMobile = await getDefaultHeroImage(business.industry, 'mobile'); // independent
  dedicatedMobileCandidate = stockMobile?.image.url;
} else {
  heroStyle = 'illustration'; // no desktop default → mobile is never even looked up
}
```

An industry can have a default desktop hero with no default mobile hero,
or vice versa — the two "default" flags are completely separate settings,
each set independently via its own "Set as default" action scoped to the
exact (industry, kind, variant) group.

The `industry-kind-index` GSI's partition-key value format changed from
`"{industry}#{kind}"` to `"{industry}#{kind}#{variant}"` — no infra change
was needed for this: the GSI's CDK definition only declares the attribute
name/type (String), never its value format, so this is a pure
application-layer change. Updated the doc comment in
`infra/lib/stacks/stock-images-stack.ts` for accuracy; no `cdk diff`/
`cdk deploy` required.

### Admin UI

`/admin/stock-images` is now a straightforward gallery:
- **Upload form**: pick image type (Hero image / General stock photo), then
  (for hero) desktop-or-mobile, then industry, then select a batch of
  photos (`<input type="file" multiple>`) — every file becomes its own
  independent `StockImage` record tagged with the same kind/variant/
  industry. A per-file upload failure doesn't block the rest of the batch
  (`uploadStockImagesAction` reports "Uploaded N, M failed" rather than
  all-or-nothing).
- **Gallery filters**: Industry → Type (All/Hero/General) → Desktop-or-mobile
  (only shown once "Hero images" is selected) — a strict three-level filter
  matching the lookup hierarchy above, not a flat industry-only filter.
- **Cards**: one image each (no more side-by-side desktop+mobile thumbnail),
  labeled with industry/kind/variant, with independent Set-as-default/
  Archive/Delete actions per image.

### Verification

```
web:
npm run lint         — passes
npx tsc --noEmit     — passes
npm test             — 64 files, 718 tests passed
npm run build        — succeeds (new /admin/stock-images route present)

infra:
npm run build (tsc)  — passes
npm test             — 6 files, 141 tests passed
```

No infrastructure changed — this was entirely an application-code and
data-model correction (the GSI value format change needs no CDK update),
so no `cdk deploy` was needed.

### Files changed

```
domain/models/stock-image.ts                                                    MODIFIED — flat shape,
                                                                                     StockImageAsset rename,
                                                                                     variant field
domain/schemas/stock-image.schema.ts                                            MODIFIED — kind/variant
                                                                                     superRefine
domain/factories/stock-image.factory.ts                                        MODIFIED — single
                                                                                     createStockImage()
lib/db/stock-images.ts                                                          MODIFIED — listStockImages()
                                                                                     + getDefaultHeroImage()
lib/s3/stock-images.ts                                                          MODIFIED — single
                                                                                     uploadStockImage() helper
lib/image/resolve-hero-image.ts                                                 MODIFIED — independent
                                                                                     desktop/mobile stock lookups
lib/image/__tests__/resolve-hero-image.test.ts                                 MODIFIED — rewritten for
                                                                                     independent lookups
app/admin/(dashboard)/stock-images/actions.ts                                   MODIFIED — batch upload,
                                                                                     per-file resilience
app/admin/(dashboard)/stock-images/StockImagesPanel.tsx                       MODIFIED — gallery + 3-level
                                                                                     filters
app/admin/(dashboard)/stock-images/page.tsx                                    MODIFIED — description text
infra/lib/stacks/stock-images-stack.ts                                          MODIFIED — doc comment only,
                                                                                     no resource change
web/docs/build_log.md                                                          MODIFIED — this entry
```

# Stock photo picker — hand-pick a stock photo for a specific business (Part 2) (2026-07-27, same day)

## Problem

Part 1 gave the auto hero-pick fallback chain (`lib/image/resolve-hero-image.ts`)
access to the curated stock gallery, but only as an automatic per-industry
default — an admin had no way to browse the gallery and hand-pick a
specific stock photo for one business's Desktop hero, Mobile hero, About
Us, Why Choose Us, or Featured service card slot.

## Solution

Extended the existing per-slot `PhotoPickerField` (business Photos card)
with an "Explore our stock photos" option alongside the existing "upload
your own" file input, on 5 of its 6 slots (all except Business logo — a
stock photo can't be a business's own logo). Opens a modal pre-filtered to
the right kind/variant for that slot (Hero+Desktop, Hero+Mobile, or
General) and the business's own industry, but every filter stays fully
changeable so any slot can browse the whole gallery.

Key finding confirmed during planning and borne out during implementation:
this required **zero server-action, schema, or persistence changes**.
`PhotoPickerField`'s existing `choose(value)` already treats any string as
a valid pick (it's what handles clicking one of the business's own
uploaded-photo thumbnails); `updatePhotosAction`'s `UpdatePhotosSchema`
parses every slot as a plain `z.string().optional()`, and the only
validation is `BusinessSchema`'s `PhotoSlotOverrideSchema`
(`UrlOrPathSchema` — any `https://...` URL — union `'none'`), which a
stock image's CloudFront URL already satisfies. The entire feature is one
new self-contained client component plus prop-threading through four
existing files.

- `app/admin/(dashboard)/businesses/StockPhotoPickerModal.tsx` (new) — the
  trigger button + modal. Copies `StockImagesPanel.tsx`'s exact 3-level
  filter (industry → hero/general → desktop/mobile-if-hero) and card visual
  style, but cards are plain click-to-select buttons (a new local
  `SelectableStockImageCard`, not a reuse of the admin gallery's
  action-button-laden card). Overlay/close pattern copied from
  `DeleteBusinessRowButton.tsx` (click-outside-to-close), plus an added
  Escape-key handler and explicit close button since this modal is much
  larger (a full photo grid, not a small confirm dialog). No focus-trap
  library added — matches this repo's existing no-dependency convention for
  its other plain-div dialogs.
- `FormFields.tsx`'s `PhotoPickerField` gained one optional prop,
  `stockPhotos?: { images, initialKind, initialVariant?, defaultIndustry? }`
  — renders the modal wired to the field's own `choose` function when
  present. Passing `onSelect={choose}` directly means a stock pick
  triggers the exact same `onChange` callback a thumbnail click already
  does, so `PhotosForm.tsx`'s live hero-dimension-warning box updates
  correctly for a stock-picked desktop hero with no extra wiring.
- `PhotosForm.tsx` gained a `stockImages: StockImage[]` prop, wired into 5
  of its 6 `PhotoPickerField` calls (not the logo).
- Both Server Component call sites
  (`businesses/[businessId]/page.tsx`,
  `businesses/[businessId]/onboarding/photos/page.tsx`) now also fetch
  `(await listAllStockImages()).filter((img) => img.status === 'active')`
  and pass it down — filtering at the fetch site (not inside the new
  component) keeps the component's contract simple and matches this
  repo's convention of never passing raw unfiltered DB reads into client
  components.

## Local dev environment gap found and fixed

Manually verifying against the real dev business data (via a minted admin
session JWT + `curl`, since no browser-automation tooling — no
`chromium-cli`, no installable Playwright — is available in this sandbox)
surfaced a real gap: `STOCK_IMAGES_BUCKET_NAME`/`STOCK_IMAGES_CDN_DOMAIN`/
`STOCK_IMAGES_TABLE_NAME` were added to Vercel's environment variables when
Part 1 deployed, but never to local `web/.env.local` — any local
`npm run dev` session would 500 on any page calling `listAllStockImages()`
with `STOCK_IMAGES_TABLE_NAME environment variable is not set`. Added all
three (matching the real deployed values) to `.env.local`.

## Verification

```
npm run lint         — passes
npx tsc --noEmit     — passes
npm test             — 64 files, 718 tests passed (unchanged — no
                         server-side logic touched)
npm run build        — succeeds
```

Manual: started the real dev server against the real dev DynamoDB/S3 (via
a minted admin session JWT, since sign-in requires the plaintext password
this session doesn't have), fetched several real business detail pages via
`curl`. Confirmed: pages render 200 with no server errors; the new picker
button appears exactly 5 times per business that has uploaded photos (one
per intended slot: Desktop hero, Mobile hero, About Us, Why Choose Us,
Featured service card), and zero times for the Business logo slot;
businesses with no uploaded photos correctly show no Photo Assignment
section at all (pre-existing behavior, unrelated to this change).
**Not verified**: the actual in-browser modal interaction (opening,
changing filters, clicking a photo, confirming the save round-trip and
`/b/[slug]` rendering) — no headless-browser tooling was available in this
sandbox to drive it. This should be spot-checked in a real browser before
considering the feature fully confirmed.

## Files changed

```
app/admin/(dashboard)/businesses/StockPhotoPickerModal.tsx              NEW
app/admin/(dashboard)/businesses/FormFields.tsx                         MODIFIED — stockPhotos prop
                                                                            on PhotoPickerField
app/admin/(dashboard)/businesses/PhotosForm.tsx                         MODIFIED — stockImages prop,
                                                                            wired into 5 slots
app/admin/(dashboard)/businesses/[businessId]/page.tsx                  MODIFIED — fetch + pass
                                                                            stockImages
app/admin/(dashboard)/businesses/[businessId]/onboarding/photos/page.tsx MODIFIED — same
.env.local                                                              MODIFIED — added
                                                                            STOCK_IMAGES_* vars
                                                                            (local dev only)
web/docs/build_log.md                                                   MODIFIED — this entry
```

# Stage 17 — Website Claim Flow

## Scope

Full implementation per the rewritten Stage 17 section of `implementation.md` (rewritten across two prior sessions: a v1 research/proposal, then a v2 revision addressing eleven architecture-review points — see that file and `web/docs/architecture.md`/`deployment.md` for the up-to-date spec). A business represented by a mailed postcard (or an admin-issued link) proves control of a single random claim token, authenticates via a Cognito-backed customer account, and reserves ownership of the canonical `Business` record — an authenticated, pre-payment state that Stage 18 will hand off into Stripe Checkout. No manual verification, no admin approval queue, no dashboard access before payment.

The single biggest departure from a naive "clone the admin's scrypt+JWT pattern" implementation is customer identity: this stage introduces an Amazon Cognito User Pool for customer accounts, not a second hand-rolled password store. That decision (and the ten others reviewed alongside it — multi-business ownership, a signed claim-attempt cookie, dropping a speculative `requireActiveSubscription()` stub, an admin ownership-recovery workflow, a three-state claim banner, folding rate-limiting into the Claims table instead of a dedicated table, never persisting a reconstructable claim token, and keeping customer identity structurally decoupled from business deletion) is documented in full in the plan file this session worked from, not repeated here — this entry covers what was actually built and any implementation-time refinements.

## Domain model

- `domain/models/claim.ts` (new) + `domain/schemas/claim.schema.ts` (new) + `domain/factories/claim.factory.ts` (new) — `Claim` (`claim_<uuid>`), `CLAIM_STATUSES = ['issued','consumed','expired','revoked']`. `tokenHash` is a 64-hex-char HMAC-SHA256 digest — the schema regex-enforces this shape, so a claim record can never accidentally carry anything else. Status models token lifecycle only, never ownership.
- `domain/models/business.ts` / `.schema.ts` — additive-only `ownerUserId?` (a Cognito `sub`) and `claimedAt?`. No other Business field touched; `status`, `stripeCustomerId`, `stripeSubscriptionId` are all Stage 18's.
- **No `CustomerAccount` model exists** — Cognito is the customer directory; the app never stores a customer password or account row.

## Persistence

- `lib/db/claims.ts` (new) — `getClaimById`, `listClaimsForBusiness` (business-id-index), `putClaim`, `revokeClaim` (conditional, `issued→revoked` only), `deleteClaimById`, and the two pieces doing the real work:
  - `getClaimByTokenHashWithLazyExpiry` — looks up by `token-hash-index`, lazily flips `issued→expired` via a conditional `UpdateCommand` when `expiresAt` has passed (never a DynamoDB TTL deletion — claim history is preserved indefinitely). A lost race against a concurrent consume is handled by re-reading the claim rather than throwing.
  - `consumeClaim` — this codebase's first `TransactWriteItems` call: one `Update` on Claims (`status='issued' AND expiresAt > now`) and one `Update` on Businesses (`attribute_not_exists(ownerUserId)`) in a single transaction. On `TransactionCanceledException`, re-reads the Claim to distinguish "this exact user already consumed it" (idempotent double-submit → success) from any other conflict.
  - `checkAndIncrementRateLimit` / `buildRateLimitKey` — rate-limit counters live as a distinct item shape in the *same* Claims table (`PK = RATELIMIT#<ipHash>#<windowBucket>`), not a dedicated table. The conditional increment is `attribute_not_exists(#count) OR #count < :limit` — not a bare comparison — so the first request in a new window creates the counter instead of throwing. A new `ttl` (epoch-seconds) attribute cleans these counter items up; real Claim records never populate it.
  - `isClaimUsable` — a plain, side-effect-free predicate (`status==='issued' && expiresAt` not yet passed) factored out so `/claim/continue`'s Server Component doesn't call `Date.now()` inline itself (React's `react-hooks/purity` lint rule flags impure calls made directly in component bodies — this was caught by `npm run lint`, not anticipated in the plan).
- `lib/db/businesses.ts` — added `getBusinessesByOwnerUserId` (queries `owner-user-id-index`, **not** unique per user — a customer may own several businesses) and `releaseOwnership` (conditional `REMOVE ownerUserId, claimedAt`, admin-only recovery path).
- `lib/db/client.ts` — added `TABLE_CLAIMS`.

## Claim-token generation and hashing

- `lib/claim/token.ts` (new) — `generateClaimToken` (160-bit `crypto.randomBytes(20)`, Crockford Base32, dash-grouped in fours — 32 characters / 8 groups, longer than the plan's illustrative 16-character example since that was shorthand, not a literal spec), `normalizeClaimToken` (strip dashes/whitespace, uppercase), `hashClaimToken` (HMAC-SHA256 keyed by a new `webpresa-{env}-claim-token` Secrets Manager secret), and `generateAndHashClaimToken` (the admin action's single entry point — the raw token exists only in the value returned from this call, never persisted).
- `lib/claim/banner-state.ts` (new) — `getClaimBannerState(business)` → `'unclaimed' | 'claimed_pending' | 'active'`, derived from `ownerUserId` alone. The `'active'` branch is intentionally unreachable until Stage 18 supplies real subscription data into the same function.
- `lib/claim/validate-token.ts` (new) — the entrypoint-agnostic core shared by `GET /claim/[claimToken]` and the `POST /claim` manual-entry action: rate-limits, normalizes/hashes, looks up with lazy expiry, and returns `'invalid' | 'valid' | 'resume'`. `hashIp` (SHA-256) means raw IPs are never stored in rate-limit keys.

## Customer authentication — Amazon Cognito, not a second scrypt store

- `infra/lib/constructs/webpresa-user-pool.ts` (new) — `WebpresaUserPool`: one Cognito User Pool (`selfSignUpEnabled`, `signInAliases: { email: true }`, `autoVerify: { email: true }`, `accountRecovery: EMAIL_ONLY`, `mfa: OFF`) and one User Pool Client (`generateSecret: false` — no `SECRET_HASH` needed; `authFlows: { userPassword: true }` — **required explicitly**, CDK's default `authFlows` does not include `USER_PASSWORD_AUTH`). No Lambda triggers. Wired into `data-stack.ts` as `customerUserPool`/`customerUserPoolClient`.
- `lib/auth/customer-cognito.ts` (new) — thin, error-mapping wrappers around `SignUpCommand`/`ConfirmSignUpCommand`/`ResendConfirmationCodeCommand`/`InitiateAuthCommand`/`ForgotPasswordCommand`/`ConfirmForgotPasswordCommand`/`ListUsersCommand` from the new `@aws-sdk/client-cognito-identity-provider` dependency. Every Cognito exception maps to a small generic reason code (`email_taken`, `weak_password`, `needs_confirmation`, `invalid_credentials`, `rate_limited`, `unknown`, …) — no Cognito-specific error string ever reaches a Server Action's return value. `signInCustomer` decodes `sub`/`email` directly from the `InitiateAuth` response's ID token payload (no second signature check needed — it's a direct, trusted server-to-server AWS response, not client input). `adminGetCustomerEmailBySub` uses `ListUsers` with a `sub` filter (not `AdminGetUser`, since the Cognito-assigned Username isn't necessarily the `sub`) for the admin ownership-release UI, guarded by a sub-shape regex before ever calling AWS.
- `lib/auth/customer-session.ts` (new) — structurally identical to the admin's `session.ts`: `jose`-signed JWT, cookie `webpresa_customer_session`, its own `CUSTOMER_SESSION_SECRET` so an admin session can never verify as a customer session or vice versa.
- `lib/auth/claim-attempt.ts` (new) — the signed, purpose-scoped, 15-minute `webpresa_claim_attempt` cookie (`CLAIM_ATTEMPT_SECRET`, its own secret again). Deliberately pure sign/verify only (mirrors `lib/capture-token.ts`) — cookie get/set is left to each call site since the Route Handler and the Server Action entry points use different cookie APIs.
- `lib/auth/customer-authorization.ts` (new) — `requireCustomerSession` + `requireBusinessOwnership` only. **No `requireActiveSubscription()` stub** — there's no dashboard route in this stage for one to protect; Stage 18 defines it from its own real requirements.
- `lib/auth/customer-actions.ts` (new) — `customerSignInAction`/`customerSignOutAction` for the resume-checkout path (a returning owner signing in directly, without a fresh claim token). Redirect target is allowlisted to `/account/*` — no open redirect.
- `proxy.ts` — extended with a second, fully parallel branch for `/account/:path*`, alongside the untouched `/admin/:path*` branch. `/claim/*` is deliberately not proxy-protected — it's gated by the claim-attempt cookie at the page/route level instead.

## Routes

- `GET /claim/[claimToken]` (`app/claim/[claimToken]/route.ts`, new) — a Route Handler, not a page component (only Route Handlers/Server Actions can set cookies and redirect from a single request). Sets `Referrer-Policy: no-referrer` and the signed claim-attempt cookie on success; redirects to `/claim?error=1` on any invalid/expired/revoked/consumed-by-someone-else outcome (never distinguished), or straight to `/account/claim-status` on an idempotent resume.
- `GET /claim` + `POST` action (`app/claim/page.tsx`, `ClaimTokenForm.tsx`, new) — manual code entry, same validation path.
- `GET, POST /claim/continue` (`app/claim/continue/page.tsx`, `ClaimContinueForm.tsx`, `app/claim/actions.ts`, new) — sign-up-or-sign-in scoped to the claim-attempt cookie. Cognito's self-service sign-up requires email confirmation before `InitiateAuth` succeeds (`UserNotConfirmedException` otherwise) — not explicitly called out in the plan, discovered while implementing — so this flow has a real confirm-code step: sign-up → Cognito emails a code → confirm (the password is carried through as client-side React state into the confirm form's hidden field, never round-tripped through a server response) → `InitiateAuth` → the shared `completeClaimAttempt` helper runs `consumeClaim` and establishes the session. Sign-in hits the same `completeClaimAttempt` helper directly.
- `GET /account/sign-in` + `GET /account/claim-status` (new) — the resume-checkout path and Stage 17's one protected screen. `claim-status` is business-scoped via `getBusinessesByOwnerUserId` (supports owning more than one business) and ships as an informational-only "activate (coming soon)" placeholder — there's nothing for it to call yet, and building even a stub Checkout call would encroach on Stage 18.

## Public preview banner

`isClaimed: boolean` (previously `business.status === 'active'`) is replaced end-to-end with `claimBannerState: ClaimBannerState` — threaded through `app/b/[slug]/page.tsx` → `template/index.tsx` → `SectionRenderContext` (`section-registry.tsx`) → `ClaimBanner.tsx` (now three-way: unclaimed CTA / softer "claimed, activation pending" message / hidden entirely at `'active'`) and `GeneratedSiteFooter.tsx` (its `isClaimed` boolean is now derived locally as `claimBannerState === 'active'` — the "Website by Webpresa" credit only disappears once genuinely paid, not merely claimed). SEO `noindex`/`index` in `generateMetadata` is untouched — still `business.status === 'active'`, renamed to `isIndexable` locally to make the deliberate non-relationship to ownership explicit.

## Admin

- `app/admin/(dashboard)/businesses/[businessId]/actions.ts` — added `generateClaimLinkAction` (returns the raw token once), `revokeClaimAction`, `releaseOwnershipAction` (looks up the current owner's email via `adminGetCustomerEmailBySub` before clearing ownership, for the confirmation UI). `deleteBusinessAction`'s existing cascade (previews, scans, postcards) now also deletes that business's Claims.
- `ClaimSection.tsx` (new) — added to the business detail page's meta-info grid: shows current owner (email if resolvable, else the raw `sub`) + claimed-at, a "Release ownership" button, "Generate claim link" (the one-time-reveal code, in an amber warning box), and claim history with per-issued-claim revoke.

## Infrastructure (CDK)

- `infra/lib/constructs/webpresa-table.ts` — added an optional `timeToLiveAttribute` prop, default unset (every existing table's CDK output is unaffected; confirmed via `cdk diff` showing zero changes to any table but Businesses/Claims).
- `infra/lib/stacks/data-stack.ts` — new `claims` table (6th table; PK `claimId`; GSIs `token-hash-index`, `business-id-index`; TTL attribute `ttl`, populated only by rate-limit counter items); new `owner-user-id-index` GSI on the existing `businesses` table (PK `ownerUserId`, SK `claimedAt` — **not** `createdAt`, since this sorts by claim date); new `claim-token` secret (9th secret); new `WebpresaUserPool` construct instantiated as `customerUserPool`/`customerUserPoolClient`.
- `infra/lib/stacks/vercel-access-stack.ts` — added `claimsTable` to the existing table-ARN grant loop, `claimTokenSecret` to the Secrets Manager grant, and a new minimal `CognitoCustomerAuth` statement (`SignUp`, `ConfirmSignUp`, `ResendConfirmationCode`, `InitiateAuth`, `ForgotPassword`, `ConfirmForgotPassword`, `ListUsers` — no wildcard, no `Admin*` actions) scoped to the User Pool ARN.
- `infra/bin/webpresa.ts` — passes `claimsTable`, `claimTokenSecret`, `customerUserPool` through to the Vercel access stack.
- `cdk diff WebpresaDevDataStack` confirmed purely additive: one new table, one new User Pool + Client, one new secret, and an in-place (non-replacing) GSI addition to the existing Businesses table — no resource replacement, no destructive change. **Not deployed** — per the standing deployment gate, this stage only synthesizes/diffs; a real `cdk deploy` requires separate explicit approval.

## Environment / dependencies

- New env vars (`.env.local.example`): `CLAIMS_TABLE_NAME`, `CLAIM_TOKEN_SECRET_NAME`, `COGNITO_USER_POOL_ID`, `COGNITO_USER_POOL_CLIENT_ID`, `CUSTOMER_SESSION_SECRET`, `CLAIM_ATTEMPT_SECRET`.
- New dependency: `@aws-sdk/client-cognito-identity-provider` (`web/package.json`).

## Verification

```
npm run lint         — passes (one finding along the way: react-hooks/purity
                         flagged a direct Date.now() call in the
                         /claim/continue Server Component — fixed by
                         factoring the check into lib/db/claims.ts's
                         isClaimUsable(), see Persistence above)
npx tsc --noEmit     — passes
npm test             — 71 files, 793 tests passed
npm run build        — succeeds; all new routes registered
                         (/claim, /claim/[claimToken], /claim/continue,
                         /account/sign-in, /account/claim-status)

cd ../infra
npm test             — 6 files, 153 tests passed
npx tsc -p . --noEmit — passes
npx cdk synth --profile webpresa       — succeeds
npx cdk diff WebpresaDevDataStack --profile webpresa
                     — additive only (see Infrastructure above)
npx cdk diff WebpresaDevVercelAccessStack --profile webpresa
                     — reviewed, no destructive changes
```

**Not verified**: no real AWS deployment exists yet (no Cognito User Pool, no `claims`/rate-limit table, no populated `claim-token` secret) and no headless-browser tooling is available in this sandbox, so the full claim flow (scan/paste a token → sign up → confirm code → ownership reserved → `/account/claim-status`) has not been exercised end-to-end against real infrastructure. Unit/integration tests mock every AWS boundary; `cdk synth`/`diff` confirm the infrastructure is well-formed and additive, not that it behaves correctly once deployed. This should be deployed to dev and walked through manually (including the Cognito email-confirmation round trip) before relying on it.

## Files changed

```
domain/models/claim.ts                                                  NEW
domain/schemas/claim.schema.ts                                          NEW
domain/factories/claim.factory.ts                                       NEW
domain/models/business.ts                                               MODIFIED — ownerUserId/claimedAt
domain/schemas/business.schema.ts                                       MODIFIED — same
domain/__tests__/stage17.test.ts                                        NEW

lib/db/claims.ts                                                        NEW
lib/db/businesses.ts                                                    MODIFIED — owner GSI query,
                                                                            releaseOwnership
lib/db/client.ts                                                        MODIFIED — TABLE_CLAIMS
lib/db/__tests__/claims.test.ts                                         NEW
lib/db/__tests__/businesses.test.ts                                     MODIFIED — new tests

lib/claim/token.ts                                                      NEW
lib/claim/banner-state.ts                                               NEW
lib/claim/validate-token.ts                                             NEW
lib/claim/__tests__/token.test.ts                                       NEW
lib/claim/__tests__/validate-token.test.ts                              NEW

lib/auth/customer-cognito.ts                                           NEW
lib/auth/customer-session.ts                                           NEW
lib/auth/claim-attempt.ts                                              NEW
lib/auth/customer-authorization.ts                                     NEW
lib/auth/customer-actions.ts                                           NEW
lib/auth/__tests__/customer-cognito.test.ts                            NEW
lib/auth/__tests__/customer-session.test.ts                            NEW
lib/auth/__tests__/claim-attempt.test.ts                                NEW

lib/secrets/client.ts                                                   MODIFIED — SECRET_CLAIM_TOKEN
lib/secrets/index.ts                                                    MODIFIED — getClaimTokenSecret

proxy.ts                                                                MODIFIED — /account branch

app/claim/actions.ts                                                    NEW
app/claim/page.tsx                                                      NEW
app/claim/ClaimTokenForm.tsx                                            NEW
app/claim/[claimToken]/route.ts                                        NEW
app/claim/continue/page.tsx                                             NEW
app/claim/continue/ClaimContinueForm.tsx                                NEW
app/account/sign-in/page.tsx                                            NEW
app/account/sign-in/SignInForm.tsx                                      NEW
app/account/claim-status/page.tsx                                       NEW

app/b/[slug]/page.tsx                                                   MODIFIED — claimBannerState,
                                                                            isIndexable
app/b/[slug]/ClaimBanner.tsx                                            MODIFIED — three states
app/b/[slug]/template/index.tsx                                         MODIFIED — claimBannerState prop
app/b/[slug]/template/section-registry.tsx                              MODIFIED — same
app/b/[slug]/template/GeneratedSiteFooter.tsx                           unchanged (still isClaimed boolean,
                                                                            derived at the call site)

app/admin/(dashboard)/businesses/[businessId]/actions.ts                MODIFIED — claim link/revoke/
                                                                            release actions, cascade delete
app/admin/(dashboard)/businesses/[businessId]/page.tsx                  MODIFIED — ClaimSection wired in
app/admin/(dashboard)/businesses/[businessId]/ClaimSection.tsx          NEW
app/admin/(dashboard)/businesses/[businessId]/__tests__/actions.test.ts MODIFIED — mock new imports
app/admin/(dashboard)/businesses/[businessId]/__tests__/business-details-actions.test.ts MODIFIED — same
app/admin/(dashboard)/businesses/[businessId]/__tests__/photos-actions.test.ts MODIFIED — same
app/admin/(dashboard)/businesses/[businessId]/__tests__/website-sections-actions.test.ts MODIFIED — same

infra/lib/constructs/webpresa-table.ts                                  MODIFIED — timeToLiveAttribute
infra/lib/constructs/webpresa-user-pool.ts                              NEW
infra/lib/stacks/data-stack.ts                                          MODIFIED — claims table,
                                                                            owner-user-id-index GSI,
                                                                            claim-token secret,
                                                                            customer User Pool
infra/lib/stacks/vercel-access-stack.ts                                 MODIFIED — claims/secret/Cognito
                                                                            grants
infra/bin/webpresa.ts                                                   MODIFIED — pass-through props
infra/test/data-stack.test.ts                                           MODIFIED — new assertions
infra/test/vercel-access-stack.test.ts                                  MODIFIED — new assertions

web/.env.local.example                                                  MODIFIED — new env vars
web/package.json                                                        MODIFIED — Cognito SDK dependency
web/docs/implementation.md                                              MODIFIED — Stage 17/18/19
                                                                            (earlier sessions)
web/docs/build_log.md                                                   MODIFIED — this entry
```

---

# Stage 18 — Stripe Subscriptions

## Scope

Full implementation per the rewritten Stage 18 section of `implementation.md` (the rewrite itself, and a subsequent revision incorporating six required changes from architecture review, were done in prior planning sessions — see that file and `web/docs/architecture.md`/`deployment.md` for the up-to-date spec). An authenticated customer who owns a claimed (Stage 17) but unpaid Business chooses a Webpresa plan (Basic `$39/month` or Growth `$79/month`), pays through Stripe Checkout, and gets dashboard entitlement unlocked automatically once Stripe confirms payment through a verified webhook — never from the browser redirect, a query parameter, or `ownerUserId` alone.

The single biggest departure from a naive "Business.stripeCustomerId reuse" implementation is `CustomerBillingProfile` — a new, minimal per-Cognito-customer record (`userId → stripeCustomerId`) that makes Stripe-Customer creation atomic per customer via a conditional `PutItem`, rather than scanning a customer's other owned Businesses (which has no atomic "does one already exist" check and risks creating two Stripe Customers under concurrent first-checkouts). That decision — and the others reviewed alongside it (a checked-live pending-Checkout-Session reuse pattern instead of a coarse time-bucketed idempotency key, `trialing` mapping to no entitlement rather than `active`, snapshot-first webhook reconciliation instead of `event.created`-gated writes, a `billingPurpose` metadata boundary reserved for a future domain-billing feature, and renaming the entitlement helper to `requireBusinessAccess`/`requireActiveSubscription`) — is documented in full in the approved planning session, not repeated here; this entry covers what was actually built.

## Domain model

- `domain/constants/plans.ts` (new) — `WEBPRESA_PLANS = ['basic', 'growth']`, `SUBSCRIPTION_STATUSES = ['active', 'past_due', 'canceled']`, `BILLING_PURPOSES = ['website_subscription', 'domain_purchase', 'domain_renewal']` (only `'website_subscription'` is ever created by this stage — the other two are reserved for a future domain-connection stage).
- `domain/models/customer-billing-profile.ts` (new) + `domain/schemas/customer-billing-profile.schema.ts` (new) — `CustomerBillingProfile { userId, stripeCustomerId, createdAt, updatedAt }`. No factory — no generated ID or status; the repository's create function is a conditional `PutItem`, not a validate-and-generate factory.
- `domain/models/business.ts` / `.schema.ts` — additive-only Stage 18 fields: `plan`, `subscriptionStatus`, `stripeRawStatus`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `lastStripeEventId`/`lastStripeEventAt`/`lastStripeSyncAt` (diagnostics only — explicitly do **not** gate whether a webhook-driven write is applied; the write is always an idempotent snapshot of current Stripe truth), `pendingCheckoutSessionId`/`pendingCheckoutExpiresAt`, `termsVersion`/`acceptedTermsAt` (latest acceptance only, not a permanent history). `stripeSubscriptionId` (Stage 5/17 placeholder) is populated for the first time by this stage; `stripeCustomerId` becomes a denormalized display copy of `CustomerBillingProfile.stripeCustomerId`, never independently authoritative.

## Persistence

- `lib/db/customer-billing.ts` (new) — `getCustomerBillingProfile(userId)` (direct `GetItem`), `createCustomerBillingProfile(userId, stripeCustomerId)` (conditional `PutItem`, `attribute_not_exists(userId)`; on a lost race, re-reads and returns the winning row rather than throwing — the caller discards the Stripe Customer it just created).
- `lib/db/businesses.ts` — added `getBusinessByStripeSubscriptionId` (queries the new `stripe-subscription-id-index` GSI). No new dedicated "update subscription state" function — webhook reconciliation and Checkout-session bookkeeping both reuse the existing generic `updateBusiness()` read-merge-write helper, since the design calls for an unconditional idempotent snapshot write, not a conditional one.
- `lib/db/client.ts` — added `TABLE_CUSTOMER_BILLING_PROFILES`.

## Stripe integration

- `lib/stripe/client.ts` (new) — singleton Stripe SDK client, pins an explicit `apiVersion` (`2026-06-24.dahlia`, matching the installed `stripe@22.3.2` package's own default) rather than drifting with Stripe's account-level default.
- `lib/stripe/plans.ts` (new) — `resolvePriceId(plan)` (env-var-backed, throws on missing config) and `resolvePlanFromPriceId(priceId)` (reverse lookup for webhook-driven plan-change detection).
- `lib/stripe/status-mapping.ts` (new) — `mapStripeStatusToAppStatus` (the Stripe-status → app-status table, `trialing` deliberately mapped to no entitlement with a logged anomaly rather than `active`) and `mapStripeSubscriptionToAppState` (the full snapshot-reconciliation function, reading `current_period_end` off the subscription's first item per this API version's shape, not off the subscription object itself).
- `lib/stripe/metadata.ts` (new) — `buildTrustedMetadata`/`extractBusinessId`/`extractBillingPurpose`/`resolveRuntimeEnvironment` — every Checkout Session/Subscription this stage creates carries `businessId`, `ownerUserId`, `plan`, `billingPurpose: 'website_subscription'`, `environment`, and (optionally) `claimId`/`termsVersion`/`acceptedTermsAt`, all resolved server-side, never from browser input.
- No Stripe Products/Prices created from CDK or from this session — that's a one-time, manual, test-mode Stripe Dashboard/CLI step, not yet performed (see "Not verified" below).

## Entitlement authorization

`lib/auth/customer-authorization.ts` — added `requireBusinessAccess(userId, businessId)` (returns `{ mode: 'full' | 'billing_recovery' | 'none', plan? }`, built on Stage 17's `requireBusinessOwnership`) and `requireActiveSubscription` (a thin wrapper redirecting unless `mode === 'full'`). Named `requireBusinessAccess` rather than `requireActiveSubscription` as the primary helper because it deliberately also admits `'past_due'` as a restricted mode — a name implying "active only" would be misleading. No `requirePlanCapability()` stub was added — the future boundary is documented in a code comment only, following the same "no speculative interface" principle Stage 17 already applied to this file.

## Checkout and Customer Portal

- `app/account/checkout/actions.ts` (new) — `createCheckoutSessionAction` (plan-gated against `WEBPRESA_PLANS`, ownership-gated via `requireBusinessOwnership`, guards against creating a second Checkout for an already-`active`/`past_due` Business by redirecting to the Portal instead, resolves/creates the customer's one Stripe Customer via `CustomerBillingProfile`, checks any `pendingCheckoutSessionId` live against Stripe before creating a fresh Session, uses a fresh single-use `crypto.randomUUID()` idempotency key per creation call) and `createBillingPortalSessionAction` (resolves the Stripe Customer exclusively from `CustomerBillingProfile`, never from `Business.stripeCustomerId` or any client input).
- `app/api/webhooks/stripe/route.ts` (new) — this repo's first Route Handler needing raw-body access (`await request.text()` before any parsing). Verifies the Stripe signature, checks an explicit event allowlist (`checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`), checks `billingPurpose === 'website_subscription'` (ignoring anything else — the boundary protecting website entitlement from a future domain-purchase/renewal event), resolves the target Business via metadata with a `stripe-subscription-id-index` GSI fallback, always re-fetches the current Subscription from the Stripe API, and writes the resulting snapshot unconditionally — safe to repeat on duplicate/out-of-order delivery by construction, not by event-ordering logic.

## Routes and UI

- `/account/claim-status` (existing, Stage 17 — extended) — the disabled "Activate (coming soon)" placeholder is replaced with a real `PlanSelectionForm` (Basic/Growth radio + required terms checkbox) for unpaid/canceled businesses, live plan/status display plus a "Manage billing" button for `active`, and a billing-recovery banner plus "Update payment method" button for `past_due`.
- `app/account/claim-status/PlanSelectionForm.tsx` (new, client component) — `useActionState(createCheckoutSessionAction, undefined)`, matching this repo's existing form-action convention (`SignInForm.tsx`, `ClaimTokenForm.tsx`).
- `/account/checkout/success` (new) — reads `?business=` for display/lookup only (never trusted for activation), re-checks ownership via `requireBusinessOwnership` (so a guessed/reused URL for another business/customer 404s), shows "payment processing" with bounded client-side polling (`AutoRefresh.tsx`, ~1 minute, then stops) until `subscriptionStatus === 'active'`, then "payment confirmed."
- `/account/checkout/canceled` (new) — simple "no charge was made" page.

## Infrastructure (CDK)

- `infra/lib/stacks/data-stack.ts` — new `customer-billing-profiles` table (7th table; PK `userId`, no GSI — every lookup is a direct `GetItem`); new `stripe-subscription-id-index` GSI on the existing `businesses` table (PK `stripeSubscriptionId`, sparse/high-cardinality). No new secret — the existing `webpresa-{env}-stripe` secret (Stage 10) is reused, still holding only its placeholder values.
- `infra/lib/stacks/vercel-access-stack.ts` — added `customerBillingProfilesTable` to the existing table-ARN grant loop. No new IAM statement needed for the new Businesses GSI — the existing `DynamoDbTables` statement already grants `${table.tableArn}/index/*` as a wildcard.
- `infra/bin/webpresa.ts` — passes `customerBillingProfilesTable` through to the Vercel access stack.

## Environment / dependencies

- New env vars (`.env.local.example`): `CUSTOMER_BILLING_PROFILES_TABLE_NAME`, `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_GROWTH`, `WEBPRESA_APP_BASE_URL` (a separate `web/`-runtime copy of the existing infra-side shell variable of the same name), `TERMS_VERSION`.
- New dependency: `stripe` (`web/package.json`, `^22.3.2`).

## Verification

```
npm run lint         — passes
npx tsc --noEmit     — passes
npm test             — 78 files, 863 tests passed
npm run build        — succeeds; all new routes registered
                         (/account/checkout/success, /account/checkout/canceled,
                         /api/webhooks/stripe; /account/claim-status extended)

cd ../infra
npm test             — 6 files, 156 tests passed (2 pre-existing assertions
                         updated for the new table: CloudFormation output
                         count 25→27, GSI-projection check scoped to skip
                         tables with no GSI at all)
npx tsc -p . --noEmit — passes
npx cdk synth --profile webpresa       — succeeds
npx cdk diff WebpresaDevDataStack --profile webpresa
                     — additive only: +1 table (customer-billing-profiles),
                       +1 GSI on businesses (stripe-subscription-id-index,
                       in-place, non-replacing)
npx cdk diff WebpresaDevVercelAccessStack --profile webpresa
                     — additive only: DataAccessPolicy gains 2 resource ARNs
                       (the new table + its /index/*), no new IAM actions
```

**Deployed to dev 2026-07-29.** `WebpresaDevDataStack` and `WebpresaDevVercelAccessStack` both deployed successfully (account `539898341083`, `us-east-1`) — verified directly via the `cdk deploy` output (`webpresa-dev-customer-billing-profiles` table created, `stripe-subscription-id-index` GSI added to `webpresa-dev-businesses`, `DataAccessPolicy` managed policy updated). No other stack changed.

## Stripe test-mode setup, via CLI (2026-07-30)

Done entirely from the Stripe CLI (`npx --yes @stripe/cli`, `--api-key` per command — no `stripe login`/browser device-auth needed, no global npm install required) rather than the Dashboard, at the user's request, so the identical command sequence becomes the literal recipe for production later. See `deployment.md`, "Stripe setup via CLI," for the full documented sequence.

- **Products/Prices created** (test mode): Webpresa Basic — `prod_UyhGxurnBPRcHr` / `price_1TyjryHTxTryrfUCNCT4A9Yn` ($39/month); Webpresa Growth — `prod_UyhHfa45APnAP8` / `price_1TyjsnHTxTryrfUCMeAT0q3K` ($79/month).
- **Webhook endpoint created**: `we_1Tyjx9HTxTryrfUCIhukeWAG`, listening for `checkout.session.completed`, `customer.subscription.created`/`updated`/`deleted`, `invoice.payment_failed`.
- **Vercel Deployment Protection blocker, found and fixed**: this `dev` deployment's Deployment Protection redirects every unauthenticated request — confirmed directly via `curl -X POST .../api/webhooks/stripe` → `302` to `vercel.com/sso-api` — which would have silently broken every webhook delivery. Fixed per Vercel's own documented pattern for exactly this case (third-party webhook senders that can't set custom headers): append the existing `webpresa-dev-vercel-protection-bypass` secret (Stage 14) as a `?x-vercel-protection-bypass=` query parameter on the registered webhook URL, rather than the HTTP-header method Playwright uses. This is stateless per-request (no cookie/session needed, unlike the human-browser case documented under Stage 17's Vercel-protection note) and has zero effect on this app's own signature verification, which only ever reads the raw body + `Stripe-Signature` header.
- **`webpresa-dev-stripe` secret populated** with the real test-mode `secretKey`/`webhookSecret`.
- **Verified live end-to-end**: `stripe trigger checkout.session.completed` produced a real event whose `pending_webhooks` count dropped to `0` — confirming Stripe delivered it through the Vercel bypass to the real deployed handler and got a `200` back.
- **Known gap**: this proves webhook connectivity and signature verification against the real deployment, but does not exercise a real Business flipping to `active` (would require creating throwaway test Business/Cognito records in the real dev tables — deliberately not done without asking first) or the actual hosted-Checkout redirect UX (needs a real browser click-through with a test card, which no environment running this session had).
- **Still needed**: the new Vercel environment variables (`CUSTOMER_BILLING_PROFILES_TABLE_NAME`, `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_GROWTH`, `WEBPRESA_APP_BASE_URL`, `TERMS_VERSION`) have not been added to the Vercel project (no Vercel CLI/token available in the environment that ran this setup) — the user was given the exact values to add.
- **Security note**: the user pasted two live `sk_test_...` secret keys and the Vercel bypass secret's value appeared unmasked in one command's output during this session — the user was advised to roll all of these in their respective dashboards as routine hygiene, since they touched a chat transcript.

## Files changed

```
web/domain/constants/plans.ts                                          NEW
web/domain/models/customer-billing-profile.ts                          NEW
web/domain/schemas/customer-billing-profile.schema.ts                  NEW
web/domain/models/business.ts                                          MODIFIED — Stage 18 fields
web/domain/schemas/business.schema.ts                                  MODIFIED — same

web/lib/stripe/client.ts                                               NEW
web/lib/stripe/plans.ts                                                NEW
web/lib/stripe/status-mapping.ts                                       NEW
web/lib/stripe/metadata.ts                                             NEW
web/lib/stripe/__tests__/plans.test.ts                                 NEW
web/lib/stripe/__tests__/status-mapping.test.ts                        NEW
web/lib/stripe/__tests__/metadata.test.ts                              NEW

web/lib/db/customer-billing.ts                                         NEW
web/lib/db/__tests__/customer-billing.test.ts                          NEW
web/lib/db/businesses.ts                                               MODIFIED — getBusinessByStripeSubscriptionId
web/lib/db/__tests__/businesses.test.ts                                MODIFIED — same
web/lib/db/client.ts                                                   MODIFIED — TABLE_CUSTOMER_BILLING_PROFILES

web/lib/auth/customer-authorization.ts                                 MODIFIED — requireBusinessAccess,
                                                                            requireActiveSubscription
web/lib/auth/__tests__/customer-authorization.test.ts                  NEW

web/app/account/checkout/actions.ts                                    NEW
web/app/account/checkout/__tests__/actions.test.ts                     NEW
web/app/account/checkout/success/page.tsx                              NEW
web/app/account/checkout/success/AutoRefresh.tsx                       NEW
web/app/account/checkout/canceled/page.tsx                             NEW
web/app/account/claim-status/page.tsx                                  MODIFIED — plan selector, live
                                                                            status, billing link
web/app/account/claim-status/PlanSelectionForm.tsx                     NEW

web/app/api/webhooks/stripe/route.ts                                   NEW
web/app/api/webhooks/stripe/__tests__/route.test.ts                    NEW

infra/lib/stacks/data-stack.ts                                         MODIFIED — customer-billing-profiles
                                                                            table, stripe-subscription-id-index GSI
infra/lib/stacks/vercel-access-stack.ts                                MODIFIED — new table grant
infra/bin/webpresa.ts                                                  MODIFIED — pass-through prop
infra/test/data-stack.test.ts                                          MODIFIED — new table/GSI assertions,
                                                                            updated output count
infra/test/vercel-access-stack.test.ts                                 MODIFIED — new table in buildStacks

web/.env.local.example                                                 MODIFIED — new env vars
web/package.json                                                       MODIFIED — stripe dependency
web/docs/build_log.md                                                  MODIFIED — this entry
```
