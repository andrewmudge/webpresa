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
- Outreach channel recommendation and campaign ordering (postcard / email / phone) — Stage 21 (QR and Campaign Tracking) and Stage 22 (Lob Postcard Integration)'s concern; those stages consume this stage's lead priority and qualification as an input, not the other way around
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

## Objective

Allow a real business representative to submit a secure request to claim a Webpresa preview.

## Dependencies

Stages 7, 8, and 11.

## Major deliverables

- Claim data model and table
- Claim token generation
- `/claim/[claimToken]`
- Claim form
- Authority confirmation
- Manual verification queue
- Claim status lifecycle
- Token expiration and revocation
- Audit history

## Implementation requirements

A claim token must be:

- random
- difficult to guess
- tied to one business
- expirable
- revocable
- single-use after successful claim
- stored hashed when practical

Collect:

- claimant name
- role
- business email
- phone
- confirmation of authority
- requested corrections
- desired domain
- agreement acceptance
- verification evidence as required

Initial verification is manual.

Possible checks include:

- business-domain email
- verified callback to the public business phone
- consistency with public business records
- supporting documentation
- Google Business information

Never transfer control based only on a matching business name.

## Acceptance criteria

- Admin can create and revoke a claim token.
- Public users cannot claim with a slug alone.
- Expired and revoked tokens fail safely.
- A valid token opens the correct claim form.
- Claim submissions create a verification-pending record.
- Reusing a completed token is blocked.
- Admin can approve or reject a claim.
- Claim history is preserved.
- Public responses do not expose internal verification data.

## Deferred work

- Automated domain-email verification
- Document verification provider
- Self-service re-verification
- Organization accounts
- Multiple owners and staff

---

# Stage 18 — Stripe Subscriptions

## Objective

Collect subscription payment using Stripe Checkout and synchronize subscription state through verified webhooks.

## Dependencies

Stages 10 and 17.

## Major deliverables

- Stripe account and test-mode configuration
- Product and recurring price
- Checkout-session endpoint
- Stripe webhook endpoint
- Signature verification
- Idempotent event handling
- Business and claim subscription updates
- Payment-failure handling
- Test-mode validation

## Initial product

- Product: Webpresa Managed Website
- Price: `$149/month`
- Billing: monthly recurring

Any minimum commitment must be enforced through clear agreements and business processes, not assumed from the Stripe price configuration.

## Implementation requirements

Checkout input should identify:

- business
- claim
- preview

Server actions must:

- validate claim eligibility
- create or reuse the Stripe customer
- create a subscription-mode Checkout Session
- attach internal metadata
- use controlled success and cancellation URLs

Webhook handling must include at least:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Use the raw request body for signature verification.

Do not activate a customer solely from the browser redirect.

Make webhook processing idempotent and resilient to duplicates and out-of-order events.

## Acceptance criteria

- Test checkout can be created for an eligible claim.
- Successful payment produces verified webhook processing.
- Duplicate events do not duplicate activation or records.
- Failed payments update internal status.
- Cancellation updates internal status without deleting records.
- Declined, abandoned, authentication-required, delayed, and duplicate-event scenarios are tested.
- Secret keys are never exposed to the browser.
- The business is not activated without verified server-side payment state.

## Deferred work

- Taxes
- Coupons
- Multiple plans
- Annual billing
- Usage-based products
- Dunning automation
- Accounting integration

---

# Stage 19 — Customer Activation and Dashboard

## Objective

Convert a verified paid claim into an active customer account and provide a minimal self-service dashboard.

## Dependencies

Stages 8, 17, and 18.

## Major deliverables

- Customer authentication
- Activation workflow
- Business status transition
- Claimed preview status
- Preview banner removal
- Welcome communication
- Onboarding checklist
- Customer dashboard
- Website information view
- Change-request submission
- Billing link
- Settings page

## Required routes

