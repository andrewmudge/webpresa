<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Webpresa — Permanent Agent Instructions

These rules apply on every task, every session, without exception.

---

## AWS

- The development AWS CLI profile is `webpresa`.
- Use `--profile webpresa` only in local CLI and CDK commands. Never embed profile names in application code, environment files, or CI configuration.
- Never hard-code AWS account IDs, region strings, ARNs, access keys, or secret keys in any source file. Resolve them from `process.env`, CDK context, or CloudFormation exports at runtime.
- Never expose AWS credentials or IAM role names to the browser or to any client-side bundle.
- Do not deploy infrastructure unless explicitly instructed. Before any `cdk deploy`, show the account ID, region, resources to be created, stack name, and full `cdk diff` output, then stop and wait for approval.
- Before creating any new AWS resource, inspect the existing infrastructure for resources that can be reused. Never create duplicates.
- Reuse the established naming convention: `webpresa-{env}-{resource}` (e.g. `webpresa-dev-businesses`).

## Code quality

- After every code change: run lint (`npm run lint`), type-check (`npx tsc --noEmit`), tests (`npm test`), and build (`npm run build`).
- Do not claim a task is complete if any of these steps fails.
- Fix failures before reporting success. If a failure cannot be fixed in the current task scope, report it explicitly.

## Scope

- Keep changes strictly limited to the work described in the current task. Do not refactor, rename, or "improve" adjacent code that was not mentioned.
- Do not begin the next stage until the current stage is complete and verified.
- Do not build application logic during an infrastructure stage, and do not create infrastructure during an application logic stage.

## Documentation

- After completing a stage, update `web/docs/build_log.md` with what was done, files created or modified, commands run, and results.
- Keep `web/docs/architecture.md` current whenever the system shape changes.
- Keep `web/docs/deployment.md` current whenever deployment steps change.

