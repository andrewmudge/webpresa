# Webpresa Implementation Plan

**Last updated:** 2026-07-18  
**Status:** Stages 1–10 complete in development. Stage 11 (Manual AI Website Generation) foundation implemented and manually tested end-to-end against the real OpenAI API. Stage 11.x (Configurable Website-Section System) implemented and manually tested end-to-end as a foundation stage inserted before Stage 12 — see each stage's Status field below and `build_log.md`. Stage 12 (Google Places Discovery) implemented, automatically tested, and manually verified end-to-end against the real Google Places API and dev DynamoDB. Stage 13 (Firecrawl Website Enrichment) implemented, automatically tested (472 tests), and manually verified end-to-end against the real Firecrawl v2 API, real OpenAI API, and real dev S3/DynamoDB. Stage 14 onward is next.  
**Primary development AWS profile:** `webpresa`  
**Primary AWS region:** `us-east-1`

---

## Purpose

This document is the master implementation plan for Webpresa.

It is organized by stage so a contributor or GitHub Copilot can be instructed to:

> Read `web/docs/implementation.md`, review Stage X, inspect the current repository and related documentation, and implement only that stage.

This document defines the intended objective, dependencies, deliverables, implementation requirements, acceptance criteria, and deferred work for every stage.

It does not replace:

- `architecture.md` — current system structure and technical architecture
- `deployment.md` — deployment commands, environments, and safety gates
- `build_log.md` — detailed record of completed implementation work

When this plan conflicts with the current repository, `architecture.md` and the actual codebase take priority. Update this document when an intentional architectural change is made.

---

# Project-wide implementation rules

These rules apply to every stage.

1. Preserve the existing monorepo structure:
   - `web/` for the Next.js application and domain layer
   - `infra/` for AWS CDK infrastructure
   - `vercel.json` for Vercel hosting configuration (migrated from Amplify after Stage 7)

2. Use TypeScript for application and infrastructure code.

3. Keep domain logic independent from React, Next.js, and AWS whenever practical.

4. Validate external input and persisted records with Zod.

5. Never allow browser code to access DynamoDB directly.

6. Keep AWS access, third-party API calls, authentication checks, and secret retrieval in server-side code.

7. Provision AWS resources through CDK. Do not manually create production infrastructure.

8. Use the AWS CLI profile `webpresa` for development commands unless explicitly instructed otherwise.

9. Run `cdk diff` before every real AWS deployment and require explicit approval before deploying.

10. Never store API keys, AWS credentials, authentication tokens, or secrets in source control, DynamoDB records, browser bundles, or logs.

11. Preserve historical records when the data model calls for versioning. Do not overwrite previous previews, scans, claims, or provider events when history is useful.

12. Every stage must leave the repository buildable and deployable.

13. A stage is not complete until its acceptance criteria and verification commands pass.

14. Update `build_log.md`, `architecture.md`, and `deployment.md` when the completed work changes their subject matter.

---

# Stage 1 — Public Homepage

## Status

Complete.

## Objective

Create the public Webpresa marketing homepage and establish the initial visual identity, messaging, and responsive frontend foundation.

## Dependencies

None.

## Major deliverables

- Next.js marketing homepage
- Responsive navigation
- Hero section
- Problem and before/after sections
- How-it-works section
- Postcard-recipient preview section
- Example website section
- Features and comparison sections
- Pricing section
- Founder section
- Product roadmap section
- FAQ section
- CTA section
- Footer
- Webpresa design tokens
- Basic SEO and Open Graph metadata
- Static export support

## Implementation requirements

- Use the existing Next.js App Router application in `web/`.
- Keep the homepage statically renderable.
- Use Tailwind CSS v4 design tokens from `app/globals.css`.
- Use client components only when browser APIs or interactivity require them.
- Keep CTA targets valid, even when they temporarily point to an internal section.
- Avoid fake customer claims, fake statistics, fake reviews, or unsupported results.
- Preserve the direct-mail and “preview may already be ready” positioning.

## Acceptance criteria

- `npm run lint` passes in `web/`.
- `npx tsc --noEmit` passes in `web/`.
- `npm run build` passes in `web/`.
- The homepage renders correctly at mobile, tablet, laptop, and desktop widths.
- There are no browser console errors during normal use.
- Navigation and CTA links work.
- The build produces a valid static export.
- Core metadata is present.

## Deferred work

- Real contact form
- Real example websites
- Founder photography
- Customer login
- Claim flow
- Production legal pages
- Analytics and conversion tracking

---

# Stage 2 — Repository and Environment Foundation

## Status

Complete.

## Objective

Establish a maintainable repository structure, development workflow, environment model, and quality gates.

## Dependencies

Stage 1.

## Major deliverables

- Single GitHub repository
- `web/` application package
- `infra/` CDK package
- Development and production environment concepts
- Git ignore rules
- TypeScript configuration
- Linting
- Formatting conventions
- Test scripts
- Build scripts
- Environment-variable documentation
- Branch and repository protection recommendations

## Implementation requirements

- Preserve the current repository structure documented in `architecture.md`.
- Keep `web/` and `infra/` independently installable and testable.
- Keep real `.env` files out of Git.
- Add example environment variables only when needed.
- Use separate development and production names for AWS resources.
- Never expose secrets using `NEXT_PUBLIC_` variables.
- Keep deployment commands documented in `deployment.md`.

## Acceptance criteria

- A new developer can clone the repository and identify how to run the web and infrastructure projects.
- Web lint, typecheck, test, and build commands pass.
- Infrastructure tests and synth pass.
- Environment-specific infrastructure configuration exists.
- Secrets and local environment files are ignored by Git.

## Deferred work

- Staging environment
- Automated CI quality gates
- Preview environments per pull request
- Automated dependency-update policies

---

# Stage 3 — AWS Account and Access Foundation

## Status

Complete for development.

## Objective

Prepare the AWS development account for secure, repeatable development and CDK deployment.

## Dependencies

Stage 2.

## Major deliverables

- Root-account security
- MFA
- Billing contacts
- AWS budget and alerts
- IAM Identity Center access
- SSO-based AWS CLI profile
- Primary region selection
- CDK bootstrap

## Implementation requirements

- Use IAM Identity Center rather than permanent IAM users for normal development.
- Use the development profile name `webpresa`.
- Use `us-east-1` unless the architecture document explicitly changes the region.
- Verify account identity before deployments.
- Do not use root credentials for development.
- Do not create long-lived AWS access keys for application deployment.

## Acceptance criteria

- `aws sso login --profile webpresa` succeeds.
- `aws sts get-caller-identity --profile webpresa` returns the correct development account.
- The development account is bootstrapped for CDK in `us-east-1`.
- Billing alerts and budget controls are configured.
- Root MFA is enabled.

## Deferred work

- Separate production AWS account
- `webpresa-prod` SSO profile
- Least-privilege production permission sets
- Organization-level guardrails
- Centralized security and audit account

---

# Stage 4 — Amplify Hosting and Domain

## Status

Superseded. The static homepage was initially deployed via AWS Amplify. After Stage 7, hosting was migrated to **Vercel** due to Amplify's inability to deploy Next.js 16 SSR apps with a custom build spec. The domain now points to Vercel. See `deployment.md` for the current deployment setup.

## Objective

Deploy the public Next.js application through AWS Amplify and establish the production domain deployment path.

## Dependencies

Stages 1–3.

## Major deliverables

- Amplify application connected to GitHub
- Main-branch deployment
- Development-branch deployment when enabled
- Static Next.js build configuration
- `amplify.yml`
- Domain and HTTPS configuration
- Canonical-domain redirect

## Implementation requirements

- Preserve a successful production deployment when a new build fails.
- Use `main` for production.
- Use `development` for the development environment where configured.
- Keep the static-export settings compatible with Next.js.
- Do not connect production application logic to undeployed backend resources.
- Keep domain, redirect, and SSL behavior documented.

## Acceptance criteria

- The Amplify build succeeds from GitHub.
- The public domain loads over HTTPS.
- The canonical hostname works.
- The alternate `www` hostname redirects correctly.
- Mobile layouts work in the deployed environment.
- Pushing an approved change triggers a deployment.
- A failed deployment does not replace the last successful production build.

## Deferred work

- Server-rendered admin deployment strategy
- Backend environment-variable injection
- Preview deployments
- WAF and advanced edge security
- Multi-region hosting

---

# Stage 5 — Canonical Domain Data Model

## Status

Complete.

## Objective

Define the canonical Webpresa domain records before application logic or third-party integrations write data.

## Dependencies

Stages 1–2.

## Major deliverables

- `Business` model
- `SitePreview` model
- `ScanEvent` model
- `Postcard` model
- Shared timestamp and address types
- Canonical status and source constants
- Zod schemas
- Record factories
- ID conventions
- Preview versioning
- Automated domain tests

## Implementation requirements

- Keep models in `web/domain/models/`.
- Keep runtime validation in `web/domain/schemas/`.
- Keep valid-record creation in `web/domain/factories/`.
- Use prefixed UUID identifiers.
- Preserve optional website and Google Place ID fields.
- Validate all AI-generated preview content before persistence.
- Preserve previous preview versions.
- Do not store third-party secrets in domain records.
- `Business` is extended with optional website-generation input fields (services offered, service areas, description, differentiators, brand tone, notes) and asset references (logo, photos) — implemented as part of the Stage 11 foundation work; see Stage 7's business creation form and Stage 9's asset key structure for the authoritative field list.

## Acceptance criteria

- All domain tests pass.
- All main records have unique IDs.
- All persisted records have timestamps.
- Mutable records have `updatedAt`.
- Invalid statuses are rejected.
- Invalid scores are rejected.
- A business is valid without a website or Google Place ID.
- AI content that does not match the preview schema is rejected.
- Regenerating a preview creates a new record and increments the version.

## Deferred work

- Claim model
- Lead model
- Customer change-request model
- Audit-event model
- Stripe webhook-event model
- Lob webhook-event model
- Cost-tracking model

---

# Stage 6 — DynamoDB Infrastructure

## Status

Complete in development.

## Objective

Provision the initial persistent data layer using AWS CDK.

## Dependencies

Stages 2, 3, and 5.

## Major deliverables

- Environment-aware CDK project
- Reusable `WebpresaTable` construct
- Businesses table
- SitePreviews table
- ScanEvents table
- Postcards table
- Required global secondary indexes
- Development and production configuration
- CloudFormation outputs
- Resource tags
- CDK assertion tests

## Implementation requirements

- Use on-demand billing.
- Use AWS-managed encryption.
- Use `DESTROY` only in development.
- Use `RETAIN`, deletion protection, and point-in-time recovery in production.
- Preserve `createdAt` sort keys on business history indexes.
- Keep table names environment-specific.
- Reassess low-cardinality status indexes before production deployment.
- Do not deploy production tables until the production account and migration strategy are ready.

## Acceptance criteria

- Infrastructure tests pass.
- CDK synth passes.
- CDK diff is reviewed.
- `WebpresaDevDataStack` deploys successfully using `--profile webpresa`.
- All four tables are active.
- Required indexes exist.
- CloudFormation outputs exist.
- Resource tags are present.
- `architecture.md`, `deployment.md`, and `build_log.md` reflect the deployed state.

## Deferred work

- Production deployment
- Status-index redesign
- Data migration tooling
- Backups beyond production PITR
- Additional domain tables

---

# Stage 7 — Manual Admin Dashboard

## Status

Complete.

## Objective

Build the protected internal application used to operate Webpresa manually before introducing automated discovery, scanning, generation, billing, or postcard workflows.

## Dependencies

Stages 1–6.

## Major deliverables

- Protected admin route group
- Admin sign-in and sign-out
- Admin dashboard shell
- Business list page
- New-business page
- Business detail page
- Business edit support
- Preview, scan, and postcard navigation placeholders or read-only pages
- Server-side DynamoDB repositories
- Authenticated admin API or server operations
- Validation and predictable error responses
- Activity-oriented business detail interface

## Required routes

- `/admin`
- `/admin/businesses`
- `/admin/businesses/new`
- `/admin/businesses/[businessId]`
- `/admin/previews`
- `/admin/scans`
- `/admin/postcards`

Additional authentication routes may be added as required.

## Implementation requirements

### Authentication

- Do not rely on an obscure URL.
- Protect every admin route.
- Protect every admin API or server operation independently.
- Prefer Amazon Cognito for the durable implementation.
- Do not allow unauthenticated browser writes.
- Use secure, HTTP-only cookies or a verified server session.
- Do not expose AWS credentials to the browser.

### Data access

Create a server-only data-access layer similar to:

```text
web/lib/db/
  client.ts
  businesses.ts
  site-previews.ts
  scan-events.ts
  postcards.ts
```

Repository functions must:

- accept and return canonical domain types
- validate records before writes
- hide DynamoDB-specific response structures from UI components
- use environment-provided table names
- return controlled application errors
- support pagination where list queries require it

### Business creation

The form is the single entry point for both business record creation and — later — the inputs Stage 11 needs to generate a website for a business with no usable existing presence. It should collect:

**Identity**
- business name
- industry

**Contact**
- phone
- email
- existing website URL (optional)
- Google Place ID (optional)

**Address**
- street
- city
- state
- postal code

**Website generation** (optional at creation time; the fields Stage 11 reads when generating)
- services offered (multi-line text)
- service areas (multi-line text)
- business description
- differentiators
- brand tone (e.g. Professional, Friendly, Luxury, Modern, Traditional)
- additional notes

**Assets** (optional)
- logo upload
- business photo uploads

**Admin**
- source