- `/app`
- `/app/website`
- `/app/requests`
- `/app/billing`
- `/app/settings`

## Implementation requirements

After verified payment:

- mark the claim paid/activated
- mark the business as customer
- mark the preview claimed
- provision the customer identity
- remove the public claim banner
- send a welcome message
- collect final business details
- request domain information
- record content approval
- record terms acceptance

Use Stripe Customer Portal for billing management where practical.

Customers must only access records belonging to their organization.

## Acceptance criteria

- A paid, verified claim activates exactly once.
- The customer can sign in.
- The dashboard shows website, domain, requests, billing, and settings information.
- The customer cannot access another business.
- A customer can submit a change request.
- Billing management opens the correct Stripe portal.
- The claimed site no longer displays the Webpresa claim banner.
- Activation failures are recoverable without duplicate accounts.

## Deferred work

- Team members
- Fine-grained customer permissions
- Direct content editing
- Advanced analytics
- Lead history
- Domain registrar automation
- White-label dashboards

---

# Stage 20 — Contact Forms and Lead Delivery

## Objective

Provide functioning lead forms on customer websites and reliably deliver submissions to the customer.

## Dependencies

Stages 8 and 19.

## Major deliverables

- Public contact form
- Lead data model and table
- Server-side validation
- Spam protection
- Lead notification
- Submission confirmation
- Admin lead view
- Customer lead history where enabled

## Initial fields

- name
- phone
- email
- message
- preferred contact method

## Implementation requirements

- Validate every submission.
- Collect only necessary information.
- Store source page and campaign.
- Protect against spam using a combination of honeypots, rate limits, CAPTCHA/Turnstile, throttling, and duplicate detection.
- Do not expose private business email addresses unnecessarily.
- Do not send sensitive data to logs.
- Notify the business through an approved email service.
- Provide a clear success state without exposing internal delivery results.

## Acceptance criteria

- A valid submission is persisted once.
- The business receives a notification.
- Invalid submissions are rejected.
- Spam controls block common automated abuse.
- Duplicate rapid submissions are limited.
- Public users cannot retrieve lead records.
- Customers can view only their own leads when lead history is enabled.
- Notification failure does not silently lose the stored lead.

## Deferred work

- SMS delivery
- CRM synchronization
- Automated lead responses
- Call tracking
- Lead assignment
- Sensitive-industry forms

---

# Stage 21 — QR and Campaign Tracking

## Objective

Track postcard engagement through a redirect route rather than linking printed QR codes directly to previews.

## Dependencies

Stages 8 and 17.

## Major deliverables

- Campaign-code generation
- `/r/[campaignCode]` redirect route
- Scan-event recording
- Destination resolution
- Total and estimated-unique metrics
- Admin campaign view
- Privacy disclosure updates

## Implementation requirements

QR flow:

```text
Scan QR
  ↓
/r/{campaignCode}
  ↓
Record event
  ↓
Redirect to /b/{slug}?campaign={campaignCode}
```

Record only useful analytics such as:

- campaign code
- business ID
- postcard ID
- timestamp
- user agent
- referrer
- approximate device class
- destination URL

Avoid collecting precise location data unless clearly justified and disclosed.

Use a reasonable method to estimate unique scans without presenting the result as exact.

## Acceptance criteria

- A valid campaign redirects to the intended preview.
- A scan event is recorded.
- Invalid or disabled campaign codes fail safely.
- Repeated scans increment totals.
- Estimated-unique metrics are clearly labeled.
- QR destinations can be changed without reprinting the route structure.
- Tracking does not expose private business or claim data.

## Deferred work

- Advanced attribution
- Geographic reporting
- Bot filtering
- Conversion funnels
- Cross-device identity
- Campaign experiments

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
16. Confirm delivery.
17. Submit an edit request.
18. Confirm admin handling.

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

Stages 17–19.

Outcome:

- A business can securely claim a preview, pay, and become an active customer.

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