import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    /**
     * Mirror the `@/*` → `./` path alias from tsconfig.json so that
     * imports like `@/domain/models` resolve correctly during test runs
     * without requiring a Next.js server or vite-tsconfig-paths plugin.
     */
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
