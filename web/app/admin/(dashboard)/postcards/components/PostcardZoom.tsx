'use client';

import { useEffect, useState } from 'react';
import { POSTCARD_TRIM_SIZE_INCHES, POSTCARD_BLEED_SIZE_INCHES, POSTCARD_SAFE_ZONE_SIZE_INCHES } from './postcard-size';

/**
 * Click-to-enlarge wrapper for a postcard front/back preview (Stage 22).
 * The thumbnail and the modal both render the same `children` element — a
 * pure, prop-driven presentational component (`PostcardFront`/
 * `PostcardBack`, wrapped in `PostcardFrame`), so rendering it twice costs
 * no extra data fetching; images just resolve from the browser cache the
 * second time.
 *
 * The modal sizes itself to the postcard's full bleed-canvas dimensions
 * (`POSTCARD_BLEED_SIZE_INCHES` — `PostcardFrame` is itself sized to this,
 * so nesting it here stays proportionally correct) via the CSS `in` unit —
 * browsers approximate 96px per inch per the CSS spec, so this isn't true
 * physical size on every monitor, but it's the closest a browser can get
 * and the standard convention for it. `min(...vw/vh)` keeps it from
 * overflowing small/admin-panel viewports.
 */
export default function PostcardZoom({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in text-left transition-opacity hover:opacity-90"
        aria-label={`Enlarge ${label} at actual size`}
      >
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} — actual size`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div className="flex max-h-full max-w-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: `min(${POSTCARD_BLEED_SIZE_INCHES.width}in, 90vw)`, height: `min(${POSTCARD_BLEED_SIZE_INCHES.height}in, 60vh)` }}>
              {children}
            </div>
            <p className="max-w-md text-center text-xs text-white/70">
              {label} — actual size. Solid border is the {POSTCARD_BLEED_SIZE_INCHES.width}&quot;×{POSTCARD_BLEED_SIZE_INCHES.height}&quot; print file
              (bleed included); dashed line is the {POSTCARD_TRIM_SIZE_INCHES.width}&quot;×{POSTCARD_TRIM_SIZE_INCHES.height}&quot; trim edge the recipient
              actually sees; dotted line is the {POSTCARD_SAFE_ZONE_SIZE_INCHES.width}&quot;×{POSTCARD_SAFE_ZONE_SIZE_INCHES.height}&quot; safe zone essential
              content should stay inside. Approximated at 96px/in — true on-screen size varies by monitor.
            </p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
