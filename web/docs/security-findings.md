# Webpresa — Security Findings Register

Created alongside `implementation.md`'s Stage 25 (Security Hardening and
Pre-Production Security Review) rewrite. Seeded with exactly the findings
that planning research actually discovered by reading the live repository —
no hypothetical entries. New findings discovered during Stage 25's actual
implementation, or any later security work, get appended here with the same
rigor: description, affected component, realistic impact, remediation,
status, and verification method.

Severities: **Critical** / **High** / **Medium** / **Low** / **Informational**.
Critical/High findings must be resolved before Webpresa is declared
production-launch-ready, unless an explicit, dated risk-acceptance note is
recorded against the finding.

Status values: `open` / `in progress` / `resolved` / `risk accepted`.

---

## SEC-01 — Stored XSS via unvalidated upload + extension-derived Content-Type

- **Severity:** High
- **Status:** resolved — `lib/s3/upload-validation.ts` (new) validates every
  business photo/logo upload via `sharp`-decoded format detection (JPEG/PNG/WebP
  allowlist, 8MB cap), rejecting SVG outright; `uploadBusinessAsset()` now
  derives the stored `Content-Type`/extension from the validated decode
  result, never `file.type`/the client filename; `/api/assets/[...key]`
  dropped `svg`/`gif` from its served-type map and added
  `X-Content-Type-Options: nosniff`. Tests:
  `lib/s3/__tests__/upload-validation.test.ts`,
  `app/api/assets/[...key]/__tests__/route.test.ts`.
- **Affected component:** `web/lib/s3/assets.ts` (`putAsset`),
  `web/lib/s3/business-assets.ts` (`uploadBusinessAsset`, `fileExtension`),
  `web/app/api/assets/[...key]/route.ts` (`contentTypeForKey`)
- **Description:** `putAsset()` performs no MIME-type, size, or content
  validation on upload — it stores the browser-supplied `file.type` verbatim
  and the S3 key's extension is derived from the client-supplied filename.
  The public asset proxy then re-derives the served `Content-Type` purely
  from the requested key's file extension, including `svg → image/svg+xml`,
  with no CSP and no `X-Content-Type-Options: nosniff` anywhere in the app.
- **Realistic impact:** Any authenticated customer (uploading to their own
  business's photo/logo slots) or admin can upload a `.svg` file containing
  an inline `<script>` and have it served back same-origin, publicly, and
  cached for a year (`Cache-Control: public, max-age=31536000, immutable`).
  A visitor to that business's own public preview page, or an admin viewing
  the asset directly, could have the script execute in the `webpresa.com`
  origin.
- **Remediation:** Validate uploaded content server-side via real image
  decoding (mirror `lib/s3/stock-images.ts`'s existing `sharp(buffer).metadata()`
  pattern), restrict to an explicit MIME allowlist (`image/jpeg`,
  `image/png`, `image/webp`), reject SVG outright for the MVP, stop trusting
  `file.type` for the stored `Content-Type`, stop deriving the served
  `Content-Type` from the bare key extension, and add
  `X-Content-Type-Options: nosniff` to the asset proxy's response. See
  Stage 25 §4/§9 in `implementation.md`.
- **Verification method:** Automated test — upload a crafted `.svg`/mislabeled
  file and confirm rejection; upload a correctly-typed image and confirm
  acceptance with the correct stored/served `Content-Type`; confirm the
  proxy response includes `nosniff`.

---

## SEC-02 — No security headers anywhere in the app

- **Severity:** Medium
- **Status:** resolved — `next.config.ts`'s new `headers()` adds a CSP
  (`frame-ancestors 'self'`, allowlisted image/font/connect sources),
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  site-wide `Referrer-Policy: strict-origin-when-cross-origin` (with the
  existing narrower `no-referrer` preserved on `/claim/*` and `/r/*` via a
  more specific header rule), and a minimal `Permissions-Policy`. No
  nonce-based CSP (`script-src`/`style-src` use `'unsafe-inline'`) — this
  app has no per-request nonce plumbing in `proxy.ts` and Tailwind/the `V`
  inline-style pattern rely on inline styles; adding nonce support is a
  larger, separate change. **Verification still needed**: confirm the
  deployed production app actually serves these headers (source config
  only, not yet checked against a live deployment).
- **Affected component:** `web/next.config.ts`
- **Description:** `next.config.ts` has no `headers()` configuration at
  all — no `Content-Security-Policy`/`frame-ancestors` (clickjacking
  defense), no `Strict-Transport-Security`, no `X-Content-Type-Options`, no
  site-wide `Referrer-Policy` (currently only set narrowly on the
  claim-token page), no `Permissions-Policy`. Already flagged in
  `implementation.md`'s Stage 19.A notes as a known follow-up.
- **Realistic impact:** The app has no defense-in-depth against clickjacking
  (no `frame-ancestors`), no explicit MIME-sniffing protection outside the
  one route fixed by SEC-01, and no baseline CSP to blunt any future XSS
  that does land.
- **Remediation:** Add a `headers()` function to `next.config.ts` with an
  explicit CSP (evaluated against this app's real integrations — Unsplash,
  Google user-content avatars, the stock-images CloudFront domain, Stripe's
  redirect domains), HSTS, `X-Content-Type-Options: nosniff`, a sensible
  site-wide `Referrer-Policy`, and a minimal `Permissions-Policy`. See Stage
  25 §6.
- **Verification method:** Verify headers against the deployed production
  application (not just source config) after implementation.

---

## SEC-03 — No rate limiting or lockout on admin sign-in

- **Severity:** Medium
- **Status:** resolved — `lib/auth/signin-rate-limit.ts` (new) reuses
  `lib/db/rate-limit.ts`'s existing fixed-window counter (IP-hash keyed,
  10 attempts/10 minutes, backed by the Claims table's `ttl` attribute —
  same reuse pattern the Claims/Leads tables already established for their
  own rate limits). `lib/auth/actions.ts`'s `signIn` checks it before
  validating credentials and returns the same generic message on both
  rate-limited and invalid-credential outcomes. Also added: structured
  `admin.signin.{succeeded,failed,rate_limited}` audit log events (ties
  into SEC-14).
