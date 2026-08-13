import 'server-only';

/**
 * The deployment environment this process is running in, per Vercel's own
 * `VERCEL_ENV` signal (falls back to `NODE_ENV` for local/CI runs where
 * `VERCEL_ENV` is never set). Introduced in Stage 18 as a diagnostic tag on
 * Stripe Checkout metadata; Stage 22.5 also uses it as an enforcement
 * boundary — see `assertLiveModeAllowed` below.
 */
export function resolveRuntimeEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown';
}

/**
 * Stage 22.5 — refuses to proceed with what looks like a live-mode
 * Stripe/Lob API key unless the resolved runtime environment is genuinely
 * `'production'`. Before this, safety rested entirely on which key string
 * was stored in Secrets Manager: a live key pasted into the (single,
 * dev-suffixed) secret would have been usable from every Preview
 * deployment with no code-level check. This is defense in depth, not a
 * replacement for keeping live keys out of non-production secrets.
 */
export function assertLiveModeAllowed(provider: string, isLiveKey: boolean): void {
  if (!isLiveKey) return;
  const env = resolveRuntimeEnvironment();
  if (env !== 'production') {
    throw new Error(
      `${provider}: refusing to use a live-mode API key outside a production deployment ` +
        `(resolved runtime environment: "${env}"). This looks like a live-mode key configured ` +
        'on a non-production deployment — check the Secrets Manager secret value and the Vercel ' +
        'environment variables for this deployment.',
    );
  }
}
