import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export removed in Stage 7: admin dashboard requires Server Actions,
  // Route Handlers, and proxy.ts — all incompatible with `output: 'export'`.
  // Homepage pages are still statically optimised by Next.js at build time.
  experimental: {
    serverActions: {
      // Default is 1MB, too small for the Photos form's logo + up to 6
      // photo uploads (updatePhotosAction submits all files as one
      // multipart Server Action request). No per-file size/type validation
      // exists yet — see Stage 25 (Security Hardening) deferred work.
      bodySizeLimit: '15mb',
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Google reviewer avatars (authorAttribution.photoUri) — a directly
      // hotlinkable Google CDN URL, not a Google Place Photo. See
      // lib/google-places/reviews.ts.
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      // Stock image repository CDN (Phase 1 curated hero-photo fallback) —
      // required even with `unoptimized: true` above: next/image still
      // validates remote hostnames for absolute URLs, only same-origin/
      // relative URLs (e.g. `/api/assets/...`) skip that check. See
      // lib/s3/stock-images.ts / infra/lib/stacks/stock-images-stack.ts.
      {
        protocol: 'https',
        hostname: process.env.STOCK_IMAGES_CDN_DOMAIN ?? '*.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
