import 'server-only';

/**
 * Stage 25 (Security Hardening) — fail-fast guard against a Vercel
 * deployment whose resolved AWS resource identifiers don't all belong to
 * the same environment. Unlike `assertLiveModeAllowed()`
 * (`lib/env/runtime-environment.ts`), which checks Stripe/Lob key liveness
 * against the Vercel deployment target, nothing previously checked that
 * every DynamoDB table name / Secrets Manager secret name / S3 bucket name
 * resolved by this process actually agree with each other — correctness
 * rested entirely on every Vercel environment-variable binding being set
 * correctly by hand (`implementation.md`, Stage 25, "Environment
 * isolation"). This detects inconsistency only; it never infers or
 * overrides which environment is "correct."
 *
 * Cached per process, matching `getSecretJson`'s own process-lifetime
 * caching rationale — the first resolved resource name in a given
 * serverless instance establishes what every later one must agree with.
 */

const RESOURCE_NAME_PATTERN = /^webpresa-(dev|prod)-/;

let expectedSuffix: string | undefined;

/**
 * Validates that `name` (a resolved table/secret/bucket name) belongs to
 * the same `webpresa-{env}-` environment as every other resource this
 * process has already resolved, then returns it unchanged. Names that
 * don't match the `webpresa-{env}-` convention pass through untouched —
 * this is a consistency check, not a naming-convention enforcer.
 */
export function assertResourceEnvironmentConsistency(name: string): string {
  const match = name.match(RESOURCE_NAME_PATTERN);
  if (!match) return name;

  const suffix = match[1];
  if (!expectedSuffix) {
    expectedSuffix = suffix;
    return name;
  }

  if (suffix !== expectedSuffix) {
    throw new Error(
      `Resource environment mismatch: "${name}" looks like a "${suffix}" resource, but this deployment has ` +
        `already resolved "${expectedSuffix}" resources. This usually means a Vercel environment variable is ` +
        `bound to the wrong environment's AWS resource name — check the Vercel dashboard's environment-variable ` +
        `bindings for this deployment.`,
    );
  }

  return name;
}