The Website generation and Assets fields are **persisted on the `Business` record** as new optional fields (extends the Stage 5 domain model — see Stage 5's Implementation requirements) rather than being ephemeral form-only inputs. This lets an admin revisit and re-run Stage 11 generation later without re-entering data, and both sections remain editable from the business edit form after creation, not just at creation time. Logo and photo uploads go to S3 under `businesses/{businessId}/assets/` (Stage 9); the resulting keys/URLs are what's stored on `Business`, never the file payloads themselves.

On submission:

- validate input
- normalize strings and URLs
- generate a unique business ID
- generate a location-aware slug
- check slug uniqueness
- add a deterministic suffix when needed
- upload any provided logo/photo assets to S3
- create the canonical record
- save it to DynamoDB
- redirect to the detail page

### Business detail

Show available:

- identity and contact information
- address
- existing website
- source
- current status
- site scores
- current preview
- preview history
- scan history
- postcard history
- subscription identifiers and status
- timestamps

Actions may include:

- edit business
- create preview
- run scan
- publish preview
- generate postcard
- archive business

Actions belonging to later stages must be disabled or clearly marked unavailable without adding fake implementation.

### API behavior

Admin endpoints or server actions must:

- verify authentication
- validate input with Zod
- perform authorization
- use repositories rather than raw database calls in UI components
- return predictable success and error structures
- avoid leaking AWS errors, stack traces, secrets, or internal identifiers unnecessarily
- log safe failure context

## Acceptance criteria

- Unauthenticated users cannot access admin pages.
- Unauthenticated requests cannot call protected write operations.
- An authenticated admin can list businesses.
- An authenticated admin can create a valid business.
- Duplicate slugs are resolved safely.
- An authenticated admin can view and edit a business.
- Invalid records are rejected before persistence.
- Browser code contains no AWS credentials or direct DynamoDB access.
- Empty, loading, success, validation-error, and server-error states are handled.
- The admin is usable on desktop and tablet.
- Web lint, typecheck, tests, and production build pass.
- Relevant infrastructure tests and synth still pass.
- Documentation is updated.

## Deferred work

- Role-based admin permissions
- Multiple internal users
- Bulk import
- Full scan execution
- AI generation
- Preview publication workflow
- Postcard submission
- Production-grade audit trail
- Customer support impersonation

---

# Stage 8 — Dynamic Business Preview Website

## Status

Complete. Template redesigned in Stage 8B revision. Later revisions — see `build_log.md` — rebranded the default theme to navy/orange, added a picture background to the featured service card, and replaced hardcoded CTA copy with an admin-configurable primary/secondary CTA system (`PreviewContent.cta`).

## Objective

Build the core customer-facing preview route that renders a business website from persisted `SitePreview` content.

## Dependencies

Stages 5–7.

## Major deliverables

- `/b/[slug]` route
- Server-side preview lookup
- One flexible local-service-business template
- Draft, published, claimed, and archived behavior
- Preview claim banner
- Per-business metadata
- Mobile layout
- Contact section
- No-index behavior for speculative previews
- Admin-only draft access

## Implementation requirements

- Query the SitePreviews `slug-index`.
- Never hardcode business-specific copy inside the template.
- Render from `SitePreview.content` and `SitePreview.theme`.
- Return a true 404 for missing or unavailable previews.
- Keep draft previews private.
- Show the Webpresa banner on published but unclaimed previews.
- Remove the banner for claimed customer sites.
- Use `noindex, nofollow` for speculative and unclaimed previews.
- Generate metadata from validated preview content.
- Validate phone and contact links.
- Keep business content visually dominant over Webpresa promotion.

## Acceptance criteria

- A stored published preview renders at `/b/[slug]`.
- Editing persisted content changes the rendered site.
- Invalid slugs return 404.
- Draft previews are not public.
- Archived previews are unavailable.
- Claimed previews do not show the claim banner.
- Published unclaimed previews show the banner.
- Unclaimed previews are not indexed.
- The template works for multiple local-service industries.
- Mobile layout and phone links work.
- The page builds without embedding secrets or database credentials in the browser.

## Deferred work

- Multiple templates
- Customer-owned custom domains
- Advanced SEO
- Lead persistence
- Image optimization pipeline
- Customer self-editing
- A/B testing

---

# Stage 9 — S3 Assets and Scan Storage

## Status

Complete in development. See `build_log.md` for implementation details and `architecture.md` for the deployed bucket shape.

## Objective

Provision secure object storage for crawl outputs, screenshots, generated assets, and postcard files.

## Dependencies

Stages 3, 6, and 8.

## Major deliverables

- Development asset bucket
- Development scan-artifact bucket or equivalent prefix design
- Environment-aware production configuration
- Public-access blocking
- Encryption
- Lifecycle policies
- Signed admin download/view access
- Least-privilege IAM grants
- CloudFormation outputs

## Recommended key structure

```text
scans/{businessId}/{scanId}/crawl.json
scans/{businessId}/{scanId}/desktop.png
scans/{businessId}/{scanId}/mobile.png
previews/{businessId}/{previewId}/
postcards/{businessId}/{postcardId}/
businesses/{businessId}/assets/logo.*
businesses/{businessId}/assets/photos/{n}.*
```

## Implementation requirements

- Keep buckets private.
- Block all public access.
- Enable encryption.
- Enable production versioning.
- Add lifecycle rules for failed and obsolete scan artifacts.
- Never auto-delete current customer assets.
- Grant each runtime only the prefixes it needs.
- Use signed URLs for private admin viewing.
- Store S3 keys in DynamoDB, not large file payloads.
- Support admin-uploaded business assets (logo, photos) under the `businesses/` prefix, with the resulting keys stored on the `Business` record. This is an internal admin operation during business creation/editing (Stage 7/11) — distinct from the "Customer uploads" item below, which refers to end-customer self-service uploads after purchase and remains deferred.

## Acceptance criteria

- CDK tests validate bucket security.
- CDK synth passes.
- CDK diff is reviewed before deployment.
- Development buckets deploy successfully.
- Public access is blocked.
- A test server operation can upload and retrieve a private object.
- Admin viewing uses a short-lived signed URL.
- Unauthorized users cannot retrieve objects.

## Deferred work

- CDN-backed customer asset delivery
- Malware scanning
- Cross-region replication
- Customer uploads
- Cost-optimized archival tiers

---

# Stage 10 — Secrets Management

## Status

Complete in development. See `build_log.md` for implementation details and `architecture.md` for the documented secret names, JSON shapes, and owners.

## Objective

Create the secure secret-storage and retrieval foundation for third-party integrations.

## Dependencies

Stages 3, 6, and 9.

## Major deliverables

Development secret locations for:

- OpenAI
- Firecrawl
- Google Places
- Stripe
- Lob

Production equivalents must be represented in infrastructure but not necessarily populated or deployed yet.

## Implementation requirements

- Use AWS Secrets Manager.
- Keep development and production secrets separate.
- Grant each runtime access only to required secrets.
- Cache secrets appropriately in long-lived execution environments.
- Never log secret values.
- Never expose secrets to client components.
- Do not commit secret values.
- Document secret names, expected JSON shapes, and owners.

## Acceptance criteria

- Secrets exist in the development environment.
- A test server-side operation can retrieve only its authorized secret.
- Unauthorized runtime roles cannot retrieve unrelated secrets.
- Secret values do not appear in browser bundles, logs, Git history, DynamoDB, or CloudFormation outputs.
- Deployment documentation explains how secret names are provided to runtimes.

## Deferred work

- Automated rotation where supported
- Production secrets
- Centralized secret inventory
- Emergency rotation runbook

---

# Stage 11 — Manual AI Website Generation

## Status

In development — implemented and manually tested against the real OpenAI API (a business was created with full generation inputs and uploaded assets, a real website was generated, and the result reviewed as a draft preview). See `build_log.md`, "Stage 11 Foundation — Website Generation Inputs, Assets, and Manual AI Generation" and "Bug Fixes — Live Generation Testing" for the implementation record and two bugs found/fixed during that testing.

## Objective

Allow an administrator to generate a complete website — content, theme, and hero presentation — from manually entered business information, without requiring an existing website. This stage primarily supports:

- new businesses
- businesses with no website
- Facebook-only businesses
- Google Business Profile–only businesses
- businesses with an outdated or unusable website

## Dependencies

Stages 5, 7, 9, and 10.

## Major deliverables

- Admin generation form or action ("Generate Website" on the business detail page)
- Server-side OpenAI client
- Configurable model selection
- Versioned prompt
- Structured output schema, covering content, CTA configuration, theme, and hero presentation
- `PreviewContent` validation
- New `SitePreview` record creation
- Human review state
- Admin preview editor
- Manual publication
- Automatic theme (color/font) and hero-presentation selection

## Implementation requirements

### Workflow

```text
Create Business
        ↓
Enter business information
        ↓
Click Generate Website
        ↓
OpenAI generates structured PreviewContent
        ↓
Validate with PreviewContentSchema
        ↓
Save new SitePreview version
        ↓
Open Preview (/b/{slug})
        ↓
Admin reviews and edits
        ↓
Publish
```

### OpenAI receives

Only verified admin-entered information (see Stage 7's business creation form):

- business name
- industry
- address
- contact information
- services offered
- service areas
- business description
- differentiators
- brand tone
- additional notes
- uploaded logo/photo asset references, if present

OpenAI does not crawl the website during Stage 11 — see Stage 13 for that.

### OpenAI generates

- hero copy
- navigation (which sections are present, driven by which content the template already renders conditionally)
- about section
- services
- trust section
- CTA configuration (`content.cta` — see `PreviewCtaConfig` in `build_log.md`, "Configurable CTA System"; must not default to generic phrases like "Get a Quote" — follow the same phone-first/email-fallback/hidden-CTA logic as `buildDefaultCta()` in the admin seed generator unless the admin already configured a CTA)
- contact section
- SEO metadata
- theme selection — **not a color palette.** As of the Brand Theme System (2026-07-14), OpenAI selects only a preset *name* from `THEME_NAMES` (`domain/constants/themes.ts`); it never generates a hex value. See `architecture.md`, "Brand Theme System" and `lib/theme/select-theme.ts`. Font family remains a small model-chosen enum (not a color, so out of scope for that system).
- hero presentation selection

### Hero selection

Use uploaded logo/photo assets for the hero when present. Otherwise automatically select a non-image hero style — gradient, pattern, or solid color. The generated website must never require a full-width hero image; the template's hero must render acceptably with no image at all.

### Guardrails

The model must not invent:

- certifications
- licenses
- years in business
- reviews
- awards
- guarantees
- 24/7 availability
- service areas
- business ownership claims
- statistics

Use a configurable model setting rather than hardcoding a model throughout the codebase.

All output must:

- use a structured response format
- pass `PreviewContentSchema`
- be saved as a new version
- start in a human-review state
- remain editable before publication

## Acceptance criteria

- An admin can create a business.
- An admin can generate a website from it.
- AI creates unique `PreviewContent` (including CTA, theme, and hero presentation).
- Loading and failure states are visible.
- The preview opens at `/b/{slug}`.
- Invalid output is rejected and not persisted.
- The new preview remains unpublished.
- Every generated field, including theme and CTA, can be reviewed and edited.
- A new `SitePreview` version is created; existing previews remain unchanged.
- Publishing requires an explicit admin action.
- Unsupported claims do not appear in test generations.
- Integration errors are logged safely.

## Deferred work

- Generation from scan results — this is now Stage 13's responsibility (Firecrawl Website Enrichment), not Stage 11's
- Industry-specific prompts
- AI-generated imagery (distinct from admin-uploaded photos, which are in scope)
- Automatic publication
- Prompt experimentation dashboard
- Cost tracking
- ~~Color contrast/saturation guardrails for the AI-selected theme~~ — resolved by the Brand Theme System (2026-07-14): AI no longer generates colors at all, only a preset name from a curated, pre-validated set. See `architecture.md`, "Brand Theme System".

---

# Stage 11.x — Configurable Website-Section System

## Status

Implemented and manually tested end-to-end (including against the real dev DynamoDB tables) — see `build_log.md`, "Stage 11.x — Configurable Website-Section System" for the full implementation record.

## Objective

Insert a component-configuration foundation between Stage 11 and Stage 12: replace the permanently fixed page layout with a stored, per-business section configuration that the preview renderer honors, so that Stage 12 (and later, rule-based/AI automation) has a validated place to plug section-eligibility signals into — without ever letting stored configuration or AI output directly choose a React component. An administrator can manually enable/disable optional sections and reorder them today; the client dashboard (Cognito-authenticated) is expected to gain the same controls in a future stage.

## Dependencies

Stage 5 (domain model), Stage 7 (admin dashboard), Stage 8 (preview website), Stage 11 (existing template components this reuses).

## Major deliverables

- Fixed component catalog (`domain/constants/website-sections.ts`) — the only source of truth for which section identifiers, required sections, variants, and default order/enabled-state exist.
- `Business.websiteSections` stored configuration + Zod validation, wired into the existing repository/schema layer — no new persistence mechanism.
- Default-configuration generator reproducing the pre-existing template's appearance exactly, so no migration was needed for existing businesses/previews.
- Deterministic, non-AI availability checks and a "Apply Recommended Sections" rule-based recommendation action.
- A controlled component registry (`section-registry.tsx`) — the single place a stored section identifier becomes a real React component.
- Preview renderer (`GeneratedWebsite`) refactored to render from resolved configuration through the registry instead of a fixed hardcoded sequence.
- Admin "Website Sections" management UI (enable/disable, reorder, recommend, reset) on the business detail page.
- Five new template components for previously-nonexistent sections (Gallery, Reviews, Testimonials, FAQ, Process), each gated by the same availability checks as every other section.

## Implementation requirements

### Core architectural principle

AI must never directly control React components. Any future rule-based or AI-proposed configuration must pass through the same fixed catalog and the same validation this stage establishes — never a dynamic import, never a database-driven `require`, never raw JSX/component names in storage.

### What was explicitly out of scope for this stage

Google Places (Stage 12), Firecrawl, AI section selection, AI-generated testimonials/reviews, AI approval/confidence scoring, Playwright review automation, drag-and-drop page building, arbitrary custom components, customer-facing website editing, multiple design variants per section, a complete CMS.

### Backward compatibility

`Business.websiteSections` is optional; its absence — true for every business/preview created before this stage — resolves at render time to a computed default that exactly reproduces the previously-fixed template's appearance. No destructive or backfill migration was run or is required.

## Acceptance criteria

- A manually entered business can have optional sections enabled or disabled from the admin dashboard.
- Required sections (Header, Hero, Services, Contact, Footer) cannot be disabled, including via a tampered/bypassed client request (enforced server-side).
- Settings persist across reloads and across "Generate Website" regenerations.
- The public preview renders sections from stored configuration, in configured order, through the controlled registry.
- A disabled section is fully absent — no layout gap, no broken placeholder.
- An enabled optional section with unavailable content does not render on the public preview and is flagged in the admin UI instead.
- "Apply Recommended Sections" produces a deterministic, non-AI proposal from currently stored business data; the admin can still override it.
- Existing businesses/previews with no stored configuration remain fully functional.
- Server-side validation (Zod) rejects invalid configuration before persistence; client-side feedback surfaces the same errors.

## Deferred work

- Google Places discovery — Stage 12, next.
- Admin (or client-dashboard) UI to manually enter testimonials/FAQ/process-step content — the fields and availability checks exist; nothing populates them yet.
- A variant library beyond the single `'default'` variant per section.
- Drag-and-drop section ordering (plain numeric order inputs only, per this stage's explicit scope).
- Rule-based/AI-driven automatic section selection without manual admin approval.

---

# Stage 12 — Google Places Discovery

## Status

Implemented, automatically tested, and manually verified end-to-end against the real Google Places API and the real dev DynamoDB table (see `build_log.md`, "Stage 12 — Google Places Discovery", "Manual" verification line). Not yet exercised through the admin UI in a live browser session — the manual verification called the same Server Action functions directly.

## Objective

Allow an administrator to search Google Places for local businesses by industry and location, review the results, and selectively import chosen businesses into the existing `Business` persistence model.

Stage 12 is strictly **discovery and selective import**. It ends the moment selected Google Places records have been safely imported as `Business` records — it does not run, queue, or schedule any later-pipeline stage. See "Relationship to Stage 13" below for the exact handoff boundary.

## Dependencies

Stages 7 (admin dashboard, `Business` schema/model, repositories) and 10 (`webpresa-{env}-google-places` secret).

## Major deliverables

- Google Cloud project with the Places API (New) enabled, and a restricted server-side API key
- Admin business-search form (industry + location)
- Server-side Google Places client — never called from the browser
- Economical field-mask configuration for the search request
- Search-result review table showing required fields plus duplicate indicators
- Selective import (only admin-checked results import; nothing imports automatically)
- Server-side duplicate detection, re-run immediately before persistence
- Import result summary (imported / duplicate / failed counts)
- Safe, non-persistent operational logging of search and import activity

## Implementation requirements

### Manual workflow

```text
Admin enters industry and location
        ↓
Server-side Google Places search
        ↓
Admin reviews results
        ↓
Duplicate detection
        ↓
Admin selects businesses
        ↓
Selected businesses are imported
        ↓
Imported business status remains the canonical discovered/pending state
```

Stage 12 must **not** automatically:

- run Firecrawl
- run Playwright
- generate screenshots
- score a website
- generate a preview
- trigger OpenAI
- download Google Places photos
- publish anything

There is no automated batch mode, scheduled search, or "import all" action — every import is an explicit, individually selected admin decision. Keeping the workflow manual lets Stage 12 be tested completely independently before Stage 13 (Firecrawl enrichment), Stage 14 (screenshots), and Stage 15 (scoring) exist.

### Economical field-mask requirements

Request a field mask limited to what discovery, review, duplicate detection, and downstream eligibility actually need — never the full response. At minimum:

- `id` (Google Place ID)
- `displayName`
- `formattedAddress` and `addressComponents` (structured components — needed to populate the existing `Address` shape correctly, not a naive split of the formatted string)
- `location` (latitude/longitude — review context only, see "Fields requested but not persisted" below)
- `nationalPhoneNumber` / `internationalPhoneNumber`
- `websiteUri`
- `googleMapsUri`
- `primaryType` and `types`
- `businessStatus`
- `rating` and `userRatingCount`
- `regularOpeningHours` (or an equivalent lightweight hours summary if the chosen search endpoint offers one)

`rating`, `userRatingCount`, and `regularOpeningHours` sit in a higher-cost Places API (New) tier than the identity/location fields — request them deliberately, not by default, and see `deployment.md` for budget guidance.

### No Google Places photo downloading

Google Places photo data — photo references or binaries — must not be requested as a separate call, downloaded, or copied into S3. Webpresa deliberately does not use Google Places photos as website assets:

- retrieving them adds Google API usage and cost beyond the search itself
- Google Places photos carry attribution and usage constraints
- they are less useful than assets pulled from the business's own website, which Firecrawl (Stage 13) and Playwright (Stage 14) will later inspect
- admin-uploaded assets (`Business.photoUrls`, the `businesses/{businessId}/assets/photos/` S3 prefix — Stage 9) remain the supported path for businesses without usable website assets

If the chosen field mask happens to include a lightweight photo-reference field with a clear future use, it may be kept only in the transient search-result shape shown during review. It must never be persisted onto `Business`, downloaded, or written to any S3 prefix — including `businesses/{businessId}/assets/`.

### Imported and reviewed fields — mapped to the current `Business` model

| Google Places field | Destination |
|---|---|
| `id` | `Business.googlePlaceId` (existing field; also the target of the `google-place-id-index` GSI on `webpresa-dev-businesses`, used for duplicate detection) |
| `displayName` | `Business.name` |
| `formattedAddress` / `addressComponents` | `Business.address` (`Address`: `line1`, `line2?`, `city`, `state`, `postalCode`, `country`) |
| `nationalPhoneNumber` / `internationalPhoneNumber` | `Business.phone` |
| `websiteUri` | `Business.websiteUrl` |
| `googleMapsUri` | `Business.googleMapsUrl` (existing field) |
| `rating` | `Business.googleRating` (existing field, reserved ahead of this stage — see `architecture.md`, "Section eligibility signals") |
| `userRatingCount` | `Business.googleReviewCount` (existing field, same reservation) |
| `primaryType` / `types` | Mapped to `Business.industry` (the fixed `INDUSTRIES` enum) via a deterministic best-match table. `industry` is required and Google's type taxonomy does not line up 1:1 with `INDUSTRIES`, so the admin must be able to review and override the mapped value before import. |

Fields requested for review/eligibility context but **not persisted onto `Business`** — kept only in the transient search-result shape shown to the admin, because nothing downstream currently consumes them and adding a field for them now would be premature:

- `location` (latitude/longitude) — no map or territory feature exists yet to use it
- `businessStatus` (Google's operational status — e.g. temporarily/permanently closed) — used only to warn the admin during review; never conflated with `Business.status`, Webpresa's own lifecycle field, which imported records still receive normally (see "Canonical initial status" below)
- `types` beyond the one mapped to `primaryType` — shown for review context only
- `regularOpeningHours` — shown for review context only; no `Business` or `PreviewContent` field currently stores structured hours (`PreviewContent.hours` is a free-text field populated by generation/admin edit, not by Stage 12)

### Domain-model change required for this stage

`Business.source` (`BUSINESS_SOURCES` in `domain/models/business.ts`, and the matching `z.enum` in `BusinessSchema`) currently allows only `'scan'`, `'manual'`, and `'import'` — none of these identify a Google Places import. Add a new `'google_places'` value to `BUSINESS_SOURCES` as part of implementing this stage. This is a deliberate, minimal extension genuinely needed downstream (distinguishing Google-imported records from manually created ones for the data-attribution guardrail below and for future reporting), not a field invented for completeness. No new table or aggregate is introduced — imported Google results become ordinary `Business` records via the existing `putBusiness()` function in `web/lib/db/businesses.ts`.

### Canonical initial status

Set `status` to `'pending'` — the existing `BUSINESS_STATUSES` value (`'active' | 'inactive' | 'pending' | 'archived'`, `domain/models/business.ts`) that `createBusiness()` already assigns by default. This **is** the canonical discovered/pending state. There is no `READY_FOR_SCAN` or `READY_FOR_ENRICHMENT` status anywhere in the model, and Stage 12 must not invent one — "ready for scan" is no longer valid terminology now that Stage 13 is website enrichment, not a generic scanning stage. Moving a business into Stage 13 enrichment is a distinct, explicit admin action on the business detail page (see "Relationship to Stage 13" below), not a status the import step sets or a queue Stage 12 populates.

### Server-side duplicate detection

Check in this priority order, immediately before persistence — re-run at import time even if the same indicators were already shown during review, since the database may have changed while the admin was looking at the list:

1. **Google Place ID** — exact match via the existing `google-place-id-index` GSI. A match is definitive: block import, or require explicit admin confirmation to proceed.
2. **Normalized website domain** — strip protocol/`www.`/trailing slash, compare host. May block or require confirmation.
3. **Normalized phone number** — digits-only comparison. May block or require confirmation.
4. **Normalized business name + full address** — case/whitespace/punctuation-normalized comparison. May block or require confirmation.
5. **Normalized business name + city** — a lower-confidence signal. Surface as a possible-duplicate warning; do not block import on this alone.

Partial batch failures must not roll back successful imports — if 8 of 10 selected businesses import successfully and 2 fail (validation error, transient DynamoDB error, etc.), the 8 remain persisted and the summary reports the 2 failures separately.

### Google Places source data versus verified business data

Imported Google Places fields are source data the admin has selectively chosen to bring in — they are not automatically treated as verified, customer-provided information. Stage 13 and later AI generation must continue to honor the existing anti-fabrication guardrails (see Stage 11, "Guardrails") and must never use imported data to assert licenses, certifications, guarantees, ownership claims, years in business, 24/7 availability, awards, or statistics.

`googleRating` / `googleReviewCount`, when stored, remain specifically attributed Google data (see Stage 11.x, "Section eligibility signals") — they must never be presented as manually entered reviews or generic testimonials.

Stage 12 never enables, disables, or reorders any website section. `Business.websiteSections` and the deterministic "Apply Recommended Sections" action (Stage 11.x) remain the only path that changes section configuration. Populating `googleRating`/`googleReviewCount` only changes what the Reviews section's existing, deterministic availability check returns — Stage 12 itself never writes `websiteSections` and never lets external data directly choose a React component.

### Operational logging (no search-history table)

No new persistence for search history is introduced in this stage. Non-persistent, structured log entries may capture: search query, location, result count, selected count, imported count, duplicate count, failure count, request duration, and safe provider error metadata. Persistent search-history reporting, per-search cost attribution, territory management, and automated city campaigns remain deferred (see below).

### API quota and budget protection

- The Google Places API key is read server-side only, via `getGooglePlacesSecret()` (`web/lib/secrets/index.ts`), which reads the existing `webpresa-{env}-google-places` secret — never sent to or read from the browser.
- Restrict the API key in Google Cloud to the Places API (New) only.
- Configure a Google Cloud budget alert and a daily quota before running any real (non-test) searches.
- Handle quota-exhausted, invalid-key, and restricted-key responses safely — surface a clear admin-facing error, never a raw provider error or stack trace, and never retry silently in a loop.

## Acceptance criteria

- An admin can search one industry in one location.
- Results display with the required business fields (see the field table above).
- Individual businesses can be selected; nothing imports until the admin explicitly selects and submits.
- Server-side duplicate detection re-runs immediately before persistence, even when the same indicators were already shown during review.
- A partial batch failure does not roll back the businesses that imported successfully.
- Google Places photos are never downloaded, requested as a separate call, or written to any S3 prefix — including `businesses/{businessId}/assets/`.
- No Firecrawl call, Playwright call, OpenAI call, website scoring, preview generation, or publication action is triggered by search or import.
- Imported businesses appear in the existing `/admin/businesses` list.
- `googleRating` / `googleReviewCount`, when stored, remain identified as Google-sourced data wherever surfaced — never rendered as a manually entered review or generic testimonial.
- The Google Places API key never reaches the client — verify no key value appears in a client bundle, browser network response, or page source.
- Quotas and a budget alert are configured in Google Cloud before real (non-test) searches are run.

## Deferred work

- Automated city batches
- Nearby Search
- Place Details refresh jobs
- Large-scale import
- Territory management
- Lead-source cost attribution
- Persistent search-history table / reporting

---

# Stage 13 — Firecrawl Website Enrichment

## Status

Implemented and manually verified end-to-end against the real Firecrawl v2 API, the real OpenAI API, the real dev S3 bucket, and the real dev DynamoDB tables (see `build_log.md`, "Stage 13 — Firecrawl Website Enrichment"). **Revises the original objective below**: Stage 13 can now create a business's **first** preview, not only enrich an already-generated one — a Google Places–imported business typically has no Stage 11 inputs at all, and requiring a manual Stage 11 pass first would defeat the point of automated discovery. Stage 11 remains fully independent and unaffected; Stage 13 reuses its generation pipeline (`lib/ai/generate-preview.ts`) rather than duplicating it.

## Objective

Allow an administrator to enrich a `Business` record by scraping its known website with Firecrawl, normalizing the result into a validated evidence snapshot, merging it in memory with the canonical `Business` record (Business always wins on conflict), and generating a new versioned `SitePreview` via the existing Stage 11 pipeline — whether or not a preview already exists for that business.

An admin explicitly starts enrichment by clicking "Enrich Website" on the business detail page. Stage 12 import never automatically queues, schedules, or flags a business for enrichment — there is no `READY_FOR_SCAN` or `READY_FOR_ENRICHMENT` `Business.status` value. The admin action is what begins Stage 13, every time; `Business.enrichmentStatus` (a separate field from `Business.status` — see "Domain model" below) tracks Stage 13's own disposition without overloading the general lifecycle status.

## Dependencies

Stages 7, 9, 10, 11, and 12.

## Major deliverables

- Server-side Firecrawl v2 client (`lib/firecrawl/client.ts`) — plain `fetch` against the REST API, matching the Stage 12 Google Places client's pattern rather than the `firecrawl` npm SDK (see `architecture.md` for the rationale)
- SSRF-safe URL validation (`lib/firecrawl/url-validation.ts`), applied to the business's website URL, Firecrawl's reported final URL, and every candidate image URL
- Redesigned `ScanEvent` (`queued`/`running`/`completed`/`failed`/`manual_approval_required`, provider/operation/attempt/retry/failure-category fields) — Stage 13 is `ScanEvent`'s first real caller (Stage 12 creates none)
- `WebsiteEnrichmentSnapshot` — a normalized, bounded, Zod-validated evidence shape (`domain/models/website-enrichment.ts`) built from Firecrawl's response, including a `{ type: 'json', schema, prompt }` structured-extraction format requested as part of the single Scrape call (Firecrawl's own extraction LLM — no second app-side LLM call)
- Website image discovery/ingestion pipeline (`lib/firecrawl/images.ts`) — validates, fetches, dimension-checks, classifies, and rehosts accepted images under `scans/{businessId}/{scanId}/images/`; never downloads Google Places photos, never hotlinks the original URL, never writes to `Business.photoUrls`
- `buildGenerationContext()` (`lib/firecrawl/generation-context.ts`) — the one explicit merge function; Business's own fields win outright, the snapshot fills only what's blank
- `enrichBusinessWebsite()` / `retryEnrichmentScan()` orchestration (`lib/firecrawl/enrich-business.ts`), split into small checkpoint functions per the 20-step flow below
- `Business.enrichmentStatus` / `manualApprovalReason` / `manualApprovalNote` — the business-level disposition, distinct from per-attempt `ScanEvent.status`
- Bounded inline retry (exponential backoff + jitter, honors `Retry-After`) for transient Firecrawl failures, plus a separate admin-triggered cross-attempt retry that always creates a new `ScanEvent`
- Admin UI: "Website Enrichment" card (`EnrichmentSection.tsx`) on the business detail page

## Implementation requirements

### Workflow (20 checkpoints, split across small functions — never one monolithic action)

```text
Authenticate admin → load Business → verify it exists
        ↓
No website on file? → manual_approval_required ScanEvent, Business.enrichmentStatus
        set, Firecrawl never called, no images downloaded — DONE
        ↓ (website present)
Validate + normalize the website URL (SSRF guard)
        ↓
Reject if another scan is already queued/running for this Business (conflict)
        ↓
Create a queued ScanEvent → transition to running
        ↓
Call Firecrawl Scrape (bounded inline retry on rate-limit/timeout/5xx)
        ↓
Classify provider/HTTP failure if any → failed ScanEvent, stop
        ↓
Sanitize + store the raw response → scans/{businessId}/{scanId}/crawl.json
        ↓
Normalize + validate → WebsiteEnrichmentSnapshot → extracted.json
        ↓
Ingest candidate images (failure here is never fatal to the scan)
        ↓
buildGenerationContext(Business, snapshot) → generatePreviewContent(Business, { enrichment })
        ↓
Persist a new immutable SitePreview version (1 if none existed, else latest + 1)
        ↓
Mark ScanEvent completed + generatedPreviewId; set Business.enrichmentStatus
        ↓
Return a structured result to the admin UI
```

Initial scope is one homepage per scan (single-page Firecrawl **Scrape** — never crawl, search, or extract).

### Firecrawl extracts

Via one Scrape call requesting `formats: ['markdown', 'links', 'images', { type: 'json', schema, prompt }]`:

- business name, summary, about text
- services (name + description)
- service areas
- FAQ question/answer pairs
- navigation labels, calls-to-action
- contact phones/emails/addresses
- social profile links
- discovered page links and image URLs

Also captured: title, meta description, HTTP status, final URL (itself re-validated by the SSRF guard before being trusted), and the raw provider output key. Raw crawl artifacts are stored in S3, never in DynamoDB.

### OpenAI receives

- the `Business` record (unchanged from Stage 11)
- gap-filled prompt input from `buildGenerationContext()` — the normalized snapshot only ever supplies what the admin-entered fields leave blank

OpenAI never reads the website directly — Firecrawl remains responsible for retrieval, and its own structured-extraction LLM (not a second OpenAI call) does the raw-page → structured-fields work.

### Conflict resolution

Administrator-approved Business data always wins. `buildGenerationContext()` uses the business's own `servicesOffered`/`serviceAreas`/`differentiators`/`description` outright whenever non-empty; the Firecrawl snapshot is consulted only for fields the business left blank. `Business` is never mutated by this process — no field is ever overwritten, so there is no field-level "conflict" to surface for review; a blank field silently gets a Firecrawl-sourced value in the generation *input* only.

### Output

Creates a new immutable `SitePreview` version via the existing Stage 11 factory/persistence path (`createSitePreview`/`putSitePreview`) — version 1 when none exists yet, otherwise latest + 1. Prior versions (Stage 11–generated or earlier Stage 13 runs) are never overwritten, so they remain viewable for comparison. `SitePreview.generationMetadata.source` is `'firecrawl_enriched'` (vs. Stage 11's `'manual_ai'`) and `generationMetadata.scanId` links back to the producing `ScanEvent`.

### Failure handling

`ScanFailureCategory` (`domain/models/scan-event.ts`): `missing_website`, `invalid_url`, `blocked_url`, `firecrawl_auth`, `firecrawl_rate_limit`, `firecrawl_timeout`, `firecrawl_provider_error`, `website_unreachable`, `empty_content`, `normalization_failed`, `artifact_storage_failed`, `generation_failed`, `preview_persistence_failed`, `unknown`. Only `firecrawl_rate_limit`/`firecrawl_timeout`/`firecrawl_provider_error` are retry-eligible (`lib/firecrawl/retry.ts`'s `isRetryableFailureCategory`) — invalid/blocked URLs and auth/config errors are never retried, since they'd fail identically every time.

Businesses without a website follow the dedicated no-website path (`manual_approval_required`, `missing_website` category) — never treated as a generic technical failure, and Firecrawl is never called for them.

### Website images

See `architecture.md`, "Firecrawl Website Enrichment" for the full image-ingestion pipeline (validation, size/dimension/format limits, deterministic role classification, S3 storage, and the public-proxy exposure boundary). A successful text scrape with zero accepted images still completes normally — `Business.manualApprovalReason` is set to `'no_usable_images'` as a non-blocking note, and generation proceeds with the existing image-free fallback (theme-matched illustration hero).

## Acceptance criteria

- An admin can start a Firecrawl scrape of a business's website from the business detail page.
- A `ScanEvent` is created and its status transitions (`queued` → `running` → terminal) are recorded.
- Raw and normalized artifacts are saved privately in S3; the `ScanEvent` stores both keys.
- Failed scans store a safe failure category/message and can be retried when eligible; one failed scan never permanently invalidates the business.
- A business with no prior preview gets version 1 from Stage 13; a business with existing previews gets the next version.
- Business-entered fields are never overwritten by Firecrawl-discovered values, and Firecrawl never mutates `Business` beyond its own `enrichmentStatus`/`manualApprovalReason`/`manualApprovalNote` disposition fields.
- The new version does not overwrite any prior version — all remain viewable for comparison.
- A business with no website gets `manual_approval_required` with the exact required admin note, and Firecrawl is never called.
- Google Places photos are never downloaded; Firecrawl-discovered images are only ever used after being fetched, validated, and rehosted under `scans/`, never hotlinked.
- A retry always creates a new `ScanEvent` (`retryOfScanId` + incremented `attempt`) — a failed `ScanEvent` is never transitioned back to `running`.
- Concurrent active scans for the same business are prevented.
- Publishing still requires an explicit admin action (new previews save as `draft`).
- API credentials remain server-side; no raw page content or API key is ever returned to the browser.

## Deferred work

- Multi-page crawling
- Scheduled refreshes
- Content-diff detection
- Robots-policy reporting
- Crawl-cost tracking
- Dedicated side-by-side conflict-diff UI (relies on comparing two full `SitePreview` versions, not a field-level diff)
- `insufficient_content`/`other` `ManualApprovalReason` values (modeled in the schema; no write path sets them yet — only `missing_website` and `no_usable_images` are produced today)
- A "dismiss"/"not interested" action for a scan-discovered image an admin doesn't want promoted — today the only choice is promote-or-ignore; ignored images stay listed under "Images found during website enrichment" indefinitely (see "Scan-image promotion" in `architecture.md`)

Implemented after the initial build, in response to real usage — see `architecture.md`, "Scan-image promotion" and "`/admin/scans`", and `build_log.md`: admin promotion of scan-derived images (`accepted` or `review_required`) into the canonical `Business.photoUrls`, and a real `/admin/scans` list/detail UI replacing the Stage-9 placeholder.

---

# Stage 14 — Playwright Screenshots

## Status

**Implemented 2026-07-22, deployed to dev 2026-07-23.** Application and infrastructure code written and locally verified against every requirement below (domain model, Server Actions/admin UI, Lambda package, CDK constructs/stacks) — `cdk synth`/`cdk diff` run against the real dev account (additive-only diff, IAM reviewed by hand), the Lambda package's own typecheck/tests pass, and a real local Docker build with manual runtime smoke tests (handler load, Chromium launch + real screenshot, capture-token mint) all succeed. `WebpresaDevDataStack`, `WebpresaDevScreenshotRepositoryStack`, and `WebpresaDevScreenshotStack` are deployed, and a real end-to-end `existing_site` capture against the live Lambda has been verified (queued → running → completed, both viewport PNGs confirmed in S3). `generated_preview`'s live round-trip and the Vercel-side env vars (`SCREENSHOT_LAMBDA_FUNCTION_NAME`, etc.) are still outstanding — see `build_log.md`, "Stage 14 — CDK stack-ordering fix, pre-deploy testing, and dev deployment" for the exact remaining steps. See `architecture.md`, "Playwright Screenshots (Stage 14)" for the full implementation record.

## Objective

Capture consistent, timestamped screenshots — of a business's **existing website** and of Webpresa's own **generated preview** — for admin review, Stage 15 AI scoring, and postcard creative.

## Dependencies

Stages 9 and 13.

## Architectural commitment

This is the project's **first compute infrastructure**. Every other stage so far runs as Next.js Server Actions/Route Handlers on Vercel talking to DynamoDB/S3/Secrets Manager directly. Stage 14 introduces a second deployable unit:

- Playwright runs inside an **AWS Lambda container image** (headless Chromium doesn't fit a standard zip-based Lambda bundle) — built and stored in a new **ECR repository**.
- The container is deployed via a new **CDK construct** (`infra/lib/constructs/`, alongside the existing `webpresa-table.ts`/`webpresa-bucket.ts`/`webpresa-secret.ts` data constructs — this is the first *compute* construct in the project).
- The Lambda is **invoked asynchronously from a Vercel Server Action** via the AWS SDK (`@aws-sdk/client-lambda`, `InvocationType: 'Event'`) — not run inside the Vercel function itself, and not invoked synchronously.
- The Lambda's asynchronous invocation configuration is set explicitly, not left at defaults: `MaximumRetryAttempts: 0` (AWS never automatically re-invokes on failure — see "Idempotency and status transitions" and "Failure destination and stale-scan recovery" below for why), `MaximumEventAge` ≈ 5–10 minutes, `OnFailure` → the Stage 14 SQS DLQ.
- The Lambda is **not attached to a VPC**. It only ever calls public websites/the public preview URL plus AWS APIs (DynamoDB, S3, Secrets Manager, SQS) that don't require VPC placement — putting it in a VPC would need private subnets plus a NAT Gateway just to reach the public internet, an ongoing cost and networking complication this stage has no reason to take on.
- There is no Vercel-hosted-Chromium alternative under consideration for this stage; the above is the committed architecture, not one option among several.

## Screenshot targets

Two distinct, independently triggerable capture targets exist. This is the central structural difference from the stage's original framing (which implied one screenshot pair per scan) and must not be collapsed back into one:

| Target | `targetType` | Source URL | Purpose | Requires a website? |
|---|---|---|---|---|
| Existing website | `existing_site` | `Business.websiteUrl` | Stage 15 AI scoring; "before" comparisons | Yes — skipped entirely (Lambda never invoked) when the business has no `websiteUrl`; the admin UI shows "No existing website available" instead of a capture action |
| Generated preview | `generated_preview` | The business's `SitePreview` (a specific `previewId`), rendered at its public `/b/{slug}` route | Postcard creative, admin review, before/after comparisons | No — must work for a business that never had a website, since Webpresa still needs a screenshot of the site *it* generated for that business |

Each target is captured by its own admin action, its own `ScanEvent`, and its own `scanId` — "Capture Existing Site Screenshots" and "Capture Generated Preview Screenshots" are two separate buttons on the business detail page (mirroring Stage 13's existing "Enrich Website"/"Retry" pattern of one explicit action per outcome), not one combined action. A business can re-capture its generated preview after regenerating content without needing to re-capture the existing site, and vice versa.

## Major deliverables

**Application-side (Vercel):**
- Two Server Actions on the business detail page: one per target (see "Screenshot targets" above), each validating the request, creating a `queued` `ScanEvent`, invoking the Lambda asynchronously, and returning immediately — never blocking on Playwright.
- Admin UI: capture buttons (disabled while that target has an active scan, matching Stage 13's `hasActiveScan()` pattern), scan status display, and a way to view the resulting screenshots (signed URL, matching the existing `getSignedAssetUrl()` pattern private artifacts already use — screenshots are not exposed through the public `businesses/`/`scans/.../images/` proxy paths, since they're internal review/creative assets, not public-facing content).
- Polling or manual refresh on the business detail page to reflect `ScanEvent` status transitions after an async invocation (see "Workflow" below) — no long-lived connection back to the Lambda.

**Infrastructure (CDK):**
- ECR repository for the Playwright container image.
- Lambda function (container image package), with its own least-privilege execution role (see "Infrastructure and IAM" below) — never a reuse of the broad `webpresa-vercel-dev` policy.
- New Secrets Manager secret, `webpresa-{env}-capture-token` (`{ signingKey }`), via the existing `WebpresaSecret` construct — backs the preview capture token described under "Draft preview visibility."
- New SQS dead-letter queue, configured as the Lambda's asynchronous `OnFailure` destination — see "Failure destination and stale-scan recovery."
- CDK construct(s) wiring the above together, plus CloudWatch log group for the Lambda.
- Lambda invoke permission granted to whatever identity the Vercel Server Action authenticates as (the existing `webpresa-vercel-dev` IAM user, extended with `lambda:InvokeFunction` scoped to this one function's ARN — invocation permission is the one thing the Vercel-side identity needs; it must not also gain the Lambda's own S3/DynamoDB/Secrets/SQS permissions).

**Domain model:**
- `ScanEvent` extended (not a new model) — see "Domain model changes" below.

## Workflow (asynchronous, per target)

```text
Admin clicks "Capture Existing Site" or "Capture Generated Preview"
        ↓
Server Action validates the request (session, target eligibility —
  e.g. existing_site requires Business.websiteUrl to be set)
        ↓
Reject if another scan of the SAME targetType is already queued/running
  for this business (independent per target — an active existing_site
  scan does not block a generated_preview scan, and vice versa)
        ↓
Create a queued ScanEvent (provider: 'playwright', operation: 'screenshot',
  targetType, previewId set only for generated_preview)
        ↓
Invoke the Lambda asynchronously (InvocationType: 'Event') with an
  identifiers-only payload — see "Lambda payload" below
        ↓
Server Action returns success immediately; admin UI shows "Capture queued"
        ↓                                    (Server Action's job ends here)
Lambda: load the ScanEvent by scanId. Already in a terminal state
  (completed/partial/failed)? → exit successfully, no browser launched
  (handles Lambda's rare at-least-once duplicate delivery — see
  "Idempotency and status transitions" below)
        ↓ (still queued)
Lambda: conditionally transition ScanEvent → running (ConditionExpression:
  status = 'queued'; a losing race here also exits cleanly)
        ↓
Lambda: resolve the actual target URL from DynamoDB (never trusts a URL
  in the invocation payload) — see "Lambda payload" below
        ↓
Lambda: validate the URL (existing_site: shared SSRF guard; generated_preview:
  strict same-origin policy — see "URL validation" below)
        ↓
Lambda: launch browser, navigate, capture desktop viewport
        ↓
Lambda: capture mobile viewport
        ↓
Lambda: upload each captured screenshot to S3 as it succeeds
        ↓
Lambda: conditionally transition ScanEvent → completed (both viewports
  succeeded) / partial (one succeeded, one failed) / failed (neither
  succeeded) — ConditionExpression: status = 'running'; captureResults
  records each viewport's own outcome and storage key
        ↓
Admin page polls or is manually refreshed to see the terminal status

  [alternate path] Lambda throws or times out before writing any
  terminal status
        ↓
  MaximumRetryAttempts: 0 — AWS never automatically re-invokes
        ↓
  Failed invocation event delivered to the SQS DLQ (OnFailure destination)
        ↓
  ScanEvent stays running with no further automatic action
        ↓
  Stale-scan rule surfaces it once past the 10-minute threshold —
  see "Failure destination and stale-scan recovery" below
```

The Server Action never remains open waiting for Playwright to finish. `'partial'` is a new terminal `ScanEvent` status (see below) — a real, expected outcome (e.g. mobile times out on a slow site while desktop succeeds), not an error condition requiring special handling beyond what `captureResults` already communicates per viewport.

## Lambda payload — identifiers only

The Lambda receives no URLs and does no trusting of caller-supplied data beyond IDs:

```json
{ "businessId": "biz_...", "scanId": "scan_...", "targetType": "existing_site" }
```
or
```json
{ "businessId": "biz_...", "scanId": "scan_...", "targetType": "generated_preview", "previewId": "preview_..." }
```

The Lambda re-reads the actual target from DynamoDB itself:
- `existing_site` → `Business.websiteUrl`.
- `generated_preview` → load the `SitePreview` by `previewId`, then construct its public URL as `{APP_BASE_URL}/b/{slug}` — `SitePreview` stores only a `slug`, never an absolute URL, so the Lambda needs the app's public origin. Provide this as a Lambda environment variable (e.g. `WEBPRESA_APP_BASE_URL`, set via the CDK construct's environment config) rather than hardcoding a domain.

This keeps the trust boundary identical to every other integration in this codebase: the caller (Vercel) supplies identifiers, the callee re-resolves the actual sensitive value (here, a URL to navigate a browser to) from the canonical store rather than accepting it second-hand. Note the payload never carries a capture token either — see "Draft preview visibility" immediately below for why that's minted inside the Lambda, not passed in.

### Draft preview visibility

`/b/[slug]` restricts draft/ready previews to authenticated admins (see `architecture.md`, "Public preview website"). Most `generated_preview` captures happen on an unpublished draft — for internal review and postcard creative, well before a business is claimed — so the Lambda (which has no admin session/cookie) must still be able to render it. Do not weaken the public draft-protection guarantee to solve this.

**The token is minted by the Lambda, immediately before navigation — never by the Server Action at invoke time.** A token generated when the Server Action fires the async invocation could expire before a delayed or AWS-redelivered execution actually runs, and passing a live credential through the invocation payload would also break the identifiers-only payload contract above. Instead:

1. The Lambda loads and validates the `ScanEvent` (and, for `generated_preview`, the referenced `SitePreview`) from DynamoDB, as already described.
2. Immediately before navigating, the Lambda mints a fresh, single-purpose token: `{ purpose: 'preview_capture', previewId, scanId, exp }` — a short expiry (minutes), signed with a dedicated signing key.
3. **The token is delivered as an HTTP-only cookie, never a URL query parameter.** Playwright sets the cookie on its browser context (scoped to the configured Webpresa domain) before navigating, then requests the plain `/b/{slug}` URL with no token in it anywhere. A query-string token would end up in Vercel request logs, monitoring/analytics logs, browser navigation history, error reports, and potentially referrer headers on any downstream request the page itself makes — a cookie avoids all of that. Indicative cookie shape (exact `domain`/dev-vs-prod handling to be finalized during implementation): `{ name: '__Host-webpresa_capture', value: token, path: '/', httpOnly: true, secure: true, sameSite: 'Strict' }`.
4. `/b/[slug]`'s existing auth gate reads that cookie and accepts it as an alternate, narrowly-scoped bypass **only** after verifying every claim — signature, `purpose === 'preview_capture'`, `previewId` matches the record being rendered, `scanId` matches an actual in-flight `ScanEvent`, and `exp` hasn't passed. Checking the signature alone is not sufficient — a validly-signed token for the wrong preview or a stale scan must still be rejected.

This is a genuinely new piece of the auth surface and should be treated with the same care as `SESSION_SECRET`-signed cookies. The signing key is **not** an existing secret — see "Infrastructure and IAM" below for the new dedicated Secrets Manager secret this requires.

### Platform-level access: Vercel Deployment Protection

Distinct from the app-level draft-protection problem above, and discovered only through live testing against a real deployed environment: Vercel's own **Deployment Protection** (Vercel Authentication) sits in front of the entire non-production deployment at the edge, redirecting any unauthenticated request — including the Lambda's server-side Playwright navigation — to Vercel's own login page, before Next.js or the capture-token cookie logic above ever runs. The capture-token mechanism can't reach far enough to solve this; it's a platform-level gate, not an app-level one, and weakening it (disabling Deployment Protection entirely) would make the whole non-production deployment publicly reachable by anyone, not just this Lambda.

Fixed with Vercel's own purpose-built mechanism for exactly this case — **Protection Bypass for Automation**: a project-level secret, generated in Vercel's dashboard, sent as the `x-vercel-protection-bypass` HTTP header (plus `x-vercel-set-bypass-cookie: true` so subresource requests within the same browser context also pass) on `generated_preview` navigations only (`existing_site` targets real external business websites, never Webpresa's own deployment, so this header is irrelevant there). Stored the same way as the capture-token signing key — a dedicated Secrets Manager secret (`webpresa-{env}-vercel-protection-bypass`, `{ bypassSecret }`), read-only by the screenshot Lambda's own execution role, never by the Next.js app (which has no code path that touches this value — Vercel's edge checks the header against its own copy of the secret, independent of this app's Secrets Manager).

## Storage key structure

Each target's `scanId` gets its own subfolder, split by target name (redundant with `targetType` already being on the `ScanEvent` record, but kept as a second, physical safeguard — a code path that writes to the wrong target's folder is visibly wrong in S3, not just wrong in a database field):

```
scans/{businessId}/{scanId}/existing/desktop.png
scans/{businessId}/{scanId}/existing/mobile.png

scans/{businessId}/{scanId}/preview/desktop.png
scans/{businessId}/{scanId}/preview/mobile.png
```

A given `ScanEvent` only ever populates one of the two subfolder shapes (`existing/` or `preview/`), matching its own `targetType`. This is a new sub-shape of the existing `scans/{businessId}/{scanId}/...` prefix already reserved since Stage 9 — no change to `ALLOWED_PREFIXES` (`web/lib/s3/assets.ts`) is needed. Screenshots are **not** added to the public `/api/assets/...` proxy's allowed patterns — they stay private, admin-viewable only via `getSignedAssetUrl()`, unlike Stage 13's accepted/review-required website images (which are legitimately public-facing content once promoted).

## Domain model changes

Extend the existing `ScanEvent` model (`domain/models/scan-event.ts`) — do not introduce a parallel model, and reuse the existing `createScanEvent()` factory (already generic over `provider`/`operation` since Stage 13):

- `SCAN_PROVIDERS`: add `'playwright'`.
- `SCAN_OPERATIONS`: add `'screenshot'`.
- `SCAN_STATUSES`: add `'partial'` (a completed-but-incomplete terminal state — see "Workflow" above).
- `SCAN_FAILURE_CATEGORIES`: add `browser_launch_failed`, `navigation_timeout`, `page_load_failed`, `blocked_by_bot_protection`, `screenshot_failed`, `upload_failed`. Top-level `failureCategory`/`failureMessage` remain the whole-scan summary (used as-is by Firecrawl scans, and set on a Playwright scan when neither viewport succeeds); per-viewport detail lives in `captureResults` (immediately below), which is what makes a `'partial'` result diagnosable.
- New field `targetType: 'existing_site' | 'generated_preview'`.
- New field `previewId?: string` — the `SitePreview` being captured, set only when `targetType` is `'generated_preview'`. This is distinct from the existing `generatedPreviewId` field (Stage 13's output — a preview a Firecrawl scan *produced*); Stage 14 never sets `generatedPreviewId`, since capturing screenshots never generates a preview.
- New field `captureResults?: { desktop?: ViewportCaptureResult; mobile?: ViewportCaptureResult }`, where `ViewportCaptureResult = { status: 'completed' | 'failed'; storageKey?: string; failureCategory?: ScanFailureCategory; failureMessage?: string }`. **This supersedes the generic reserved `storageKeys` field for Playwright scans specifically** — a single scan-level `failureCategory` can't say *which* viewport failed on a `'partial'` result, and folding each viewport's own storage key into its own result avoids two fields (a flat `storageKeys` map and a separate failure map) that could disagree with each other. Firecrawl `ScanEvent`s are unaffected — this field is Playwright-specific, same as `images` is Firecrawl-specific.
- Matching Zod schema updates in `scan-event.schema.ts`.

## URL validation

The two targets get **different, deliberately mismatched** validation policies, because they have different trust levels — treating both the same would either be too weak for an arbitrary external site or needlessly expensive/complex for a URL that's always our own app.

### `existing_site` — shared SSRF guard

`Business.websiteUrl` is a genuinely untrusted, admin-supplied external URL — reuse, do not duplicate, the SSRF guard Stage 13 built (`web/lib/firecrawl/url-validation.ts`'s `validateOutboundUrl()` — protocol allowlist, DNS resolution, private/loopback/link-local/AWS-metadata-endpoint rejection, redirect re-validation). Before this stage's implementation begins, relocate it to a shared, non-Firecrawl-specific module (e.g. `web/lib/security/url-validation.ts`) and update `lib/firecrawl/`'s own imports to point at the new location — it was already documented as a cross-cutting concern in Stage 25 (Security Hardening), not a Firecrawl-only one. Stage 14 imports the same shared implementation and calls it **inside the Lambda**, immediately before navigation.

### `generated_preview` — strict same-origin policy, not the SSRF guard

The preview target is never actually untrusted — it's always Webpresa's own generated site — so running the general-purpose DNS/private-range SSRF validator against our own app on every capture would be unnecessary overhead for a destination that was never in question. Instead, enforce same-origin directly:

- The origin comes **only** from the `WEBPRESA_APP_BASE_URL` Lambda environment variable — never from any caller-supplied value.
- The path comes **only** from the canonical `SitePreview.slug` looked up by `previewId` — never a caller-supplied slug or path.
- Any redirect the browser follows away from that configured origin is rejected outright (the capture fails rather than silently following it elsewhere).

This is simpler and safer for this specific case than reusing the general-purpose validator on a URL that was already fully constructed from trusted, code-controlled inputs.

## Operational parameters

- **Idempotency and status transitions:** the Lambda's asynchronous invocation is deliberately configured with `MaximumRetryAttempts: 0` (see "Architectural commitment" above) — **AWS never automatically re-invokes on failure.** This matters because a naive "just retry" design is actually unsafe without a lease system: a retry that lands after the first attempt already moved the `ScanEvent` to `running` would find `queued`→`running`'s condition failed, exit "successfully" having done no work, and the scan would sit `running` forever with no error surfaced anywhere. Rather than build the lease system that would make automatic retries safe, Stage 14 disables them outright and routes every failure to the DLQ instead (see "Failure destination and stale-scan recovery" below) — a stuck scan is always visible and actionable, never silently swallowed.
  - Conditional updates are still required, but for a narrower reason: Lambda's async invocation model is inherently **at-least-once**, not exactly-once, so a rare duplicate delivery of the same event is possible even with retries disabled — a fundamental property of the delivery mechanism, unrelated to the retry-count setting. Every `ScanEvent` status transition uses a conditional DynamoDB update to stay safe against that:
    - `queued` → `running`: `ConditionExpression` requires current status `= 'queued'`. A losing race (the duplicate delivery arriving second) exits cleanly rather than erroring.
    - `running` → a terminal state (`completed`/`partial`/`failed`): `ConditionExpression` requires current status `= 'running'`.
    - On load, if the `ScanEvent` is **already in a terminal state**, the Lambda exits successfully **without launching Chromium at all**. S3 keys are deterministic per `scanId`/viewport regardless, so even a write that does happen twice is a safe overwrite, not a duplicate.
  - A brand-new **admin-triggered** re-capture is a different case entirely — it gets its own fresh `scanId` and its own permanent history entry, consistent with this project's "never delete history" convention (project-wide rule 11; the same convention `SitePreview` versions and Stage 13 `ScanEvent`s already follow). Idempotency applies within one `scanId`'s lifecycle, never across separate captures.
  - **Known open risk, deliberately not fully solved in this stage:** the rare duplicate-delivery case could still theoretically land while an earlier attempt is mid-flight and both observe `running` (a narrow window between the conditional read and write). A full lease system (`executionId`/`startedAt`/`leaseExpiresAt`, with a lease-expiry takeover rule) would close this completely but is judged excessive for Stage 14's volume, especially now that automatic retries are disabled and no longer the primary driver of this risk; the minimum bar here is conditional transitions plus reserved concurrency (below). Revisit if real usage shows double-execution in practice.
- **Reserved concurrency:** 2–5.
- **Memory:** 2048–3072 MB.
- **Timeout:** 180 seconds (overall Lambda timeout; navigation itself uses a shorter strict sub-timeout — see below).
- **Viewport capture:** desktop `1440 × 1000`, mobile `390 × 844`, **`fullPage: false`** — the visible viewport only, never a full-page scrolling capture. A full-page screenshot of a long site is unusable on a postcard and makes memory/file-size unbounded; full-page capture stays explicitly deferred (see "Deferred work").
- **Wait strategy:** `networkidle` is unreliable on real sites with persistent analytics/chat-widget/polling connections that never go quiet, so it is not the primary condition capture waits on. Sequence: (1) `page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })`; (2) wait for `document.fonts.ready`, bounded; (3) wait for a visible root/body element; (4) a short bounded stabilization delay (~1–2s); (5) disable animations (below); (6) capture. `networkidle` may still be attempted as a short, bounded, best-effort enhancement layered on top of this — it must never be able to block capture indefinitely the way it could as a primary condition.
- **Animation disabling:** disable CSS/JS animations and transitions before capture (consistent screenshots, no mid-transition frames).
- **Partial success handling:** capture desktop and mobile independently; one viewport's failure does not abort the other. Result: `'completed'` (both), `'partial'` (one), or `'failed'` (neither), with `captureResults.desktop`/`captureResults.mobile` recording each viewport's own outcome — see "Workflow" and "Domain model changes" above.
- **Size bound:** with `fullPage: false` and fixed viewport dimensions, file size is already naturally bounded; still apply a sanity max-byte check before upload as a defensive backstop.
- **Timeout handling:** a per-viewport navigation/capture timeout maps to `navigation_timeout`; other classified failures map to the other new failure categories above, recorded on that viewport's own `captureResults` entry. Never a bare `unknown` when a more specific category applies.
- Do not log into websites, do not bypass authentication, block unnecessary large media where practical, and attempt normal cookie-banner dismissal without defeating access controls (all carried over from the original spec — still correct, unchanged).

## Failure destination and stale-scan recovery

An async Lambda invocation can fail (throw, time out, or be throttled away entirely) before the handler ever updates the `ScanEvent`. With automatic retries disabled (`MaximumRetryAttempts: 0` — see "Architectural commitment" and "Idempotency and status transitions" above), that failure is never silently retried into a lease conflict, but it also means there's no second attempt at the actual work — so a real, visible failure path is required, not optional:

- **Asynchronous invocation configuration**, explicit: `MaximumRetryAttempts: 0`, `MaximumEventAge` ≈ 5–10 minutes (an event older than this is discarded rather than attempted), `OnFailure` destination → the DLQ below.
- **CDK-managed SQS dead-letter queue** as the Lambda's asynchronous `OnFailure` destination (`DestinationConfig.OnFailure`) — chosen over a Lambda-to-Lambda failure handler as the simplest option that meets this stage's actual need, consistent with every other stage's "build only what's needed now" convention. The DLQ does not itself touch DynamoDB; it exists purely to preserve the failed invocation event for inspection and manual recovery, so a permanent failure is never silently lost. DLQ message retention: 14 days.
- **The two failure paths, stated explicitly so they aren't conflated:**
  - Invocation **succeeds** (even if the capture itself fails) → the normal `queued` → `running` → terminal (`completed`/`partial`/`failed`) workflow above, with `captureResults`/`failureCategory` describing what went wrong.
  - Invocation **throws or times out before reaching the handler's own terminal write** → no automatic retry → the failed event lands in the DLQ → the `ScanEvent` itself stays `running` (or `queued`, if it failed before even that transition) with no further automatic action → the stale-scan rule below is what eventually surfaces it to an admin.
- **Stale-scan rule:** a `queued` or `running` Playwright `ScanEvent` older than **10 minutes** is treated as stale. This is checked when the admin views the business detail page (a plain "is this scan older than the threshold and still non-terminal?" check against the already-loaded `ScanEvent`, not a background job or scheduled sweep — consistent with this stage having no automation, see "No automatic chaining" below) — a stale scan is presented with an option to mark it `failed` or trigger a fresh capture, the same way Stage 13's failed-scan retry already works.

## Infrastructure and IAM

Least-privilege, and never a reuse of the existing broad `webpresa-vercel-dev` grants (which are scoped to the Vercel app's own needs, not this Lambda's):

- **S3:** `s3:PutObject` only, scoped to real object ARNs — `arn:aws:s3:::<assets-bucket-name>/scans/*/*/existing/*` and `arn:aws:s3:::<assets-bucket-name>/scans/*/*/preview/*` (bucket name resolved the same way every other prefix-scoped grant in `deployment.md` already resolves it) — not the whole bucket, not even the whole `scans/` prefix. Screenshots are single small PNGs uploaded via standard `PutObject`; no multipart upload is used, so `s3:AbortMultipartUpload` is not granted.
- **DynamoDB:** `dynamodb:GetItem` on **all three** tables this Lambda reads — Businesses, SitePreviews, **and ScanEvents** (the Lambda must load its own `ScanEvent` to verify `targetType`/`previewId` against the canonical record and to check current status before every conditional transition — see "Idempotency and status transitions" above); `dynamodb:UpdateItem` on ScanEvents only, since that's the only table this Lambda ever writes. Every lookup is a direct `GetItem` by partition key (`businessId`/`previewId`/`scanId` are each the table's own PK — see `architecture.md`, "DynamoDB tables") — no `Query`, no GSI access needed.
- **Secrets Manager:** `secretsmanager:GetSecretValue` scoped to two new secrets, both provisioned the same way as every existing secret (`WebpresaSecret` CDK construct, Stage 10's pattern): `webpresa-{env}-capture-token` (`{ signingKey }`, mints the preview capture token — see "Draft preview visibility" above) and `webpresa-{env}-vercel-protection-bypass` (`{ bypassSecret }`, bypasses Vercel's Deployment Protection for `generated_preview` navigations — see "Platform-level access: Vercel Deployment Protection" above). No third-party API key is needed for either; this Lambda calls no external service besides the target website/preview itself and Vercel's own edge (which the bypass secret is presented to, not a separate API call).
- **SQS:** `sqs:SendMessage` on the new dead-letter queue (see "Failure destination and stale-scan recovery" below) — required for the Lambda service to deliver a failed-invocation record to the configured `OnFailure` destination on this execution role's behalf.
- **CloudWatch Logs:** the standard Lambda execution-role log-group grant (unavoidable minimum for any Lambda), with an explicit **14–30 day retention** set on the log group (CDK default is "never expire," which is unbounded cost for a Lambda that runs a real browser and can log verbosely).
- **Vercel-side identity (`webpresa-vercel-dev`):** gains exactly one new permission, `lambda:InvokeFunction` scoped to this function's ARN — nothing else changes about its existing policy. It does not gain any of the Lambda's own S3/DynamoDB/Secrets/SQS permissions above.
- **Housekeeping (cheap, non-architectural, but should be set from day one rather than left at defaults):** ECR lifecycle rule retaining only the most recent 5–10 container images (each build pushes a new one; unbounded retention is silent storage cost); DLQ message retention 14 days (see "Failure destination and stale-scan recovery" above).

## No automatic chaining

Preserves the manual-workflow philosophy Stages 12 and 13 already established: both capture actions are admin-initiated only. Stage 14 is never automatically triggered by Stage 13 (Firecrawl) completing, and never automatically triggers Stage 15 (AI scoring) on its own completion — each stage remains its own explicit action until Stage 23 (EventBridge Controlled Automation) exists and is deliberately turned on.

## Acceptance criteria

- An admin can trigger an existing-site capture (when `Business.websiteUrl` is set) and a generated-preview capture independently, from the business detail page.
- A business with no website shows "No existing website available" instead of an existing-site capture action, and the Lambda is never invoked for that target.
- A `ScanEvent` (`provider: 'playwright'`, `operation: 'screenshot'`) is created per capture, transitions `queued` → `running` → a terminal state, and its `targetType` (plus `previewId` for preview captures) is recorded.
- The triggering Server Action returns immediately and never blocks on Playwright execution.
- Both viewports are captured independently, `fullPage: false`, at the exact specified dimensions; one viewport's failure does not prevent the other from completing, and produces `'partial'`, not a hard failure.
- Screenshots upload to the private, target-split S3 key structure; `ScanEvent.captureResults.desktop`/`.mobile` each accurately reflect that viewport's own outcome and storage key.
- Admin can view completed screenshots through short-lived signed URLs, not a public path.
- The Lambda's asynchronous invocation configuration has `MaximumRetryAttempts: 0` confirmed in CDK/console — AWS never automatically re-invokes on failure.
- In the rare case of Lambda's own at-least-once duplicate delivery for the same `scanId`, the second delivery finds the `ScanEvent` already in a terminal state and exits without launching a browser — no duplicate files, no corrupted status, no wasted browser launch.
- Every `ScanEvent` status transition uses a conditional update (`queued`→`running` only from `queued`; terminal only from `running`); a losing race exits cleanly rather than corrupting the record.
- A repeat admin-triggered capture of the same target creates a new `ScanEvent`/`scanId` and does not delete or overwrite a prior capture's history.
- Concurrent active captures for the same business **and target** are prevented; an active `existing_site` capture does not block a `generated_preview` capture for the same business, or vice versa.
- A draft (unpublished) generated preview can still be captured — the Lambda provides the short-lived capture token through a secure, HTTP-only cookie (never a URL query parameter or any other logged/visible location), and the preview route verifies every claim (purpose, `previewId`, `scanId`, expiry), not just its signature, working only for the one preview/scan it was issued for.
- A `ScanEvent` stuck `queued`/`running` past the 10-minute staleness threshold is flagged on the business detail page, with an admin option to mark it failed or retry.
- An invocation that throws or times out before the handler writes any terminal status is never automatically retried; it lands in the DLQ (inspectable, not silently lost) and its `ScanEvent` is caught by the stale-scan rule.
- The Lambda is confirmed to have no VPC configuration (no ENI attachment, no NAT Gateway dependency).
- The Lambda's IAM role cannot write outside its two S3 prefixes, read/write DynamoDB tables/items beyond exactly Businesses/SitePreviews/ScanEvents as specified, or read any Secrets Manager secret besides `webpresa-{env}-capture-token`.
- Private, local-network, and otherwise SSRF-prohibited `existing_site` target URLs are blocked before navigation, using the shared (not duplicated) SSRF guard; a `generated_preview` capture is rejected if it ever resolves or redirects outside the configured `WEBPRESA_APP_BASE_URL` origin.

## Deferred work

- Full-page (`fullPage: true`) and multi-viewport variants beyond the two fixed desktop/mobile viewports
- Visual-diff history between captures
- Video capture
- ECS/Fargate migration
- Cookie-banner provider library
- A full lease-based concurrency system (`executionId`/`startedAt`/`leaseExpiresAt`) beyond the conditional status transitions specified above — revisit only if real usage shows double-execution in practice
- Automatic chaining into Stage 15 scoring (explicitly out of scope — see "No automatic chaining")
- Scheduled/batch capture (Stage 23's concern, not this stage's)

---

# Stage 15 — AI Prospect Qualification & Website Analysis

## Objective

Generate a structured, reviewable assessment of a business's existing website that determines its quality, identifies improvement opportunities, and prioritizes it as a sales prospect. The score is an internal prioritization tool, not an objective fact — outreach execution (which channel, in what order) remains Stage 21/22's concern, not this stage's.

## Dependencies

Stages 10, 12, 13, and 14.

## Scope note: this stage scores the existing site, not the generated preview

Stage 14 introduced two independent capture targets, each its own `ScanEvent` (`targetType: 'existing_site' | 'generated_preview'`). Stage 15 scores only the **`existing_site`** `ScanEvent` for a business — a business's existing website is the only thing being evaluated as a sales prospect, so there is nothing meaningful to score on the `generated_preview` side. This holds regardless of when a preview happens to exist: `enrichBusinessWebsite` (Stage 13) already generates and persists a preview unconditionally as part of crawling, so by the time Stage 15 runs a preview is typically already present — Stage 15 simply has no reason to score it.

## Major deliverables

- AI analysis prompt (`chat.completions.parse` + `zodResponseFormat`, following the pattern in `web/lib/ai/`)
- Structured response schema, re-validated app-side after the API's own schema enforcement (same defense-in-depth pattern as `generatePreviewContent`)
- Deterministic website metrics (computed by the application, not the model)
- AI category scores, explanations, and suggested improvements
- Overall website quality score and confidence level
- Lead priority
- Qualification result
- Website strengths, weaknesses, and missing opportunities
- Executive summary and top problems
- Admin override (score and qualification)
- Preserved original AI response

## Deterministic metrics

Computed by the application and included in the AI prompt as grounding context — not model output. Collect:

- Website exists
- HTTPS enabled
- Crawl succeeded (from the Stage 13 `ScanEvent`)
- Desktop screenshot captured / mobile screenshot captured (from the Stage 14 `existing_site` `ScanEvent`)
- Firecrawl extraction confidence
- Google Places data available
- Business category, website URL, city, state
- Phone detected, email detected, contact form detected
- Google rating, Google review count
- Social profiles detected, hours detected, services detected
- Hero image available

## AI scoring categories

Evaluate each category from 0–100. Each category returns a score, an explanation, and a suggested improvement.

- Mobile friendliness
- Visual design
- Branding
- Professionalism
- Trust
- Calls to action
- Lead generation
- Local SEO
- Service clarity
- Content quality
- Accessibility
- Overall user experience

## AI input

- Firecrawl crawl content and page metadata (from the Stage 13 `ScanEvent`)
- Desktop and mobile screenshots (from the Stage 14 `existing_site` `ScanEvent.captureResults`)
- Google Places business data
- Deterministic website metrics (above)
- Business category, city, existing website URL

## AI output

Strict schema, returned in one structured-output call:

- Overall website score (0–100) and confidence (High / Medium / Low)
- Lead priority (High / Medium / Low)
- Qualification (Qualified / Manual Review / Reject)
- Category scores: for every category, `score`, `explanation`, `suggested improvement`
- Website strengths — the strongest aspects of the current site
- Website weaknesses — the biggest issues affecting trust, conversions, usability, or professionalism
- Missing opportunities — e.g. FAQ, testimonials, gallery, team section, contact form, online booking, service areas, certifications, trust badges, reviews. This is advisory context for the admin and for the existing deterministic `recommendWebsiteSections()` flow (`web/lib/website-sections/recommend.ts`) — the AI does not write to `WebsiteSectionsConfig` directly. Per the existing invariant ("AI must never directly control React components — this catalog is the only bridge"), the deterministic recommender remains the sole writer of section configuration.
- Executive summary, top problems, highest-impact improvements, and a short rationale for why this business is (or isn't) a good prospect

Outreach channel selection and campaign ordering (postcard / email / phone, and in what order) are explicitly **not** part of this stage's output — see "Deferred work."

## Qualification rules

The AI provides a recommendation; application rules may override it. Initial deterministic overrides:

- No website → Qualified
- Closed business → Reject
- National chain → Reject
- Government organization → Reject
- Website unavailable → Manual Review
- Invalid address → Manual Review

Do not trigger postcard mailing, or any other outreach action, solely from an AI score.

## No automatic chaining

Preserves the manual-workflow philosophy established in Stages 12–14: Stage 15 is never automatically triggered by Stage 14 completing. Scoring remains an explicit admin action until Stage 23 (EventBridge Controlled Automation) exists and is deliberately turned on.

## Persistence

Following the Stage 13/14 precedent of keeping scan-scoped derived data on `ScanEvent` and only durable, admin-facing summary state on `Business`:

**On `ScanEvent`** (the full assessment, scan-scoped):
- Deterministic metrics
- Category scores, explanations, and suggested improvements
- Strengths, weaknesses, missing opportunities
- Executive summary, top problems
- Overall score, confidence
- Prompt version, model, timestamp (no temperature — the scoring model is reasoning-class and only supports its API default value)

**On `Business`** (durable summary, mirrors the `enrichmentStatus`/`manualApprovalReason` pattern from Stage 13):
- Qualification result
- Lead priority
- Overall score (rollup, for admin list/filter views)
- Admin-reviewed score and qualification, when provided — stored separately from the AI-generated values; admin overrides must never overwrite the original AI assessment

**Raw AI response:** stored as an S3 artifact (an `aiResponseArtifactKey` on `ScanEvent`, following the `rawArtifactKey`/`extractedArtifactKey` pattern from Stage 13) rather than inline in the DynamoDB item, to avoid item-size bloat from a 12-category structured response.

**New failure categories** (extending `SCAN_FAILURE_CATEGORIES`, following the pattern of Stage 13/14 each adding their own): `invalid_ai_schema_output`, `ai_request_failed`, `ai_timeout`.

## Acceptance criteria

- A completed `existing_site` scan can be scored.
- AI output validates against a strict schema; invalid output is rejected and recorded under one of the new scoring failure categories, not silently discarded.
- Deterministic metrics are computed and included in the prompt.
- Category scores, explanations, and suggested improvements are generated and persisted.
- Confidence, lead priority, and qualification are returned and persisted.
- Missing-opportunities output is advisory only — no code path allows AI output to write `WebsiteSectionsConfig` directly.
- No outreach-channel or campaign-ordering data is produced by this stage.
- Admin can override the overall score and qualification on `Business`.
- The original AI assessment (including the raw response artifact) remains preserved after an admin override.
- The `Business` and `ScanEvent` reflect the completed scoring state.
- Test cases produce understandable and reasonably consistent assessments.

## Deferred work

- Calibration dataset
- Human-review analytics
- Industry-specific scoring weights
- Score-change / historical tracking
- Continuous rescoring
- Outreach channel recommendation and campaign ordering (postcard / email / phone) — Stage 21 (Campaign and QR Tracking) and Stage 22 (Lob Postcard Integration)'s concern; those stages consume this stage's lead priority and qualification as an input, not the other way around
- AI-driven writes to `WebsiteSectionsConfig` — the existing deterministic `recommendWebsiteSections()` remains the sole writer; this stage's missing-opportunities output is advisory only
- Automatic campaign execution
- Automatic template generation from recommendations

---

# Stage 16 — Step Functions Scan and Preview Workflow

## Status

Planned.

## Objective

Connect the independently working Google Places import, Firecrawl enrichment, Playwright screenshot capture, AI website scoring, and prospect qualification operations (Stages 11–15) into a durable, observable, idempotent Step Functions workflow.

The workflow must support businesses with:

- an existing website,
- no website,
- an inaccessible or partially scannable website,
- sufficient evidence for automatic qualification,
- insufficient or conflicting evidence requiring manual review.

Postcard creation and mailing (Stage 22, not yet built) remain outside this workflow.

## Dependencies

Stages 11 and 13–15.

- Stage 11 provides `generatePreviewContent` (`web/lib/ai/generate-preview.ts`) — called directly by this workflow only on the no-website branch (see "No-website path").
- Stage 12 provides discovered/imported `Business` records. It creates no `ScanEvent`s and is not otherwise invoked by this workflow.
- Stage 13 provides `enrichBusinessWebsite` (`web/lib/firecrawl/enrich-business.ts`) — crawl, normalize, image ingestion, **and** preview generation/persistence, already combined into one existing operation.
- Stage 14 provides `captureExistingSiteScreenshot`/`captureGeneratedPreviewScreenshot` (`web/lib/screenshots/capture.ts`).
- Stage 15 provides `scoreBusinessWebsite`/`applyQualificationOverrides` (`web/lib/scoring/score-business.ts`, `web/lib/scoring/qualification-rules.ts`) — normalized scores, qualification, lead priority.

## Architecture decision

Use an AWS Step Functions **Standard Workflow**. Preferred over an Express Workflow because this process can run longer than a short synchronous request, calls multiple external providers, requires durable execution history and observable retries, may pause logically at manual-review boundaries, and must preserve execution records for admin troubleshooting.

**Task Lambdas call back into the app, they do not reimplement its logic.** Only `screenshot-capture` (`infra/lambda/screenshot-capture/`) exists as a standalone AWS Lambda today — Firecrawl enrichment and AI scoring are Next.js Server Actions/lib code running on Vercel (`web/lib/firecrawl/`, `web/lib/scoring/`), already covered by their own test suites. Rather than porting or duplicating that logic into new Lambda bundles, Stage 16's task Lambdas invoke it through internal, authenticated API routes in the Next.js app. This extends the AWS→Vercel call pattern Stage 14 already established (the screenshot Lambda already reaches the Vercel-hosted preview using a `vercel-protection-bypass` secret from Secrets Manager) rather than inventing a second one.

## Major deliverables

- Step Functions Standard state machine
- Task-specific Lambda functions that call existing app logic via internal API routes
- A new `ScanExecution` record and `scan-executions` DynamoDB table
- Per-state timeout and retry policies
- Normalized catch and failure paths
- Manual admin trigger
- Workflow status display
- Rerun support
- Preview-screenshot capture on the qualified path

## Reused vs. new — what Stage 16 actually builds

Most of the individual work is already implemented. Stage 16's job is orchestration, a small number of genuinely new steps, and a new execution record — not reimplementing Stages 11/13/14/15.

| Workflow task | Wraps existing function | New code |
|---|---|---|
| `loadBusiness` | `getBusinessById` (`web/lib/db/businesses.ts`) | thin wrapper |
| `crawlWebsite` | `enrichBusinessWebsite` (`web/lib/firecrawl/enrich-business.ts`) — already crawls, normalizes, ingests images, **and** generates + persists a `SitePreview`, all in one operation | none |
| `captureSourceScreenshots` | `captureExistingSiteScreenshot` (`web/lib/screenshots/capture.ts`) | none |
| `scoreWebsite` / `qualifyProspect` | `scoreBusinessWebsite` (`web/lib/scoring/score-business.ts`) — already applies `applyQualificationOverrides` and updates `Business.qualification`/`leadPriority`/`websiteQualityScore` internally | none; may be one Step Functions task rather than two — a doc-only Step Functions modeling choice |
| `capturePreviewScreenshots` | `captureGeneratedPreviewScreenshot` (`web/lib/screenshots/capture.ts`) | none |
| `recordNoWebsiteSignals` | — | new: sets `Business.enrichmentStatus`/`manualApprovalReason` (reusing the exact `'manual_approval_required'`/`'missing_website'` values `handleMissingWebsite` already uses) plus the new `ScanExecution` signal fields below |
| `generatePreview` (no-website branch only) | `generatePreviewContent` + `createSitePreview`/`putSitePreview` | new orchestration — neither Stage 13's no-website path nor Stage 15's no-website shortcut generates a preview today; this is a new caller of already-working Stage 11 building blocks |
| `initializeScanExecution` / `finalizeScanExecution` / `recordScanFailure` / `queueManualReview` | — | new — these operate on the new `ScanExecution` record, not on `Business` or `ScanEvent` |

Do not create a single `processEverything` Lambda.

## Workflow ownership: `ScanExecution`

`ScanEvent` (`web/domain/models/scan-event.ts`) is already a **per-operation** record — exactly one per Firecrawl scrape, one per Playwright screenshot, one per AI score, immutable once terminal, with retries always creating a new `ScanEvent` linked via `retryOfScanId`. A single Stage 16 run spans several of these (one crawl, one or two screenshot captures, one score), so the workflow needs its own record rather than overloading `ScanEvent` with a second, incompatible meaning.

**`ScanExecution`** is that new record — the primary execution record for one Step Functions run, referencing the `ScanEvent`s (and the `SitePreview`) it produces rather than replacing them. New `scan-executions` DynamoDB table, following the existing `WebpresaTable` construct (`infra/lib/constructs/webpresa-table.ts`) and the `business-id-index` (`createdAt` sort key) convention already used by `scan-events`/`site-previews`.

Keep the Step Functions execution input small — identifiers, not full provider responses:

```ts
type ScanWorkflowInput = {
  businessId: string;
  scanExecutionId: string;
  requestedBy: string;
  triggerSource: 'admin_manual';
  forceRescan?: boolean;
};
```

`ScanExecution` itself:

```ts
type ScanWorkflowStatus =
  | 'queued'
  | 'running'
  | 'manual_review'
  | 'qualified'
  | 'reject'
  | 'preview_ready'
  | 'failed';

type ScanWorkflowStep =
  | 'initializing'
  | 'loading_business'
  | 'validating'
  | 'recording_no_website'
  | 'crawling'
  | 'capturing_source_screenshots'
  | 'scoring'
  | 'qualifying'
  | 'generating_preview'
  | 'capturing_preview_screenshots'
  | 'queueing_manual_review'
  | 'finalizing';

type ScanWorkflowFailure = {
  step: ScanWorkflowStep;
  /** Rolled up from the underlying ScanEvent's ScanFailureCategory (scan-event.ts) via a small mapping function — not an independent taxonomy. */
  category:
    | 'validation'
    | 'not_found'
    | 'rate_limit'
    | 'provider_timeout'
    | 'provider_error'
    | 'network'
    | 'schema_validation'
    | 'artifact_persistence'
    | 'conditional_conflict'
    | 'internal';
  safeMessage: string;
  provider?: 'firecrawl' | 'playwright' | 'openai' | 'internal';
  occurredAt: string;
  attemptCount: number;
  retryEligible: boolean;
};

interface ScanExecution {
  scanExecutionId: string; // scanexec_<uuid>
  businessId: string;
  executionArn?: string;
  executionName?: string;
  status: ScanWorkflowStatus;
  currentStep?: ScanWorkflowStep;
  triggerSource: 'admin_manual';
  requestedBy: string;

  // References to the per-operation records this execution produced —
  // never a copy of their content.
  crawlScanId?: string;              // ScanEvent: provider 'firecrawl', operation 'scrape'
  sourceScreenshotScanId?: string;    // ScanEvent: provider 'playwright', targetType 'existing_site'
  scoreScanId?: string;               // ScanEvent: provider 'openai', operation 'score'
  previewScreenshotScanId?: string;   // ScanEvent: provider 'playwright', targetType 'generated_preview'
  previewId?: string;                // SitePreview produced by crawlScanId, or by the no-website branch

  qualification?: QualificationResult; // reuse website-assessment.ts, not a redefined type
  leadPriority?: LeadPriority;
  manualReviewReason?: string;

  attemptNumber: number;
  parentScanExecutionId?: string;
  rerunReason?: string;
  failure?: ScanWorkflowFailure;

  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}
```

Reuse `QualificationResult` (`'qualified' | 'manual_review' | 'reject'`) and `LeadPriority` from `web/domain/models/website-assessment.ts` directly rather than defining a parallel type.

## Suggested workflow

```text
Initialize Scan Execution
  ↓
Load Business
  ↓
Validate Scan Eligibility
  ↓
Website exists?
  ├─ No
  │    ↓
  │  Record No-Website Signals
  │    ↓
  │  Score & Qualify (Stage 15's existing no-website shortcut — auto "qualified", no OpenAI call)
  │    ↓
  │  Qualified? → Generate Preview (new orchestration) → Capture Preview Screenshots
  │
  └─ Yes
       ↓
     Crawl Website  (crawl + normalize + image ingest + generate + persist preview — one existing operation)
       ↓
     Capture Source-Site Screenshots
       ↓
     Score Website & Qualify Prospect

Qualification Result
  ├─ manual_review → Queue for Manual Review (a preview may already exist from Crawl Website)
  ├─ reject        → Finalize (a preview may already exist from Crawl Website; not surfaced for outreach)
  └─ qualified     → Capture Preview Screenshots → Mark Preview Ready for Review → Finalize
```

This intentionally differs from earlier drafts of this stage: preview generation is **not** gated behind qualification on the has-website path, because `enrichBusinessWebsite` already produces a preview unconditionally as a side effect of crawling — before scoring even runs. The qualification decision instead controls whether the workflow proceeds to preview-screenshot capture and "ready for review," and (once Stage 21/22 exist) postcard eligibility — it does not decide whether a preview exists.

Note: Stage 15's own "Scope note" (above, `## Scope note: this stage scores the existing site, not the generated preview`) currently states that scoring runs "before a preview exists." That statement no longer matches `enrichBusinessWebsite`'s actual behavior — a preview is already created during crawl, before Stage 15 ever runs. Worth a follow-up correction to that note; left untouched here since it's outside this rewrite's scope.

## Qualification behavior

### Qualified

- Has-website path: a preview already exists (created during Crawl Website). Capture preview screenshots, then mark it ready for review.
- No-website path: generate and save a preview (see "Reused vs. new"), then capture preview screenshots.

Preview screenshot capture is separate from source-site screenshot capture and never triggers postcard mailing.

### Manual review

Do not automatically continue into postcard creation or mailing. Two distinct existing "needs a human" signals both roll up into this one workflow status, each keeping its own structured reason rather than being collapsed into a single generic one:

- Stage 13's enrichment disposition — `Business.enrichmentStatus`/`manualApprovalReason` (`'missing_website' | 'no_usable_images' | 'insufficient_content' | 'other'`) — about content/image availability.
- Stage 15's qualification — `Business.qualification === 'manual_review'`, driven by `applyQualificationOverrides` for a Firecrawl failure in `{website_unreachable, blocked_url, invalid_url}`, or low AI confidence — about prospect quality.

A manual-review outcome may coexist with an already-generated preview (has-website path) or no preview at all (no-website path, when not qualified).

Only route on reasons the current pipeline actually produces: missing website, no usable images, a crawl/screenshot failure, AI schema-validation failure after its bounded retry, or low AI confidence. `web/lib/scoring/qualification-rules.ts` explicitly documents that "closed business," "national chain," "government organization," and "invalid address" overrides are **not implemented** — no such signal exists on `Business` today. Do not have Stage 16 assume these reasons are available; treat them as a possible future Stage 15 extension.

### Reject

Complete the workflow successfully without further action. A `reject` result is not a failed workflow, and — unlike the draft assumption — does not imply no preview exists: on the has-website path a preview may already have been created by Crawl Website. Store the qualification evidence (already persisted via `ScanEvent.assessment` and `Business.qualification`/`websiteQualityScore`) so the decision can be reviewed and rescanned later.

## No-website path

A missing `Business.websiteUrl` is a valid business condition, not an exception — this already matches `enrichBusinessWebsite`'s existing `handleMissingWebsite` behavior (skip Firecrawl, terminal `ScanEvent` with `failureCategory: 'missing_website'`).

For a business without a website, the workflow:

- skips Firecrawl (Stage 13's existing no-website path already does this),
- skips source-site screenshot capture (there is no source site),
- records explicit no-website signals (reusing `enrichmentStatus: 'manual_approval_required'`/`manualApprovalReason: 'missing_website'`, the same values `handleMissingWebsite` already sets),
- runs Stage 15's existing no-website qualification shortcut (auto-`'qualified'`, no OpenAI call — see `scoreBusinessWebsite`),
- generates a preview when qualified, via the new `generatePreview` orchestration described above,
- captures preview screenshots once one exists,
- still requires manual review when Stage 13 also flagged `'no_usable_images'`, even though qualification itself passed.

Reuse the existing `ScanFailureCategory` distinctions (`scan-event.ts`) rather than introducing a new parallel status enum for source-website availability — `missing_website` (no website) is already distinct from `website_unreachable`/`blocked_url`/`invalid_url` (a website exists but couldn't be scanned).

## Task-specific functions

Use small task-specific Lambdas or direct AWS service integrations, per the "Reused vs. new" table above:

- `initializeScanExecution`
- `loadBusiness`
- `validateScanEligibility`
- `recordNoWebsiteSignals`
- `crawlWebsite`
- `captureSourceScreenshots`
- `scoreWebsite` / `qualifyProspect`
- `generatePreview` (no-website branch only)
- `capturePreviewScreenshots`
- `queueManualReview`
- `finalizeScanExecution`
- `recordScanFailure`

Do not create a single `processEverything` Lambda. A task Lambda may normalize a provider response and persist its own result, but it should not silently execute several unrelated workflow stages.

## Business record updates

`Business` already carries the durable, admin-facing rollups Stage 16 needs — do not reinvent them:

- `currentPreviewId`, `qualification`, `leadPriority`, `websiteQualityScore`, `adminReviewedQualification`, `adminReviewedScore` (Stage 15)
- `enrichmentStatus`, `manualApprovalReason`, `manualApprovalNote` (Stage 13)

Add only what's genuinely new — a workflow-level rollup distinct from the Stage-13-specific `enrichmentStatus`:

- `latestScanExecutionId?: string`
- `scanExecutionStatus?: ScanWorkflowStatus`
- `scanExecutionUpdatedAt?: string`

These fields must only be updated through conditional transitions (matching `updateBusiness`'s existing merge-against-freshly-fetched-record behavior) so an older or duplicate execution cannot overwrite newer results. The complete execution history remains on `ScanExecution` and the individual `ScanEvent`s.

## Idempotency and duplicate execution protection

Duplicate admin triggers must not corrupt business, scan, or preview state — the same conditional-update discipline Stage 13/14 already established for `ScanEvent` transitions applies here:

1. Create a `ScanExecution` in `queued` before starting the state machine.
2. Prevent a second active execution from claiming the same business (mirrors `hasActiveScan` in `enrich-business.ts`, which already blocks a concurrent Firecrawl attempt).
3. Start the Step Functions execution with a deterministic or collision-resistant execution name; persist the returned execution ARN/name on `ScanExecution`.
4. Each state that writes data must be idempotent — conditional DynamoDB expressions, expected current-status checks, and compare-before-update on `Business`, exactly as Stage 13/14 already do.

Do not rely on Lambda reserved concurrency as the primary duplicate-execution safeguard — Stage 14 already established this precedent (`MaximumRetryAttempts: 0` + DLQ instead of relying on concurrency limits). Reserved concurrency may still be configured later as an operational limit, but correctness comes from conditional transitions.

## Rerun behavior

An admin must be able to rerun a failed, rejected, or manual-review scan without mutating the historical execution — mirroring `retryEnrichmentScan`'s existing pattern of always creating a new `ScanEvent` rather than flipping a terminal one back to `running`.

A rerun creates a new `ScanExecution` with a new `scanExecutionId`, a new Step Functions execution, an incremented `attemptNumber` or `parentScanExecutionId` reference, and an optional `rerunReason`. Do not reset a completed historical `ScanExecution` back to `queued`.

`forceRescan` may bypass freshness checks but must not bypass input validation, idempotency controls, or execution ownership.

## Retry policies

Configure retries per task, not through one global rule — following the bounded-inline-retry pattern already implemented in `scrapeWithBoundedRetry` (`enrich-business.ts`) and `isRetryableFailureCategory`/`computeAutomaticRetryDelayMs` (`web/lib/firecrawl/retry.ts`).

Retry temporary failures: provider rate limits, timeouts, network interruptions, Firecrawl/Playwright/OpenAI 5xx or infrastructure failures, transient AWS SDK failures. Use exponential backoff with bounded attempts and jitter where supported.

Do not repeatedly retry: missing business records, invalid workflow input, missing required identifiers, malformed stored records, invalid application schemas, conditional ownership conflicts, unsupported website URLs. AI schema-validation failures may receive one bounded corrective retry (matching Stage 15's own bounded-retry behavior); after that, route to manual review or failure by category.

Each task must define its own timeout so a provider call cannot leave a Lambda or workflow state running indefinitely.

## Failure and partial-success handling

Not every missing artifact should fail the whole workflow.

**Fatal:** business record missing, invalid workflow input, execution ownership lost, persistent artifact-storage failure, invalid internal record schema, preview persistence failure, unrecoverable internal exception.

**Recoverable/reviewable, after retries are exhausted:** Firecrawl fails but source screenshots are available; screenshots fail but crawl content is available; the source site blocks automation; the AI cannot confidently qualify the prospect. Persist partial results and route to manual review when useful evidence still exists — never claim a source was analyzed when a required signal was actually unavailable.

Record failures with: failed step, normalized error category (mapped from the underlying `ScanEvent.failureCategory`), safe error message, provider when applicable, timestamp, attempt count, execution reference, retry eligibility, whether partial artifacts were retained, whether manual review is possible. Never store secrets, credentials, or raw provider responses in the failure message — detailed diagnostics belong in CloudWatch logs, not the admin-facing record.

## Execution references

Persist the Step Functions execution ARN/name on `ScanExecution`. The admin interface should link workflow records to the business, the `ScanExecution`, the generated preview when present, the current status/step, and the safe failure summary when present. Do not make the AWS console the only way to determine what happened.

## Admin trigger

Add a manual admin action (`Run full scan` / `Rescan` / `Retry as new scan`). The server-side trigger must: authorize the admin, validate the business, create the `ScanExecution`, claim execution ownership, start the Step Functions execution, persist the execution reference, and return the new `scanExecutionId`. The browser must not call Step Functions directly. Provide clear feedback for: an active scan already exists, a duplicate request was ignored, a new scan started, the business is not eligible, or Step Functions could not be started.

## Workflow status display

Show queued/running/current step/qualified/reject/manual review required/preview ready/failed, plus (when available) started/completed time, attempt number, latest safe error, source/screenshot/preview-screenshot availability, qualification reason, lead priority, and a rerun action. Distinguish a workflow failure from a valid `reject` qualification in the UI.

## Preview screenshot requirement

Source screenshots (Stage 14, captured from the prospect's existing site) and preview screenshots (captured after a preview is saved) serve different purposes — visual scoring/evidence for the former, admin review/before-after/future postcard creative for the latter. A business without an existing website has no source screenshot but can still have preview screenshots. Preview screenshot capture never triggers postcard mailing.

## Observability

Emit structured logs/metrics for: workflows started/completed/failed, workflows routed to manual review, workflows rejected, previews generated, crawl/screenshot/scoring/qualification failures, duplicate-trigger prevention, average workflow duration. Include `businessId`, `scanExecutionId`, the Step Functions execution name, and workflow step. Never log full crawl content, provider credentials, or secrets.

## Infrastructure requirements

Define the state machine, Lambda integrations, IAM permissions, log groups, and environment configuration through CDK, following the existing `WebpresaTable`/`WebpresaBucket`/`WebpresaSecret` construct pattern (`infra/lib/constructs/`). Grant each task only the permissions it requires — the Stage 16 state machine must not have permission to send postcards.

## Acceptance criteria

- An admin can manually start a complete scan workflow.
- A new `ScanExecution` is created for each execution, and the Step Functions execution reference is stored on it.
- Each major operation is visible as an individual workflow state.
- Businesses with no website skip crawl and source-screenshot states without failing.
- Existing websites are crawled and visually captured.
- Temporary failures retry per bounded, state-specific policy; permanent failures terminate safely with normalized failure details recorded.
- Recoverable provider failures can route to manual review when sufficient partial evidence exists.
- Qualification produces an explicit `qualified`, `manual_review`, or `reject` outcome (reusing `QualificationResult`).
- A `reject` outcome completes the workflow without necessarily implying no preview exists.
- Qualified businesses have a persisted, reviewable preview with separate preview screenshots — including no-website businesses that had none to begin with.
- Manual-review outcomes appear in the admin review queue.
- Duplicate manual triggers do not corrupt state or overwrite newer results.
- Completed scan executions remain immutable; reruns create new `ScanExecution`s rather than resetting completed ones.
- Large provider artifacts stay on the existing `ScanEvent`/S3 artifact keys, referenced (not duplicated) by `ScanExecution`.
- No postcard is created or sent automatically.
- The workflow does not depend on Lambda reserved concurrency for correctness.

## Deferred work

- EventBridge scheduled discovery or scanning
- Batch workflow execution / Distributed Map processing
- Human approval callback task tokens and automatic continuation after human approval
- Cost-aware provider branching
- Multi-page crawling and scoring
- Automatic postcard creation and mailing
- Workflow cancellation from the admin interface
- Automatic stale-scan refresh
- Extending qualification overrides to "closed business," "national chain," "government organization," and "invalid address" signals (Stage 15's concern, not this stage's)

---

# Stage 17 — Website Claim Flow

## Status

Not started. This specification replaces the original Stage 17 draft, which assumed manual verification and an admin approval queue. The approved MVP direction uses a single claim token as the sole ownership proof, verified automatically, with no manual review step and no dedicated customer-account table — customer identity is provided by Amazon Cognito.

## Objective

Let a business represented by a mailed postcard (or an admin-issued link) prove control of a claim token, authenticate via a Cognito-backed customer account, and reserve ownership of the canonical `Business` record — establishing an authenticated, pre-payment state that Stage 18 hands off into Stripe Checkout.

## Dependencies

Stages 7, 8, 10, and 11.

## Major deliverables

- `Claim` domain model, schema, factory, and repository
- Claim-token generation, normalization, hashing, and validation
- A Cognito User Pool + User Pool Client for customer identity (sign-up, sign-in, password reset, email change) — no app-owned customer-account table
- `owner-user-id-index` GSI on the existing Businesses table, supporting one customer owning multiple Businesses
- New `webpresa-{env}-claims` DynamoDB table, carrying both claim records and (as a distinct item shape) rate-limit counters
- New `webpresa-{env}-claim-token` Secrets Manager secret (HMAC pepper)
- Public claim routes: `/claim/[claimToken]`, `/claim`, `/claim/continue`
- Customer session system (`webpresa_customer_session` cookie), separate from the existing admin session, issued after Cognito authentication
- `requireCustomerSession` / `requireBusinessOwnership` authorization primitives
- `/account/sign-in` and `/account/claim-status` routes
- Admin claim-link generation/revocation UI, plus an ownership-release/reissue workflow, on the business detail page
- Rate limiting on the claim-validation entrypoints
- A three-state claim-banner derivation on the public preview site (unclaimed / claimed-pending / active)

## Non-goals

- Charging the customer or creating any Stripe object (Stage 18)
- Webhook processing or subscription-state sync (Stage 18)
- Unlocking any customer dashboard route (Stage 18+, a later stage)
- Full customer website-editing UI (a later stage)
- Automatic preview regeneration after customer edits (a later stage)
- Billing portal, lead history, custom domains, team members, ownership transfer between customers (deferred indefinitely)
- Manual verification, admin approval/rejection of claims, business-email verification, phone verification, document verification (rejected by the approved product decisions, not merely deferred)
- Changing `BusinessStatus` or adding a subscription-status field to `Business` (left to Stage 18)
- A `requireActiveSubscription()` authorization primitive — no dashboard route exists yet for it to protect; Stage 18 defines it from its own real requirements once subscriptions exist, rather than inheriting a speculative interface

## Domain-model changes

New `Claim` model (`web/domain/models/claim.ts`):

- `claimId` (`claim_<uuid>`), `businessId`, optional `postcardId`, optional `previewId`
- `tokenHash` (HMAC-SHA256 of the normalized token; the raw token is never persisted)
- `status`: `'issued' | 'consumed' | 'expired' | 'revoked'` — token state only, never overloaded with ownership or subscription meaning
- `expiresAt`, `consumedByUserId?` (a Cognito `sub`), `consumedAt?`, `revokedAt?`, `revokedReason?`
- `createdAt`/`updatedAt` (standard `MutableTimestampedRecord`)

`Business` (`web/domain/models/business.ts`) — additive only:

- `ownerUserId?: string` — a Cognito `sub`. Presence means claimed; absence means unclaimed. This is the sole ownership signal.
- `claimedAt?: string` — set together with `ownerUserId`.
- No other existing field changes. `status`, `stripeCustomerId`, and `stripeSubscriptionId` are untouched by this stage.

**No `CustomerAccount` model.** Customer identity (email, password, verification, lockout, password reset, email change) lives entirely in the Cognito User Pool. The app never stores customer credentials; `Business.ownerUserId` references a Cognito `sub`, not a row in an app-owned table.

## Authentication requirements — Amazon Cognito, not custom auth

Customer accounts are public-facing: unknown users sign up, choose passwords, log in repeatedly, forget passwords, and need account recovery, lockout protection, and email changes — a fundamentally different problem than the existing admin auth's single hardcoded operator credential. Extending the admin's custom scrypt+JWT pattern would require building, from scratch, a password-reset token flow, an email-sending pipeline (none exists anywhere in this repo today), an account-lockout mechanism, and an email-change flow — and would leave no path to per-user session revocation. Amazon Cognito provides all of this natively, is already the documented "future path" for this project's own auth evolution (`architecture.md`'s admin-auth section, Stage 7's own text, and Stage 11.x's description of the future customer dashboard as "Cognito-authenticated" all anticipate exactly this), and removes more bespoke code than it adds (no customer-account table, no email-uniqueness workaround).

- One Cognito User Pool, customers only. Admin auth (`web/lib/auth/session.ts`, `actions.ts`) is completely untouched.
- User Pool Client: `generateSecret: false` (no `SECRET_HASH` computation needed for server-side calls), `authFlows: { userPassword: true }` explicitly enabled (not Cognito's default).
- Direct server-side SDK calls (`SignUp`, `ConfirmSignUp`, `InitiateAuth`, `ForgotPassword`, `ConfirmForgotPassword`, `GetUser`) from Next.js Server Actions via `@aws-sdk/client-cognito-identity-provider` (new dependency), authenticated the same way every other AWS call in this app is — the existing Vercel IAM user's credentials, extended with `cognito-idp:*` actions scoped to the User Pool ARN. No Lambda triggers required for the MVP.
- Email sending: Cognito's default sender for MVP (a documented ~50/day ceiling — acceptable at this stage; migrating the User Pool to SES-backed email is a deferred item once volume requires it, not a blocker).
- The app still issues its **own** short-lived session after a successful Cognito authentication: cookie `webpresa_customer_session`, `jose`-signed JWT, HttpOnly, `secure` in production, `sameSite=lax`, payload `{ sub, email, expiresAt }`, signed with a separate `CUSTOMER_SESSION_SECRET` so a captured admin session token can never verify as a customer session or vice versa.
- **Hard rule**: Cognito's `email_verified` attribute is never read by any authorization or ownership check. Email is a login identifier only. Business ownership is decided exclusively by `Business.ownerUserId`, set only by the claim-token consumption transaction — never by anything Cognito reports about the account.
- `proxy.ts` extended with a second matcher prefix (`/account/:path*`) and a parallel verification branch, alongside the existing, untouched admin branch.
- Account recovery, password reset, and email change are provided by Cognito directly — no app-level implementation needed for any of them.

## Ownership model — one owner per Business, one customer may own several

Each `Business` has exactly one owner. A single customer account (Cognito `sub`) may own multiple Businesses — there is no one-account-one-business restriction, and no rejection check preventing an existing owner from claiming a second business. This requires no special schema: the `owner-user-id-index` GSI (PK `ownerUserId`, SK `claimedAt`) is not unique per user by construction — querying it returns every Business a given customer owns. `requireBusinessOwnership(userId, businessId)` is already parametrized per business and needs no change to support this.

Team members, staff accounts, and shared ownership of a single Business remain out of scope.

## Infrastructure changes

In `infra/lib/stacks/data-stack.ts`:

- New table `claims` — PK `claimId`; GSIs `token-hash-index` (PK `tokenHash`) and `business-id-index` (PK `businessId`, SK `createdAt`). No `status-index` (low cardinality, matches the existing warning already documented for other tables' status indexes). A table-wide TTL attribute (e.g. `ttl`) is added for this stage's rate-limit counter items only — real `Claim` records never populate it, so claim history is never auto-deleted; claim-token expiration remains a status transition at read time, never a TTL deletion.
- Existing `businesses` table gains GSI `owner-user-id-index` (PK `ownerUserId`, SK `claimedAt`), not unique per user.
- New Secrets Manager secret `claim-token` (key: `hmacSecret`) via the existing `WebpresaSecret` construct.
- New Cognito User Pool + User Pool Client (a new construct, e.g. `WebpresaUserPool`, following the existing construct-per-concern pattern) for customer identity.

In `infra/lib/constructs/webpresa-table.ts`:

- Small additive extension exposing an optional `timeToLiveAttribute` prop, defaulting to unset, so every existing table's CDK output is unaffected.

In `infra/lib/stacks/vercel-access-stack.ts`:

- Extend the managed policy with the new Claims table ARN (+ indexes), the Businesses table's new GSI, the new secret ARN, and `cognito-idp:SignUp`/`InitiateAuth`/`ConfirmSignUp`/`ForgotPassword`/`ConfirmForgotPassword`/`GetUser`/`AdminGetUser` scoped to the User Pool ARN (the `AdminGetUser` grant supports the admin ownership-release UI showing which customer currently owns a business).

No new compute (no Lambda, no API Gateway). Show `cdk diff` for the affected stacks and wait for explicit approval before any deploy, per the standing deployment gate.

## Required routes

- `GET /claim/[claimToken]` — public; validates the token; on success, sets a short-lived, signed, purpose-scoped HttpOnly `webpresa_claim_attempt` cookie (a JWT carrying the `claimId`, never the raw token) and redirects to `/claim/continue`.
- `GET /claim` — public; manual token entry for a printed/typed code.
- `GET, POST /claim/continue` — requires the signed `claim_attempt` cookie; sign-up-or-sign-in via Cognito, then performs the ownership transaction. The server re-validates the claim's state (issued, unexpired, unrevoked) on every use regardless of the cookie's signature — signing prevents tampering, it does not replace validation.
- `GET /account/sign-in` — public; Cognito sign-in for resuming checkout without a token.
- `GET /account/claim-status` — requires an authenticated customer session and business ownership; business-scoped (resolved from the business just claimed, or via `owner-user-id-index` — showing a short list if the customer owns more than one business).

## Detailed workflow

1. Customer opens `/claim/[claimToken]` (QR scan or typed URL).
2. Server normalizes the token, computes its HMAC hash, and queries the `token-hash-index` GSI on Claims.
3. Not-found, expired (lazily transitioned), revoked, or consumed-by-a-different-session all render the same generic "invalid or expired" page — never distinguished to the caller.
4. Consumed-by-the-current-session (idempotent resume) skips directly to step 9.
5. A valid, `issued`, unexpired token sets the signed `claim_attempt` cookie and redirects to `/claim/continue`.
6. `/claim/continue` collects sign-up or sign-in credentials and resolves a `userId` via Cognito (`SignUp`/`ConfirmSignUp` or `InitiateAuth`). Cognito enforces email uniqueness natively — no app-level uniqueness transaction is needed.
7. Server runs one `TransactWriteItems`:
   - Claims: condition `status='issued' AND expiresAt > now`, set `status='consumed', consumedByUserId, consumedAt`.
   - Businesses: condition `attribute_not_exists(ownerUserId)`, set `ownerUserId, claimedAt`.
8. On cancellation, inspect the per-item cancellation reasons:
   - Claims condition failed but `consumedByUserId` already equals this user (a double-submit) → treat as success, continue.
   - Claims condition failed otherwise, or the Businesses condition failed → generic error; no ownership or token state changes.
9. On success, establish the `webpresa_customer_session` cookie (populated from Cognito's authentication response), clear the `claim_attempt` cookie, and redirect to `/account/claim-status`.
10. `/account/claim-status` shows the claimed business and a call-to-action toward Stage 18's checkout. Returning, still-unpaid owners reach the same screen by signing in directly at `/account/sign-in` — no new token is ever required to resume, and no restriction prevents the same account from later claiming a different business.

## Claim-token requirements

- 80-bit random token (`crypto.randomBytes(10)`, 16 characters in 4 dash-grouped groups of 4), Crockford Base32 encoded, dash-grouped for manual entry. (Originally 160 bits/32 characters at Stage 17 launch — shortened 2026-08-03 after review found 160 bits far exceeded any realistic threat model for this class of secret; 80 bits matches the conventional floor for an unauthenticated, rate-limit-optional token guarding a real ownership-transfer action, and coincidentally matches Stage 21's campaign-code entropy.)
- Normalized (strip dashes/whitespace, uppercase) before every hash or comparison.
- Hashed with HMAC-SHA256 keyed by a dedicated Secrets-Manager-held pepper — never stored or logged in plaintext, never logged even as a partial hash.
- Looked up via a dedicated high-cardinality GSI (`token-hash-index`), not scanned.
- Expiration enforced at read time against a stored `expiresAt`; never enforced via DynamoDB TTL (the table's TTL attribute is scoped to rate-limit counter items only — see Infrastructure changes).
- Revocable by an admin at any point while `status='issued'`.
- Single-use: enforced by a `TransactWriteItems` condition, not by application-level "check then write" logic.
- **Never persisted in any recoverable form beyond its hash** — including on `Postcard` records. The raw token exists only in memory at issuance; any QR/PDF artifact is rendered synchronously from it at that moment (or, for a future async pipeline, the raw token is passed as job input at enqueue time, never fetched back from storage). If a postcard needs regeneration for reasons unrelated to token compromise, that's a resubmission of the already-rendered artifact via `providerPostcardId`; if regeneration is needed because the token itself is suspect, that is handled by the ownership-recovery workflow below (revoke, then issue a replacement claim and token) — never by recalling a discarded token.
- Rate-limited per requester (IP-hash bucket) on every entrypoint that accepts a token guess (`GET /claim/[claimToken]` and the `POST /claim` manual-entry form). Implemented as a distinct item shape in the Claims table itself (`PK = RATELIMIT#<ipHash>#<windowBucket>`), not a dedicated table — the token's 80-bit entropy is the real defense against brute force, so rate limiting here is abuse/cost protection, not the security boundary. The conditional increment must use `ConditionExpression: attribute_not_exists(#count) OR #count < :limit` (not a bare `#count < :limit`), so the first request in a new window creates the counter rather than throwing — the same conditional-update idiom already established by `claimScanExecutionStatus()` in `web/lib/db/scan-executions.ts`. On exceeding the limit, return the same generic "invalid or expired" response, not a distinct "rate limited" message.

## Ownership, entitlement, and recovery rules

- Ownership is represented solely by `Business.ownerUserId` (presence) and `claimedAt` (when) — never by `Business.status`, and never by any Stripe-related field.
- Entitlement (a paid, active subscription) is not modeled by this stage at all, and no stub function stands in for it — there is no dashboard route in this stage for one to protect.
- **Ownership recovery (new)**: if a business is claimed but the claimant never completes payment (or claims incorrectly), an admin can run an exceptional recovery workflow — `releaseOwnershipAction(businessId, reason)` clears `ownerUserId`/`claimedAt` via a conditional update (`attribute_exists(ownerUserId)`), without touching the original (now-historical, terminal) `Claim` record. The admin then issues a new claim/token for the same business through the existing "generate claim link" action, allowing a legitimate claimant to try again. Ownership does not expire automatically — this recovery path is manual and administrative only, logged via structured server-side logging (businessId, previous owner, admin identity, reason, timestamp).
- It must be structurally impossible to reach a dashboard-equivalent state from token possession alone, from the Stripe success-redirect URL alone, or from `ownerUserId` being set without a verified, webhook-confirmed active subscription — none of those exist as capabilities in this stage in the first place.

## Public claim-banner behavior

The public preview's claim banner reflects three states, not a single ownership flip: `getClaimBannerState(business)` returns `'unclaimed'` (no owner — "claim this business" CTA), `'claimed_pending'` (owned, but this stage has no subscription concept yet — a softer "claimed, activation pending" message that neither invites a conflicting claim nor implies the business is paying), or `'active'` (a real paid subscription — Stage 18's concern; this branch is defined now but unreachable until Stage 18 supplies real subscription data into the same function). This avoids a claimed-but-never-paid business permanently losing its conversion-driving banner, while the exactly-once claim guarantee itself is enforced independently by the `TransactWriteItems` condition, not by banner content. SEO `noindex`/`index` logic stays entirely on `business.status === 'active'`, unrelated to ownership and unchanged by this stage.

> **Correction (2026-07-31):** the "unreachable until Stage 18 supplies real subscription data" wiring described above was never actually done when Stage 18 shipped — `getClaimBannerState` kept checking `ownerUserId` alone, so the banner never cleared after a genuine payment. Fixed by widening it to `Pick<Business, 'ownerUserId' | 'subscriptionStatus'>` and returning `'active'` only when `subscriptionStatus === 'active'` specifically (a `past_due`/`canceled` business correctly stays `'claimed_pending'`). See `architecture.md`'s "Claim banner" note and `build_log.md` for the fix record.

## Failure and recovery behavior

- **Account creation succeeds, the ownership transaction fails**: the Cognito account is durable (created before the transaction). The user can retry — the same account resolves, and the retry either idempotently detects it already succeeded or attempts the transaction again with no orphaned state.
- **Ownership reserved, Stripe Checkout abandoned**: `ownerUserId` remains set indefinitely — ownership does not expire or roll back on its own. The customer returns via `/account/sign-in` to resume, or an admin runs the ownership-recovery workflow above if the claim was made in error and abandoned.
- **Concurrent submissions of the same token**: the `TransactWriteItems` condition on the Claims item ensures exactly one submission commits; the loser sees a generic error unless it's the same user re-submitting (idempotent path).
- **Token already consumed by someone else**: generic error, no disclosure of who claimed it or when.
- **Business deletion**: deleting a Business must never delete or disable the owning customer's Cognito account — there is no code path from business deletion into Cognito, since customer identity is not stored in any app-owned, business-linked table. `deleteBusinessAction`'s existing cascade (SitePreviews, ScanEvents, Postcards) is extended to also delete that business's Claims, for consistency; this is an explicit admin-destructive action, not a claim-lifecycle event, and does not conflict with claim-history preservation during normal operation.

## Security requirements

- No plaintext claim token in logs, error messages, or persisted records, at any point — including on `Postcard` records (see Claim-token requirements).
- Generic, uniform error responses across invalid/expired/revoked/consumed-by-another-account token states.
- Rate limiting on every token-guessing entrypoint, implemented within the Claims table (see above).
- The `webpresa_claim_attempt` cookie is signed and purpose-scoped, not a raw identifier; the server always re-validates claim state independent of the cookie's signature.
- `Referrer-Policy: no-referrer` on the token-bearing initial claim page; no third-party resource loads on that page.
- All three cookies in play (admin session, customer session, claim-attempt) remain HttpOnly, `secure` in production, `sameSite=lax`, each signed with its own dedicated secret so none can be replayed as another.
- All claim-flow mutations run as Next.js Server Actions, inheriting Next.js's built-in same-origin Server Action protection.
- Any post-authentication redirect target is validated against an allowlist of internal paths — no open redirect.
- No AWS credentials, secrets, table names, or Cognito identifiers beyond the already-public naming convention ever reach the browser bundle.
- Cognito API errors (e.g. `UsernameExistsException`, `NotAuthorizedException`, `TooManyRequestsException`) are mapped to the same generic, non-disclosing messages the rest of this flow uses — no Cognito-specific error detail leaks to the client.

## Acceptance criteria

- Admin can generate and revoke a claim token for a business, and can release ownership and issue a replacement claim for a business that was claimed but never activated.
- Public visitors cannot claim a business using only its slug or ID.
- Invalid, expired, revoked, and already-consumed-by-another-account tokens all fail with the same generic message.
- A valid, unexpired, unconsumed token followed by successful Cognito account creation or sign-in reserves ownership exactly once, even under concurrent submission of the same token.
- The same authenticated user resubmitting an already-consumed-by-them token is treated as a successful, idempotent resume, not an error.
- A customer account may own more than one business; there is no rejection for claiming a second business.
- Claim history (all Claim records, including expired/revoked/consumed ones) is preserved indefinitely — never deleted by normal operation.
- A claimed business shows `ownerUserId`/`claimedAt`; its public claim banner reflects claimed-pending (not silently disappearing); its `Business.status` and Stripe fields are untouched by this stage.
- An authenticated owner with no active subscription cannot reach any route this stage does not explicitly grant — there is no dashboard, and no route exists that could be mistaken for one.
- Deleting a Business never deletes or disables the owning customer's Cognito account.
- The Stripe success-redirect URL (not built in this stage) is never treated as proof of anything, by construction — no code path in this stage could act on it, because no such code path exists yet.

## Deferred work

- Stripe customer/Checkout/webhook handling (Stage 18)
- Dashboard entitlement and any protected dashboard route, including the `requireActiveSubscription()` primitive (Stage 18+)
- Full customer website-editing UI and automatic preview regeneration (a later customer-dashboard stage)
- Async/regenerable postcard PDF generation and Lob integration (a later postcard/campaign stage — see the token-handling guidance above for the constraint any such stage must respect)
- Billing portal, lead history, custom domains
- Team members, shared ownership, ownership transfer between customers
- Manual/document/phone/business-email verification (rejected for the MVP, not merely deferred)
- SES-backed Cognito email (deferred until default sending volume requires it)
- Full customer-account deletion (GDPR-style), alongside team accounts

---

# Stage 18 — Stripe Subscriptions

## Status

Application code complete, automatically tested (unit tests mocking every AWS/Stripe SDK boundary), and deployed to development — `webpresa-dev-customer-billing-profiles` table and the `stripe-subscription-id-index` GSI on `webpresa-dev-businesses` are live (deployed 2026-07-29). **Not yet manually verified end-to-end**: no Stripe test-mode Product/Price objects created yet, no real values populated into the `webpresa-dev-stripe` secret, and the new Vercel environment variables not yet added. See `build_log.md`, "Stage 18 — Stripe Subscriptions", for the full implementation/deployment record and exactly what remains before this can be exercised against a real Stripe test-mode account. This specification replaces the original single-plan draft (`$149/month`), which predated the approved two-plan pricing decision and Stage 17's finalized multi-business ownership model.

## Objective

Let an authenticated customer who owns a claimed (Stage 17) but unpaid Business choose a Webpresa plan, pay through Stripe Checkout, and have dashboard entitlement unlock automatically once Stripe confirms payment through a verified webhook — never from the browser redirect, a query parameter, or `ownerUserId` alone.

## Dependencies

Stages 10 and 17.

## Major deliverables

- Stripe test-mode Product/Price configuration (two monthly Prices — Basic, Growth) — Dashboard/CLI, not CDK
- New `CustomerBillingProfile` record and table — the canonical Cognito-`sub` → Stripe-Customer mapping
- `WebpresaPlan`/`SubscriptionStatus`/`BillingPurpose` domain constants
- Additive `Business` fields: `plan`, `subscriptionStatus`, `stripeRawStatus`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `lastStripeEventId`, `lastStripeEventAt`, `lastStripeSyncAt`, `pendingCheckoutSessionId`, `pendingCheckoutExpiresAt`, `termsVersion`, `acceptedTermsAt`
- New `stripe-subscription-id-index` GSI on the Businesses table
- Stripe SDK client wrapper (`web/lib/stripe/`), with a pinned, documented API version — Price ID mapping, status mapping, metadata helpers
- `createCheckoutSessionAction` (plan-gated, ownership-gated, pending-Session-aware)
- `createBillingPortalSessionAction`
- `POST /api/webhooks/stripe` Route Handler — raw-body signature verification, allowlist, `billingPurpose` guard, snapshot-based reconciliation
- `requireBusinessAccess()` / `requireActiveSubscription()` on `web/lib/auth/customer-authorization.ts`
- Plan-selection UI on `/account/claim-status`, plus `/account/checkout/success` and `/account/checkout/canceled`
- Terms-acceptance checkbox + `termsVersion`/`acceptedTermsAt` capture, mirrored into Checkout metadata (placeholder legal copy — see Stage 26)

## Approved plans

- **Basic** — `$39/month` — single-page site, primary-city SEO, lead/contact functionality per current architecture.
- **Growth** — `$79/month` — expanded site, multiple city-SEO pages (per current product limits), lead forms and Growth-tier functionality per current architecture.
- Monthly recurring only. No trial, no setup fee, no minimum commitment enforced through Stripe, no annual billing, no usage-based billing, no coupons.
- The customer chooses Basic or Growth before Checkout; the same consumed Stage 17 Claim may purchase either plan.
- One Stripe Customer per Cognito customer (via `CustomerBillingProfile`), reused across every Business that customer subscribes, and reserved for future one-time charges (domain purchase/renewal).

## Non-goals

- Re-validating or reopening the Stage 17 `Claim`
- Recreating customer identity or requiring the customer to reclaim the Business
- Any dashboard beyond the minimum needed to prove entitlement (Stage 19)
- Domain purchase, DNS connection, SSL, or live-site cutover (a dedicated later stage) — though the `billingPurpose` metadata boundary is reserved now so that stage's future Checkout Sessions can never be misread as a website-subscription event
- Custom credit-card forms, custom invoice/payment-method management, card storage
- Annual billing, coupons, usage-based billing, automated tax calculation
- Self-service Basic⇄Growth plan switching through the Customer Portal (deferred)
- A `requirePlanCapability()` implementation (the future boundary is documented in prose; no unimplemented function is shipped)

## Domain-model changes

New `CustomerBillingProfile`:

- `userId` (Cognito `sub`, partition key) — one row per customer, ever
- `stripeCustomerId`
- `createdAt`/`updatedAt`

`Business` (additive only):

- `plan?: 'basic' | 'growth'`
- `subscriptionStatus?: 'active' | 'past_due' | 'canceled'` — the sole field authorization and the claim banner read
- `stripeRawStatus?: string` — diagnostics only, never branched on
- `currentPeriodEnd?: string` (ISO)
- `cancelAtPeriodEnd?: boolean` — when true and `subscriptionStatus` is still `'active'`, the customer remains entitled through `currentPeriodEnd`; no separate `entitledUntil` field
- `lastStripeEventId?: string`, `lastStripeEventAt?: string`, `lastStripeSyncAt?: string` — diagnostics only, never a write gate
- `pendingCheckoutSessionId?: string`, `pendingCheckoutExpiresAt?: string` — a checked-before-reuse in-flight Checkout Session reference
- `termsVersion?: string`, `acceptedTermsAt?: string` — latest acceptance only, also mirrored into Checkout metadata

No changes to `Claim` or `BusinessStatus`. `stripeSubscriptionId` (Stage 5/17 placeholder) is populated for the first time by this stage; `stripeCustomerId` becomes a denormalized display copy of `CustomerBillingProfile.stripeCustomerId`.

## Infrastructure and Stripe configuration

- One new table: `webpresa-{env}-customer-billing-profiles` (PK `userId`, no GSI).
- One new GSI on `webpresa-{env}-businesses`: `stripe-subscription-id-index` (PK `stripeSubscriptionId`).
- No new secret, no new IAM role beyond adding the new table/GSI ARNs to the existing Vercel data-access policy. The existing `webpresa-{env}-stripe` secret gets its first real test-mode values.
- Two new plain (non-secret) environment variables: `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_GROWTH` — server-only, never `NEXT_PUBLIC_`.
- One new server-side base-URL environment variable for building Checkout success/cancel URLs.
- A pinned Stripe API version, set explicitly on the SDK client and documented in `deployment.md`.
- Stripe Products/Prices are created once via the Stripe Dashboard or CLI, in test mode only — never via CDK.

## Required routes

- `/account/claim-status` (existing — extended with plan selection, live status display, and a "Manage billing" link)
- `/account/checkout/success` (new)
- `/account/checkout/canceled` (new)
- `POST /api/webhooks/stripe` (new)

## Detailed Checkout workflow

1. `requireCustomerSession()` → `requireBusinessOwnership(userId, businessId)`.
2. Validate the submitted plan against `WEBPRESA_PLANS`; reject anything else.
3. Reject (redirect to Portal) if `business.subscriptionStatus` is already `active` or `past_due`.
4. Resolve the Stripe Customer from `CustomerBillingProfile(userId)` — reuse if present; otherwise create a new Stripe Customer and conditionally create the profile (`attribute_not_exists(userId)`), reusing the winner's ID on a lost race.
5. If `business.pendingCheckoutSessionId` is set, retrieve it from Stripe; if still `open`, redirect to its URL instead of creating a new Session.
6. Resolve the Stripe Price ID for the plan server-side — never from the browser.
7. Create a subscription-mode Checkout Session with trusted metadata (`businessId`, `ownerUserId`, `plan`, `billingPurpose: 'website_subscription'`, `environment`, `termsVersion`/`acceptedTermsAt`, optional `claimId`), a single-use idempotency key for this one call, `billing_address_collection: 'required'`, and controlled success/cancel URLs.
8. Persist `pendingCheckoutSessionId`/`pendingCheckoutExpiresAt`, then redirect the browser to the Stripe-hosted Checkout URL.

## Webhook workflow

1. Read the raw request body; verify the Stripe signature; reject invalid signatures with `400`.
2. Check the event type against an explicit allowlist (`checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`); acknowledge (`200`) and ignore anything else.
3. Confirm `metadata.billingPurpose === 'website_subscription'` (and `mode === 'subscription'` where applicable); acknowledge and ignore anything else — this is the boundary that protects website entitlement from a future domain-purchase/renewal event.
4. Resolve the target `Business` from the event's metadata, cross-checked via `stripe-subscription-id-index`.
5. Re-fetch the current Subscription object from the Stripe API — this, not `event.created` ordering, is the authority for what gets written.
6. Map Stripe's status to the application's 3-value enum.
7. Write the resulting snapshot to `Business` unconditionally (safe to repeat; safe out of order by construction), clear `pendingCheckoutSessionId`, and record `lastStripeEventId`/`lastStripeEventAt`/`lastStripeSyncAt` as diagnostics only.
8. Log safely (event ID, type, resolved business ID, outcome) — never the full payload.

## Subscription status mapping

| Stripe status | App `subscriptionStatus` |
|---|---|
| `active` | `active` |
| `trialing` | *(no entitlement — log a configuration anomaly; Webpresa never intentionally creates trials)* |
| `past_due`, `unpaid`, `paused` | `past_due` |
| `canceled` | `canceled` |
| `incomplete`, `incomplete_expired` | *(leave unset — no entitlement granted)* |

`cancel_at_period_end` and `current_period_end` are recorded independently of the status mapping above, on every reconciliation.

## Entitlement rules

- `requireBusinessAccess(userId, businessId)` builds on `requireBusinessOwnership`; returns `{ mode: 'full' | 'billing_recovery' | 'none', plan? }` — `'full'` only when `subscriptionStatus === 'active'`, `'billing_recovery'` when `'past_due'`, `'none'` when `'canceled'` or unset. A strict `requireActiveSubscription()` wraps this and redirects unless `mode === 'full'`.
- Never trusts: browser state, the success-URL query parameter, `ownerUserId` alone, `stripeCustomerId`'s mere presence, or any client-supplied identifier.
- A future `requirePlanCapability(businessId, capability)` boundary is documented, not implemented — Stage 19/20 add it once a real Basic/Growth feature difference exists to gate.

## Customer Portal requirements

- `createBillingPortalSessionAction(businessId)` — authenticated, ownership-checked, resolves the Stripe Customer exclusively from `CustomerBillingProfile(userId)` (not from `Business.stripeCustomerId`), fixed server-controlled return URL.
- Permitted via Portal: payment-method updates, invoices/receipts, billing history, cancellation.
- Self-service Basic⇄Growth switching via Portal is configured later (Stripe Dashboard toggle only — no application code changes needed).

## Failure and recovery behavior

- Abandoned Checkout: `pendingCheckoutSessionId` is checked and reused if still open, or superseded by a fresh Session if not.
- Duplicate click: the pending-Session check plus a disabled submit control during the Server Action's pending state, not a coarse idempotency key.
- Webhook delayed: success page shows "processing" and refreshes until entitlement lands or a bounded timeout is reached.
- Recurring payment failure: `past_due` — restricted access, billing-recovery banner, Portal link; nothing deleted or unpublished.
- Cancellation (scheduled): `subscriptionStatus` stays `active` with `cancelAtPeriodEnd: true` until Stripe's period actually ends.
- Cancellation (completed): `subscriptionStatus` becomes `canceled`; paid editing/management locks; all records preserved; reactivation is a fresh Checkout Session reusing the same `CustomerBillingProfile` Stripe Customer.
- Plan change: reconciled generically through the same webhook path.

## Security requirements

- Stripe secret key and webhook secret are never sent to the browser and never logged.
- Stripe Price IDs are resolved server-side only; the browser never submits or influences a Price ID.
- Stripe Customer IDs are resolved server-side only, exclusively from `CustomerBillingProfile`; the browser never submits one.
- Dashboard entitlement is granted exclusively by the verified webhook handler.
- Webhook signature verification uses the raw request body.
- A `billingPurpose` check prevents any non-website-subscription event from altering website entitlement.
- Success/cancel/return URLs are built from a fixed server-side base URL — no open redirect.
- Errors returned to the browser are generic, non-disclosing reason codes.

## Acceptance criteria

- An authenticated owner of an unpaid, claimed Business can select Basic or Growth and complete a test-mode Checkout.
- Dashboard entitlement only ever flips to granted after a verified webhook updates `Business.subscriptionStatus` — never from the success redirect alone.
- Two concurrent first-checkouts across two businesses owned by the same customer resolve to exactly one Stripe Customer (via `CustomerBillingProfile`'s conditional write), not two.
- A `trialing` Stripe status never grants entitlement.
- Duplicate and out-of-order webhook delivery do not corrupt or regress subscription state (verified as a snapshot-write property, not an event-ordering property).
- A recurring payment failure moves the Business to `past_due` with restricted, non-destructive access.
- A completed cancellation moves the Business to `canceled` without deleting any business, claim, preview, or customer data.
- A customer owning multiple businesses can subscribe each independently, reusing one Stripe Customer via `CustomerBillingProfile`.
- A repeated Checkout click while a Session is still open returns the same Session rather than creating a new one.
- The claim banner and footer credit correctly reach their `'active'` state once, and only once, entitlement is genuinely granted.
- Secret keys and webhook secrets never appear in browser bundles, logs, or error responses.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` pass in `web/`; `npm test`, `npx tsc -p . --noEmit`, and `npx cdk synth`/`diff` pass in `infra/`.

## Deferred work

- Self-service Basic⇄Growth plan switching via Customer Portal (Stripe Dashboard configuration only, once decided)
- Annual billing, coupons, usage-based billing
- Automated tax calculation (Stripe Tax)
- Final legal terms content/versioning and a dedicated agreement-history record (Stage 26)
- `requirePlanCapability()` implementation (Stage 19/20, once a real capability exists to gate)
- Full customer dashboard (Stage 19)
- Domain purchase, DNS connection, SSL, custom-domain activation, live-site cutover (a dedicated later stage — reusing `CustomerBillingProfile` and the `billingPurpose` boundary this stage reserves)

---

# Stage 19 — Customer Website Dashboard and Self-Service Editing

## Status

Implemented (2026-07-29) — application code complete, automatically tested, not yet manually verified end-to-end against a real dev customer session (no real Cognito/claimed/subscribed test business exercised yet). See `architecture.md`, "Customer Website Dashboard (Stage 19)", and `build_log.md`, "Stage 19 — Customer Website Dashboard and Self-Service Editing", for the full implementation record. Customer identity and claim ownership are implemented in Stage 17; subscription state, Checkout, Stripe webhook reconciliation, billing recovery, and the `requireBusinessAccess()`/`requireActiveSubscription()` authorization primitives are implemented in Stage 18. This stage did not perform activation, did not touch `Business.status`, and did not duplicate any Stage 17/18 work.

## Objective

Give an authenticated, subscription-entitled business owner a polished self-service dashboard to view, edit, preview, and publish their Webpresa website, reusing the Stage 11.x admin editing primitives under new customer-scoped authorization — while staying strictly isolated from other customers' businesses and from internal admin operations (scans, AI scores, claim management, provider IDs).

## Dependencies

Stages 8, 11.x, 17, and 18. Stage 11.x is a hard dependency, not a soft one: its controlled section registry (`lib/website-sections/`), per-section content editors, and durable `Business` fields (photo slots, theme, cta, testimonials/FAQ/process) are the actual editing surface this stage exposes — Stage 19 adds new authorization and UI around them, not a second content model.

## Major deliverables

- `/app/*` customer dashboard shell (`AppSidebar.tsx` + layout), modeled directly on `app/admin/(dashboard)/AdminSidebar.tsx`'s responsive pattern (`framer-motion` slide-in drawer below `md:`, fixed sidebar above)
- Business switcher (for customers owning more than one business — `getBusinessesByOwnerUserId()`, already used by `/account/claim-status`)
- `/app` portfolio/redirect page
- `/app/businesses/[businessId]` dashboard home — status, live preview, setup checklist, notices
- `/app/businesses/[businessId]/website` — tabbed content/section editor
- `/app/businesses/[businessId]/design` — theme, photo slots, hero
- `/app/businesses/[businessId]/billing` — plan/status summary + Stripe Customer Portal entry
- `/app/businesses/[businessId]/settings` — business-level contact/visibility settings
- New customer-scoped Server Actions (own module, own auth) that call the *same underlying lib functions* the admin actions call — never the admin actions themselves
- `ensureDraftPreview(businessId)` — the copy-on-write helper described below; new, since nothing today needs it
- Explicit draft/publish workflow reusing `publishSitePreview()`
- Extend `app/b/[slug]/page.tsx`'s `resolvePreview()` with an owning-customer branch, so "Preview draft" actually resolves (see "Small required changes" below)
- A small shared plan-display catalog (`{ basic: { label, priceDisplay }, growth: { ... } }`) — extracted from `PlanSelectionForm.tsx`'s inline strings, reused by both it and the new Billing page
- Small, additive changes to already-shipped Stage 8/17/18 surfaces (listed below) — required for `/app` to be reachable, linked to, and previewable at all
- Responsive (desktop/tablet/mobile), themed loading/empty/error/read-only states

## Non-goals (explicitly out of scope for this stage)

- Anything Stage 17/18 already does: authentication, claim consumption, Checkout, webhook reconciliation, `Business.status` transitions (there is no `'customer'` status — paid entitlement is `subscriptionStatus === 'active'`, already true)
- A support/change-request queue (`/app/requests`) — customers edit directly; this was the explicit product-direction reversal driving this rewrite
- Domain connection/purchase, leads inbox, analytics, team members/shared editing, ownership transfer, AI-assisted whole-site rewriting, drag-and-drop building, custom HTML/CSS, `requirePlanCapability()` (no gated capability exists yet), account deletion, admin impersonation, SES/welcome-email infrastructure (a static in-dashboard notice is sufficient)

## Required routes

```
/app
/app/businesses/[businessId]
/app/businesses/[businessId]/website
/app/businesses/[businessId]/design
/app/businesses/[businessId]/billing
/app/businesses/[businessId]/settings
```

`/app/account` (Cognito email/password/sign-out account-level settings, distinct from business settings) is explicitly deferred — but the sidebar's **Sign out** action itself ships now, reusing `customerSignOutAction`, the same way `AdminSidebar.tsx`'s `SignOutFooter` does today.

## Route protection

`proxy.ts` gains a third branch, parallel to the existing `/admin/:path*` and `/account/:path*` ones: unauthenticated requests to `/app/:path*` redirect to `/account/sign-in`. This is a session check only (mirrors the admin pattern) — per-business, per-mode authorization happens on the page/action, not the proxy, since a `billing_recovery` customer is a valid session that still needs to reach `/app` (read-only), not be turned away at the edge.

`lib/auth/customer-actions.ts`'s `safeNextPath()` currently only allows redirect targets starting with `/account` — widen it to also allow `/app`, or sign-in-to-continue flows that should land a customer back in the dashboard will silently fall back to `/account`.

## Authorization model

Every `/app/*` page and every new customer-scoped Server Action independently:

1. Calls `requireCustomerSession()`.
2. Calls `requireBusinessOwnership(userId, businessId)` (`notFound()` if the business doesn't exist or isn't owned by this session — never a 403 that confirms the business exists).
3. Calls `requireBusinessAccess(userId, businessId)` and branches on `{ mode }`:

| `mode` | Overview/Website/Design pages | Editing (Server Actions) | Billing |
|---|---|---|---|
| `full` | Full dashboard | Allowed | Full — plan summary + Portal |
| `billing_recovery` | Rendered **read-only** (same pages, edit affordances hidden/disabled) | **Rejected server-side**, regardless of what the UI showed | Portal only (payment recovery) |
| `none` | Not rendered — business home shows a minimal reactivation card instead | Rejected | Not applicable — reactivation happens via `/account/claim-status`'s existing plan selector, not a new Portal session |

The client-side read-only rendering in `billing_recovery` is a UX convenience only; every mutating action re-checks `mode === 'full'` itself. `/app/businesses/[businessId]/website` and `/design` redirect to the business home when `mode !== 'full'` and `mode !== 'billing_recovery'` (i.e. only for `none`) — home is the single place that renders the tri-state (full / read-only / reactivate) so subpages don't each reimplement it.

A `billing_recovery` customer may view **both** the live published site and their own existing draft (the preview card/iframe works identically to `full` mode, since viewing needs `mode ∈ {full, billing_recovery}` per the `/b/[slug]` change below) — they simply cannot create a new draft, edit it, or publish it. This mirrors the "restricted, non-destructive access" language Stage 18 already uses elsewhere; it does not restrict what a past-due customer can *see* of their own site, only what they can *change*.

Every preview/business ID pairing used by a mutation is re-verified server-side (`preview.businessId === businessId` and `business.ownerUserId === userId`) — never trust a browser-supplied `businessId`/`previewId` combination.

## Dashboard layout

### `/app` — portfolio entry

- One owned business: redirect straight to `/app/businesses/{id}` — no selection step.
- Zero owned businesses: redirect to `/account/claim-status` (it already renders the correct empty state — no need for a second copy of that message).
- Multiple owned businesses: cards (business name, thumbnail, plan, subscription state, website state, public link, "Manage website," a billing-recovery flag when applicable). Not an analytics dashboard — its only job is getting the customer to the right business.

### `/app/businesses/[businessId]` — business home

Answers, in order: is my site live, what does it look like, what's incomplete, what should I do next, is billing healthy.

- **Header**: business name, plan badge, website-status badge (Live / Draft changes / No live site — see "Draft & publish model" below), "View website" (opens `/b/[slug]`), "Edit website."
- **Website preview card**: an embedded, scaled `<iframe src="/b/[slug]">` (simplest MVP that's always current — no dependency on triggering a fresh Stage 14 screenshot capture; reusing Stage 14's existing `generated_preview` screenshots as a static thumbnail is a reasonable later optimization, not required here) with "Edit content" / "Edit design" buttons and a last-updated timestamp (`SitePreview.updatedAt` — already exists, no new field). Same-origin, so the customer's own httpOnly `webpresa_customer_session` cookie authenticates the framed request automatically — no capture-token-style query-string/cookie workaround needed, unlike Stage 14's cross-context Lambda case. Concretely:
  - `Desktop | Mobile` viewport toggle above the frame (fixed-width container, not just CSS `transform: scale`, so text reflow is representative) plus an **"Open full preview"** link that opens `/b/[slug]` in a new tab for a true full-size look.
  - `title` attribute on the `<iframe>` for accessibility.
  - Loading skeleton while the frame loads; a failure fallback (not a blank white box) if `/b/[slug]` errors.
  - No `sandbox` attribute — this is same-origin content from this app's own template, not third-party content, and the template's client-side pieces (the Request Service modal's `RequestServiceProvider` context, `CtaButton`'s `tel:`/`mailto:`/external-link handling) need to keep working exactly as they do on the real public page. Before shipping, manually verify none of those interactions unexpectedly navigate or break the parent dashboard frame.
- **Setup checklist** — only items derivable from existing data, each linking into `/website` or `/design`; disappears once nothing's left:
  - No logo (`!business.logoUrl`) → "Add your logo"
  - No photos (`!business.photoUrls?.length`) → "Add photos of your business"
  - No phone and no email → "Add a way for customers to reach you"
  - No `theme` set → "Choose a look for your website"
  - No `published` preview exists yet → "Publish your website"
  - "Connect a domain" is explicitly **not** included — no domain stage exists yet to link to.
- **Account notices** (banners, highest priority first): `billing_recovery` payment problem + Portal link; `cancelAtPeriodEnd && subscriptionStatus === 'active'` scheduled-cancellation notice; no published preview; draft changes waiting to publish.

### `/app/businesses/[businessId]/website` — content editor

Tabbed/segmented single page (not six route trees): **Content** (hero headline/subheadline, tagline, about text), **Services** (services list, differentiators), **Photos** (gallery + slot assignment, reusing `PhotoManager`/`PhotosForm` patterns), **Sections** (enable/disable/reorder via `persistWebsiteSections`, Reviews visibility/reorder via the existing Google-review hide/show + reorder logic — the former "Testimonials" section was merged into Reviews in 2026-07-26, per `architecture.md`; review author/rating/text stay hard read-only, matching the fact that admin never exposed editing them either), **Contact & CTAs** (CTA label/action-type/destination and section-level display toggles only — see split below), **SEO** (`content.seo.title`/`description`).

**Contact & CTAs vs. Settings — deliberately not the same editor.** Canonical contact fields (`Business.phone`/`email`/`address`/`socialLinks`, notification destination) have exactly one edit surface: the Settings page. Website → Contact & CTAs shows the resolved values **read-only**, with an "Edit business information" link into Settings, and only edits things that are actually website/preview-specific: CTA label, CTA action type/destination, and whether the contact section is shown at all (already covered by the Sections tab's enable/disable, not a second toggle). Two independent editors writing the same underlying fields would invite "which one actually saved it" confusion and double the validation surface for no benefit.

### `/app/businesses/[businessId]/design` — design editor

**Theme** (preset picker, reusing `ThemeForm`'s picker UI), **Hero** (desktop/mobile hero photo slots, reusing `checkHeroPhotoDimensions`/`resolvePhotoSlot`), **Section images** (about/why-choose-us/services photo slots). A "preview" sub-view is optional — it can reuse the same preview card component from the business home rather than being a fourth distinct feature.

### `/app/businesses/[businessId]/billing` — intentionally small

Current plan, monthly price, subscription status, current period end, cancellation status, a payment-problem banner when applicable, and a single "Manage billing" button that calls the existing `createBillingPortalSessionAction(businessId)` (`app/account/checkout/actions.ts`) unchanged. No custom payment-method, invoice, or cancellation UI — Stripe Portal already owns that. Because one Stripe Customer can back several business subscriptions, the page states which business's subscription is being managed even though the Portal itself may show more. The displayed plan name/monthly price reads from the new shared plan-display catalog (an application-owned constant), never from browser input, `stripeRawStatus`, or any other raw webhook-derived text.

### `/app/businesses/[businessId]/settings` — business-specific only

The single canonical edit surface for display name, phone, email, address, social links, and notification destination (see "Contact & CTAs vs. Settings" above — Website only ever reads these, never writes them).

**Publication summary — deliberately read-only, no new visibility model.** No customer-controlled "hide my site" toggle ships in this stage: introducing one now risks a fourth state alongside `draft`/`published`/`archived` with no defined interaction rules (does it override an active subscription? survive a re-publish?), and nothing in Stage 17/18 or the product direction defines those rules. Instead, a plain read-only summary, entirely derived from existing data:

```
Website status: Live
Published: July 29, 2026
Public address: /b/business-slug
```

(For "No live site," the last two lines are simply omitted — there's nothing to show yet.) Customer-controlled unpublish, maintenance mode, or suspension are explicitly deferred until their own rules are designed (see Deferred work). A domain-status line is added once a domain stage exists to source it from — not here.

Account-level identity (Cognito email/password/sign-out) stays out of this page — deferred to `/app/account`.

## Editing behavior

Reuse, don't fork: new customer-scoped Server Actions call the **same auth-agnostic lib functions** the admin actions call (`persistWebsiteSections`, the content-patch logic behind `updateSectionContentAction`, `updateBusinessListFieldAction`, the photo-slot/theme dual-write behind `updatePhotosAction`/`updateThemeAction`) rather than duplicating validation logic. Where that logic is currently inline inside an admin-session-gated action in `app/admin/(dashboard)/businesses/[businessId]/actions.ts`, extract its auth-agnostic core into a shared `lib/` function first, so both admin and customer actions call the identical validated write path.

**Direct patch** (updates the draft preview immediately, no AI call, exactly like the admin equivalents do today): phone/email/address/social links, CTA labels/action types, theme, photo slots, section enabled/order, existing section copy, services/service-area text.

**Regeneration** (AI, creates a new `SitePreview` version): explicitly **not** offered in the customer dashboard for this stage — `generateWebsiteAction`'s AI regeneration path stays admin-only. Customers get direct patch editing only; broad AI-assisted rewriting is deferred (see Deferred work).

## Draft & publish model

Three customer-facing website states, derived from existing data (no new `Business`/`SitePreview` fields needed anywhere in this stage):

- **Live** — a `published` preview exists and no newer draft sits on top of it.
- **Draft changes** — the newest preview for the business has `status !== 'published'` while an older `published` sibling still exists.
- **No live site** — no preview has ever been published.

Workflow:

1. Customer edits a field.
2. The action calls `ensureDraftPreview(businessId)`: if the current newest preview's `status === 'published'`, clone it into a new draft version via `createSitePreview({ ...latest fields, previousVersion: latest.version })` (always lands as `status: 'draft'`); otherwise reuse the current newest preview as-is. This is a new copy-on-write step the admin side never needed — today's admin actions patch whichever preview is newest **in place**, even if it's already published (edits go live immediately, by design, for a trusted admin), which is exactly the "customer accidentally overwrites the live site" failure mode this stage must prevent.
3. The action patches the returned draft in place — identical mechanics to the admin's existing patch-in-place actions, just always guaranteed to be a draft first.
4. The dashboard shows "Draft changes saved" with **Preview draft** / **Publish changes**.
5. Publishing calls the existing `publishSitePreview(previewId)` (archives the old published sibling, promotes the draft) + `updateBusiness(businessId, { currentPreviewId })` — after re-verifying session, ownership, `mode === 'full'`, and that `previewId` actually belongs to `businessId`.
6. Previous preview versions are never deleted (already true — `publishSitePreview` archives, never deletes).
7. `/b/[slug]` is already `force-dynamic` with no cache layer in front of it — publishing needs no explicit revalidation step.
8. A failed publish leaves the currently-published preview untouched (the operation only ever promotes the target draft after validating it; it never mutates the live one first).

## Small required changes to already-shipped code

These are prerequisites for `/app` to exist, be reachable, and actually preview a draft — not a reopening of Stage 8/17/18's own scope:

- **`app/b/[slug]/page.tsx`'s `resolvePreview()`** — today it only returns a `draft`/`ready` preview for an admin session (`getSession()`) or a Stage-14 capture-token request; there is no path for a customer at all. Add a third branch: after the admin check and before (or alongside) the capture-token loop, call `getCustomerSession()` (`lib/auth/customer-session.ts` — already exists, already non-throwing, returns `null` instead of redirecting) and, if present, resolve that preview's owning `Business` and check `business.ownerUserId === session.sub` and access mode ∈ `{full, billing_recovery}`. Extract the mode computation Stage 18 already has inside `requireBusinessAccess()` into a small pure helper (e.g. `computeBusinessAccessMode(business): BusinessAccessMode`) so both `requireBusinessAccess()` and this new branch share one implementation instead of two copies of the `subscriptionStatus` → mode mapping. Return `{ preview, isAdmin: false }` — `isAdmin` in this file only gates one thing (`GeneratedWebsite`'s admin-only draft banner in `template/index.tsx`), so `false` is correct and sufficient; no other admin-only UI leaks through this path. Unauthenticated visitors and customers who don't own the business continue to get `null` → `notFound()`, unchanged.
- `proxy.ts` — add the `/app/:path*` branch (see "Route protection" above).
- `lib/auth/customer-actions.ts` — widen `safeNextPath()` to allow `/app` targets.
- `app/account/claim-status/page.tsx`'s `BusinessCard` — once `subscriptionStatus === 'active'` (or `billing_recovery`), show a primary **"Go to dashboard"** link to `/app/businesses/{id}` alongside/instead of the inline "Manage billing" button. `claim-status` otherwise keeps its existing Stage 17/18 job unchanged (pre-entitlement plan selection, reactivation for `canceled`) — no billing-management logic is duplicated into `/app`.
- `app/account/claim-status/PlanSelectionForm.tsx` — read its price/label text from the new shared plan-display catalog instead of its current inline `"$39/month"`/`"$79/month"` literals, so the Billing page and the plan selector can never drift out of sync.

## Security requirements

- Every `/app/*` page and Server Action independently re-derives session → ownership → access mode; nothing is cached from a prior request or trusted from the client.
- No admin-only data ever reaches a customer response: scan records, AI qualification/scores, Firecrawl artifacts, claim-token management, `Business.source`/internal status fields, Stripe/Cognito raw IDs, provider error text, cascade-delete or ownership-release actions.
- Google-sourced review author/rating/text remain immutable; only visibility/order are customer-editable, matching what was ever possible in the admin UI.
- `previewId`/`businessId` pairs are revalidated server-side on every mutation — never trusted from a form field alone.
- **Photo uploads inherit today's actual state, not an idealized one**: there is no MIME-type or per-file-size validation on `putAsset()` today (only a key-prefix allowlist) — this is a pre-existing gap already tracked under Stage 25 (Security Hardening), and Stage 19 does not silently fix it. What Stage 19 *does* add, correctly: the uploaded S3 key is only ever written under a `businessId` the requesting customer was already proven to own by `requireBusinessOwnership()` — no new customer-specific path for an unowned business's asset prefix.
- **CSRF/origin protection**: every Server Action in this app (admin's included) already gets Next.js's built-in same-origin verification for Server Action POSTs, and `next.config.ts` sets no `experimental.serverActions.allowedOrigins` override that would weaken it. The new customer-scoped actions are plain `'use server'` functions and inherit this automatically; no new CSRF mechanism is needed. Worth a one-line confirmation in `build_log.md` once implemented, not new code.
- **Safe logging**: publish attempts and access-mode denials (`billing_recovery`/`none` hitting a `full`-only action) are logged with `userId`, `businessId`, `previewId`, and outcome only — never full form payloads or PII — matching the "log safely, never the full payload" convention Stage 16/18's webhook handler already establishes. No new audit table.

## Acceptance criteria

- An authenticated customer can view every business they own; a single-business customer reaches it with no selection step; a multi-business customer can switch.
- A customer cannot view or mutate another customer's business via a crafted URL or payload.
- A `full`-mode customer can edit approved content/design fields; edits land on a draft, never immediately overwrite a live published preview.
- A customer can preview a draft and explicitly publish it; previous versions remain preserved.
- Google-sourced review author/rating/text cannot be altered by a customer.
- No admin-only field or operation is ever reachable from `/app/*`.
- A `billing_recovery` customer sees a read-only dashboard, can view both their published site and their existing draft, and can reach Stripe Portal — but every edit/publish action rejects server-side regardless of UI state.
- `/b/[slug]` correctly resolves an owning customer's own `draft`/`ready` preview (mode `full` or `billing_recovery`) while continuing to reject unauthenticated visitors and non-owning customers exactly as before.
- A `none`-mode (canceled) customer sees a minimal reactivation path via `/account/claim-status`, never a bare 404 or full lockout.
- "Manage billing" opens a real Stripe Customer Portal session scoped to the correct business's Stripe Customer.
- The dashboard is usable on mobile, tablet, and desktop, following `AdminSidebar.tsx`'s responsive drawer pattern.
- Loading, empty, validation-error, authorization-error, publish-error, and read-only states are all handled.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` pass in `web/`.
- `architecture.md`, `deployment.md`, and `build_log.md` are updated.

## Deferred work

Lead inbox/notification history (Stage 20), domain connection/purchase (dedicated stage), analytics/traffic reporting, Google Business Profile management, team members/shared editing, ownership transfer, `requirePlanCapability()` (no gated capability exists yet), AI-assisted whole-site rewriting/regeneration from the customer dashboard, drag-and-drop layout building, custom section variants, custom HTML/CSS, customer-visible scan history or AI scores, admin impersonation, SES/welcome-email infrastructure (a static in-dashboard notice suffices for now), `/app/account` (Cognito email/password/sign-out settings beyond the sidebar's sign-out action).

---

# Stage 19.x — Customer Onboarding and Domain Connection

## Status

**Parts 1 and 2 implemented and deployed to dev (2026-07-31), with a real `webpresa-dev-vercel-api` token populated and a real customer walkthrough performed.** That walkthrough surfaced (and this stage now addresses) several UI gaps — progress-bar readability/backward navigation, inline services editing on Review, the domain-choice cards' default/ordering, real-time (not two-manual-click) domain verification, a too-narrow publish-step preview — and one critical finding: connecting a real domain via Vercel's plain Domains API served **Production**, not `dev`, because Production predates Stage 17 entirely. See "Domain-to-branch targeting" under Part 2 below for the fix. Parts 3 (OpenSRS purchase) and 4 (final integration/dashboard orientation) — not started. See `architecture.md`, "Customer Onboarding and Domain Connection (Stage 19.x, Parts 1–2)", and `build_log.md` for the full implementation record.

## Objective

Guide a newly subscribed customer from successful Stripe payment to a live, published Webpresa website with a working custom domain — without requiring the customer to understand DNS, registrars, Vercel, or SSL — then hand them into Stage 19's dashboard already oriented. This stage does not recreate account creation, claim consumption, Checkout, subscription reconciliation, website editing, or publishing infrastructure. It is a one-time orchestration layer over Stage 19's existing capabilities, plus the domain-connection and domain-purchase capabilities Stage 19 never needed.

This stage is delivered as four sequential parts, each independently shippable and independently verifiable against this document's standard completion checklist:

```text
Part 1 — Onboarding framework
        ↓
Part 2 — Existing-domain connection
        ↓
Part 3 — Domain purchasing via OpenSRS
        ↓
Part 4 — Final onboarding integration and dashboard orientation
```

Part 1 ships a complete, useful onboarding wizard on its own (welcome → business review → domain [Webpresa-address-only for now] → publish → a minimal tour placeholder). Each later part upgrades the same Domain route in place: Part 2 adds "connect a domain I already own," Part 3 adds "buy a new domain," Part 4 replaces the placeholder tour with the full illustrated orientation and performs the stage's final cross-flow integration pass. A customer who onboards after only Part 1 is shipped sees a complete, coherent flow — not a flow with a visibly missing feature.

## Dependencies

- Stage 8 — public generated website route and rendering
- Stage 11.x — configurable website sections and reusable editing primitives
- Stage 17 — Cognito customer authentication, ownership, and claim flow
- Stage 18 — Stripe subscription entitlement, `CustomerBillingProfile`, and the reserved `billingPurpose` metadata boundary (`domain/constants/plans.ts` already reserves `'domain_purchase'`/`'domain_renewal'` for this stage)
- Stage 19 — customer dashboard, customer-scoped editing, draft preview, and publishing (implemented — see Stage 19's Status above)
- Existing Vercel deployment (project-domain attachment, automatic certificate issuance)
- **Part 3 only**: an OpenSRS reseller account (business-side signup, prepaid balance, API credentials, IP allowlisting) — a prerequisite performed outside this codebase, the same way Stage 18's Stripe Products/Prices are created via Dashboard/CLI, not CDK. Exact OpenSRS API method names, request/response shapes, and sandbox vs. live endpoint hostnames must be verified against OpenSRS's current reseller API documentation before implementing Part 3 — none are hardcoded in this spec.

## Non-goals (all four parts)

- Anything Stage 17/18/19 already does: authentication, claim consumption, Checkout, webhook reconciliation for the recurring subscription, `Business.status` transitions, the customer dashboard shell/editing/publishing itself.
- A support/change-request queue, domain analytics, leads inbox (Stage 20), team members/shared editing, ownership transfer, AI-assisted whole-site rewriting, drag-and-drop building, custom HTML/CSS, `requirePlanCapability()`, account deletion, admin impersonation.
- Registrar transfer (moving a domain's registrar of record away from its current provider) — the existing-domain flow (Part 2) only ever points DNS at Vercel; the domain stays registered wherever the customer already has it.
- A full domain-lifecycle management center (renewal-reminder emails, self-service transfer-out tooling) — the data model must not prevent building these later, but no UI ships for them in this stage.
- A scheduled, always-on domain-status reconciliation job — Parts 2 and 3 reconcile on page load and on an explicit "check again" action only; a scheduled EventBridge job belongs to **Stage 23 — EventBridge Controlled Automation**, once that stage exists, not built ad hoc here.
- Wildcard `{slug}.webpresa.com` subdomains — deferred until a later infrastructure decision explicitly implements them; the temporary public address stays `webpresa.com/b/{slug}`.
- A pluggable multi-registrar provider interface — see Part 3's "Major deliverables."

## Architectural position

Stage 19 remains the reusable application; this stage is a one-time orchestration layer over it. The business-review step links into/reuses Stage 19's settings and content-editing primitives; the publish step calls Stage 19's existing `publishDraftActionCustomer`/`ensureDraftPreview` path unchanged; the tour explains Stage 19's navigation; domain status stays visible in Stage 19's dashboard after onboarding completes. No onboarding-only reimplementation of business editing, photo upload, theme selection, publication, or billing is created at any point in this stage.

## Production launch gate

Parts 1 and 2 may each be deployed to development and verified independently — Part 1 alone is a coherent, complete onboarding experience for internal/dev testing. **Production launch of the Webpresa MVP is explicitly gated on Parts 1–3 all being implemented and verified, plus Part 4's final integration pass** — domain purchasing is a required MVP capability, not a nice-to-have layered on afterward. "Part 1 ships a complete flow" describes development-verifiable scope, not launch-readiness.

## Post-Checkout routing (added in Part 1, unchanged by later parts)

Once Stage 18's webhook confirms `subscriptionStatus === 'active'` and `requireBusinessAccess()` resolves to `full`:

```text
Onboarding record missing or status !== 'completed'  →  /app/onboarding/{businessId}
Onboarding record status === 'completed'              →  /app/businesses/{businessId}
```

The redirect decision reads the persisted `CustomerOnboarding` record — never a browser-controlled query parameter, and never the Stripe success-redirect alone. A `billing_recovery` customer may resume viewing a completed onboarding record read-only, but cannot start onboarding, connect/purchase a domain, edit, or publish until `full` access returns. A `none`-mode customer uses the existing `/account/claim-status` reactivation path; no onboarding route renders for them.

## Authorization model (all parts)

Every onboarding page and every onboarding Server Action independently:

1. Calls `requireCustomerSession()`.
2. Calls `requireBusinessOwnership(userId, businessId)` — `notFound()`, never a 403 that confirms the business exists.
3. Calls `requireBusinessAccess(userId, businessId)` and requires `mode === 'full'` for every mutation (starting/advancing a step, connecting/purchasing a domain, publishing). `billing_recovery` may view an already-completed onboarding record read-only. `none` never reaches an onboarding route.
4. Revalidates every `domainConnectionId`, and (Part 3) purchase-attempt ID against the authorized business — never trusts a browser-supplied pairing.
5. Never trusts the Checkout success redirect, client-reported DNS status, or client-reported domain availability/pricing as proof of anything.

---

## Part 1 — Onboarding framework

### Objective

Ship a complete, working onboarding wizard: welcome, essential business review, a domain step that (for now) only offers "use my Webpresa address for now," preview-and-publish, and a minimal tour placeholder — wired into real persisted progress, real resume behavior, and real Stage 19 dashboard hooks.

### Major deliverables

- `CustomerOnboarding` domain model, Zod schema, factory, and repository (`web/lib/db/customer-onboarding.ts`)
- New DynamoDB table `webpresa-{env}-customer-onboarding` — partition key `businessId` (one onboarding record per business; no GSI needed for the core route, since `/app` already resolves businesses by owner)
- The full onboarding route group ships in this part: `/app/onboarding/[businessId]`, `/app/onboarding/[businessId]/domain`, `/app/onboarding/[businessId]/review`, `/app/onboarding/[businessId]/publish`, `/app/onboarding/[businessId]/tour`. Later parts upgrade what a route offers rather than introducing new routes mid-stage — the Domain route in this part offers only "Use my Webpresa address for now"; Part 2 adds "Use a domain I already own" to the same route; Part 3 adds "Buy a new domain" to the same route again.
- Step-completion rules and resume logic (see below)
- Stage 18 post-Checkout redirect updated to read the onboarding record (see "Post-Checkout routing" above)
- Stage 19 dashboard hook: a "Finish setting up your website" notice + "Continue onboarding" link when onboarding is incomplete
- Essential business-review step, reusing Stage 19's customer-scoped editing functions (`lib/customer-editing/*`) directly — never a second content model
- Preview-and-publish step, reusing Stage 19's `publishDraftActionCustomer`/`ensureDraftPreview` unchanged
- A minimal placeholder tour screen ("Go to my dashboard" / "Skip tour" — no illustrated cards yet; Part 4 replaces this)

### `CustomerOnboarding` model

```ts
interface CustomerOnboarding extends MutableTimestampedRecord {
  businessId: string; // partition key — one onboarding record per business
  userId: string;

  status: 'not_started' | 'in_progress' | 'completed';

  currentStep: 'welcome' | 'review' | 'domain' | 'publish' | 'tour' | 'complete';

  completedSteps: Array<'welcome' | 'review' | 'domain' | 'publish' | 'tour'>;

  // Part 1 only ever writes 'defer'. Part 2 adds 'existing'; Part 3 adds
  // 'purchase' — additive, same pattern Stage 17/18 used for Business fields.
  domainDecision?: 'defer' | 'existing' | 'purchase';
  domainConnectionId?: string; // set starting Part 2 — resolved via DomainConnection's
                                // business-id-index, not a dedicated onboarding-side index

  domainDeferredAt?: string;
  tourCompletedAt?: string;
  tourSkippedAt?: string;
  completedAt?: string;
}
```

No standalone `onboardingId`: the table's partition key is already `businessId`, and the relationship is strictly one-to-one, so a second generated identifier is redundant. This matches `CustomerBillingProfile` (Stage 18), which is likewise keyed directly on its natural one-to-one key (`userId`) with no extra ID field.

**Ordering rationale**: Review runs before Domain because the business's corrected name, city, state, and primary service (captured during Review) feed Part 3's domain-name suggestions — suggesting domain names before the business's own facts are confirmed would mean suggesting names from stale or AI-guessed data.

### Step-completion rules (not browser-trusted)

A Server Action marks a step complete only after verifying its actual requirement — never from a client-supplied "done" flag:

- `welcome` — completes once an authorized customer continues past it.
- `review` — completes once required fields validate: business name; at least one of phone or email; at least one service. A public street address is **optional** — when entered it must pass full canonical address validation, but its absence never blocks completion (many home-service businesses intentionally don't publish a street address while still showing city/state/service areas). This is a data-completeness rule, independent of which theme happens to be selected — theme never gates field validity.
- `domain` — in Part 1, completes only via explicit defer (`domainDecision = 'defer'`, `domainDeferredAt` set). Parts 2/3 add their own completion conditions on this same step without changing this one.
- `publish` — the customer may **exit onboarding temporarily** with only a draft (entering the dashboard early, where a "Finish setting up your website — your site still needs to be published" notice shows). But the `publish` step, and therefore `CustomerOnboarding.status`, cannot reach `'completed'` until a `published` preview actually exists — a draft-only site keeps the record `'in_progress'` no matter how far into the tour the customer has gone. A narrow admin-only exception exists for the case where publishing is genuinely unavailable due to a platform failure (not a customer choice); that is an admin-operated recovery state, not a normal customer skip.
- `tour` — completes (`tourCompletedAt`) or is explicitly skipped (`tourSkippedAt`); both are terminal for this step, recorded as distinct outcomes so "finished the tour" and "intentionally bypassed it" stay distinguishable (analytics, and Part 4's replay entry point).

`CustomerOnboarding.status` becomes `'completed'` only through a single server-side completion function, once welcome + review + domain + publish (with a real published preview) + tour are all satisfied — keeping `'completed'` an honest signal that this stage's stated objective ("a live, published website") was actually met.

### Resume behavior

On every `/app/onboarding/{businessId}/*` request: authenticate → verify ownership → resolve access mode → load (or, on first visit, conditionally create) the onboarding record → determine the earliest incomplete required step (welcome → review → domain → publish → tour) → allow the requested step only if it doesn't skip ahead of that step. A customer closing the browser mid-review returns exactly to Review with whatever was already saved (review edits patch the draft directly via Stage 19's existing lib functions, so there's nothing onboarding-specific to persist there). A customer who finishes onboarding and revisits `/app/onboarding/{businessId}` sees a completion summary, not the wizard again.

### Security requirements

- Same as the stage-level authorization model above, scoped to `previewId` re-verification.
- Publish attempts and step-completion transitions are logged with `userId`, `businessId`, and outcome only — never full form payloads — matching the Stage 16/18 safe-logging convention.

### Testing requirements

- Onboarding next-step resolution, including the review-before-domain ordering (unit).
- Onboarding completion rules — in particular, that a draft-only site never yields `status: 'completed'`, and that address validation never depends on the active theme (unit).
- Conditional onboarding-record creation, resume-from-any-step (repository + integration).
- Authorization: unauthenticated → redirect; non-owner → `notFound()`; `billing_recovery` cannot start/advance a step; `none` never reaches an onboarding route.

### Acceptance criteria

- A customer redirected from Checkout success lands on `/app/onboarding/{businessId}` and can complete welcome → review → domain (defer) → publish → tour end to end.
- A customer who leaves after only publishing a draft can still enter the dashboard early, but their onboarding record stays `in_progress` with a visible "still needs to be published" notice — never silently marked complete.
- Progress persists across sessions; closing the browser mid-flow and returning resumes at the correct step.
- Completing onboarding (with a real published preview) redirects to `/app/businesses/{businessId}` and the Stage 19 dashboard shows a one-time "Your Webpresa website is set up" message, not driven solely by a query parameter.
- The dashboard shows "Finish setting up your website" whenever onboarding is incomplete, and the link resumes correctly.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` pass in `web/`.

---

## Part 2 — Existing-domain connection

### Objective

Let a customer whose business already has a domain (at GoDaddy, Wix, Squarespace, Namecheap, Cloudflare, Hostinger, Network Solutions, or elsewhere) point it at their Webpresa website — DNS connection only, never a registrar transfer — with plain-language instructions and safe verification.

### Major deliverables

- `DomainConnection` canonical model, Zod schema, factory, and repository (`web/lib/db/domain-connections.ts`) — a standalone record, not fields bolted onto `Business`, since a business may eventually have an apex domain, a `www` alias, redirects, and domain history
- New DynamoDB table `webpresa-{env}-domain-connections` — **partition key `normalizedDomain`** (see "Why `normalizedDomain` is the partition key" below); GSI `business-id-index` (PK `businessId`, SK `createdAt`). No `status-index` — low-cardinality status GSIs are exactly what `architecture.md`'s own GSI convention already warns against.
- `domainConnectionId` remains a stable, generated, opaque field on every record (used in URLs/logs, and as the cross-reference stored on `CustomerOnboarding.domainConnectionId` and, in Part 3, `DomainPurchaseAttempt.domainConnectionId`) — but it is **not** the table key, and no dedicated GSI exists on it. A lookup by `domainConnectionId` resolves via `business-id-index` (fetch the business's connection, match the field) since a business has at most one active primary connection at a time; a third GSI purely for this isn't needed.
- Server-only Vercel client: `web/lib/vercel/client.ts`, `domains.ts`, `errors.ts` — add a domain to the Webpresa Vercel project, inspect project-domain configuration, retrieve required DNS/verification records, check verification status, remove a failed/abandoned assignment
- New Secrets Manager secret `webpresa-{env}-vercel-api` (`{ accessToken, teamId?, projectId? }`) via the existing `WebpresaSecret` construct; granted to `webpresa-vercel-{env}` through `vercel-access-stack.ts`'s existing `SecretsManager` statement — no new IAM identity
- `/app/onboarding/[businessId]/domain` already exists from Part 1 — this part adds "Use a domain I already own" and its full connection flow to that same route
- Multi-tenant custom-domain host routing (see architecture checkpoint below)
- `reconcileDomainConnection(domainConnectionId)` — page-load and manual "check again" invocation only in this part
- Domain status card + read-only domain summary on Stage 19's Settings page + "View website" preferring an active custom domain
- Admin domain visibility on the business-detail page (read-only status, refresh, resend/regenerate instructions, mark disconnected, remove a failed Vercel assignment)

### Why `normalizedDomain` is the partition key, not a GSI

A generated `domainConnectionId` as the partition key with a `normalized-domain-index` GSI relied on to prevent double-assignment does not actually guarantee uniqueness: two concurrent requests can both query the GSI, both see no existing match, and each then `PutItem` a different item for the same domain — a check-then-act race, since a GSI query and a write under a different table key are never atomic together. Keying the table directly on `normalizedDomain` and creating the record with `ConditionExpression: attribute_not_exists(normalizedDomain)` makes the reservation atomic by construction — the same approach `CustomerBillingProfile` (Stage 18) already uses, keyed directly on its natural one-to-one key (`userId`) rather than a generated ID plus a uniqueness index. It's also simpler: one fewer GSI, no separate reservation/lock item needed.

### `DomainConnection` model

```ts
interface DomainConnection extends MutableTimestampedRecord {
  normalizedDomain: string; // partition key — the apex domain, normalized
  domainConnectionId: string; // stable opaque reference field, not the table key
  businessId: string;
  ownerUserId: string;

  domainName: string; // as originally entered, pre-normalization, for display

  source: 'customer_owned' | 'webpresa_registered'; // no 'temporary_webpresa' — see below

  registrarProvider?:
    | 'godaddy' | 'wix' | 'squarespace' | 'namecheap' | 'cloudflare'
    | 'hostinger' | 'network_solutions' | 'opensrs' | 'other' | 'unknown'; // 'opensrs' unused until Part 3

  status:
    | 'draft' | 'awaiting_dns' | 'verifying' | 'connected'
    | 'certificate_pending' | 'active' | 'failed' | 'disconnected' | 'expired';

  isPrimary: boolean;
  desiredRedirect: 'apex_to_www' | 'www_to_apex' | 'none';

  primaryHostname: string; // e.g. 'example.com' or 'www.example.com'
  aliasHostnames: string[]; // apex and www are separate Vercel project-domain
                             // objects with independent status — don't assume
                             // they share one verification/certificate state
  providerDomains?: Array<{
    hostname: string;
    vercelProjectDomainId?: string;
    status: 'pending' | 'verified' | 'certificate_pending' | 'active' | 'failed';
  }>;

  verificationRecords?: DomainDnsInstruction[];

  lastCheckedAt?: string;
  verifiedAt?: string;
  certificateReadyAt?: string;
  activatedAt?: string;

  failureCategory?: DomainFailureCategory;
  failureMessage?: string;

  // Part 3 adds a `registration` sub-object here, additively.
}

interface DomainDnsInstruction {
  recordType: 'A' | 'AAAA' | 'CNAME' | 'TXT'; // no 'NS' — see below
  name: string;
  value: string;
  purpose: 'routing' | 'ownership_verification' | 'redirect' | 'certificate';
  required: boolean;
}

type DomainFailureCategory =
  | 'invalid_domain' | 'domain_already_assigned' | 'domain_owned_by_another_customer'
  | 'vercel_auth_failed' | 'vercel_project_not_found' | 'vercel_domain_add_failed'
  | 'ownership_verification_required' | 'dns_not_configured' | 'dns_mismatch'
  | 'dns_propagation_pending' | 'certificate_pending' | 'certificate_failed'
  | 'domain_expired' | 'unknown';
  // Part 3 adds purchase-specific values additively.
```

ID convention: `domain_<uuid>` for `domainConnectionId`. DNS values shown to the customer always come from the live Vercel project-domain response, never a hardcoded IP.

No `'temporary_webpresa'` value on `source` — the deferred/Webpresa-address state is not a domain at all, so it must never produce a `DomainConnection` row. It's represented purely on `CustomerOnboarding` (`domainDecision = 'defer'`, `domainDeferredAt`); `/b/{slug}` is an application route, not a domain connection.

No `'NS'` record type in the MVP instruction set: this stage never asks an existing-domain customer to delegate nameservers — that would hand Webpresa control over every DNS record on the domain, including unrelated email/verification records this plan already promises to leave untouched. If Vercel's response for a given domain ever *requires* full nameserver delegation to complete verification, Part 2 treats that as an explicitly unsupported case — fail closed with "this domain's setup isn't supported yet, please contact us," never silently ask for nameserver changes.

### Existing-domain flow

1. **Input**: ask for the bare domain (`coastalplumbing.com`), normalize server-side (lowercase, punycode, strip protocol/path/query/trailing dot, treat `www.` as an alias choice not a separate record), validate with a domain-specific parser (not a generic URL regex).
2. **Registrar selection**: "Where do you manage this domain?" — display-only, tailors instructions, grants no registrar access.
3. **Preflight**: confirm ownership + `mode === 'full'`; normalize/validate; attempt the conditional create on `normalizedDomain`; reject if it already exists for another business; allow resuming this business's own pending record; block reserved/Webpresa-owned/localhost/malformed/public-suffix-only names; add the domain (and its alias) to the Vercel project; save the returned DNS/verification instructions.
4. **Customer instructions**: registrar-tailored steps, exact record cards populated from the live provider response (type/name/value), copy button, and a single **"Record Updated"** button (renamed from an earlier "Check again" — real customer testing showed "check again" implied a second manual click was normal/expected; "Record Updated" reads as the one deliberate signal it actually is). Never ask the customer to touch unrelated MX/DKIM/SPF/other-subdomain records; warn before replacing a conflicting A/AAAA/CNAME.
5. **Verification**: `status = 'verifying'`, immediate provider check on "Record Updated." Outcomes: connected → proceed to certificate status; DNS pending → "still updating, we'll keep checking," never a trapped spinner; incorrect records → expected vs. detected value + retry; ownership-verification-required → show the exact TXT record.
6. **Polling**: one click ("Record Updated") starts client polling automatically (`POST /api/domains/status` every ~7s while the page is open) — the customer never has to click again to watch it progress through to "Your domain is live." Provider calls stay server-side; polling stops on active/failed/expired. No perpetual background polling in this part — see reconciliation, below.
7. **Certificate status**: `connected → certificate_pending → active`. The domain is customer-facing "Live" only once HTTPS works, even though Vercel manages issuance automatically.

### Multi-tenant custom-domain routing

`proxy.ts` today matches exactly `/admin/:path*`, `/account/:path*`, `/app/:path*` (confirmed by reading the file) — a request to `bestplumber.com/` never reaches it. **Before writing the routing code**, produce a short design note (grounded in the actual `proxy.ts`, DynamoDB client, and Vercel deployment) covering runtime compatibility, per-request lookup count, cache behavior, matcher exclusions, and unknown-host behavior — a checkpoint, not a step to skip.

Keep the routing layer thin. Do not import the full business/domain repositories into the proxy. Add a single narrow, purpose-built lookup:

```ts
function resolveActiveDomainRoute(hostname: string): {
  businessId: string;
  slug: string;
  primaryHostname: string;
  redirectToHostname?: string;
} | null
```

so a tenant request resolves in one lookup rather than a domain-table query, then a business-table read, then a preview lookup in sequence. The routing-relevant `slug` is denormalized directly onto the `DomainConnection` record at connect/activation time for exactly this reason — the same "denormalized display copy" pattern Stage 18 already uses for `stripeCustomerId`.

Explicitly exclude from tenant resolution: `/_next/*`, `/api/*`, `/admin/*`, `/account/*`, `/app/*`, `/claim/*`, plus the existing reserved-host allowlist (`webpresa.com`, `www.webpresa.com`, Vercel preview-deployment hosts, `localhost`, internal test hosts). Behavior must be host-aware and fail closed: on Webpresa hosts, existing routes work unchanged; on an active customer host, allowed public tenant routes resolve; on an unknown or inactive customer host, resolution fails closed — no host ever falls through to another customer's site.

When an active custom domain exists, prefer it for metadata canonical URL, sitemap URLs, Open Graph URLs, and the dashboard's public link; otherwise use `/b/{slug}`. Support both apex and `www` per `desiredRedirect` (default `www → apex` unless Vercel's current guidance says otherwise).

### Domain-to-branch targeting (required — confirmed via a real production incident)

Attaching a domain via Vercel's plain Project Domains API (`POST /v10/projects/{id}/domains` with just `{ name }`) makes it serve **Production** by default. If this application's customer-facing pipeline (Stage 17 onward) does not yet exist on the Production branch — true for this codebase as of Stage 19.x, where everything through Part 2 has only ever been deployed to a `dev` branch — a real customer domain will silently serve whatever old build Production happens to be running, with none of the routing logic above ever executing. This was caught live: a real test domain served the plain marketing homepage instead of `/b/{slug}` for its business.

The fix: `addProjectDomain()` accepts an optional `gitBranch`, confirmed live against the real Vercel API (`PATCH /v9/projects/{id}/domains/{domain}` accepts and persists it) — pins the domain to serve that branch's deployments instead of Production. `startDomainConnection` reads this from an environment variable (`WEBPRESA_VERCEL_DOMAIN_GIT_BRANCH`) rather than hardcoding it, set only in the environment(s) where the pipeline still lives on a non-Production branch — left unset once this stage is genuinely deployed to Production, so no application-code change is needed at that point. Any future implementer connecting a domain outside of a fully-promoted-to-Production environment must set this or repeat the same failure.

### `reconcileDomainConnection(domainConnectionId)`

Load and validate the record → query Vercel project-domain status → update verification/DNS/certificate status and timestamps → map safe failures → avoid invalid backward transitions → return a customer-safe result. Called from: Domain page load (non-terminal status only), "Check again," and foreground polling. A scheduled background job is explicitly out of scope for this part (see Non-goals).

### Status transitions (existing-domain path)

```text
draft → awaiting_dns → verifying → (dns pending → awaiting_dns | provider error → failed | verified → connected)
connected → certificate_pending → active
active → disconnected
active → expired
```

No client-controlled transition is ever accepted directly — every transition is server-derived from a provider check.

### Domain disconnection on subscription cancellation (customer-owned domain)

Do not immediately remove the DNS/Vercel project-domain assignment when a subscription is canceled — retain service through `currentPeriodEnd` per Stage 18's entitlement rules; after entitlement ends the site may cease serving on that domain per cancellation policy; preserve the `DomainConnection` record and show clear reconnection guidance on reactivation.

### Security requirements

- Domain uniqueness/takeover protection: the conditional `PutItem` on `normalizedDomain` is the primary guarantee (see above); Vercel's own ownership-verification process (TXT record) remains required before a domain is ever marked `connected` — bare DNS resolution is never treated as ownership proof. When Vercel reports the domain attached elsewhere: store `ownership_verification_required`, show the exact provider-approved verification record, never expose the other project/owner.
- **`POST /api/domains/status`** (not `GET` — a status check that also triggers a live provider call and a DynamoDB write must never look like a side-effect-free `GET`) independently verifies session, ownership, access mode, origin, that the target `domainConnectionId` belongs to the authorized business, and applies bounded rate limiting on top of the 15–30s foreground-polling cadence.
- `previewId`/`businessId`/`domainConnectionId` triples re-verified server-side on every mutation.
- Safe logging: operation, businessId, domainConnectionId, normalized domain (when operationally necessary), provider request ID, status transition, safe failure category — never the Vercel token or full provider response.

### Testing requirements

- Domain normalization, validation, reserved-host rejection (unit).
- **Concurrent-create race**: two simultaneous connection attempts for the same normalized domain — exactly one succeeds via the conditional `PutItem`, the other gets a clean "already connected" rejection (integration).
- Status-transition validity (unit) — no invalid backward transition accepted.
- Host-to-business resolution via `resolveActiveDomainRoute` (unit) — reserved/unknown hosts never trigger tenant lookup or fall through to another business.
- Authorization: non-owner cannot connect a domain to a business they don't own; `billing_recovery`/`none` cannot mutate; `GET` on the status endpoint never mutates state.

### Acceptance criteria

- A `full`-mode customer can connect an existing domain, see exact live DNS instructions, verify, and reach "Live" once HTTPS is ready — all without engineering support.
- A domain-connection race (two simultaneous attempts for the same domain) never produces two records for one domain.
- `bestplumber.com/` renders the correct business's website via internal rewrite; the browser URL bar shows the custom domain, not `/b/{slug}`.
- A domain already active on another business is rejected with a generic, non-identifying message.
- Unauthenticated visitors and non-owning customers are rejected exactly as before on both `webpresa.com/b/{slug}` and any connected custom domain.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` pass in `web/`; `cdk diff`/`cdk synth` pass in `infra/`.

---

## Part 3 — Domain purchasing via OpenSRS

### Objective

Let a customer without an existing domain search, price, and buy one directly during onboarding, using **OpenSRS** as the registrar/reseller backend — Webpresa purchases and manages the domain as reseller, with the customer's business as the registrant of record, and DNS is configured automatically (no manual customer step, unlike Part 2's existing-domain flow).

### Part 3.0 — Prerequisites and architecture checkpoints (resolve before writing any client code)

1. **OpenSRS reseller account** (business-side signup, prepaid balance, API username/key, IP-allowlisted access, sandbox/test environment) — provisioned outside this codebase, the same way Stage 18's Stripe Products/Prices are created via Dashboard/CLI, not CDK.
2. **Fixed-egress compute decision — resolved.** OpenSRS's reseller API restricts access by source IP **in the live environment, for every action** — not only registration. This matters because it also gates the *interactive search step* (`LOOKUP`/`get_price`/`name_suggest`), which happens synchronously as a customer types a domain name during onboarding, not only the async purchase step. Decision: **Option B — a single dedicated AWS Lambda with static egress**, consistent with this repo's existing infra precedent (Stage 14 screenshot Lambda, Stage 16 Step Functions workflow: "Vercel serves the app; a purpose-built AWS Lambda handles one constrained backend job").
   - **Egress mechanism**: the Lambda runs in a VPC private subnet routed through **[fck-nat](https://github.com/AndrewGuenther/fck-nat)** (an open-source NAT-instance CDK construct), not a managed NAT Gateway — a managed NAT Gateway costs ~$33/month sitting idle regardless of traffic (AWS's flat hourly rate), which is disproportionate for a feature with low purchase volume at this stage; fck-nat is a self-managed EC2 NAT instance (~$3-5/month, ~90% cheaper) with an Auto Scaling Group for auto-replace-on-failure. Trade-off accepted deliberately: this is a self-managed component (AMI/patching) rather than an AWS-managed one, in exchange for the cost difference. If purchase/search volume grows enough that the ops overhead outweighs the savings, swapping to a managed NAT Gateway is a small, isolated infra change (same VPC/subnet shape, only the NAT construct changes).
   - **One Lambda, two invoke modes** — this single Lambda owns *all* OpenSRS interaction (not just purchase), invoked two different ways depending on latency needs:
     - **Search/pricing** (`LOOKUP`, `get_price`, `name_suggest`): synchronous `lambda:InvokeFunction` (`RequestResponse`) directly from the Next.js app — fast enough for interactive UI, and reuses the same pattern already established for the Vercel-hosted app's IAM identity (`webpresa-vercel-{env}`) having direct, least-privilege AWS SDK access to other AWS resources (see `vercel-access-stack.ts`). No API Gateway — it would add a new AWS service pattern this codebase doesn't otherwise use, for no capability the direct-invoke IAM grant doesn't already provide.
     - **Purchase execution** (`sw_register`, DNS zone commands, Vercel attach): asynchronous, triggered by an SQS message the Stripe webhook enqueues (see "Stripe webhook changes," below) — decoupled from the webhook's request/response cycle.
   - **Code location — corrects an assumption in the "Major deliverables" list below**: because only this Lambda has the fixed IP, the actual OpenSRS request/XML/signing implementation must live inside the Lambda's own standalone source tree, `infra/lambda/domain-purchase-worker/` — mirroring Stage 14's screenshot Lambda, which is "a standalone deployable, independent of both `web/` and `infra/`'s own npm projects (no workspace tooling exists in this repo)." `web/lib/opensrs/client.ts` on the Vercel side is therefore **not** a raw HTTP client to OpenSRS — it's a thin invoker: builds the `InvokeCommand`/`SendMessageCommand` payload and calls the Lambda/SQS queue. The XML envelope building, MD5 signature, and Zod-mapped response parsing all live in `infra/lambda/domain-purchase-worker/src/opensrs/`.
3. **OpenSRS DNS-hosting verification** — researched against current public OpenSRS documentation (`domains.opensrs.guide`, `support.opensrs.com`); **still to be reconfirmed against the live reseller account's own settings once provisioned**, since default-nameserver behavior is itself reseller-configurable:
   - New registrations default to one of three reseller-configured nameserver modes: OpenSRS nameservers (`ns1/ns2/ns3.systemdns.com`), "Park with Ads," or custom nameservers — set in the Reseller Control Panel's default domain settings, and overridable per-registration via `sw_register`'s `custom_nameservers`/`nameserver_list` params. This part requires the OpenSRS-nameservers mode (custom nameservers disable DNS/zone management entirely).
   - DNS is enabled per-domain via `create_dns_zone`, then records set via `set_dns_zone` (apex A record, `www` CNAME), read back via `get_dns_zone`; `force_dns_nameservers` reverts a domain to OpenSRS's DNS nameservers if it was pointed elsewhere. Public docs don't state a hard activation delay before `create_dns_zone` can run post-registration — worker logic must not assume it's instant; treat a transient failure here as retryable, same as `configurationStatus = failed`.
   - Default parking/ad records are removed by `set_dns_zone` overwriting the zone's records outright, or `reset_dns_zone` to fall back to a template — no separate "delete parking" action.
   - Apex and `www` records must be created via `set_dns_zone` before Vercel domain verification/certificate issuance can succeed, exactly as Part 2 requires for customer-managed DNS.
4. **Exact API surface** — researched and confirmed against current public documentation; endpoint hosts differ from this spec's earlier placeholder names and are corrected here:
   - Transport: HTTPS POST of a custom XML `OPS_envelope` document (not JSON) — `Content-Type: text/xml`, `X-Username` header, `X-Signature` header (double MD5: `MD5(MD5(xml + api_key) + api_key)`). This is a materially different wire format than this codebase's other JSON-based clients (Firecrawl/Google Places); the OpenSRS client's `client.ts` must build/parse XML, then map the parsed result into a plain object before Zod validation — Zod still validates the *mapped* shape, same as elsewhere.
   - Test host: `https://horizon.opensrs.net:55443` (no IP allowlist required — matches this project's local/CI dev needs). Live host: `https://rr-n1-tor.opensrs.net:55443` (source IP must be allowlisted in the Reseller Control Panel — this is what Part 3.0 checkpoint 2's fixed-egress decision exists for).
   - Actions used by this part: `LOOKUP` (object `DOMAIN`) for availability — note `response_code = 211` ("domain taken") still returns `is_success = 1`, so availability must be read from `response_code`/the `status` attribute, never from `is_success` alone; `get_price` for registration/renewal pricing (a separate call from `LOOKUP`, which does not return price); `name_suggest` for search suggestions; `sw_register` (object `DOMAIN`) for purchase, which requires a `contact_set` (owner/admin/billing/tech) and an OpenSRS-specific `reg_username`/`reg_password` pair for the registrant's OpenSRS control-panel login — the latter must be generated server-side per purchase and never persisted or logged (see Security requirements); `create_dns_zone`/`set_dns_zone`/`get_dns_zone` for DNS.
   - Every response carries `is_success`, `response_code`, `response_text` — the `OpensrsErrorCategory` taxonomy in `errors.ts` should map off `response_code`, not string-match `response_text`.

### Major deliverables

- **`infra/lambda/domain-purchase-worker/`** — standalone Lambda deployable (own `package.json`, no workspace tooling, mirroring `infra/lambda/screenshot-capture/`) that owns 100% of the OpenSRS wire protocol: `src/opensrs/client.ts` (XML `OPS_envelope` request building, `X-Signature` MD5 signing, response parsing + Zod validation, `OpensrsErrorCategory` taxonomy keyed off `response_code`) plus feature-specific callers — `search.ts`, `purchase.ts`, `dns.ts`, `contacts.ts` — same file-splitting convention as Firecrawl/Google Places, just relocated to where the fixed IP actually is. `src/handler.ts` dispatches on invoke source: a direct `RequestResponse` invoke (search/pricing) vs. an SQS-triggered event (purchase execution). **No pluggable multi-registrar interface ships in this stage** — only OpenSRS exists as a backend, and building an abstraction for a hypothetical second registrar with no concrete second implementation contradicts this project's own anti-premature-abstraction convention; extracting an interface later, if a second registrar is ever actually needed, is cheap. The canonical `DomainConnection`/`DomainPurchaseAttempt` models do keep provider-neutral *field names* (`registrarProvider`, `registrarOrderId`, `providerRequestId` — already generic, not OpenSRS-shaped), which costs nothing now and avoids a rename later.
- **`web/lib/opensrs/`** — thin invoker on the Vercel side, *not* an OpenSRS HTTP client (see Part 3.0 checkpoint 2): `client.ts` wraps `@aws-sdk/client-lambda`'s `InvokeCommand` (search/pricing, synchronous) and `@aws-sdk/client-sqs`'s `SendMessageCommand` (purchase handoff, async); `search.ts`/`purchase.ts` are the feature-specific callers `lib/domains/*` orchestration functions import, matching this codebase's usual client/feature-file split.
- New VPC (private + public subnet, single AZ — this Lambda's traffic doesn't justify multi-AZ redundancy cost) with **fck-nat** (not a managed NAT Gateway — see Part 3.0 checkpoint 2 for the cost rationale) providing the Lambda's static egress IP; the IAM identity `webpresa-vercel-{env}` gets `lambda:InvokeFunction` on this Lambda and `sqs:SendMessage` on the purchase queue, added to `vercel-access-stack.ts` alongside its existing grants — no new IAM identity.
- New SQS queue `webpresa-{env}-domain-purchase-queue` (+ DLQ) — the Stripe webhook's handoff mechanism to the async purchase path; the Lambda's SQS event-source mapping is its trigger, mirroring the DLQ-on-failure pattern the screenshot Lambda already establishes, but via SQS-as-trigger rather than SQS-as-failure-destination.
- New Secrets Manager secret `webpresa-{env}-opensrs-api` (`{ username, apiKey, environment: 'test' | 'live' }`) via `WebpresaSecret`; granted only to the domain-purchase-worker Lambda's execution role (`GetSecretValue` only) — never to `webpresa-vercel-{env}`, since the Vercel-hosted app never talks to OpenSRS directly.
- `DomainPurchaseAttempt` model, Zod schema, factory, and repository — split payment/registration/configuration status (see below), since a single flat `status` can't distinguish failures that need very different recovery responses.
- New DynamoDB table `webpresa-{env}-domain-purchase-attempts` — partition key `domainPurchaseAttemptId`; GSI `business-id-index` (PK `businessId`, SK `createdAt`).
- The Domain step (same route since Part 1) gains its third choice: "Buy a new domain."
- Domain search UI (deterministic name suggestions from the business's confirmed name/city/state/service — captured in Part 1's Review step, which is why Review runs before Domain).
- Registrant-contact collection (`DomainRegistrantContact`) with explicit customer review before submission.
- A new, separate one-time Stripe Checkout Session (`mode: 'payment'`, `billingPurpose: 'domain_purchase'`), with a Stripe idempotency key derived from the purchase-attempt ID.
- The Stripe webhook's new `domain_purchase` branch (fast-ack + async handoff, detailed below).
- `SUPPORTED_PURCHASE_TLDS` — an application-owned allowlist (`.com`, `.net`, `.org` to start; others added only after their eligibility/contact requirements are individually verified). No ccTLDs at launch unless their requirements are explicitly implemented.
- A documented registrant/admin/tech/billing contact-role policy (see below).
- `DomainConnection.source: 'webpresa_registered'`, `registrarProvider: 'opensrs'`, and a `registration` sub-object (additive to Part 2's shape).
- Additional `DomainFailureCategory` values: `domain_unavailable`, `unsupported_tld`, `premium_domain`, `registrar_search_failed`, `purchase_payment_failed`, `purchase_provider_failed`, `registration_contact_required`.
- Admin: view purchase-attempt status, begin refund recovery.

### Additive model change to `DomainConnection`

```ts
registration?: {
  orderId?: string;
  purchasedAt?: string;
  expiresAt?: string;
  autoRenew: boolean;
  registrationPriceCents?: number;
  registrationCurrency?: string;
  renewalPriceCents?: number;
  renewalCurrency?: string;
};
```

No `provider` field inside `registration` — `DomainConnection.registrarProvider` (already reserved on the model, currently "display-only") is the single field that identifies the registrar; duplicating `'opensrs'` inside `registration` too would be redundant since the two values can never disagree while OpenSRS is the only backend.

### `DomainPurchaseAttempt` model

A single flat `status` field can't distinguish "payment succeeded but registration definitively failed" (refund) from "payment succeeded, registration outcome unknown" (query and wait — never blindly refund or retry) from "domain registered fine, only Vercel/DNS configuration failed" (retry configuration, no refund at all). Splitting these into independent fields is what makes the compensation logic below actually correct:

```ts
interface DomainPurchaseAttempt extends MutableTimestampedRecord {
  domainPurchaseAttemptId: string;
  businessId: string;
  userId: string;
  domainName: string;

  quote: {
    quoteId: string;
    registrationPriceCents: number;
    renewalPriceCents?: number;
    currency: string;
    registrationYears: number;
    retrievedAt: string;
    expiresAt: string;
  };

  paymentStatus: 'not_started' | 'pending' | 'paid' | 'failed' | 'refund_required' | 'refunded';
  registrationStatus: 'not_started' | 'pending' | 'registered' | 'failed' | 'uncertain';
  configurationStatus: 'not_started' | 'pending' | 'completed' | 'failed';

  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;

  registrarProvider: 'opensrs';
  registrarOrderId?: string;
  providerRequestId?: string;

  domainConnectionId?: string;

  // Lease-based claiming so a duplicate/retried Stripe webhook delivery, or a
  // retried worker invocation, can never trigger two registrar purchases for
  // the same attempt.
  purchaseExecutionId?: string;
  purchaseStartedAt?: string;
  purchaseLeaseExpiresAt?: string;

  acceptedTermsVersion: string;
  acceptedTermsAt: string;

  failureCategory?: DomainFailureCategory;
  customerSafeMessage?: string; // never raw provider text — see Security requirements
  providerErrorCode?: string;
}
```

ID convention: `domainpurchase_<uuid>`. A worker transitions `registrationStatus` from `not_started`/expired-lease to `pending` only after first checking the registrar's own order status — never a blind retry after a timeout.

Do not persist a registrar password, customer registrar session, raw payment credential, or full OpenSRS response anywhere. If `DomainRegistrantContact` must be persisted beyond the purchase transaction, treat it as sensitive PII: encrypt at rest, minimize fields, never log it, never return it outside authorized account/domain pages, document retention/deletion.

### Domain search and purchase flow

1. **Search**: suggested names derived from the business's confirmed Review-step data. Server queries OpenSRS for availability, registration price, renewal price, premium status, supported registration period, restricted to `SUPPORTED_PURCHASE_TLDS`. Display exact returned pricing — never a hardcoded assumption.
2. **Premium domains**: not purchasable through the one-click path — shown as "additional review required."
3. **Registrant contact**: collect only the fields the registrar/TLD requires; explicit review before submission. Default contact-role policy (confirm against OpenSRS's actual reseller policies before shipping): **registrant and admin contact = the customer's business**; **technical and billing contact = a Webpresa operational contact**. Never duplicate the same personal details into every role unless the registrar requires it. State plainly in the UI that ICANN may require the registrant to verify their contact email after registration, and what happens if they don't (a domain can be suspended for an unverified WHOIS contact).
4. **Payment**: the UI surfaces `quote.expiresAt` as soft, non-committal freshness messaging ("price confirmed a moment ago — we'll double-check before you pay") rather than a hard countdown implying a guaranteed price hold, since OpenSRS's actual quote-freshness behavior isn't confirmed until Part 3.0 checkpoint 4 is resolved. Server rechecks availability/price immediately before creating the Checkout Session; customer explicitly accepts price/renewal terms (`acceptedTermsVersion`/`acceptedTermsAt`); one-time Stripe Checkout Session created with the purchase-attempt ID as the Stripe idempotency key.
5. **Price/availability changes**: recheck immediately before payment and again immediately before the registrar call; reject if unavailable; require reconfirmation if price changed materially; never blindly retry an uncertain purchase result — query order status first.
6. **Compensation**, expressed per split status:
   - `paymentStatus = paid`, `registrationStatus = failed` (registrar definitively confirms unavailable/rejected) → `paymentStatus = refund_required`; never fabricate an active domain; notify the customer; offer another search; refund through a controlled admin/automated path. **Must be tested.**
   - `paymentStatus = paid`, `registrationStatus = uncertain` (registrar timed out or returned an ambiguous result) → query the registrar's own order/domain status before doing anything else; never auto-refund or auto-retry while uncertain.
   - `registrationStatus = registered`, `configurationStatus = failed` (domain registered fine, Vercel attach or DNS setup failed) → retry configuration; **no refund** — the customer already owns a valid domain.
   - `registrationStatus = registered`, DNS configuration still `pending` → not a failure; the customer may continue onboarding while it finishes (mirrors Part 2's "don't block on DNS propagation" rule).
7. **Post-purchase**: domain attached to the Vercel project and DNS configured automatically via the OpenSRS client — no manual DNS step for the customer, unlike Part 2. Certificate issuance proceeds exactly as Part 2's `connected → certificate_pending → active` path; `reconcileDomainConnection` is reused unchanged.

### Stripe webhook changes

`app/api/webhooks/stripe/route.ts` today checks `metadata.billingPurpose === 'website_subscription'` and explicitly ignores (`ignored_purpose`, logged) anything else; its reconciliation step re-fetches a Stripe *Subscription* object, meaningless for a one-time payment. This part adds a distinct, fast-acknowledging branch:

```text
Stripe webhook (domain_purchase)
  → validate signature/event
  → conditionally mark DomainPurchaseAttempt.paymentStatus = 'paid' (idempotent —
    a webhook redelivery must not re-trigger anything)
  → hand off one purchase execution (async — see Part 3.0's egress decision)
  → return 2xx immediately

Purchase worker (separate execution context)
  → conditionally claim the attempt (lease fields, above)
  → recheck availability/order state with OpenSRS
  → call OpenSRS to register
  → configure DNS, attach to Vercel
  → persist the outcome (registrationStatus / configurationStatus)
```

The webhook request itself never stays open through OpenSRS registration, DNS setup, Vercel attachment, and certificate checks — that's why the split-status model and lease fields exist. `BILLING_PURPOSES` in `domain/constants/plans.ts` already reserves `'domain_purchase'`; no change needed there.

### Registration ownership policy

Recommended, to be confirmed with final legal terms (Stage 26) before this part ships: *"A customer-paid domain belongs to the customer's business. Webpresa manages it operationally through its OpenSRS reseller account while the account is active, and provides a reasonable transfer-out process after identity verification and settlement of outstanding domain charges."* The dashboard must state this plainly. Do not ship this part with ownership left ambiguous in either the UI or the terms.

### Renewal — interim policy for this stage

OpenSRS's own auto-renew, if enabled, draws from **Webpresa's reseller balance**, not the customer's payment method directly — enabling it without a separate customer-facing renewal charge means Webpresa silently absorbs every renewal indefinitely. Full automated recurring renewal billing through Stripe is **out of scope for this part** (a dedicated later implementation, since it needs its own price-recheck-then-charge workflow and grace-period handling). For this stage: store expiration/renewal state and next renewal price when available; explain annual renewal plainly to the customer; keep OpenSRS auto-renew under an explicit, documented interim policy decision rather than silently assuming the Stripe Customer on file funds it; do not ship automated customer-renewal-charging in this part.

### Security requirements

- Same domain-uniqueness/takeover protections as Part 2 (the `normalizedDomain` partition key + conditional write), applied to the purchased domain too.
- OpenSRS credentials and raw registrant contact data are never sent to the browser, logged, or returned outside authorized pages.
- Purchase-attempt/`domainConnectionId` pairs re-verified server-side on every mutation.
- Safe logging: purchase-attempt ID, Stripe event/session ID, OpenSRS order ID, safe failure category, `customerSafeMessage` — never the OpenSRS API key, full registrant contact, or a raw provider response/error string (`providerErrorCode` only).

### Testing requirements

- Quote expiration; premium-domain blocking; `SUPPORTED_PURCHASE_TLDS` enforcement; safe-retry classification (unit).
- Purchase-attempt persistence and conditional status transitions across all three split-status fields (repository).
- All four compensation branches from step 6 above — paid+failed, paid+uncertain, registered+configuration-failed, registered+DNS-pending (integration — required, not optional).
- Lease-based concurrent-worker safety: two overlapping purchase-execution attempts for the same `DomainPurchaseAttempt` never both call the registrar.
- Webhook: `domain_purchase` events reconcile independently of `website_subscription` events; a duplicate Stripe webhook delivery is a no-op the second time.
- Authorization: customer cannot purchase a domain for a business they don't own; `billing_recovery`/`none` cannot initiate a purchase.

### Acceptance criteria

- A `full`-mode customer can search (within `SUPPORTED_PURCHASE_TLDS`), price-check, pay for, and receive a fully DNS-configured, Vercel-attached domain with no manual DNS step.
- Each of the four compensation scenarios above resolves to the correct, distinct outcome — a configuration-only failure never triggers a refund; a definitive registration failure never leaves a fake active domain.
- A duplicate Stripe webhook delivery never results in two registrar purchase attempts.
- The recurring website subscription's entitlement is never affected by a domain-purchase event, and vice versa.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` pass in `web/`; `cdk diff`/`cdk synth` pass in `infra/`.

---

## Part 4 — Final onboarding integration and dashboard orientation

### Objective

Beyond replacing Part 1's placeholder tour with the full illustrated orientation, this part is the stage's final integration pass: verify the complete flow end to end across every domain-decision branch now that Parts 1–3 all exist, before the stage is considered launch-ready (see "Production launch gate").

### Major deliverables

- `/app/onboarding/[businessId]/tour` upgraded to illustrated cards for Your website, Website, Design, Billing, Settings (one line of plain-language description each).
- Full cross-flow verification across all three domain choices (existing/purchase/defer) and their sub-states (active, pending-DNS, pending-configuration, deferred), domain-aware publish messaging, public-URL preference, dashboard domain card, resume behavior — exercised together, not just per-part in isolation.
- `tourCompletedAt` and `tourSkippedAt` recorded as distinct outcomes (already on the Part 1 model) — "finished the tour" and "intentionally skipped it" stay analytically distinguishable.
- A persistent replay entry point: `/app/onboarding/[businessId]/tour?mode=replay`, server-validated, renders the same illustrated cards **without mutating onboarding state** — no new page/route tree, no onboarding reset.
- A derived (not stored) `domainOutcome` used by the final completion check — `'active_existing' | 'active_purchased' | 'pending_existing' | 'pending_purchased' | 'deferred'`, computed from current `DomainConnection`/`DomainPurchaseAttempt` state rather than persisted redundantly, matching Stage 19's existing convention of deriving dashboard status (Live/Draft changes/No live site) rather than storing it. The customer is never blocked while DNS propagates or a certificate issues; but a purchase stuck at `paymentStatus = paid`, `registrationStatus = uncertain` shows a purchase-processing/recovery state, never a casually "complete" domain step.

### Acceptance criteria

- The tour renders once per business, is fully skippable, and completion/skip state is durable across sessions (not local-storage-only).
- The replay link works from a completed dashboard without altering any onboarding record.
- No dashboard interaction is blocked by the tour at any point.
- All three domain-decision branches (and their sub-states) are exercised end to end in this part's own verification pass, not assumed correct because each part passed in isolation.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` pass in `web/`.

---

## Customer-facing language (all parts)

Prefer: website address, connect your domain, buy a new domain, domain provider, checking your connection, securing your website, connected, needs attention. Avoid unless expanded in help text: apex, propagation, DNS zone, nameserver delegation, CNAME flattening, certificate challenge, tenant routing, Vercel project alias. Never say "transfer your domain" for the Part 2 flow — that flow only ever changes DNS, never registrar of record.

## Deferred work

- Registrar transfer (moving a domain's registrar of record to Webpresa/OpenSRS for an already-elsewhere-registered domain).
- A scheduled EventBridge domain-reconciliation job (Stage 23, once it exists) — Parts 2/3 ship with page-load/manual reconciliation only.
- A pluggable multi-registrar provider interface — only OpenSRS is implemented in this stage; revisit only if a second registrar backend is actually needed.
- Automated recurring domain-renewal billing through Stripe (see Part 3's "Renewal — interim policy for this stage").
- Automated renewal-reminder emails and self-service transfer-out tooling (the data model must not prevent them; no UI ships here).
- Wildcard `{slug}.webpresa.com` subdomains.
- A customer-facing full domain-lifecycle management center beyond the Settings summary + admin card.
- `requirePlanCapability()`, analytics/traffic reporting, Google Business Profile management, team members/shared editing, ownership transfer, `/app/account` (Cognito email/password/sign-out beyond the sidebar's existing sign-out action).

---

# Stage 19.A — Website Editor Redesign

## Status

**Implemented and manually verified 2026-08-01** — all 6 phases shipped in one pass; `npm run lint`/`npx tsc --noEmit`/`npm test`/`npm run build` all pass, and the redesigned editor was click-tested in a real browser (Playwright, headless Chromium) against real dev DynamoDB data using a locally-minted customer session JWT for a genuine claimed/subscribed business — tab switching, the persistent preview panel, sidebar collapse/expand, the `/design` → `/website#theme` redirect, and the mobile Edit/Preview toggle were all confirmed working with zero browser console errors. This spec is the product of exhaustively re-inspecting the real, shipped Stage 19/19.x code (not just the docs describing it) — several things `architecture.md` described as already true were found not to match the actual code (see "Corrections to prior documentation" below). Overview page's own preview card was not click-tested end-to-end — it independently depends on the `CUSTOMER_ONBOARDING_TABLE_NAME` DynamoDB table, which is genuinely not yet deployed in this environment (confirmed via `aws dynamodb list-tables`, matching `deployment.md`'s documented status), a pre-existing gap unrelated to this stage; the identical `WebsitePreviewCard`/staleness-guard code path was verified instead via the new editor panel, which doesn't depend on that table.

## Objective

Redesign `/app/businesses/[businessId]/website` from a form-first, single-column scrolling page into a **preview-first** editor: a persistent, always-visible representation of the customer's website next to compact editing controls, so a customer always knows what their site looks like, what they're changing, and whether it's saved/live — without turning Webpresa into an unrestricted page builder. No drag-and-drop layout design, no custom HTML/CSS, no AI regeneration from the dashboard, no multi-page editing.

## Dependencies

Stage 19 (this redesign reuses its authorization model, editing actions, and draft/publish primitives unchanged) and Stage 19.x (reuses `WebsitePreviewCard`/`WebsitePreviewPanel`'s iframe pattern and the recently-fixed preview-staleness technique).

## Corrections to prior documentation

- **`architecture.md`'s Stage 19 entry claims the Live/Draft/None website-state derivation is a single shared computation "at render time."** The real code independently re-implements the identical 4-line computation in at least 6 files (`page.tsx`, `website/page.tsx`, `settings/page.tsx`, and 3 onboarding pages) — a duplicated pattern, not a shared function. This stage centralizes it (see "Major deliverables").
- **A `/design` route still exists and is still live**, despite a git commit titled "move design into website" suggesting it was retired. It duplicates Theme editing and all 6 photo-slot pickers, which are already independently present inside `website/`'s own tabs (`ThemeTab`, `LogoTab`, `ContentTab`, `ServicesTab`), writing through the same `lib/customer-editing/*` functions via a different action name. This is dead, redundant UI, not a partial migration — this stage removes it.
- **`WebsitePreviewCard` on the Overview page (`page.tsx`) has the exact unfixed "iframe shows stale content after a save" bug** that was found and fixed in the onboarding wizard's `WebsitePreviewPanel` on 2026-07-31 (`key={`${business.updatedAt}:${latest?.updatedAt}`}`). It hasn't surfaced yet only because Overview is a single fixed route, not a multi-step wizard reusing the same tree position across navigations — but the same root cause (an iframe whose `src` doesn't change across a client-side navigation gets reused by React with no refetch) applies identically. This stage fixes it in both the new shell and the pre-existing Overview instance.

## Major deliverables

- `EditorShell` + `EditorTabNav` (new, `website/`) — a two-pane, preview-first layout replacing the anchor-scroll single column. All 8 existing tabs (Theme, Logo, Sections, Content, Services, Photos, Contact & CTAs, SEO) reused completely unmodified, kept simultaneously mounted with CSS-only visibility toggling (never conditionally unmounted — see "Tab-switching" below for why this is a hard requirement, not a convenience).
- `WebsitePreviewPanel` inside the new shell, reusing `WebsitePreviewCard` unmodified, plus the `key`-based staleness-guard applied there **and** retrofitted onto the pre-existing Overview call site.
- `AppSidebar` gains collapse/expand-to-icon-rail (genuinely new — no precedent anywhere in this codebase, admin sidebar included): `localStorage`-persisted collapsed state, icon-only nav when collapsed (`lucide-react`, already a dependency), full nav restored on expand. Collapse only applies to the `md:+` fixed sidebar; the mobile drawer is unaffected.
- Deletion of the redundant `/design` route, its two now-fully-duplicate Server Actions (`updateThemeActionCustomer`, `updatePhotoSlotsAction`), and its sidebar nav entry, plus a redirect from the old URL.
- One-line descriptions added to `WEBSITE_SECTION_CATALOG` (compile-time constant, no persistence change) so the Sections tab reads less like raw identifiers.
- `data-editor-section={type}` DOM attribute added to every section's root element in `app/b/[slug]/template/section-registry.tsx`'s render functions — foundational metadata only, for a possible future click-to-edit stage; no interactive behavior ships in this stage.
- Centralized `lib/customer-editing/site-status.ts` (`deriveWebsiteState(previews)`) replacing the 6 independent copies of the Live/Draft/None computation named above.
- One shared save/error/read-only banner component replacing the 3x-copy-pasted JSX in `website/page.tsx`/`design/page.tsx`(removed)/`settings/page.tsx`.
- Real ARIA tablist semantics (`role="tablist"`/`role="tab"`/`aria-selected`/`aria-controls`, roving tabindex, arrow-key navigation) on `EditorTabNav` — the anchor bar it replaces had none.
- `useReducedMotion()` applied to the sidebar's `framer-motion` drawer/collapse animations (a real, previously-unaddressed gap — no `prefers-reduced-motion` handling existed anywhere in this app).

## Non-goals (explicitly out of scope)

Drag-and-drop section reordering (no DnD library exists in this repo today; the current up/down buttons are already keyboard-accessible and were already a deliberate choice over drag-and-drop per this file's Stage 11.x/19 history — see `architecture.md:913`), interactive click-to-edit (`postMessage`, hover overlays, selection sync — only the foundational DOM attribute ships), inline-rendering the public template's React components directly inside the editor's own tree (rejected — see "Preview architecture decision" below), a customer-facing unpublish/hide-site toggle, `SitePreview` write concurrency hardening (a real, pre-existing gap, but orthogonal to this UI redesign — see "Deferred work"), regrouping the 8 editor categories into a different taxonomy, per-field `aria-describedby` error relationships, app-wide clickjacking header hardening (`frame-ancestors`/`X-Frame-Options`) — a genuine, pre-existing gap this research surfaced, but touching every route in the app, not just the editor, so out of scope here.

## Implementation requirements

### Target component tree

```
website/page.tsx (Server Component — unchanged data-fetching)
└── EditorShell ('use client' — owns only `activeTab` state, read from
    `window.location.hash` on mount, falling back to 'theme')
    ├── shared banner row (saved/error/read-only)
    ├── flex-1 flex flex-col lg:flex-row min-h-0
    │   ├── EditorPanel (flex flex-col min-h-0, lg:w-[440px] shrink-0)
    │   │   ├── EditorTabNav (role="tablist", replaces the <a href="#..."> bar)
    │   │   └── overflow-y-auto flex-1 → all 8 tab components, unchanged,
    │   │       ALL simultaneously mounted, visibility toggled via CSS only
    │   └── WebsitePreviewPanel (hidden lg:flex flex-1)
    │       └── WebsitePreviewCard — unchanged internals + staleness-guard key
    └── mobile (<lg): EditorPanel/WebsitePreviewPanel become two views toggled
        by an "Edit / Preview" segmented control — same CSS-visibility
        mechanism as tab-switching, not a route change
```

### Tab-switching — client state, not routing, with a hard mounting rule

Client-side tab state, not per-tab routes: every existing save action's `redirect(withError(path, message, anchor))` already targets one of the 8 existing ids (`actions.ts`'s `SECTION_ANCHOR` map) — reading the initial tab from `window.location.hash` means **zero lines of `actions.ts` change**.

**Hard requirement**: `EditorPanel` must keep all 8 tab subtrees mounted simultaneously and switch via CSS visibility (`hidden`/`block`), never by conditionally rendering only the active one. Every tab form is a native, uncontrolled `<form>` with no client-side dirty-state tracking; if switching tabs unmounted the inactive one, a customer who typed into a field and then clicked a different tab would silently lose that input. CSS-based show/hide costs nothing extra (today's page already mounts and fetches all 8 sections' data simultaneously — they're just stacked, not switched) and requires no new "discard unsaved changes?" confirmation UI, since there is nothing to discard.

### Editing-panel behavior rule

All 8 tabs stay in the side panel — none need to escalate to a full workspace, since each is already 1-3 small `Card`s with a handful of fields or a compact list (max ~10 service rows, max 6 photos, a 15-row section list). Settings and Billing correctly stay outside the tabbed editor (an intentional Stage 19 split — "Contact & CTAs vs. Settings," different concerns). No modal is introduced — the only modal precedent in this codebase (`RequestServiceModal`) lives on the public site, not the editor, and nothing here needs focus-interrupting treatment.

### Preview architecture decision — iframe (existing `WebsitePreviewCard`), not inline rendering

Firm decision: keep the iframe-embedded approach. The blocking reason to reject inline-rendering the public template's own components directly inside the editor's React tree: `app/b/[slug]/template/index.tsx`'s `RequestServiceProvider` does `document.body.style.overflow = 'hidden'` when its CTA modal opens — a page-**global** mutation, not scoped to its own modal. Mounted inline, previewing the Request Service CTA would lock scroll on the entire dashboard, including whatever field the customer is mid-edit in. The template also has no CSS Modules/scoping (its `--site-*` theme tokens are inline `style` on its own root `<div>`, safe only because of DOM-position isolation, not a real boundary) — an iframe's document boundary avoids this risk entirely. `WebsitePreviewCard` is already production-proven (Overview page), same-origin (customer's own httpOnly session cookie authenticates automatically, no `sandbox` needed), and the `?preview=draft` mechanism it already uses for draft-vs-live resolution is exactly what a persistent preview needs — nothing new to build there.

### Information architecture decision — preserve the 8 categories

Keep Theme, Logo, Sections, Content, Services, Photos, Contact & CTAs, SEO unrenamed and unregrouped. Every existing `actions.ts` redirect target maps to these exact 8 ids already — regrouping (e.g. Brand/Structure/Content/Media/Contact/SEO) is mechanically possible but would touch ~15 redirect call sites for a taxonomy change with no evidence it improves task completion, and bundling it into this redesign would make any resulting regression harder to attribute. A plausible, comparatively cheap fast-follow once `EditorTabNav` exists — not part of this stage.

### Desktop & mobile preview

Keep `WebsitePreviewCard`'s existing fixed-size-container approach (desktop fluid full-width, mobile a real `390×844` iPhone-logical-px box) — not CSS `transform: scale` — so text reflow is representative of the real device. No decorative phone-shell chrome beyond the existing plain rounded/shadowed frame. Desktop and mobile always resolve the identical underlying page (`/b/[slug]{?preview=draft}`), just at a different container size, so they can never show materially different content.

### Responsive editor behavior

- **Desktop (`lg:+`)**: persistent split, `EditorPanel` fixed `440px`, preview filling the remainder; sidebar collapse (above) reclaims ~180px on demand.
- **Tablet (`md:`–`lg:`)**: falls through to the mobile pattern rather than forcing a cramped split — `WebsitePreviewCard`'s mobile container alone is 390px wide, so a true side-by-side split doesn't fit usefully before `lg:`.
- **Mobile (`<md`)**: no shrunk split-screen. A segmented "Edit / Preview" control toggles full-width views via the same CSS-visibility mechanism as tab-switching, so switching to Preview and back never discards in-progress input.

### Save & status model

No new draft/publish primitives — reuse `ensureDraftPreview`/`publishSitePreview`/`?preview=draft` exactly as they exist. "Save changes" never means "publish": every edit already lands on a draft; publishing stays the separate, explicit `publishDraftActionCustomer` action, now also reachable from the new shell's top bar. Status vocabulary maps honestly onto what's real — no invented autosave, no fabricated "Saved ✓" toast that fires before the actual round trip completes:

| Status | Source of truth |
|---|---|
| Live / Draft changes / No live site | centralized `deriveWebsiteState(previews)` |
| Saving… | `useFormStatus().pending` on `SaveButton` (unchanged) |
| Saved / Save failed | full-page `redirect(...&saved=1\|error=...)`, banner rendered server-side (unchanged) |
| Preview unavailable | `WebsitePreviewCard`'s existing iframe `onError` fallback (unchanged) |

No "unsaved changes" indicator is added to the preview panel — there is no client-side dirty-tracking to derive one from honestly.

### Contextual click-to-edit — foundation only

No `postMessage` infrastructure exists anywhere in this repo today, and full click-to-edit needs a real, non-trivial amount of it (bidirectional messaging, origin validation, hover/selection UX, distinguishing editable content from real `tel:`/`mailto:`/external links, nested-element resolution). This stage ships only the mechanical, additive half: `data-editor-section={type}` on each section's root DOM element, via `section-registry.tsx`'s already-stable `WebsiteSectionType` → render-function mapping. No interaction, no messaging, no hover state ships here.

### Accessibility

Real ARIA tablist pattern on `EditorTabNav`; `useReducedMotion()` on the sidebar's animations (previously entirely unhandled — confirmed zero `prefers-reduced-motion` references anywhere in the app); verify/adjust mobile text-input font size against iOS Safari's ~16px auto-zoom threshold (`FormBits.tsx` currently renders at `text-sm`/14px); confirm the sidebar collapse toggle has an explicit `aria-label`, not an icon alone; the "keep all tabs mounted" rule (above) is the accessibility answer to "confirm before discarding unsaved work" — nothing is ever silently discarded, so no confirmation dialog is built. Per-field error-message association (`aria-describedby`) is a pre-existing gap this stage does not fix (would require touching every tab form's internals).

### Performance

No new cost from embedding the preview (reuses what Overview already pays today); no new cost from keeping all 8 tabs mounted (today's page already mounts and fetches all 8 simultaneously — this redesign only changes CSS visibility, not data-fetching); every tab component stays a Server/async Component — the only new client code is thin UI-state wrappers (`EditorShell`'s tab index, sidebar collapsed flag). The `key`-based preview remount causes exactly one fresh iframe load per save, which is correct (content genuinely changed), not wasteful.

### Security

No change to any authorization check (`requireCustomerSession`/`requireBusinessOwnership`/`requireActiveSubscription`), no new Route Handler, no new cross-origin surface (this stage stops short of `postMessage`), no change to iframe sandboxing (still deliberately no `sandbox` attribute — same-origin, authenticated, customer's own content). `putAsset()`'s pre-existing lack of MIME/size validation (tracked under Stage 25) is untouched and not claimed to be fixed here.

## Proposed phases

1. **Shared editor shell** — `EditorShell`/`EditorTabNav`, sidebar collapse. No preview panel yet.
2. **Persistent preview + staleness fix** — add `WebsitePreviewPanel`; apply the `key` guard to it and to the pre-existing Overview call site.
3. **Migrate tabs in / delete `/design`** — confirm all 8 tabs render correctly in the new panel; remove the redundant route, its two dead actions, its nav entry; add a redirect.
4. **Sections/media polish** — catalog descriptions, tidy `SectionsOrderEditor` for the narrower panel.
5. **Contextual-preview foundation** — `data-editor-section` attributes only.
6. **Cleanup, accessibility, docs** — extract the shared banner and `deriveWebsiteState`, reduced-motion, mobile font-size check, finish ARIA tablist if needed, update `architecture.md`/`build_log.md`.

Recommended first slice: Phases 1+2 together — the tab-switching shell with a live, always-current preview is the change a customer actually feels, shipped with zero action/redirect changes and no deletions. `/design`'s removal (Phase 3) is invisible correctness cleanup and can trail without blocking the shell's value.

## Acceptance criteria

- Editor tabs switch instantly with no navigation and no lost input when switching away and back mid-edit.
- A save-redirect still lands on the correct tab.
- Editing a field, saving, and returning to the editor shows the updated preview with no manual refresh — same check on Overview.
- Sidebar collapses/expands and persists across reloads; mobile drawer unaffected.
- `/design` redirects to `/website#theme`; no dangling imports of its removed actions.
- `data-editor-section` present in `/b/[slug]`'s rendered HTML with zero visual/behavioral change to the public site.
- Keyboard-only navigation reaches every tab and the sidebar toggle.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` all pass.
- `architecture.md` and `build_log.md` updated.

## Deferred work

`SitePreview` write concurrency hardening (conditional writes / version check — a real gap, pairs naturally with the already-tracked Stage 25 upload-validation gap as a future hardening pass), app-wide clickjacking header hardening (`frame-ancestors`/`X-Frame-Options` via `next.config.ts`), full interactive click-to-edit (`postMessage`, hover/selection sync — foundation only ships here), regrouped information architecture (Approach B), drag-and-drop section reordering, per-field `aria-describedby` error relationships.

---

# Stage 19.B — Overview → Website Health Dashboard Redesign

## Status

**Implemented and verified 2026-08-02** — `npm run lint`, `npx tsc --noEmit`, `npm test` (996 tests, including 36 new tests for the view-model module), and `npm run build` all pass. The dev server was started and the route was confirmed to compile and redirect unauthenticated requests correctly with zero server errors; full authenticated, multi-data-state visual verification in a browser was not performed in this environment (no seeded dev-Cognito session/business fixtures for the live/draft/none/billing_recovery states were available) — the four card states, the health checklist, action-item visibility rules, and the recent-activity derivation are instead covered by the unit-test suite described below.

## Objective

Replace `/app/businesses/[businessId]` ("Overview")'s embedded live-preview iframe (`WebsitePreviewCard`) and setup checklist with a reassurance-focused "Website Health" dashboard: four top-level status cards (Website/Domain/SSL/Subscription), a truthful health checklist, a recent-activity feed synthesized from existing timestamps, and a real Action Required list — with no analytics, no editing actions, and no fabricated monitoring capabilities (uptime probing, contact-form-submission verification, certificate-expiry dates) this app does not actually have. `WebsitePreviewCard` itself is untouched and remains exclusively under `/website` (the editor).

## Dependencies

Stage 19 (authorization model, `deriveWebsiteStatus`, `publishDraftActionCustomer`, `createBillingPortalSessionAction` all reused unchanged) and Stage 19.x (`DomainConnection` model/statuses).

## Major deliverables

- `overview-status.ts` — a pure view-model module (no JSX, no fetching) housing every status/health/action/activity derivation, following this app's existing `billing/status.ts` pattern. Intentionally diverges from `billing/status.ts`'s `resolveWebsiteOverallStatus` for one case: the Overview page's top Website card stays "Live" while a newer draft is unpublished, instead of downgrading to "Draft changes" — a deliberate product decision, not a bug; `billing/status.ts` itself is unchanged.
- `StatusCard`, `WebsiteHealthCard`, `RecentActivityCard`, `ActionRequiredCard`, `SupportCard` — new presentational components under `businesses/[businessId]/`, all server-renderable (no `'use client'`); only the existing publish/billing-portal forms carry interactivity, via the existing `SaveButton`.
- Website Health checklist relabels the mockup's "Contact form working/configured" as **"Contact details published"** — this app has no submittable contact form at all (`ContactSection.tsx` renders only `tel:`/`mailto:` links from `business.phone`/`business.email`), so "form" language would misrepresent what exists.
- SSL status has no dedicated field in this app: a Webpresa-hosted site (`/b/[slug]`) is treated as unconditionally "Secure" (a static, documented guarantee of the shared HTTPS deployment), and a custom domain reuses its existing `DomainConnection.status` — never a fabricated certificate-expiry date.
- Recent Activity is synthesized entirely from existing record timestamps (published-preview `updatedAt`, draft `updatedAt`, `DomainConnection.createdAt`/`activatedAt`, `Business.claimedAt`) — there is no dedicated activity/event log in this app. Subscription events are deliberately excluded: `Business.lastStripeEventAt` is documented elsewhere as diagnostics-only and isn't tied to a specific event type, so labeling it "Subscription renewed" could misrepresent what actually happened.
- Removed from Overview: the embedded `WebsitePreviewCard` iframe, the `w-[95%]` full-bleed wrapper, the "Finish setting up your website" logo/photos/contact/theme checklist (those links opened the editor — counts as an editing shortcut, which Overview must not contain), the "Edit website" header button, and the standalone `cancelAtPeriodEnd` banner (folded into the Subscription card's own text instead).
- Retained unchanged: the onboarding force-redirect/resume banner, the `billing_recovery` read-only payment banner, the `mode === 'none'` reactivation screen, and `deriveWebsiteStatus`/`listDomainConnectionsForBusiness`/`PLAN_CATALOG`/`createBillingPortalSessionAction`.

## Acceptance criteria

- No analytics/traffic content anywhere on Overview.
- No iframe, screenshot, or editing action (Edit Website/Content/Theme/etc.) anywhere on Overview.
- The Action Required card never renders when no real actionable item exists (no empty-state panel).
- A newer unpublished draft never downgrades the top Website status card away from "Live" while a published version is up.
- A business with no custom domain shows a neutral/healthy Domain and SSL state, never implying the site is offline.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` all pass.

## Deferred work

Visitor/traffic analytics, CTA click tracking, live uptime monitoring, automated contact-form-delivery health checks, a real activity/event log (richer than timestamp-derived entries), publish-time screenshot capture.

---

# Stage 20 — Contact Forms and Lead Delivery

## Objective

Wire the existing "Request Service" modal — live on every published customer
website today, but frontend-only (`RequestServiceForm.tsx` simulates
submission with a timeout and sends nothing anywhere) — to a real backend:
persist each submission reliably, notify the business by email, and let the
business (and admin) view submissions.

## Dependencies

Stages 8, 17, 18, and 19. Specifically: the `/b/[slug]` public preview
resolution and host-based domain routing (Stage 8/19.x), customer
authentication and business ownership (Stage 17), and `Business.plan`/
`subscriptionStatus` entitlement (Stage 18) — lead capture is gated to the
Growth plan (see "Entitlement" below), the first real Basic/Growth feature
difference Stage 18's `requirePlanCapability` stub was deliberately left
unbuilt for.

## Starting state (confirmed against the repo, not assumed)

- The public form already exists and already collects `name` (required),
  `phone`, `email`, `service` (labeled "Service needed" — renamed to
  `serviceNeeded` as part of this stage), and `message` ("Details"). No
  `preferredContactMethod` field exists or is added — deferred, as it was in
  the original draft of this stage.
- No `leads` table, no email-sending infrastructure, and no queue/DLQ
  infrastructure of any kind exists anywhere in this repo today. The only
  SQS queue in the codebase is the Stage 14 screenshot-Lambda's
  single-purpose dead-letter queue, not a reusable work queue. All of it is
  net-new for this stage.
- No customer-configurable lead-notification email exists. `Business.email`
  — the one canonical, already-editable business contact email (edited only
  on the Settings page) — is reused as the MVP notification destination.
  This *does* mean a Google-Places/Firecrawl-sourced or otherwise unverified
  address can receive lead notifications; a dedicated, customer-confirmed
  lead-notification address is deferred, not solved here.
- `businessId`/`previewId`/`slug` are not currently threaded from the public
  page down into the form at all — that plumbing is part of this stage.

## Major deliverables

- Public contact form wired to a real submission path (Server Action, not a
  new Route Handler — matching this repo's one existing precedent for a
  public, unauthenticated form submission, Stage 17's claim-token flow)
- `Lead` data model and a new `leads` DynamoDB table
- Server-side validation, independent of and never trusting client state
- Baseline spam/abuse protection (honeypot, timing check, rate limiting,
  duplicate-submission detection) — Turnstile/CAPTCHA explicitly deferred
- A real entitlement gate (`hasPlanCapability`) restricting lead capture to
  the Growth plan, checked both at public-rendering time and independently
  again inside the submission handler
- Amazon SES lead-notification email — the first use of SES in this repo
- Lightweight async delivery: persist-then-inline-send, with a scheduled
  Vercel Cron retry sweep for anything left `pending`/`failed` — not a
  SQS+Lambda+DLQ pipeline (considered and deliberately rejected as more
  infrastructure than sending one email justifies)
- Customer lead inbox (new `/leads` dashboard page + sidebar entry)
- Admin troubleshooting view (notification status/attempts, manual retry)

## Fields

- `name` — required
- `phone` — optional
- `email` — optional
- `serviceNeeded` — optional
- `message` — optional

At least one of `phone` or `email` is required (existing client-side rule,
now also enforced server-side). `preferredContactMethod` remains deferred.

## Data model

`Lead` (`domain/models/lead.ts` / `domain/schemas/lead.schema.ts`):
`leadId`, `businessId`, `previewId` (audit only), `name`, `phone`, `email`,
`serviceNeeded`, `message`, `source` (`'request_service_form'`), `status`
(`new | read | archived` — the owner's own inbox triage),
`submitterIpHash` (SHA-256 of the IP, never the raw address — reuses
`hashIp()` from Stage 17's claim-validation code), `fingerprint`
(duplicate-submission signature), `notificationStatus`
(`pending | sent | failed`), `notificationAttempts`,
`lastNotificationAttemptAt`, `lastNotificationError` (diagnostics only,
never shown to the business owner), `createdAt`/`updatedAt`/`archivedAt`.

`status` and `notificationStatus` are two independent lifecycles on one
record — an owner marking a lead read/archived has nothing to do with
whether the notification email ever sent.

New `leads` DynamoDB table: PK `leadId`; GSI `business-id-index` (PK
`businessId`, SK `createdAt`), mirroring the existing `postcards`/
`scan-events` per-business-history pattern; no `status-index` (low
cardinality, same reasoning already documented for `claims`). Rate-limit
counters and duplicate-submission fingerprints are folded into this same
table as two additional item shapes (`RATELIMIT#...`/`FINGERPRINT#...`,
both TTL'd) rather than a dedicated table — the same pattern the `claims`
table already established for its own rate-limit counters, and the same
atomic-conditional-write approach `domain-connections` uses for
uniqueness (`ConditionExpression: attribute_not_exists(...)`, never a
GSI-query-then-write).

The server derives `businessId` fresh from the request's trusted `slug`
(resolved the same way `/b/[slug]/page.tsx` already does) on every
submission. The browser never selects the destination business, and a
client-supplied `businessId`/`previewId` is never trusted for anything
beyond a display hint.

## Entitlement

Lead capture is a Growth-plan feature (already advertised as such in
`PLAN_CATALOG.growth.features`: "Lead forms to capture new customers").
`hasPlanCapability(access, 'lead_capture')` — new, in
`lib/auth/customer-authorization.ts`, replacing the "not yet built" stub
comment left there in Stage 18 — returns true only when
`access.mode === 'full' && access.plan === 'growth'`; a `past_due`
(`billing_recovery`) Growth business does not pass. Checked twice,
independently: once to decide whether the public page even renders the
"Request Service" CTA as a live action, and again inside the submission
handler itself, since a hidden form must never be the only thing stopping a
Basic-plan submission.

## Submission workflow

1. Resolve the published site and business server-side from the request's
   trusted `slug` (never from client-supplied identifiers).
2. Re-check `hasPlanCapability` for lead capture.
3. Honeypot and minimum-fill-time checks (silent rejection — no
   distinguishable response to a bot).
4. Parse and validate fields (name required; phone-or-email required) —
   these errors ARE shown to the visitor.
5. Per-IP and per-business rate limiting.
6. Duplicate-submission detection via an atomic fingerprint reservation.
7. Persist the lead. This must complete before any response is returned.
8. Return a generic success response.
9. Attempt the SES notification inline, bounded by a short timeout; record
   `notificationStatus`/`notificationAttempts` regardless of outcome.
10. A scheduled retry sweep (Vercel Cron, once daily — the fastest schedule
    the project's Hobby plan allows) re-attempts any lead still
    `pending`/`failed` up to a bounded attempt count, after which it
    stays `failed` for admin visibility — there is no dead-letter queue in
    this design; the admin troubleshooting view is the failure-recovery
    path.

Notification failure must never delete, retroactively invalidate, or block
the stored lead — the lead row is already durable before any email is
attempted.

## Validation

- `name`: required, non-empty, bounded length
- `phone`: normalized when supplied
- `email`: valid, normalized when supplied
- `serviceNeeded`: bounded length
- `message`: bounded length
- At least one of `phone`/`email` is required
- Trim and normalize all values; treat submitted content as plain text
- Enforce request-body size limits
- Safely escape values wherever rendered (emails, dashboards)

## Spam and abuse protection

MVP scope: honeypot field, minimum form-completion timing, per-IP and
per-business rate limiting (reusing/extracting the `claims` table's
rate-limit-counter pattern), duplicate-submission fingerprinting, and
request-size limits. Rapid identical submissions must not create additional
leads or notifications. The public response never reveals which internal
check, if any, rejected a submission.

**Cloudflare Turnstile is explicitly deferred** — no `TURNSTILE_*` secret
or environment variable exists anywhere in this repo today, and adding one
is out of scope for this stage. The validation pipeline documents (in code)
exactly where a Turnstile token check would slot in — immediately before
field validation — as a low-friction fast-follow once real spam volume
justifies it.

Do not persist raw IP addresses; only a keyed SHA-256 hash, matching the
existing `claims` table's approach.

## Notification delivery

- **Amazon SES** — first use of SES anywhere in this repo. Unlike every
  other third-party integration here (OpenAI, Firecrawl, Stripe, Lob), SES
  authenticates via IAM (`ses:SendEmail`), not an API key, so it
  deliberately gets **no** Secrets Manager entry — a new least-privilege IAM
  statement on the existing Vercel-execution role is the only credential
  path.
- The sending identity is a CDK-managed `EmailIdentity` (domain + DKIM) in
  the data stack, so it stays in `cdk diff`/`cdk deploy` rather than a
  hand-run `aws ses verify-domain-identity` — this repo's `AGENTS.md`
  already flags hand-run infra steps as a past incident source.
- Deliver to `Business.email` (see "Starting state" above for the tradeoff
  this implies).
- Include the lead's details, source page, and submission time. Use the
  submitter's own validated email as `Reply-To` only when supplied.
- Never expose SES delivery results to the public visitor.
- **SES sandbox mode**: production access has been requested but is not yet
  approved. Only two recipient addresses are currently verified for testing
  (`andrew@webpresa.com`, `mudge.andrew+test@gmail.com`) — any
  `Business.email` outside the verified set will bounce every notification
  until production access is granted. This is an expected, temporary
  deployment constraint, not a bug, and is called out again in
  `deployment.md`.

## Public UX

- Disable submission controls while processing; prevent double submission.
- Show field-level and form-level validation errors; preserve values after
  a recoverable error; focus the first invalid field.
- Replace the form with a clear success state after acceptance. Do not
  claim the business received an email — only confirm the request was
  accepted.
- Keyboard navigation, focus trapping, Escape, focus restoration, screen
  readers, and mobile layouts (the modal shell already provides most of
  this — verify it still holds once the form becomes a real async action).
- Include a telephone link when the business accepts calls (already true
  today via the modal's existing `phone` prop).

## Customer lead inbox

New `/app/businesses/[businessId]/leads` page, gated by
`requireBusinessOwnership` + `hasPlanCapability`. A Basic-plan owner sees an
upsell state on this page, not a 404 or redirect — the failure mode here is
"upgrade," not "access denied." Authorized Growth-plan owners can:

- View only leads belonging to their business, newest first
- See name, contact details, requested service, details, and submission time
- Mark a lead read or archived (no customer-facing delete)

No public endpoint can retrieve lead records.

## Admin view

Added to the existing admin business-detail page, alongside the other
per-business diagnostic cards (enrichment, scan workflow, scoring):

- Every lead for the business, with `notificationStatus`,
  `notificationAttempts`, and `lastNotificationError`
- A manual "Retry notification" action per failed lead, calling the same
  shared send-and-record function the scheduled retry sweep uses
- Admin tools never display raw SES payloads or provider secrets

## Logging and observability

Never log `name`, `phone`, `email`, `serviceNeeded`, `message`, or a raw IP
address — matching this repo's existing `lib/db/*.ts` convention (spot
verified: no PII is logged anywhere in that layer today). Error logs
reference only `leadId`/`businessId` and, for SES failures, the provider's
error code/message id — never the full request/response body.

## Acceptance criteria

- A valid submission is persisted exactly once.
- The public request receives a generic success response after persistence.
- Email delivery occurs asynchronously and never blocks or risks the lead
  write.
- A notification-provider outage does not lose accepted leads.
- Failed notifications are retried on a schedule and remain visible (with
  a manual retry option) to administrators.
- Invalid submissions are rejected without being persisted.
- Common automated abuse and rapid duplicate submissions are limited.
- The destination business is resolved from trusted server-side context,
  never from client-supplied identifiers.
- Public users cannot retrieve lead records.
- Customers can retrieve only leads belonging to businesses they own, and
  only when their plan includes lead capture.
- Lead-form rendering and submission are both independently blocked when
  the business lacks the Growth-plan entitlement.
- Submitted PII and free-text content never appear in application logs.
- The modal and confirmation experience remain keyboard- and
  screen-reader-accessible after the async rewrite.

## Deferred work

- Cloudflare Turnstile / CAPTCHA
- A dedicated, customer-confirmed lead-notification email (distinct from
  `Business.email`)
- SMS delivery
- CRM synchronization
- Automated lead responses
- Call tracking
- Lead assignment
- Notes, tags, and pipeline management
- File attachments
- Marketing opt-in
- Preferred-contact scheduling
- Sensitive-industry forms
- Custom form builders

---

# Stage 21 — Campaign and QR Tracking

## Status

Not started. This specification replaces the original Stage 21 draft, which
modeled QR tracking as a single-recipient, single-record concept tied
directly to an individual postcard. The revised design introduces
`Campaign` and `CampaignRecipient` as first-class objects so the same data
model supports both a manually created, single-recipient test campaign
today and a fully automated, many-recipient mail campaign later, without
restructuring.

## Objective

Track engagement with mailed (or otherwise distributed) QR codes through a
redirect route, and attribute scans to a `Campaign` → `CampaignRecipient` →
`Business` chain rather than to an individual postcard or preview URL
directly.

## Dependencies

Stages 8 and 17 — the public preview site (`/b/[slug]`) and existing
business claim links, both common `CampaignRecipient` destinations.

## Non-goals

- Automated campaign creation, bulk business selection, batch QR/postcard
  generation, or submission to a print/mail provider — the data model is
  designed so none of this requires restructuring later (see "Future
  automation" below), but no automation is built in this stage.
- Lob or any postcard-provider integration (Stage 22). A `CampaignRecipient`
  does not require a `Postcard` to exist.
- A/B testing, multiple simultaneous destinations per recipient, or
  campaign experiments.
- Geographic reporting, device-precise fingerprinting, or cross-device
  identity resolution.
- Conversion funnels or attribution beyond "this code was scanned this many
  times."
- Charting/graphing UI — the admin view shows counts and a recent-scans
  list, not a dashboard.

## Design principles

1. **A Campaign is not tied to a single business.** It owns zero
   application logic about any one business; that belongs to its
   recipients.
2. **CampaignRecipient is the attribution unit**, not Campaign and not
   ScanHit directly:
   ```
   Campaign
     └── CampaignRecipient   (owns: campaignCode, destination, scan rollups)
           └── Business
           └── ScanHit(s)
   ```
   `ScanHit` records reference their `CampaignRecipient`, never a `Campaign`
   or `Business` directly (though `businessId`/`campaignCode` are
   denormalized onto each `ScanHit` for query convenience — see "Domain
   model" below).
3. **QR codes only ever point at `/r/{campaignCode}`**, never directly at a
   preview, claim link, or any other destination. The destination is
   resolved server-side from the `CampaignRecipient`, so it can change
   without reprinting anything.
4. **A manually created campaign with one recipient is not a separate,
   simpler architecture** — it's a `Campaign` row with exactly one
   `CampaignRecipient` row. Nothing in the redirect route, scan recording,
   or analytics code branches on recipient count.

## Domain model

### `Campaign` (`domain/models/campaign.ts`)

- `campaignId` (`campaign_<uuid>`)
- `name` — admin-facing label, free text, bounded length
- `channel` — `'postcard' | 'other'`. MVP only ever creates `'postcard'`
  campaigns; the field exists so a future channel doesn't require a schema
  change.
- `status` — `'active' | 'paused' | 'archived' | 'expired'`. Controls
  whether *any* of this campaign's recipients' codes resolve (see
  "Redirect behavior" below).
- `expiresAt?` — optional, informational only in this stage. Stage 21 does
  not enforce it automatically; an admin transitions `status` to
  `'expired'` manually. Stored now so a future scheduled job can flip it
  without a schema change.
- `createdAt` / `updatedAt`

### `CampaignRecipient` (`domain/models/campaign-recipient.ts`)

- `campaignRecipientId` (`recipient_<uuid>`)
- `campaignId`
- `businessId`
- `campaignCode` — opaque, unique, unguessable (see "Campaign code
  generation")
- `destinationType` — `'claim' | 'custom'`. `'claim'` is the default,
  automatic path: `/r/[campaignCode]` resolves the recipient straight into
  the business's claim flow at scan time, with zero manual code entry
  (see "Destination resolution" below). `'custom'` is the exception —
  an explicit admin-supplied `destinationUrl`.
- `claimId?` — set only when `destinationType === 'claim'`. A plain
  internal record reference (the same class of field as `Claim.postcardId`/
  `previewId`) — never a secret, never rendered into any URL, QR, or
  printed artifact. Absent means the business was already claimed when
  this recipient was added; the redirect route then just links to the
  business's live page.
- `destinationUrl?` — set only when `destinationType === 'custom'` — the
  full URL this recipient's QR code resolves to (a preview, a pricing
  page, an external URL — anything other than the auto-managed claim
  flow). Editable at any time without changing `campaignCode`; saving an
  override is a one-way switch to `'custom'` (no UI to switch back).
- `destinationLabel?` — set only when `destinationType === 'custom'` —
  optional free-text admin note on what the destination is (e.g.
  "pricing page") — display only, never parsed or trusted.
- `status` — `'active' | 'disabled'`. A per-recipient kill switch
  independent of the parent campaign's status (e.g. one bad address in an
  otherwise-active campaign).
- `postcardId?` — optional forward-reference to a Stage 22 `Postcard` once
  one exists for this recipient. Absent for the entire lifetime of Stage 21.
- `totalScans` — rollup, default `0`
- `estimatedUniqueScans` — rollup, default `0`, explicitly labeled
  "estimated" everywhere displayed
- `firstScanAt?`, `lastScanAt?`
- `createdAt` / `updatedAt`

Recipients created before `destinationType` existed have no such field
stored; the schema defaults a missing value to `'custom'` on read (they all
carried an explicit `destinationUrl`), so they keep working unchanged with
no migration.

### `ScanHit` (`domain/models/scan-hit.ts`)

Deliberately **not** named `ScanEvent` — that name is already taken by the
unrelated Firecrawl/Playwright/OpenAI scrape-and-score record
(`domain/models/scan-event.ts`), and reusing it would make every future
grep for either concept ambiguous.

- `campaignRecipientId` (table partition key — see "Infrastructure")
- `campaignCode` — denormalized, avoids a join when displaying a hit
- `businessId` — denormalized
- `destinationUrl` — the URL actually redirected to *at scan time* (captures
  history even if the recipient's destination is changed later)
- `visitorFingerprint` — SHA-256 hash used only for the uniqueness estimate
  (see below); never the raw IP
- `userAgent` — raw string, bounded length
- `referrer?`
- `deviceClass` — `'mobile' | 'tablet' | 'desktop' | 'unknown'`
- `browserFamily?`, `operatingSystem?`
- `createdAt`

Every valid scan creates a new, permanent `ScanHit` row — never an update
to a prior one, matching this repo's "never overwrite history" convention
already established for `ScanEvent`/`ScanExecution`/`Claim`. Only the
`CampaignRecipient` rollup fields (`totalScans`/`estimatedUniqueScans`/
`lastScanAt`) are updated in place, the same "durable event record +
denormalized rollup" split `Business.scanExecutionStatus` already uses.

### Relationship to `Postcard` (Stage 22 — not changed by this stage)

`Postcard` (`domain/models/postcard.ts`, modeled in Stage 5, not yet
implemented) currently has its own `campaignCode` and `qrDestination`
fields, added before this stage's model existed. When Stage 22 is
implemented, `Postcard` should instead carry an optional
`campaignRecipientId` and read its campaign code/destination from the
referenced `CampaignRecipient` rather than duplicating them — a
`CampaignRecipient` **is** "one mailed piece" in this model; `Postcard`
becomes the record of its physical fulfillment (provider, `mailedAt`,
`deliveredAt`), not a second source of truth for its destination. This
stage does not modify `Postcard` or its schema; it's flagged here so
Stage 22 doesn't need to rediscover it.

## Campaign code generation

`campaignCode` follows the same opaque-random-identifier approach as
Stage 17's claim tokens, sized for embedding in a URL/QR rather than manual
typing: `crypto.randomBytes(10)` (80 bits), Crockford Base32 encoded, **no
dash-grouping** (never hand-typed). Looked up via the `campaign-code-index`
GSI (see "Infrastructure"), never scanned. 80 bits of entropy makes a
generation-time collision astronomically unlikely, so — matching the
claim-token precedent — generation does not need an atomic uniqueness
transaction, only the GSI for lookup.

Campaign codes must never encode or be derivable from `businessId`,
`claimId`, `postcardId`, `previewId`, `campaignId`, or
`campaignRecipientId` — they are a pure random lookup key.

## Infrastructure changes

New tables in `infra/lib/stacks/data-stack.ts` (via the existing
`WebpresaTable` construct):

- **`webpresa-{env}-campaigns`** — PK `campaignId`. No GSIs: campaign count
  stays small under manual creation, and an admin list can page a bounded
  `Scan`; a `createdAt`-sortable GSI can be added later without
  restructuring, matching the same YAGNI reasoning already applied to
  `customer-billing-profiles`/`customer-onboarding`.
- **`webpresa-{env}-campaign-recipients`** — PK `campaignRecipientId`; GSI
  `campaign-code-index` (PK `campaignCode`, high-cardinality — the redirect
  route's primary lookup); GSI `campaign-id-index` (PK `campaignId`, SK
  `createdAt` — admin recipient list per campaign); GSI `business-id-index`
  (PK `businessId`, SK `createdAt` — every campaign a business has ever
  been part of). No `status-index` (two-value field, same reasoning already
  documented for `claims`/`leads`).
- **`webpresa-{env}-scan-hits`** — PK `campaignRecipientId`, SK a sortable
  range key with two item shapes sharing the table (the same fold-in
  pattern `claims`/`leads` already use for their own rate-limit/fingerprint
  items):
  - Real hits: `HIT#<isoTimestamp>#<random suffix>` — lets "recent scans
    for this recipient" be a single ordered query with no GSI.
  - Uniqueness reservations: `FINGERPRINT#<visitorFingerprint>` via a
    conditional `PutItem` (`attribute_not_exists`). **Deliberately not
    TTL'd**, unlike `leads`'/`claims`' own `FINGERPRINT#`/`RATELIMIT#`
    items — those exist for short-window abuse prevention and are meant to
    expire; this one backs a lifetime "estimated unique scans" count for
    the recipient and must persist for as long as the recipient does.
  - A separate `RATELIMIT#<ipHash>#<windowBucket>` item shape, TTL'd, on
    the same table — the redirect route's own abuse/cost protection (see
    "Security and privacy").

`infra/lib/stacks/vercel-access-stack.ts` gains the three new table ARNs
(+ indexes) on the existing Vercel-execution IAM policy. No new Secrets
Manager entries, no new compute.

New npm dependencies: `qrcode` (server-side QR PNG rendering — no QR
library exists in this repo today) and `ua-parser-js` (device class /
browser family / OS parsing — also net-new; hand-rolling reliable UA
parsing was judged not worth avoiding a small, well-known dependency for
this one field set).

## Required routes

- **`GET /r/[campaignCode]`** — public Route Handler (not a Server Action —
  matches the existing `/claim/[claimToken]` precedent for a public
  GET-and-redirect entrypoint, and `architecture.md`'s "API boundaries"
  exception for endpoints that must be addressable as a plain URL).
- **`GET /r`** — public page, manual campaign-code entry for a visitor who
  can't scan the QR (see "Manual entry fallback" below). Coexists with
  `/r/[campaignCode]` the same way `/claim` coexists with
  `/claim/[claimToken]`.
- **`GET /access`** — a plain `redirect('/r')`; the friendlier address
  actually printed on postcards and told to people, since "webpresa.com/r"
  reads as meaningless shorthand to a customer.
- **`GET /acess`, `/acces`, `/accsess`, `/acesss`, `/aress`** — the five
  most likely misspellings of "access" (missing/doubled/transposed
  letters), each its own `app/{name}/page.tsx` with the same one-line
  `redirect('/r')`, catching a mistyped postcard address. Each redirects
  straight to `/r`, not chained through `/access`.
- **`GET /api/campaigns/[campaignRecipientId]/qr`** — admin-session-gated
  Route Handler; renders a QR PNG on demand from
  `https://webpresa.com/r/{campaignCode}` (via `qrcode`), for the admin
  preview `<img>` and the download link. No S3 storage — regenerated on
  every request, trivial compute cost.
- **`/admin/campaigns`** — list + create.
- **`/admin/campaigns/[campaignId]`** — detail: campaign info, recipient
  list + add-recipient form, per-recipient rollups, recent scans, QR
  preview/download.

New admin Server Actions,
`web/app/admin/(dashboard)/campaigns/actions.ts`: `createCampaignAction`,
`updateCampaignStatusAction`, `addCampaignRecipientAction` (generates
`campaignCode` server-side; auto-provisions the claim-flow destination —
see "Destination resolution" below), `updateCampaignRecipientDestinationAction`
(the `'custom'` override), `updateCampaignRecipientStatusAction`.

## Destination resolution

**Adding a recipient never requires manual destination entry.**
`addCampaignRecipientAction(campaignId, { businessId, destinationUrl? })`:
if `destinationUrl` is supplied, the recipient is `'custom'` exactly as any
other admin-chosen destination. Otherwise (the default):

1. If the business is already claimed (`Business.ownerUserId` set): create
   the recipient as `destinationType: 'claim'` with `claimId` left unset.
   Nothing to offer — the redirect route already knows to just link to the
   live page in that case.
2. Otherwise, look up the business's claims (`listClaimsForBusiness`) and
   reuse the newest one satisfying `isClaimUsable()` (issued, unexpired) if
   one exists.
3. If none is usable, issue a new one — the exact same
   `generateAndHashClaimToken()` + `createClaim()` + `putClaim()` sequence
   the admin's existing "Generate claim link" action
   (`generateClaimLinkAction`, business detail page) already uses. The raw
   token is returned once in the action's result (shown once in the admin
   UI, same "copy this now" pattern) — but **only** when freshly generated,
   never for a reused claim, since its raw token was never available to
   begin with.

**Why the destination isn't a stored claim link.** The raw claim token is
never persisted in recoverable form after issuance, by Stage 17 design
(see "Claim-token requirements" above) — so a literal `/claim/{rawToken}`
URL can never be saved on a `CampaignRecipient` and reused later. Instead,
`/r/[campaignCode]` performs the claim-intent step itself at scan time,
keyed by the stored `claimId` (a plain, non-secret reference) rather than a
stored secret URL — see "Redirect behavior" below. Net effect for whoever
scans the QR is identical to today's manual `/claim/{token}` flow, just
with the code-entry step removed. This is also what makes future postcard
printing (Stage 22) straightforward: the printed QR/fallback text only ever
needs `campaignCode` (already permanently stored, safely reprintable at
any time), never the claim token.

## Redirect behavior

```
Scan QR
  ↓
GET /r/{campaignCode}
  ↓
Resolve CampaignRecipient via campaign-code-index
  ↓
Valid, recipient.status='active', parent Campaign.status='active'?
  ├─ No  → redirect to the homepage (generic, no distinguishing response,
  │         no ScanHit recorded)
  └─ Yes → resolve destination (below) → record ScanHit + update
            CampaignRecipient rollups → redirect
```

1. Rate-limit the request per IP-hash (`RATELIMIT#` item on
   `campaign-recipients`, same conditional-increment idiom as `claims`) —
   abuse/cost protection, not the security boundary; the code's 80-bit
   entropy is.
2. Look up `campaignCode` via `campaign-code-index`. Not found, recipient
   `status='disabled'`, or parent `Campaign.status` not `'active'` →
   redirect to the homepage. Never distinguish "doesn't exist" from
   "disabled" from "paused campaign" in the response.
3. **Resolve the destination**, re-checked live against the database every
   time — nothing about claim/ownership state is ever trusted from the
   stored recipient:
   - `destinationType === 'custom'` → the stored `destinationUrl`, unchanged.
   - `destinationType === 'claim'` → always `/b/{slug}` (the business's
     live page). Additionally, when the business is not yet claimed and
     `claimId` is set: look up the claim; if it's still `isClaimUsable()`
     and belongs to this business, sign a claim-intent JWT
     (`signClaimIntent()` — the exact function `GET /claim/[claimToken]`
     already calls) and pair it with the redirect. Already claimed, no
     `claimId`, or the claim is revoked/expired/consumed/mismatched →
     same `/b/{slug}` destination with **no** cookie — graceful
     degradation; whatever's genuinely true about the business renders
     correctly on its own.
4. Compute `visitorFingerprint = sha256(campaignRecipientId | ipHash | userAgent)`.
   Attempt the `FINGERPRINT#` conditional `PutItem` on `scan-hits`; success
   means a new unique visitor.
5. Write the `ScanHit` row (always, unconditionally, regardless of
   uniqueness) — `destinationUrl` is the *resolved* URL from step 3, so
   history reflects what the visitor was actually sent to, even for
   `'claim'`-type recipients.
6. Update `CampaignRecipient`: `totalScans += 1` always;
   `estimatedUniqueScans += 1` only when the fingerprint reservation was
   newly created; `lastScanAt = now`; `firstScanAt = now` only if unset.
7. Forward all incoming query parameters to the resolved destination, then
   ensure `campaign={campaignCode}` is present (added if missing, never
   duplicated):
   ```
   /r/ABC123XYZ?utm_source=email
     ↓
   {resolvedUrl}?campaign=ABC123XYZ&utm_source=email
   ```
8. Redirect (302), setting the signed `webpresa_claim_intent` cookie
   (same options `GET /claim/[claimToken]` uses — `httpOnly`, `secure` in
   production, `sameSite=lax`) when step 3 produced one.

Server always re-resolves `campaignCode → CampaignRecipient → destination`
itself; nothing about the destination is ever trusted from the request
beyond the code.

## Manual entry fallback

**`GET /access`** (`app/access/page.tsx`) — the address actually printed on
postcards and told to people. "webpresa.com/r" reads as meaningless
shorthand to a customer even though it stands for "redirect" internally, so
`/access` is a plain Server Component that does nothing but
`redirect('/r')` (a temporary, 307 redirect — not `permanentRedirect()`,
since a 308 would get cached aggressively by browsers and make the alias
harder to adjust later). `/r` itself is unchanged and still works directly.

Five sibling pages — `/acess`, `/acces`, `/accsess`, `/acesss`, `/aress` —
cover the most likely ways someone mistypes "access" reading it off a
postcard (a missing letter, a doubled letter, `cc`→`r`). Each is its own
`app/{name}/page.tsx` with the identical one-line `redirect('/r')`, and
each redirects straight to `/r` rather than chaining through `/access`.

**`GET /r`** (`app/r/page.tsx`) — a static page coexisting with the dynamic
`/r/[campaignCode]` route (the same "page + sibling dynamic route" pairing
`/claim/page.tsx` and `/claim/[claimToken]/route.ts` already establish),
for a postcard recipient who can't scan the QR. A simple form
(`CampaignCodeForm.tsx`) posts to `submitCampaignCodeAction`
(`app/r/actions.ts`), which:

1. Normalizes the typed input (strip whitespace/dashes, uppercase —
   `normalizeCampaignCodeInput`, mirroring `normalizeClaimToken`).
2. Calls `resolveCampaignRedirect()` **unchanged** — the identical
   function `/r/[campaignCode]` itself calls, with an empty
   `incomingSearchParams` (nothing to forward from a typed submission) and
   a `requestUrl` built from the `host`/`x-forwarded-proto` headers (no
   `request.url` available inside a Server Action).
3. `outcome: 'invalid'` → one generic message ("that code doesn't look
   right, or has expired"), regardless of which internal check failed —
   same "never distinguish why" principle as everywhere else in this
   stage, extended to this entry point.
4. `outcome: 'redirect'` → sets the claim-intent cookie when one was
   produced, then redirects — identical outcome to scanning.

**Deliberately does not reuse `/claim`** (Stage 17's own manual-entry page
for claim tokens), even though `/claim` already has a polished form and
generic-error UX. Two concrete reasons: a visit through `/claim` would
never become a `ScanHit`, silently undercounting anyone who can't scan the
QR; and the raw claim token is only ever available once, at the moment a
claim is freshly generated (see "Destination resolution" above) — a
recipient whose claim was *reused* has no raw token to have ever printed.
`campaignCode` has neither problem: it's permanently stored and already
drives the fully-tracked path, so typed-in entry counts identically to a
scan no matter how the recipient's claim was provisioned.

`lib/campaign/code-format.ts` (new, deliberately separate from
`lib/campaign/code.ts`'s `server-only`-guarded `generateCampaignCode`, so
a client component can import it) holds `normalizeCampaignCodeInput` and
`formatCampaignCodeForDisplay` — the latter groups a code into dashed
fours (`AB23-CD45-EF67-GH89`) purely for display/print (the admin
recipient card, and whatever gets printed next to a QR code); the
stored/looked-up `campaignCode` and the QR payload itself are never
dash-grouped.

## Analytics

Collected per `ScanHit`: campaign code, business ID, destination URL,
timestamp, user agent, referrer, device class, browser family, operating
system, and a hashed visitor fingerprint. No raw IP is ever persisted (only
`hashIp()`'s SHA-256, reused from Stage 17). No precise location data is
collected.

Exposed on `CampaignRecipient`: `totalScans` (exact — one increment per
recorded hit) and `estimatedUniqueScans` (a fingerprint-based estimate,
always labeled "estimated" in any UI that shows it — an IP/UA-hash
fingerprint undercounts shared devices behind the same NAT+browser and
overcounts a visitor who changes network or browser, so it is a heuristic,
never presented as exact).

## Admin experience

`/admin/campaigns/[campaignId]`:

- **Campaign details** — name, channel, status, created date; status
  editable inline.
- **Recipient list** — business, campaign code, destination, total scans,
  estimated unique scans; add-recipient form (select business, set
  destination).
- **Campaign analytics** — total scans and estimated unique scans (summed
  across recipients), recent scans (per-recipient list, newest first — see
  "Infrastructure" for why a cross-recipient feed is deferred).
- **QR** — inline preview and download (PNG) per recipient, pointing at
  `/r/{campaignCode}`.

No charts, no funnels, no A/B comparison — counts and a recent-activity
list only.

## Manual MVP

Stage 21 ships with no automated campaign or recipient creation. An admin
creates a `Campaign`, then adds one `CampaignRecipient` to it (or,
occasionally, a handful) by hand through `/admin/campaigns`. A
single-recipient campaign is the primary way this entire stage gets tested
end to end — it is not a separate code path, just a `Campaign` row with one
`CampaignRecipient` row.

## Future automation (architecture note only — not built in this stage)

This model is shaped so that a later automation stage can, without
restructuring: create one `Campaign`, select many businesses, generate a
`CampaignRecipient` (and its `campaignCode`/QR) per business, render
postcards, and submit the batch to a print/mail provider (Stage 22).
Nothing in this stage assumes a 1:1 `Campaign`-to-`Business` relationship,
and no `ScanHit`/analytics code branches on recipient count — so this is a
documentation note for future stages, not a promise enforced by any test in
this stage.

## Security and privacy

- Campaign codes are opaque, high-entropy, and never derived from or expose
  any database identifier.
- The redirect route never trusts anything from the request except the
  code itself; destination, business, and status are always re-resolved
  server-side.
- Invalid, disabled, and non-active-campaign codes all produce the same
  generic fail-safe redirect — no signal that distinguishes why.
- Rate limiting on `/r/[campaignCode]` blunts code-guessing/enumeration.
- No raw IP address is ever persisted or logged — only a keyed SHA-256
  hash, reusing `hashIp()`.
- No precise geolocation is collected.
- `ScanHit` history is permanent under normal operation.
  `deleteBusinessAction`'s existing cascade (SitePreviews, ScanEvents,
  Postcards, Claims) is extended to also delete that business's
  `CampaignRecipient`s and their `ScanHit`s — but never the parent
  `Campaign` itself, since a `Campaign` may still have recipients belonging
  to other businesses.
- The QR-download route requires an authenticated admin session.
- `'claim'`-type recipients reference a `Claim` only by `claimId` — a plain,
  non-secret internal record ID, never a raw claim token. The raw token
  (when a claim is freshly auto-generated for a recipient) is returned once
  in the admin action's result and never stored, matching Stage 17's own
  "never persisted in recoverable form" rule for claim tokens.
- The claim-intent cookie set by `/r/[campaignCode]` is only ever set after
  re-validating the claim live against the database (`isClaimUsable`,
  business-ID cross-check) — identical validation to `GET
  /claim/[claimToken]`, just triggered by `claimId` instead of a raw token.

## Acceptance criteria

- A valid, active campaign code redirects to its `CampaignRecipient`'s
  configured `destinationUrl`, forwarding existing query parameters and
  including `campaign={code}`.
- A `ScanHit` is durably recorded for every valid, active scan; existing
  `ScanHit`/`CampaignRecipient` records are never edited or deleted by
  normal operation.
- Unknown, disabled-recipient, or non-active-campaign codes all redirect to
  the same generic fallback, with no `ScanHit` recorded and no
  distinguishing response.
- `CampaignRecipient.totalScans` increments on every valid scan;
  `estimatedUniqueScans` increments only for a new visitor fingerprint —
  both are rollups derived from, and always consistent with, the
  underlying `ScanHit` history.
- Estimated-unique metrics are visibly labeled as estimates everywhere
  they're shown.
- A `CampaignRecipient`'s destination and status can be changed by an admin
  without regenerating its `campaignCode` or QR image.
- A `Campaign` can hold one `CampaignRecipient` (manual MVP testing) or
  many, with no code path assuming exactly one.
- Campaign codes never expose `businessId`, `claimId`, `postcardId`,
  `previewId`, or any other database identifier.
- No raw IP address or precise location is ever persisted.
- The admin campaign view shows campaign details, its recipients, each
  recipient's scan rollups and recent scans, and each recipient's QR
  (preview + download).

## Deferred work

- Automated campaign/recipient creation, bulk business selection, batch
  QR/postcard generation, and print/mail-provider submission (a later
  automation stage — see "Future automation")
- Lob/postcard-provider integration (Stage 22)
- Advanced attribution
- Geographic reporting
- Bot filtering beyond basic rate limiting
- Conversion funnels
- Cross-device identity
- Campaign experiments / A/B testing
- Automatic time-based campaign expiry (`expiresAt` is stored but not
  enforced by this stage)
- Non-QR channels (`channel` is reserved for future values; only
  `'postcard'` is supported)
- Charting/dashboard UI, cross-recipient "recent scans" feed at scale

---

# Stage 22 — Lob Postcard Integration

## Objective

Generate, approve, submit, and track physical postcards through Lob.

## Dependencies

Stages 10, 15, 17, and 21.

## Major deliverables

- Lob test-mode configuration
- Sender-address verification
- Postcard front and back templates
- QR placement
- Admin approval queue
- Cost confirmation
- Lob submission service
- Provider ID storage
- Lob webhook
- Idempotent status history

## Implementation requirements

Before submission, require admin review of:

- business status
- mailing address
- score and qualification
- generated preview
- postcard creative
- QR destination
- trademark and identity use
- postcard copy
- expected cost

Use test mode first.

Map provider status into the canonical internal postcard status lifecycle.

Verify webhook authenticity using Lob’s current documented method.

Do not mail automatically during the MVP.

Avoid unsupported aggressive claims.

## Acceptance criteria

- Test postcard renders correctly.
- Postal safe zones and address placement are correct.
- QR scans and redirects correctly.
- A test API request succeeds.
- Provider ID is saved.
- Webhook updates internal status.
- Duplicate webhooks do not duplicate history.
- No real mail is sent in test mode.
- A real postcard is sent to the owner only after an explicit production test decision.

## Deferred work

- Automatic postcard approval
- Multiple postcard variants
- Bulk campaigns
- Address verification service
- Cost optimization
- Alternative providers

---

# Stage 23 — EventBridge Controlled Automation

## Objective

Schedule small, controlled batches only after the manual pipeline has proven reliable.

## Dependencies

Stages 12–16 and 22.

## Major deliverables

- EventBridge schedule
- Queued-business selection
- Daily limits
- Concurrency controls
- Step Functions execution start
- Kill switch
- Batch summary
- Postcard manual-approval preservation

## Initial limits

Suggested configurable safety values:

```text
MAX_DAILY_SCANS=20
MAX_DAILY_PREVIEWS=10
MAX_DAILY_POSTCARDS=5
```

Suggested initial execution:

- once each weekday
- up to 10 queued businesses
- maximum five concurrent scans
- maximum two screenshot jobs
- maximum three AI generations

## Implementation requirements

- Keep all limits configuration-driven.
- Prevent overlapping batches.
- Provide an emergency disable mechanism.
- Do not automatically mail postcards.
- Record skipped, started, completed, and failed counts.
- Stop launching new work when budget or provider limits are reached.
- Make jobs idempotent.

## Acceptance criteria

- A scheduled development batch starts at the expected time.
- No more than the configured number of businesses are started.
- Concurrency limits are enforced.
- Failed jobs do not block unrelated jobs.
- A disabled schedule starts nothing.
- Batch results are visible to the admin.
- Postcards remain in manual approval.

## Deferred work

- Dynamic throughput
- Multiple geographic territories
- Priority queues
- Cost-aware schedules
- Customer-triggered workflows
- Fully automated mailing

---

# Stage 24 — Monitoring and Error Recovery

## Objective

Make failures observable, diagnosable, and recoverable.

## Dependencies

All active backend stages.

## Major deliverables

- Structured logging
- Correlation identifiers
- CloudWatch dashboards
- CloudWatch alarms
- Dead-letter queues
- Admin failure visibility
- Retry controls
- Cost and usage monitoring
- Operational runbooks

## Required log context

Where applicable:

- service
- environment
- business ID
- scan ID
- preview ID
- postcard ID
- claim ID
- execution ID
- request ID
- status
- error category

Never log:

- API keys
- passwords
- auth tokens
- full card data
- raw Secrets Manager responses
- unnecessarily sensitive customer information

## Alarm coverage

- Lambda failures
- Lambda throttles
- Step Functions failures
- API 5xx responses
- DynamoDB throttling
- Stripe webhook failures
- Lob webhook failures
- high spend
- unusual OpenAI usage
- screenshot timeouts
- dead-letter queue depth

## Acceptance criteria

- A test failure produces a structured log.
- Relevant alarms trigger in a controlled test.
- Async failures reach a DLQ where configured.
- An admin can identify the affected business and step.
- Recoverable work can be retried safely.
- Secrets and sensitive data do not appear in logs.
- Cost visibility exists for major third-party services.

## Deferred work

- Centralized log analytics
- Pager integration
- SLOs and error budgets
- Distributed tracing
- Automated incident response
- Customer-facing status page

---

# Stage 25 — Security Hardening

## Objective

Complete the security work required before accepting real customer data and payments.

## Dependencies

Stages 7–24 as applicable.

## Major deliverables

- Authorization review
- Input-validation review
- Secure headers
- Rate limiting
- CSRF protections where needed
- Secure cookie review
- Audit logging
- Upload restrictions
- SSRF protection
- IAM least-privilege review
- S3 security review
- Production deletion protection
- CloudTrail
- Security test plan

## Implementation requirements

Application security must include:

- authentication on protected routes
- authorization on every server operation
- Zod validation
- output encoding and sanitization
- public endpoint rate limits
- secure headers
- HTTPS
- controlled errors
- secure cookies
- audit events for important changes
- file type and size limits
- upload validation
- SSRF protection

URL-fetching systems must block:

- localhost
- loopback ranges
- private network ranges
- link-local ranges
- AWS metadata endpoints
- `file://`
- non-HTTP protocols
- redirects into blocked networks

AWS security must include:

- least-privilege IAM
- no embedded access keys
- secrets in Secrets Manager
- S3 public access blocking
- production retention and deletion protection
- CloudTrail
- MFA for administrative access
- environment-separated secrets
- consistent tags

## Acceptance criteria

- Security review findings are documented and resolved or explicitly accepted.
- Admin and customer authorization tests pass.
- SSRF tests block prohibited targets.
- Public endpoints have rate limits.
- Production data resources use retention and deletion protection.
- IAM policies are scoped to required actions and resources.
- No secret scanners find committed credentials.
- Error responses do not expose stack traces or AWS internals.

## Deferred work

- Formal penetration test
- AWS Config
- GuardDuty
- Security Hub
- Enterprise SSO
- Compliance certifications

---

# Stage 26 — Legal and Business Readiness

## Objective

Complete the legal, financial, and operational prerequisites for charging customers and scaling outreach.

## Dependencies

Product and business readiness, especially Stages 17–20.

## Major deliverables

- Business entity
- Business bank account
- Stripe business connection
- Appropriate insurance
- Privacy policy
- Terms of service
- Service agreement
- Cancellation rules
- Domain-ownership rules
- Content-ownership rules
- Post-cancellation policy
- Edit-policy definition
- Turnaround-time commitments
- Prohibited-content policy
- AI and third-party disclosure
- Data-retention policy
- Refund policy
- Direct-mail compliance review
- Legal review

## Implementation requirements

Clearly define:

- monthly price
- minimum commitment, if any
- cancellation process
- refund conditions
- domain ownership
- website-content ownership
- service behavior after cancellation
- meaning and limits of “unlimited edits”
- excluded custom development
- turnaround expectations
- acceptable use
- third-party hosting and AI use
- privacy and retention practices

## Acceptance criteria

- Required legal pages are published.
- Checkout requires explicit agreement.
- Agreement versions and acceptance timestamps are stored.
- Customer-facing pricing and contract language are consistent.
- Business banking and Stripe setup are complete.
- Direct-mail practices have been reviewed.
- A qualified attorney has reviewed high-risk contractual language before scale.

## Deferred work

- International terms
- Reseller agreements
- Enterprise contracts
- State-specific variants
- Formal data-processing addenda

---

# Stage 27 — Full Testing and Launch Validation

## Objective

Validate the system from business discovery through customer operation before public launch.

## Dependencies

All MVP stages.

## Major deliverables

- Unit tests
- Integration tests
- End-to-end test suite
- Webhook tests
- Security tests
- Failure-path tests
- Launch checklist
- Two complete business-type walkthroughs

## Required unit-test areas

- slug creation
- URL normalization
- business validation
- AI schema validation
- score calculation
- qualification logic
- campaign-code creation
- Stripe status mapping
- Lob status mapping
- authorization helpers
- idempotency helpers

## Required integration-test areas

- DynamoDB repositories
- S3 uploads and signed URLs
- Firecrawl handling
- OpenAI validation
- Google Places import
- Stripe signature verification
- Lob webhook verification
- Step Functions input/output
- Cognito or selected auth flow

## Required end-to-end flow

1. Create a test business.
2. Run a scan.
3. Save crawl output.
4. Capture screenshots.
5. Score the website.
6. Generate a preview.
7. Review the preview.
8. Publish the preview.
9. Generate campaign QR.
10. Render a postcard.
11. Open claim page.
12. Complete Stripe test checkout.
13. Process webhook.
14. Activate customer.
15. Submit a lead.
16. Confirm delivery
17. Confirm admin handling.

## Acceptance criteria

- The full flow succeeds at least twice with different business types.
- Failure and retry paths are tested.
- Duplicate webhooks and workflow triggers are safe.
- Authorization boundaries are tested.
- Production configuration has been reviewed separately from development.
- Launch blockers are documented and resolved.
- Operational rollback and support procedures are documented.

## Deferred work

- Load testing at scale
- Chaos testing
- Multi-region disaster recovery
- Formal usability study
- Continuous synthetic monitoring

---

# Stage 28 — Scale and Product Expansion

## Objective

Scale only after the managed-website product demonstrates reliable sales, delivery, retention, and unit economics.

## Dependencies

A validated MVP and operating history.

## Major deliverables

Potential improvements include:

- multiple website templates
- industry-specific generation prompts
- city-batch discovery
- cost tracking per prospect
- conversion reporting
- postcard experiment tracking
- production run limits
- customer lead analytics
- review management
- local SEO services
- Google Business Profile services
- blog generation
- CRM features
- AI-assisted customer service
- advertising services

## Implementation requirements

- Do not add products solely because they are technically interesting.
- Require clear customer demand, operational fit, and economic justification.
- Keep each new product modular.
- Preserve least privilege and data boundaries.
- Add new domain models and infrastructure intentionally.
- Update architecture and product documentation before major expansion.
- Measure acquisition cost, fulfillment cost, gross margin, conversion, churn, and support load.

## Acceptance criteria

Before scaling a feature:

- customer demand is demonstrated
- pricing is defined
- cost model is understood
- operational ownership is assigned
- security and legal effects are reviewed
- implementation plan exists
- monitoring exists
- rollback is possible

## Deferred work

Anything not supported by validated customer demand or a clear strategic decision.

---

# Recommended execution milestones

The numbered stages above remain the canonical implementation references. The milestones below group them into business outcomes.

## Milestone 1 — Public foundation

Stages 1–4.

Outcome:

- Webpresa has a professional public website.
- The repository, AWS development access, and hosting foundation exist.

## Milestone 2 — Data foundation

Stages 5–6, followed by Stages 9–10 as needed.

Outcome:

- Canonical records, DynamoDB, private object storage, and secrets infrastructure exist.

## Milestone 3 — Manual product

Stages 7–8.

Outcome:

- An administrator can manually create a business and publish a data-driven preview.

## Milestone 4 — AI generation

Stage 11, Stage 11.x.

Outcome:

- An administrator can generate, edit, review, and publish structured website content.
- An administrator can control which optional sections appear on a business's generated preview, independent of content regeneration.

## Milestone 5 — Sales conversion

Stages 17–19, Stage 19.x.

Outcome:

- A business can securely claim a preview, pay, and become an active customer.
- A newly paid customer is guided from checkout to a live, published website with a connected or purchased domain, and understands where to make future updates.

At this point, Webpresa has a sellable managed-website MVP.

## Milestone 6 — Discovery and scoring

Stages 12–15.

Outcome:

- Admins can discover businesses, capture and enrich generated previews from their existing websites (Stage 13), and prioritize prospects.

## Milestone 7 — Workflow automation

Stages 16 and 23.

Outcome:

- The validated manual pipeline can run in controlled, observable batches.

## Milestone 8 — Direct mail

Stages 21–22.

Outcome:

- Webpresa can generate tracked postcards, approve them manually, and monitor delivery.

## Milestone 9 — Customer operations

Stages 20 and 24–27.

Outcome:

- Leads, monitoring, security, legal readiness, and end-to-end launch validation are complete.

## Milestone 10 — Scale

Stage 28.

Outcome:

- Webpresa expands only after the core managed-website product proves demand and healthy economics.

---

# Standard completion checklist for every stage

Before marking any stage complete:

- [ ] Review the stage objective and all acceptance criteria.
- [ ] Inspect the existing code before changing architecture.
- [ ] Implement only the active stage unless a dependency requires a small supporting change.
- [ ] Add or update tests.
- [ ] Run web lint, typecheck, tests, and build when applicable.
- [ ] Run infrastructure tests and synth when applicable.
- [ ] Run `cdk diff` before proposing an AWS deployment.
- [ ] Obtain explicit approval before any real AWS deployment.
- [ ] Verify the deployed result when deployment is part of the stage.
- [ ] Confirm no secrets or credentials were committed.
- [ ] Update `architecture.md` when architecture changed.
- [ ] Update `deployment.md` when commands, variables, stacks, or environments changed.
- [ ] Append implementation details and verification results to `build_log.md`.
- [ ] Commit the documentation updates with the implementation.

---

# Prompt template for GitHub Copilot

Use this pattern for future stage implementation:

```text
Read the repository before making changes.

Review:
- web/docs/implementation.md — Stage X
- web/docs/architecture.md
- web/docs/deployment.md
- web/docs/build_log.md

Implement only Stage X and the minimum supporting work required by its dependencies.

Preserve the existing architecture and conventions. Do not introduce an alternative framework, database pattern, authentication system, or deployment approach without explaining the conflict first.

Before changing code:
1. Summarize the current relevant implementation.
2. Identify the files you expect to create or modify.
3. Identify any unresolved decisions or risks.

During implementation:
- Keep AWS and database access server-side.
- Validate external input and persisted data with Zod.
- Use canonical domain models and factories.
- Add tests.
- Do not expose secrets.
- Do not deploy AWS changes.

After implementation:
1. Run all applicable verification commands.
2. Report exact results.
3. Update build_log.md, architecture.md, and deployment.md as applicable.
4. Show the CDK diff if infrastructure changed.
5. Stop before deployment and request explicit approval.