'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, ExternalLink } from 'lucide-react';

/**
 * Not arbitrary — the same 1600×900 "desktop" reference dimension this app
 * already uses elsewhere (`lib/image/hero-dimensions.ts`'s hero-photo
 * full-bleed-eligibility check). Comfortably clears every Tailwind
 * breakpoint the public template uses (sm/md/lg/xl are all ≤1280px), so
 * rendering the iframe at this true width — then visually scaling the
 * whole box down to fit the panel — makes the embedded site reliably pick
 * its real desktop layout regardless of how narrow the panel actually is.
 * `transform: scale()` is a paint-time-only transform: it doesn't change
 * the iframe's actual CSS layout viewport (what the embedded page's media
 * queries see), only how the result is painted — the split-view editor's
 * preview panel is often only ~700-950px wide, well under some of the
 * template's own breakpoints (e.g. the header's nav collapses at `md:`,
 * 768px), so without this the "Desktop" toggle was silently showing the
 * mobile hero image/nav — a real, confusing bug for anyone comparing a
 * separately-set desktop vs. mobile hero photo.
 */
const DESKTOP_PREVIEW_WIDTH = 1600;
// Mobile needs no scaling (its native width already equals its visual
// size), but is expressed as the same width/height pair so both viewports
// can render through one shared "scaled native box" JSX shape below — that
// shape-consistency is what lets toggling Desktop/Mobile keep reusing the
// same `<iframe>` DOM node (no reload) instead of remounting it, matching
// the toggle's existing instant-switch behavior.
const MOBILE_PREVIEW_WIDTH = 390;
const MOBILE_PREVIEW_HEIGHT = 844;

interface WebsitePreviewCardProps {
  slug: string;
  lastUpdated?: string;
  /** When true, the preview shows the pending draft instead of the live
   *  published site (see `/b/[slug]`'s `?preview=draft` override) — without
   *  this, the iframe would silently keep showing stale published content
   *  even while the dashboard says "Draft changes." */
  hasDraft?: boolean;
  /** The business's active connected custom domain, e.g. `"https://example.com"`
   *  — only shown/linked when NOT previewing a draft (a draft is never live
   *  at the custom domain, so showing that address while displaying draft
   *  content would misrepresent what's actually there). Omit if no custom
   *  domain is connected — the status bar falls back to the real `/b/[slug]`
   *  path, never a fabricated `*.webpresa.io`-style address. */
  customDomainUrl?: string;
}

/**
 * Embedded, scaled preview of the business's own public page
 * (implementation.md, Stage 19, "Website preview card"). Same-origin, so
 * the customer's own httpOnly session cookie authenticates the framed
 * request automatically — no capture-token-style workaround needed. No
 * `sandbox` attribute: this is same-origin content from this app's own
 * template, and the Request Service modal / CTA `tel:`/`mailto:` handling
 * need to keep working exactly as they do on the real public page.
 */