- **Affected component:** `web/lib/auth/actions.ts` (`signIn`)
- **Description:** The single-operator admin credential's sign-in Server
  Action has no attempt throttling and logs no failures. scrypt slows each
  individual guess but nothing bounds total attempt volume.
- **Realistic impact:** An attacker with network access to the sign-in
  endpoint could attempt sustained credential guessing against the one
  admin account with no lockout or alerting.
- **Remediation:** Add IP-hash rate limiting reusing the existing
  `web/lib/db/rate-limit.ts` table-agnostic module (the same pattern already
  used for claim-token and campaign-code entry) rather than a new mechanism;
  log failed attempts via the Stage 24 structured logger. See Stage 25 §1.
- **Verification method:** Automated test confirming repeated failed
  sign-in attempts are throttled.

---

## SEC-04 — No CloudTrail in either AWS account

- **Severity:** Medium
- **Status:** in progress — code complete, deploy pending. New
  `infra/lib/stacks/cloudtrail-stack.ts` (`WebpresaCloudTrailStack`, wired
  into `infra/bin/webpresa.ts`): a multi-region, management-events-only
  trail, a private `WebpresaBucket`-backed log bucket (BLOCK_ALL, SSL-enforced,
  IA transition after 90 days), a CloudWatch Logs group (1-year retention),
  and two alarms (IAM changes, CloudTrail configuration changes) — no data
  events, no SNS target, matching this stage's "do not over-engineer"
  scope. 12 new CDK-assertion tests
  (`infra/test/cloudtrail-stack.test.ts`), all passing; full infra suite
  (228 tests) passes. **Not deployed** — per this repo's standing rule, no
  `cdk deploy` happens without first showing `cdk diff` and getting
  explicit approval; that review is the next step, separately, for both
  dev and prod.
- **Affected component:** infra (new — extends `infra/lib/stacks/monitoring-stack.ts`
  or a new sibling stack)
- **Description:** Confirmed absent from every CDK stack in both the dev
  (`539898341083`) and prod (`994748688217`) AWS accounts.
- **Realistic impact:** No durable, tamper-evident record of AWS API
  activity (IAM changes, console/CLI actions) exists for forensic or
  compliance purposes in either account.
- **Remediation:** Add a multi-region management-events trail per
  environment, a dedicated private S3 log bucket (`BLOCK_ALL`, SSE,
  restrictive bucket policy, log file validation), a proportional retention
  rule, and a small set of CloudWatch alarms for IAM/CloudTrail
  configuration changes wired into the existing `WebpresaMonitoringStack`.
  See Stage 25 §21.
