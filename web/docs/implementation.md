# Webpresa Implementation Plan

**Last updated:** 2026-07-15  
**Status:** Stages 1–10 complete in development. Stage 11 (Manual AI Website Generation) foundation implemented and manually tested end-to-end against the real OpenAI API. Stage 11.x (Configurable Website-Section System) implemented and manually tested end-to-end as a foundation stage inserted before Stage 12 — see each stage's Status field below and `build_log.md`. Stage 12 onward is next.  
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
- `stage_status.md` — current project ledger and verification status

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

14. Update `build_log.md`, `architecture.md`, `deployment.md`, and `stage_status.md` when the completed work changes their subject matter.

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

## Objective

Allow an administrator to discover and selectively import local businesses from Google Places.

## Dependencies

Stages 7 and 10.

## Major deliverables

- Google Cloud Places configuration
- Restricted API key
- Admin business-search form
- Server-side Places client
- Field-mask configuration
- Search result review table
- Selective import
- Duplicate detection
- Import result summary

## Implementation requirements

- Begin with manual searches by industry and location.
- Request only fields needed for the import workflow.
- Do not import all results automatically.
- Check duplicates using:
  - Google Place ID
  - normalized website domain
  - normalized name and address
- Set imported business source to `google_places`.
- Set initial business status to the canonical discovered/pending state used by the current model.
- Handle partial batch failures without losing successful selections.
- Track Google API failures safely.

## Acceptance criteria

- An admin can search one industry in one location.
- Results display with required business fields.
- Individual businesses can be selected.
- Selected records import successfully.
- Duplicate Place IDs are prevented.
- Obvious domain and address duplicates are surfaced.
- Imported businesses appear in the admin list.
- The API key is never exposed to the browser.
- Quotas and budget alerts are configured.

## Deferred work

- Automated city batches
- Nearby Search
- Place Details refresh jobs
- Large-scale import
- Territory management
- Lead-source cost attribution

---

# Stage 13 — Firecrawl Website Enrichment

## Objective

Improve an already-generated website by extracting information from a business's existing website and re-running generation with that additional context. Stage 13 is not responsible for creating the first website — that's Stage 11. It enriches businesses that already have an existing website.

## Dependencies

Stages 7, 9, 10, 11, and 12.

## Major deliverables

- Server-side Firecrawl client
- Manual "Generate From Existing Website" admin action
- `ScanEvent` lifecycle updates
- Raw crawl output in S3
- Extracted structured business information
- OpenAI merge step (`Business` record + Firecrawl content → improved `PreviewContent`)
- Conflict-resolution rule (admin-entered data always wins)
- New `SitePreview` version creation, comparable side-by-side with the Stage 11 version
- Retry support
- Safe failure recording

## Implementation requirements

### Workflow

```text
Existing Website URL
        ↓
Click "Generate From Existing Website"
        ↓
Firecrawl crawls website
        ↓
Raw crawl stored in S3
        ↓
Structured business information extracted
        ↓
OpenAI combines:
    • Business record
    • Firecrawl content
        ↓
Generate improved PreviewContent
        ↓
Create new SitePreview version
        ↓
Preview
```

Initial scope is one homepage per scan.

### Firecrawl extracts

Examples:

- business description
- services
- service areas
- about page
- contact information
- FAQ
- mission statement
- existing CTAs
- navigation
- branding language

Also store or derive, as before: title, meta description, markdown or primary text, links, image references, status code, final URL, crawl timestamp, and the raw provider output key. Raw crawl artifacts are stored in S3.

### OpenAI receives

- the `Business` record
- Firecrawl-extracted content

OpenAI should not read the website directly — Firecrawl remains responsible for retrieval.

### Conflict resolution

Admin-entered information always takes priority. For example, if the admin entered phone `850-555-1234` and Firecrawl finds `850-555-1111` on the site, do not overwrite the admin value. Instead: keep the verified admin value, surface the conflict for review, and use Firecrawl primarily to fill information the admin left blank.

### Output

Create a new `SitePreview` version. Do not overwrite the Stage 11 (or prior Stage 13) version — this lets the admin compare the Manual AI Generation and the Firecrawl-Enriched Generation before publishing.

### Failure handling

Handle:

- invalid URLs
- inactive domains
- SSL failure
- timeout
- robots restrictions
- rate limits
- provider 5xx errors
- empty responses
- redirects and loops

Businesses without a website must follow a separate `no website` path and must not be treated as permanent scan failures — Stage 13 simply isn't available for them; Stage 11 remains their generation path.

## Acceptance criteria

- An admin can start a crawl of an existing website.
- A `ScanEvent` is created and its status transitions are recorded.
- Raw output is saved privately in S3; the `ScanEvent` stores the S3 key.
- Failed scans store a safe failure reason and can be retried.
- One failed scan does not permanently invalidate the business.
- OpenAI combines the `Business` record and Firecrawl content into a new `SitePreview` version.
- Admin-entered fields are never overwritten by Firecrawl-discovered values.
- The new version does not overwrite the Stage 11–generated version — both remain viewable for comparison.
- Publishing still requires an explicit admin action.
- API credentials remain server-side.

## Deferred work

- Multi-page crawling
- Scheduled refreshes
- Content-diff detection
- Robots-policy reporting
- Crawl-cost tracking
- Dedicated side-by-side conflict-diff UI (v1 relies on comparing two full `SitePreview` versions, not a field-level diff)

