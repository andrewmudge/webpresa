'use client';

import { useState } from 'react';

interface Props {
  slug: string;
}

/**
 * Laptop + phone device mockup showing the customer's own already-built
 * site, embedded live via the same-origin `/b/[slug]` route (real content,
 * never a stale screenshot) — the visual centerpiece of the activation
 * page: "show, don't tell" before asking for payment. Same-origin iframe
 * technique as `WebsitePreviewCard` (`app/app/businesses/[businessId]`),
 * just composed as a hero device mockup instead of a dashboard tool.
 *
 * Renders nothing if the site fails to load — this is a celebratory hero,
 * not a diagnostic surface, so it degrades to no visual rather than an
 * error message.
 */
export function WebsiteHeroPreview({ slug }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const href = `/b/${slug}`;

  if (failed) return null;

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden={!loaded}>
      {/* Laptop */}
      <div className="rounded-t-xl border-[10px] border-b-0 border-gray-900 bg-gray-900 shadow-2xl">
        <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-white">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 animate-pulse">
              <span className="text-xs text-gray-400">Loading your website…</span>
            </div>
          )}
          <iframe
            title="Your website"
            src={href}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full border-0 transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      </div>
      <div className="relative h-3 rounded-b-xl bg-gray-300 sm:h-4">
        <div className="absolute left-1/2 top-0 h-1 w-1/4 -translate-x-1/2 rounded-b bg-gray-400" />
      </div>

      {/* Phone, overlapping the laptop's bottom-right corner */}
      {loaded && (
        <div
          className="absolute -bottom-6 -right-4 hidden w-24 overflow-hidden rounded-2xl border-[6px] border-gray-900 bg-gray-900 shadow-xl sm:block sm:w-28 lg:-right-8 lg:w-32"
          style={{ aspectRatio: '9 / 19.5' }}
        >
          <iframe title="Your website (mobile)" src={href} className="h-full w-full border-0" tabIndex={-1} />
        </div>
      )}
    </div>
  );
}
