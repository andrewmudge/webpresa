<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Webpresa — Permanent Agent Instructions

These rules apply on every task, every session, without exception.

---

## AWS

- The development AWS CLI profile is `webpresa-dev` (account `539898341083`); the production profile is `webpresa-prod` (account `994748688217`). The old bare `webpresa` profile no longer exists — it was renamed to `webpresa-dev` in Stage 22.5.
- Use `--profile webpresa-dev` / `--profile webpresa-prod` only in local CLI and CDK commands. Never embed profile names in application code, environment files, or CI configuration.
- Never hard-code AWS account IDs, region strings, ARNs, access keys, or secret keys in any source file. Resolve them from `process.env`, CDK context, or CloudFormation exports at runtime. The one deliberate exception: `infra/lib/config/environments.ts` stores each environment's *expected* account ID, used only by `assertAccountMatchesEnvironment()` as a synth-time safety check (Stage 22.5) — never referenced by application code or embedded in a resource name.
- Every `cdk` command (`synth`/`diff`/`deploy`, including `bootstrap`) requires `--context env=dev` or `--context env=prod` (defaults to `dev` if omitted) and a matching `--profile`. `assertAccountMatchesEnvironment()` in `infra/bin/webpresa.ts` fails loudly if the two don't match the same AWS account — do not work around this check; if it fires, the `--profile`/`--context env=` combination is wrong.
- Never expose AWS credentials or IAM role names to the browser or to any client-side bundle.
- Do not deploy infrastructure unless explicitly instructed. Before any `cdk deploy`, show the account ID, region, resources to be created, stack name, and full `cdk diff` output, then stop and wait for approval.
- Before creating any new AWS resource, inspect the existing infrastructure for resources that can be reused. Never create duplicates.
- Reuse the established naming convention: `webpresa-{env}-{resource}` (e.g. `webpresa-dev-businesses`).
- `Webpresa{Dev,Prod}ScreenshotStack`, `Webpresa{Dev,Prod}ScanWorkflowStack`, and `Webpresa{Dev,Prod}PostcardRenderStack` (Stage 22 Phase 2) depend on `WEBPRESA_APP_BASE_URL`. Always diff/deploy them via `npm run {diff,deploy}:screenshot`, `npm run {diff,deploy}:scan-workflow`, `npm run {diff,deploy}:postcard-render` for dev, or the `:prod` variants of the same scripts for prod (`infra/package.json`) — never a raw `cdk deploy` for any of these three. `infra/bin/webpresa.ts` hard-fails if the env var is unset (no placeholder fallback), but a deploy that skips the npm scripts loses the baked-in real URL. Immediately after any deploy touching any of these stacks, run the post-deploy verification command from `web/docs/deployment.md` (Stage 14/16 sections; add an equivalent for Stage 22 once the postcard-render Lambda actually deploys) and show the result — a 2026-07-28 deploy that skipped this silently shipped a fake `.invalid` URL into the screenshot/scan-workflow stacks, breaking both for days before anyone noticed.

## Code quality

- After every code change: run lint (`npm run lint`), type-check (`npx tsc --noEmit`), tests (`npm test`), and build (`npm run build`).
- Do not claim a task is complete if any of these steps fails.
- Fix failures before reporting success. If a failure cannot be fixed in the current task scope, report it explicitly.

## Verification

- Do not start a dev server, open a browser, or take screenshots to visually verify general UI/frontend layout changes unless asked. The user verifies visual/UI changes themselves.
- Verification means: lint, type-check, tests, and build (see "Code quality" above). That is sufficient to report a task complete — do not additionally attempt to view the running app.
- Exception — generated graphics review: when asked to look at your own work on a generated visual artifact (e.g. postcards, generated site previews), use `web/scripts/screenshot.mjs` against a locally running dev server (`npm run dev`) to capture a screenshot and view it yourself with the Read tool. See that script's header comment for the headless-Chromium sandbox setup (missing system libs, no sudo).

## Scope

- Keep changes strictly limited to the work described in the current task. Do not refactor, rename, or "improve" adjacent code that was not mentioned.
- Do not begin the next stage until the current stage is complete and verified.
- Do not build application logic during an infrastructure stage, and do not create infrastructure during an application logic stage.

## Documentation

- After completing a stage, update `web/docs/build_log.md` with what was done, files created or modified, commands run, and results.
- Keep `web/docs/architecture.md` current whenever the system shape changes.
- Keep `web/docs/deployment.md` current whenever deployment steps change.