- **Verification method:** `aws cloudtrail describe-trails`/`get-trail-status`
  against both accounts post-deploy; confirm the log bucket blocks public
  access and has log file validation enabled.

---

## SEC-05 — No per-redirect SSRF re-validation for the `existing_site` Playwright capture

- **Severity:** Medium
- **Status:** resolved — code complete, deploy pending. `browser.ts`'s new
  `guardNavigationRequests()` intercepts every navigation-type request via
  `context.route()` (the initial URL and every redirect hop Playwright
  follows within one `page.goto()`), re-validating each against
  `validateOutboundUrl()` and aborting (`blockedbyclient`) on a blocked
  destination; `captureViewport`'s error mapping gained a `blocked_url`
  category to report this distinctly from a generic load failure. 12 new
  tests (`infra/lambda/screenshot-capture/src/__tests__/browser.test.ts`).
  **Not yet deployed** — this Lambda requires a container image
  rebuild/push and `cdk deploy` (see `deployment.md`'s Stage 14 deploy
  sequence), which is a separate, explicitly-approved step from writing
  the code.
- **Affected component:** `infra/lambda/screenshot-capture/src/handler.ts`,
  `infra/lambda/screenshot-capture/src/browser.ts`
- **Description:** `validateOutboundUrl()` runs once before `page.goto()`;
  Playwright then follows any server-side redirect on its own with no
  request/response interception. The Firecrawl image-fetch path
  (`web/lib/firecrawl/images.ts`) already re-validates every redirect hop —
  this path does not.
- **Realistic impact:** A business's `websiteUrl` that passes initial
  validation and then 30x-redirects (at request time, server-side) to a
  private/internal address would not be re-checked before Playwright
  navigates there.
- **Remediation:** Add per-redirect re-validation to the Lambda's
  `existing_site` navigation, mirroring the Firecrawl image-fetch path's
  manual-redirect-following approach. See Stage 25 §10.
- **Verification method:** SSRF test matrix exercised against a
  redirect-to-private-address case for this specific capture path.

---

## SEC-06 — DNS-rebinding TOCTOU window in `validateOutboundUrl()` consumers

- **Severity:** Medium
- **Status:** open (deferred, not fixed in this pass) — full DNS pinning
  (resolve once, connect to the resolved IP directly while still
  presenting the correct Host header/SNI) was scoped in the Stage 25 plan
  but not implemented: for the Firecrawl image-ingestion `fetch()` path,
  it's a real but nontrivial change (Node's `fetch`/`https` don't expose a
  simple "connect to this IP, verify this hostname" option without custom
  `Agent`/`lookup` wiring, which risks subtly breaking certificate
  validation if done incorrectly); for the Lambda's Playwright-based
  navigation, Playwright's own browser-level DNS resolution makes this
  harder still. Risk-accepted for now on the stated mitigating factor: the
  screenshot Lambda's own IAM role is already tightly scoped (§ "What
  already exists" in `implementation.md`'s Stage 25), bounding what a
  successful rebinding attack could actually reach even if it landed.
  SEC-05's new per-redirect re-validation (resolved above) does close the
  simpler, non-rebinding redirect-to-private-address case.
- **Affected component:** `web/lib/security/url-validation.ts`,
  `infra/lambda/screenshot-capture/src/url-validation.ts` (deliberate
  duplicate)
