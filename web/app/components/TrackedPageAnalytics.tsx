"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";

/**
 * Mounted once in the root layout, but only activates the Vercel Web
 * Analytics script on the two pages the admin dashboard's visitor-analytics
 * card tracks: the homepage and the self-service build funnel's landing
 * page — never `/build/[buildId]` (the wizard steps after someone starts),
 * and never `/admin`, `/app`, `/b/[slug]`, `/api`, etc. Exact-path checks,
 * not prefix matches, so nothing else silently starts counting toward the
 * shared Vercel Web Analytics event quota (billed/quota'd per team, across
 * every project) — see `lib/analytics/vercel-visitors.ts`.
 */
export default function TrackedPageAnalytics() {
  const pathname = usePathname();
  if (pathname !== "/" && pathname !== "/build") return null;
  return <Analytics />;
}
