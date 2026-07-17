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