- **Description:** `validateOutboundUrl()` resolves DNS to check for
  private/reserved IPs but returns the original hostname, not a pinned IP.
  The actual outbound connection (Playwright's own resolver in the Lambda,
  or Node's `fetch()` in the Firecrawl image path) re-resolves DNS
  independently afterward.
- **Realistic impact:** An attacker controlling DNS for a target hostname
  could serve a public IP at validation time and a private/internal IP at
  connection time (classic DNS rebinding). Most relevant to the screenshot
  Lambda's `existing_site` navigation; the Firecrawl image-fetch path is
  lower risk since it connects immediately after validating.
- **Remediation:** Where practical (the Node-`fetch()`-based image-ingestion
  path), resolve once and connect to the resolved IP directly. For the
  Lambda's Playwright-based navigation, evaluate a practical mitigation
  given Playwright's own browser-level DNS resolution; if none is practical,
  formally risk-accept given the Lambda's own narrow IAM role bounds the
  blast radius. See Stage 25 §10.
- **Verification method:** Documented decision + (where a fix lands) a test
  exercising the rebinding scenario; otherwise a recorded risk acceptance
  here.

---

## SEC-07 — Lob's Vercel-protection-bypass secret travels as a URL query parameter

- **Severity:** Medium
- **Status:** open (needs a live decision, not fixable from static code
  review) — whether Lob supports a custom HTTP header for webhook delivery
  (which would let this move out of the query string) can only be
  confirmed against Lob's current live dashboard/API, not by reading this
  repo. Left open pending that check; no code change made against
  unverified assumptions about Lob's capabilities.
- **Affected component:** Lob webhook registration (`app/api/webhooks/lob/route.ts`
  and the out-of-band Lob dashboard registration)
- **Description:** The registered Lob webhook URL includes
  `?x-vercel-protection-bypass=<secret>` as a query parameter. Already
  flagged as "still outstanding" in `deployment.md`.
- **Realistic impact:** Query-string secrets risk exposure via access logs,
  browser history (not applicable here — server-to-server only), or
  intermediate proxies/CDNs that log full request URLs.
- **Remediation:** Check whether Lob supports a custom header for this
  instead of a query parameter; if not, document the residual risk and
  confirm it's excluded from any request logging this app or its
  infrastructure performs. See Stage 25 §8.
- **Verification method:** Confirm (by inspection of whatever logging
  exists) the secret does not appear in any retained log line.

---

## SEC-08 — Prod Vercel IAM user creation/rotation procedure undocumented

- **Severity:** Medium
- **Status:** resolved — `deployment.md`'s "AWS credentials for Vercel"
  section gained "Creating the production user (`webpresa-vercel-prod`)"
  (mirrors the dev procedure, plus a verification step comparing Vercel's
  stored `AccessKeyId` against `aws iam list-access-keys`) and "Rotating
  either user's keys" (a documented 5-step manual procedure — no
  automated rotation is planned given Vercel's plain-env-var credential
  model).
- **Affected component:** `web/docs/deployment.md` ("AWS credentials for
  Vercel")
- **Description:** `deployment.md`'s walkthrough for creating the
  `webpresa-vercel-{env}` IAM user and its access keys only documents the
  dev flow. `WebpresaProdVercelAccessStack` is confirmed deployed
  (`build_log.md`), so a prod user and keys exist, but there is no recorded,
  repeatable procedure for how they were created, and no documented
  verification that Vercel's Production environment variables actually hold
  the prod (not dev) access keys.
- **Realistic impact:** Process risk — a future credential rotation or
  incident response for the prod identity has no documented playbook to
  follow, and there's no recorded confirmation that Production isn't
  accidentally running on dev's AWS credentials.
- **Remediation:** Document the prod user creation/key-generation procedure
  in `deployment.md`, mirroring the existing dev section; verify and record
  that Vercel Production's AWS credential env vars hold the prod user's
  keys. See Stage 25 §16.
- **Verification method:** Manual checklist item, signed off by the user.

---

## SEC-09 — No runtime guard against a Vercel deployment binding to the wrong environment's AWS resources

- **Severity:** Medium
- **Status:** resolved — `lib/env/resource-consistency.ts` (new)
  `assertResourceEnvironmentConsistency()` is wired into `getTableName()`
  (`lib/db/client.ts`), `getSecretName()` (`lib/secrets/client.ts`), and
  `getAssetsBucketName()` (`lib/s3/client.ts`) — the first resolved
  `webpresa-{env}-*` resource name each process instance sees establishes
  what every later one must match; a mismatch throws immediately. 5 new
  tests (`lib/env/__tests__/resource-consistency.test.ts`).
- **Affected component:** new (`web/lib/env/`)
- **Description:** Unlike `assertLiveModeAllowed()` for Stripe/Lob live-mode
  keys, nothing in the app detects a Vercel deployment context whose
  resolved table/bucket/secret names don't match each other (e.g. a
  Production deployment accidentally configured with one dev resource name
  among otherwise-prod values). Correctness today rests entirely on every
  Vercel environment-variable binding being set correctly by hand.
- **Realistic impact:** A misconfigured single environment variable in the
  Vercel dashboard could cause a Production request to read/write a dev
  DynamoDB table or read a dev secret, silently, with no runtime signal.
