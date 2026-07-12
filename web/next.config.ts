import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export removed in Stage 7: admin dashboard requires Server Actions,
  // Route Handlers, and proxy.ts — all incompatible with `output: 'export'`.
  // Homepage pages are still statically optimised by Next.js at build time.
  images: { unoptimized: true },
};

export default nextConfig;