---

# Stage 14 — Playwright Screenshots

## Objective

Capture consistent desktop and mobile screenshots for admin review, AI scoring, and postcard creative.

## Dependencies

Stages 9 and 13.

## Major deliverables

- Local screenshot script
- Desktop viewport capture
- Mobile viewport capture
- Final redirected URL recording
- S3 upload
- Admin signed-URL viewing
- AWS runtime packaging
- Timeout and retry controls

## Target viewports

- Desktop: `1440 × 1000`
- Mobile: `390 × 844`

## Implementation requirements

- Build and validate the workflow locally before packaging it for AWS.
- Use strict navigation and overall execution timeouts.
- Avoid authentication bypasses.
- Do not log into websites.
- Block unnecessary large media when practical.
- Attempt normal cookie-banner dismissal without defeating access controls.
- Validate target URLs to prevent SSRF.
- Consider Lambda container images if browser packaging is unreliable in a standard Lambda bundle.
- Store files under the canonical scan prefix.

## Acceptance criteria

- Desktop and mobile screenshots are produced.
- Both upload to private S3 storage.
- ScanEvent storage keys are updated.
- Admin can view both through signed URLs.
- Timeouts terminate cleanly.
- Screenshot failures can be retried.
- The runtime cannot write outside the assigned bucket or prefix.
- Private and local-network URLs are blocked.

## Deferred work

- Full-page and viewport variants
- Visual-diff history
- Video capture
- ECS/Fargate migration
- Cookie-banner provider library

---

# Stage 15 — AI Website Scoring

## Objective

Generate a structured, reviewable quality assessment of a business’s existing website.

## Dependencies

Stages 10, 13, and 14.

## Major deliverables

- Scoring prompt
- Structured scoring schema
- Category scores
- Explanations
- Overall score
- Top problems
- Recommended action
- Admin override
- Qualification result

## Scoring categories

- Mobile friendliness
- Design quality
- Trust
- Calls to action
- Local SEO
- Branding
- Service clarity
- Professionalism

## Implementation requirements

Scoring input should include:

- crawl content
- page metadata
- desktop screenshot
- mobile screenshot
- business category
- city
- existing URL

Store:

- AI category scores
- category reasons
- AI overall score
- admin-reviewed score when provided
- top problems
- recommended action
- prompt and model metadata

Treat the score as an internal prioritization tool, not an objective fact.

Initial qualification logic may include:

- no website → qualified
- weak score → qualified
- strong score → manual review
- closed business → reject
- invalid address → manual review
- national chain → reject

Do not trigger postcard mailing solely from an AI score.

## Acceptance criteria

- A completed scan can be scored.
- Output validates against a strict schema.
- Scores and reasons are persisted.
- Invalid AI output is rejected.
- Admin can override the overall score and qualification.
- The original AI score remains preserved.
- The business and ScanEvent reflect the completed scoring state.
- Test cases produce understandable and reasonably consistent assessments.

## Deferred work

- Calibration dataset
- Human-review analytics
- Industry-specific weighting
- Deterministic non-AI metrics
- Score-change tracking
- Automatic outreach decisions

---

# Stage 16 — Step Functions Scan Workflow

## Objective

Connect independently working scan, screenshot, scoring, and preview-generation operations into a durable orchestrated workflow.

## Dependencies

Stages 11 and 13–15.

## Major deliverables

- Step Functions state machine
- Small task-specific Lambda functions
- Retry policies
- Catch and failure paths
- Execution references
- Manual admin trigger
- Workflow status display

## Suggested workflow

```text
Load Business
  ↓
Website exists?
  ├─ No → Mark No Website → Generate Preview
  └─ Yes → Crawl Website
              ↓
           Capture Screenshots
              ↓
           Score Website
              ↓
           Qualification Decision
              ├─ Manual Review
              └─ Generate Preview
                       ↓
                    Save Preview
                       ↓
                    Manual Approval
```

## Implementation requirements

Use small functions such as:

- `loadBusiness`
- `crawlWebsite`
- `captureScreenshots`
- `scoreWebsite`
- `generatePreview`
- `savePreview`
- `markScanFailed`

Do not create a single `processEverything` function.

Record failures with:

- failed step
- error category
- safe error message
- timestamp
- attempt count
- execution reference
- retry eligibility

Retry temporary errors such as rate limits, timeouts, and provider 5xx responses. Do not repeatedly retry invalid input, missing records, authentication errors, or invalid schemas.

Keep postcard mailing outside the automatic path.

## Acceptance criteria

- An admin can manually start the full workflow.
- Each major step is visible in execution history.
- Temporary failures retry according to policy.
- Permanent failures terminate safely.
- Failure details are recorded against the business or scan.
- A successful workflow produces a reviewable preview.
- Duplicate manual triggers do not corrupt state.
- Postcards are not sent automatically.

## Deferred work

- EventBridge scheduling
- Batch execution
- Human approval callback tasks
- Cost-aware branching
- Multi-page scanning

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
- web/docs/stage_status.md

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
3. Update build_log.md, architecture.md, deployment.md, and stage_status.md as applicable.
4. Show the CDK diff if infrastructure changed.
5. Stop before deployment and request explicit approval.