- **Remediation:** Add a small, narrowly-scoped fail-fast check that a
  deployment's resolved resource identifiers are internally consistent
  (all `webpresa-dev-*` or all `webpresa-prod-*`, never mixed) — detects
  inconsistency only, does not infer which environment is "correct." See
  Stage 25 §17/§23.
- **Verification method:** Automated test asserting the guard rejects a
  deliberately mismatched configuration.

---

## SEC-10 — `/api/domains/status`'s Origin check is skipped when the header is absent

- **Severity:** Low
- **Status:** resolved — the check is now `if (!origin || origin !==
  request.nextUrl.origin)`, rejecting a missing `Origin` header instead of
  only a mismatched one. 4 new tests
  (`app/api/domains/status/__tests__/route.test.ts`).
- **Affected component:** `web/app/api/domains/status/route.ts`
- **Description:** The route's hand-rolled CSRF defense (this app's only
  Route Handler mutation outside Next.js's default Server Action
  same-origin protection) checks the `Origin` header only when present; a
  request with no `Origin` header at all skips that check and relies solely
  on session + ownership + data re-verification.
- **Realistic impact:** Low — bounded by the route's own session/ownership
  checks either way (an attacker still can't act as a different user), but
  it's the one non-default CSRF posture in the app and is inconsistent with
  a "reject unless verified" default.
- **Remediation:** Make the Origin check unconditional (reject when the
  header is absent). See Stage 25 §5.
- **Verification method:** Automated test — a request with no `Origin`
  header is rejected.

---

## SEC-11 — No volume/cost cap on bulk Lob postcard submission

- **Severity:** Low
- **Status:** resolved — new `submitPostcardsToLobBulkAction()`
  (`app/admin/(dashboard)/postcards/actions.ts`) enforces a 25-postcard cap
  per call (rejecting the whole batch over that, submitting none of them)
  and submits sequentially, not via `Promise.all`;
  `CampaignDetail.tsx`'s "Submit all" now calls this one capped action
  instead of fanning out one `submitPostcardToLobAction` call per
  recipient, with the cap-exceeded message surfaced in the UI. 4 new tests
  (`app/admin/(dashboard)/postcards/__tests__/bulk-submit-actions.test.ts`).
- **Affected component:** `web/app/admin/(dashboard)/campaigns/CampaignDetail.tsx`,
  `web/lib/lob/submit-postcard.ts`
- **Description:** Postcard submission is admin-session-gated and has a
  per-postcard idempotency guard (an atomic `pending`→`submitting`
  transition preventing double-submission of the *same* postcard), but
  nothing caps how many postcards a single bulk "generate postcard" action
  can submit in one call.
- **Realistic impact:** A compromised admin session, or a fat-fingered bulk
  action, could trigger a large number of real-money Lob submissions in one
  action with no built-in ceiling.
- **Remediation:** Add a simple per-action or per-campaign cap on bulk
  submission volume. See Stage 25 §7/§11.
- **Verification method:** Automated test confirming a bulk submission
  above the configured cap is rejected or truncated.

---

## SEC-12 — `lib/customer-editing/*` functions have no in-function authorization check

- **Severity:** Low
- **Status:** resolved (documentation convention, not a structural
  redesign — matches the Stage 25 plan's explicit scope) — every file in
  `lib/customer-editing/` missing the convention now states, in its module
  doc comment, that it performs no auth check and names the
  `requireBusinessAccess()`/`requireBusinessOwnership()` contract the
  calling Server Action must satisfy first (`cta.ts`, `hours.ts`,
  `theme.ts`, `seo.ts`, `section-content.ts`, `business-list.ts`,
  `lead-actions.ts`, `notification-preference.ts` — `photos.ts`,
  `business-info.ts`, `publish.ts`, `account.ts`, `delete-website.ts`,
  `delete-account.ts` already had an equivalent statement;
  `site-status.ts` is a pure function with no `businessId` parameter and
  needs none).
- **Affected component:** `web/lib/customer-editing/*.ts`
- **Description:** These functions take a bare `businessId` with no
  session/ownership argument, by design — the calling Server Action (via
  `requireEditAccess()` in `app/app/(dashboard)/businesses/[businessId]/actions.ts`)
  is responsible for calling `requireBusinessAccess()` first. Every current
  call site does this correctly, but there is no structural or
  compiler-enforced guarantee preventing a future new Server Action or
  Route Handler from calling one of these functions directly with a
  client-supplied `businessId` and skipping the check.
- **Realistic impact:** None today (verified — every real call site gates
  correctly); this is a structural fragility, not an active vulnerability.
- **Remediation:** Add or extend a consistent doc-comment convention on
  every file in this directory naming the function's no-auth-check
  contract and its expected call site, so a future reviewer/lint pass can
  grep for the pattern. See Stage 25 §2.
- **Verification method:** Code review checklist; optionally a lint rule
  flagging new callers outside the established action files.

---

## SEC-13 — No shared `requireAdmin()` helper

- **Severity:** Low
- **Status:** resolved (helper added, adoption is forward-looking) — new
  `requireAdmin()` in `lib/auth/session.ts`, a throwing equivalent of the
  `getSession()`/null-check every admin Server Action already repeats
  correctly. Existing ~30 call sites were deliberately left unchanged
  (already correct; rewriting them purely for style was out of scope) —
  new admin server code should prefer this going forward.
- **Affected component:** `web/app/admin/**/*actions.ts` (all admin Server
  Action files)
- **Description:** Every admin Server Action independently repeats
  `const session = await getSession(); if (!session) return {message:'Unauthorized'}`.
  Consistently applied today (audited across every admin action file), but
  duplicated rather than centrally enforced, unlike the customer side's
  `requireCustomerSession()`.
- **Realistic impact:** None today; risk is a future admin action author
  forgetting the check, with no compiler/lint signal to catch it.
- **Remediation:** Consider a shared `requireAdmin()` throwing helper
  mirroring `requireCustomerSession()`'s shape. See Stage 25 §1.
- **Verification method:** Code review; optionally a lint rule.

---

## SEC-14 — No audit-denial logging outside internal-scan routes and webhook signature failures

- **Severity:** Low
- **Status:** resolved (highest-value events; not exhaustive — see below)
  — `lib/logging/log.ts`'s `LogFields` gained an `actorId` field (the
  identity performing a security-sensitive action; never PII/secrets).
  New structured events: `admin.signin.{succeeded,failed,rate_limited}`
  (`lib/auth/actions.ts`), `customer.signin.{succeeded,failed}`
  (`lib/auth/customer-actions.ts`), `admin.business.deleted`,
  `admin.business.ownership_released` (the latter's own doc comment, and
  `implementation.md`'s Stage 17, had both already claimed this was
  logged — it never actually was, until now), `customer.website.deleted`,
  `customer.account.deleted`. Postcard submission was already fully
  logged since Stage 24 (`lib/lob/submit-postcard.ts`) — no change
  needed there. **Not covered in this pass**: domain connect/disconnect
  events, and the many remaining ad hoc `Unauthorized` Server Action
  denials beyond sign-in — left as a reasonable follow-up rather than
  instrumenting every check site.
- **Affected component:** `web/lib/logging/log.ts` and its call sites
- **Description:** Only the 7 `/api/internal/scan/*` routes and
  Stripe/Lob webhook signature failures log unauthorized-attempt events.
  Admin/customer sign-in failures and the many ad hoc `Unauthorized`
  Server Action returns are silent to the structured log pipeline. No
  dedicated audit trail exists for ownership transfer, subscription
  changes, or account deletion beyond the implicit history already
  retained in the Claims table.
- **Realistic impact:** Reduced forensic visibility into failed
  authentication/authorization attempts and sensitive state changes.
- **Remediation:** Extend Stage 24's `LogFields` allowlist and add `log()`
  calls at sign-in failure points and the higher-value authorization
  denials; wire destructive-action logging into deletion/ownership-change/
  subscription-change/postcard-submission call sites. See Stage 25 §13/§22.
- **Verification method:** Automated test confirming a denial produces the
  expected structured log event with no secret leakage.

---

## SEC-15 — Dead/misleading SSRF-adjacent code

- **Severity:** Informational
- **Status:** resolved — `isWithinConfiguredOrigin()` is now actually
  wired in, via `browser.ts`'s `guardNavigationRequests(context,
  sameOriginBase)`: when capturing `generated_preview` (the only target
  this function was ever meant to guard), every navigation request —
  including redirects — must stay on the exact configured app origin,
  not merely pass the general SSRF blocklist. `handler.ts` now threads its
  own `appBaseUrl` through as `sameOriginBase` for that target only. The
  doc comment's claim is now true rather than aspirational. Deploy-pending,
  same as SEC-05 (same Lambda, same code change).
- **Affected component:** `infra/lambda/screenshot-capture/src/same-origin.ts`
  (`isWithinConfiguredOrigin`)
- **Description:** Documented in its own comment as being "called on every
  response/redirect Playwright follows while on this target," but a
  repo-wide reference check shows it is only ever referenced by its own
  test file — never imported or called from `handler.ts` or `browser.ts`.
  The doc comment overstates what the code actually does.
- **Realistic impact:** None directly (it's unused), but the misleading
  comment could cause a future reviewer to believe redirect protection
  exists on the `generated_preview` capture path when it doesn't rely on
  this function at all.
- **Remediation:** Either wire the function into the actual redirect-handling
  path it claims to guard, or delete it and correct the doc comment. See
  Stage 25 §10.
- **Verification method:** Code review confirming the function is either
  genuinely called or removed, and the comment matches reality.

---

## SEC-16 — No MFA option for admin or customer accounts

- **Severity:** Informational (deferred for MVP)
- **Status:** risk accepted
- **Affected component:** `infra/lib/constructs/webpresa-user-pool.ts`
  (`mfa: cognito.Mfa.OFF`), admin single-credential auth
- **Description:** The customer Cognito User Pool has MFA disabled; the
  single admin credential has no second factor.
- **Realistic impact:** A compromised password (admin or customer) is
  sufficient for account takeover with no second factor required.
- **Remediation / risk acceptance rationale:** Deferred for this MVP's
  threat model and scale — Cognito supports adding TOTP MFA later without
  re-architecture if real usage or a specific incident justifies it. See
  Stage 25 "Deferred work."
- **Verification method:** N/A (deferred). Revisit if account-takeover
  activity is observed or before a materially larger customer base is
  onboarded.

---

## SEC-17 — `ses:SendEmail` granted with `Resource: '*'`

- **Severity:** Informational (risk accepted)
- **Status:** risk accepted
- **Affected component:** `infra/lib/stacks/vercel-access-stack.ts`
  (`SesSendLeadNotifications` statement)
- **Description:** The Vercel app's IAM policy grants `ses:SendEmail` on a
  bare `Resource: '*'` rather than a scoped identity ARN.
- **Realistic impact:** In principle broadens the IAM-level blast radius of
  a compromised Vercel credential for SES sending, but SES's own
  verified-identity restriction is the real boundary in practice — this
  account can only ever send from identities it has independently verified
  (`webpresa.com`), regardless of the IAM resource pattern.
- **Remediation / risk acceptance rationale:** Two narrower attempts (a
  single sending-domain identity ARN, then an `identity/*` pattern) were
  tried and both proved unreliable in real-world testing (2026-08-03) —
  `iam simulate-principal-policy` said they should work, but real calls
  intermittently returned `AccessDeniedException` with no config change in
  between, a known real-world rough edge with pattern-matched resource ARNs
  for `ses:SendEmail`. A bare `'*'` routes through IAM's simpler "any
  resource" path and resolved it. Documented and risk-accepted rather than
  re-attempting a narrower pattern without new evidence it would be
  reliable.
- **Verification method:** N/A (risk accepted, documented in code and
  here).

---

## SEC-18 — `status-index` GSI hot-partition warning (pre-existing, cross-referenced)

- **Severity:** Informational (not new; not a Stage 25 blocker)
- **Status:** open (tracked, not resolved by Stage 25)
- **Affected component:** `infra/lib/stacks/data-stack.ts` (multiple
  tables' `status-index` GSIs)
- **Description:** The codebase already flags, in its own
  "PRE-PRODUCTION ARCHITECTURE NOTE," that every table's `status-index` GSI
  (a low-cardinality partition key) is a known hot-partition anti-pattern
  that "MUST BE REASSESSED BEFORE PRODUCTION DEPLOYMENT." This is a
  scaling/availability concern, not a confidentiality/integrity/authorization
  issue, so it's out of scope for Stage 25's own remediation work.
- **Realistic impact:** Potential DynamoDB throttling under real production
  write volume against a status-based query pattern.
- **Remediation:** Out of scope for Stage 25 — cross-referenced here so it
  isn't lost; belongs to Stage 27's launch validation or a dedicated
  scaling pass.
- **Verification method:** N/A for Stage 25.
