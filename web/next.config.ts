import type { NextConfig } from "next";

/**
 * Security headers (Stage 25 — Security Hardening). Previously absent
 * entirely — no CSP/frame-ancestors, HSTS, nosniff, site-wide
 * Referrer-Policy, or Permissions-Policy existed anywhere in this app.
 *
 * No nonce-based CSP: this app has no per-request nonce plumbing in
 * `proxy.ts` today (Next.js's nonce approach requires proxy-generated,
 * per-request nonces threaded into every script/style tag — a materially
 * larger change than this pass scopes), and Tailwind/the `V` shorthand
 * inline-style pattern used throughout the public template rely on inline
 * `style` attributes. `frame-ancestors 'self'` (not `'none'`) — not the
 * stricter default from Next's own CSP guide — because
 * `WebsitePreviewCard.tsx` legitimately iframes this app's own `/b/[slug]`
 * inside `/app/businesses/[businessId]`; `'self'` still blocks every
 * third-party site from framing any Webpresa page (the real clickjacking
 * defense) while keeping that same-origin embed working.
 */
const isDev = process.env.NODE_ENV === 'development';
const stockImagesCdnHost = process.env.STOCK_IMAGES_CDN_DOMAIN ?? '*.cloudfront.net';
// Private assets bucket (screenshots, postcard creative) — served to <img>
// tags as presigned S3 URLs (see lib/s3/assets.ts), never via the stock-
// images CDN above. AWS SDK v3 presigns virtual-hosted-style regional URLs
// (`{bucket}.s3.{region}.amazonaws.com`); the `*.s3.amazonaws.com` legacy
// global-endpoint form is also allowed defensively in case a signed URL ever
// resolves to that format instead.
const assetsBucketRegion = process.env.AWS_REGION ?? 'us-east-1';

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // `blob:` — the self-service `/build` wizard's own logo/photo previews
  // (`URL.createObjectURL(file)` in `app/build/BuildWizard.tsx`), rendered
  // client-side before any upload happens; nothing else in the app creates
  // object URLs for images.
  `img-src 'self' data: blob: https://images.unsplash.com https://*.googleusercontent.com https://${stockImagesCdnHost} https://*.s3.${assetsBucketRegion}.amazonaws.com https://*.s3.amazonaws.com`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  // `sharp` (lib/image/hero-dimensions.ts, lib/theme/logo-color.ts,
  // lib/firecrawl/images.ts, lib/s3/stock-images.ts, lib/s3/upload-
  // validation.ts) is a native addon — Next.js's build-time file tracer
  // decides which node_modules files get copied into each deployed
  // serverless function, and it doesn't always find every native binary a
  // package needs, especially with two separate sharp installs present
  // (this app's own `sharp` dependency plus Next.js's own internal nested
  // copy, at different versions with different libvips builds). That gap
  // surfaced as a real Vercel `preview` outage: `ERR_DLOPEN_FAILED:
  // libvips-cpp.so.8.18.3: cannot open shared object file` — the tracer
  // silently omitted that exact file from the function bundle. Explicitly
  // including sharp's own linux-x64 binaries (Vercel's function runtime)
  // here is the documented fix for "some files were not detected" per
  // `outputFileTracingIncludes`'s own doc comment in next's config types.
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/sharp/**/*', './node_modules/@img/sharp-linux-x64/**/*', './node_modules/@img/sharp-libvips-linux-x64/**/*'],
  },
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
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // Next.js applies header rules in order, last match wins per key (see
      // "Header Overriding Behavior" in the headers() docs) — this narrows
      // Referrer-Policy back to `no-referrer` on the token-bearing claim/
      // campaign-redirect entry points, matching the stricter value those
      // routes already set directly (Stage 17/21) so a third-party resource
      // loaded from the destination page never sees the raw token/code in
      // a Referer header. Everything else in SECURITY_HEADERS still applies
      // to these paths — this only overrides the one key.
      {
        source: '/claim/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
      {
        source: '/r/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
};

export default nextConfig;
