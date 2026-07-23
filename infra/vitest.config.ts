import { defineConfig, defaultExclude } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // lambda/screenshot-capture is a fully independent npm project (its
    // own package.json, its own `npm test`, run from within that
    // directory) — see its package.json doc comment. It must never be
    // picked up by this project's own `npm test` glob, which has none of
    // that package's dependencies (jose, playwright-core) installed.
    exclude: [...defaultExclude, 'lambda/**'],
    // CDK's Template.fromStack does real synthesis work (bigger for the
    // multi-stack Stage 14 screenshot-stack.test.ts than the single-stack
    // data-stack.test.ts) — the default 10s hook timeout is too tight for
    // that plus a cold TS transform in a fresh test run.
    hookTimeout: 60_000,
    // Two CDK-synth-heavy suites competing for CPU in parallel worker
    // processes is what actually caused the timeout (each file synths
    // fine in isolation in ~10-15s) — run test files sequentially instead
    // of in parallel workers. Slower wall-clock time, but reliable.
    fileParallelism: false,
  },
});
