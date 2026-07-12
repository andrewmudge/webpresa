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