export function WebsitePreviewCard({ slug, lastUpdated, hasDraft, customDomainUrl }: WebsitePreviewCardProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const isDesktop = viewport === 'desktop';
  const previewContainerRef = useRef<HTMLDivElement>(null);
  // `null` only until the CSS-sized desktop outer box (`w-full
  // max-w-[1600px] h-[80vh] min-h-[560px]`) has been measured for the very
  // first time — desktop mode's scaled inner box only mounts once this is
  // real (see below), so it's never created at a momentarily-wrong size.
  // Deliberately NOT reset when leaving desktop mode: the last-measured
  // size is almost always still correct when returning to it (the panel
  // usually hasn't resized in between), and in the rare case it has, the
  // `ResizeObserver` below corrects it within one tick anyway — cheaper and
  // simpler than manufacturing a "reset on mode change" path, which this
  // repo's stricter React-Compiler-era lint rules (no ref reads/writes
  // during render, no setState-in-effect for anything but syncing with the
  // external system an effect actually owns) don't have a clean answer for
  // here regardless.
  const [desktopSize, setDesktopSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!isDesktop) return;
    const el = previewContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDesktopSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isDesktop]);

  // One shared "native size, visually scaled" model for both viewports —
  // mobile is simply always scale 1 (its 390×844 native size already IS
  // its visual size). Desktop's scale maps the fixed 1600px-native render
  // down to whatever width the CSS-capped-at-1600px outer box actually
  // resolved to; its native height is back-derived so that, after scaling,
  // the visual height still equals the outer box's own CSS-driven height
  // (`80vh`/`min-h-[560px]`) — the native iframe just renders more/less of
  // the page vertically as needed to fill exactly that visual height once
  // scaled down.
  const nativeWidth = isDesktop ? DESKTOP_PREVIEW_WIDTH : MOBILE_PREVIEW_WIDTH;
  const scale = isDesktop ? (desktopSize ? desktopSize.width / DESKTOP_PREVIEW_WIDTH : null) : 1;
  const nativeHeight = isDesktop ? (desktopSize && scale ? desktopSize.height / scale : null) : MOBILE_PREVIEW_HEIGHT;

  const href = `/b/${slug}${hasDraft ? '?preview=draft' : ''}`;
  // Always exactly what the iframe below is showing — a draft never shows
  // the custom domain (see the prop doc comment), so `href` (the same
  // internal draft path) is deliberately still correct there.
  const displayUrl = !hasDraft && customDomainUrl ? customDomainUrl : href;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-100 text-xs">
        <span className="flex shrink-0 items-center gap-1.5 font-medium text-gray-600">
          <span className={`h-2 w-2 rounded-full ${hasDraft ? 'bg-amber-500' : 'bg-green-500'}`} aria-hidden="true" />
          {hasDraft ? 'Draft preview' : 'Live preview'}
        </span>
        <span className="h-4 w-px shrink-0 bg-gray-200" aria-hidden="true" />
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-center gap-1 text-gray-500 hover:text-(--color-brand) transition-colors"
        >
          <span className="truncate">{displayUrl}</span>
          <ExternalLink size={11} className="shrink-0" aria-hidden="true" />
        </a>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            aria-pressed={viewport === 'desktop'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewport === 'desktop' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            <Monitor size={14} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            aria-pressed={viewport === 'mobile'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewport === 'mobile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            <Smartphone size={14} /> Mobile
          </button>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-(--color-brand) hover:underline"
        >
          Open full preview <ExternalLink size={13} />
        </a>
      </div>

      <div className="bg-gray-100 flex justify-center p-4 sm:p-8">
        <div
          ref={previewContainerRef}
          className={`relative bg-white shadow-inner rounded-lg overflow-hidden transition-all mx-auto ${
            // Desktop's outer box is what's actually measured (see the
            // ResizeObserver above) — it fills available width up to a real
            // 1600px desktop reference size, beyond which it's capped and
            // centered rather than growing arbitrarily wide. Mobile is
            // sized to a real modern phone viewport (iPhone 12/14 standard:
            // 390×844 logical px) rather than an arbitrarily narrow box —
            // capped by max-h/max-w so it still fits on shorter/narrower
            // screens.
            isDesktop ? 'w-full max-w-[1600px] h-[80vh] min-h-[560px]' : 'w-[390px] max-w-full h-[844px] max-h-[80vh]'
          }`}
        >
          {!loaded && !failed && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 animate-pulse">
              <span className="text-xs text-gray-400">Loading preview…</span>
            </div>
          )}
          {failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50 px-4 text-center">
              <p className="text-sm text-gray-500">Couldn&apos;t load the preview.</p>
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-(--color-brand) underline">
                Open it directly
              </a>
            </div>
          )}
          {/* Rendered at a true, fixed native size and visually shrunk with
              `transform: scale` — a paint-time-only transform, so the
              embedded page's own CSS media queries still measure against
              the real `nativeWidth` (1600px on desktop), not the shrunk
              visual size. Only mounts once a real `scale`/`nativeHeight` is
              known (mobile's is immediate; desktop's arrives once the
              outer box above has actually been measured), so the iframe is
              never created at a momentarily-wrong size. Kept as the same
              JSX shape/position across both viewports specifically so
              toggling Desktop/Mobile updates this element's size in place
              rather than unmounting and recreating it — the iframe itself
              never reloads just from switching viewports, same as before
              this change. */}
          {scale !== null && nativeHeight !== null && (
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: nativeWidth, height: nativeHeight, transform: `scale(${scale})` }}
            >
              <iframe
                title="Your website preview"
                src={href}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                className={`absolute inset-0 w-full h-full border-0 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>
          )}
        </div>
      </div>

      {lastUpdated && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          Last updated {new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      )}
    </div>
  );
}
