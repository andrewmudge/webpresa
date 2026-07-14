import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export removed in Stage 7: admin dashboard requires Server Actions,
  // Route Handlers, and proxy.ts — all incompatible with `output: 'export'`.
  // Homepage pages are still statically optimised by Next.js at build time.
  experimental: {
    serverActions: {
      // Default is 1MB, too small for the business form's logo + up to 6
      // photo uploads (createBusinessAction/editBusinessAction submit all
      // files as one multipart Server Action request). No per-file size/type
      // validation exists yet — see Stage 25 (Security Hardening) deferred work.
      bodySizeLimit: '15mb',
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // DEV_FIXTURE: picsum.photos placeholder images used in seed preview data.
      // Replace with the actual S3 bucket pattern in Stage 9.
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
