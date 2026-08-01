'use client';

import { useState } from 'react';
import { Monitor, Smartphone, ExternalLink } from 'lucide-react';

interface WebsitePreviewCardProps {
  slug: string;
  lastUpdated?: string;
  /** When true, the preview shows the pending draft instead of the live
   *  published site (see `/b/[slug]`'s `?preview=draft` override) — without
   *  this, the iframe would silently keep showing stale published content
   *  even while the dashboard says "Draft changes." */
  hasDraft?: boolean;
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
export function WebsitePreviewCard({ slug, lastUpdated, hasDraft }: WebsitePreviewCardProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const href = `/b/${slug}${hasDraft ? '?preview=draft' : ''}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
          className={`relative bg-white shadow-inner rounded-lg overflow-hidden transition-all mx-auto ${
            // Desktop fills essentially the whole card so it reads as "your
            // actual website," not a postage stamp. Mobile is sized to a
            // real modern phone viewport (iPhone 12/14 standard: 390×844
            // logical px) rather than an arbitrarily narrow box — capped by
            // max-h/max-w so it still fits on shorter/narrower screens.
            viewport === 'desktop'
              ? 'w-full h-[80vh] min-h-[560px]'
              : 'w-[390px] max-w-full h-[844px] max-h-[80vh]'
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
          <iframe
            title="Your website preview"
            src={href}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 w-full h-full border-0 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
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
