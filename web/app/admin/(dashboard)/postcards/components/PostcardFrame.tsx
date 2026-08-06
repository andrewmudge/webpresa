import { POSTCARD_TRIM_INSET_PERCENT, POSTCARD_SAFE_ZONE_INSET_PERCENT } from './postcard-size';

/**
 * Postcard-shaped layout wrapper, sized to the full 9.25"×6.25" bleed
 * canvas (Lob's 6x9 jumbo print file size, confirmed 2026-08-05 — see
 * `postcard-size.ts`), not the 9"×6" trim size — matching what an actual
 * print artwork file covers. Two guide overlays mark the two boundaries
 * Lob's spec defines: a dashed line at the trim edge (only content inside
 * it survives production cutting — the border-to-dashed-line margin is
 * bleed-only background extension), and a dotted line at the safe zone
 * (essential text/QR/address content should stay inside this, 0.125"
 * further in than the trim edge, so real-world cutting tolerance never
 * clips it). Purely presentational, and purely a visual guide — it does
 * not itself enforce that `children`'s content respects the safe zone, see
 * `postcard-size.ts`'s doc comment.
 *
 * `@container` (Tailwind v4's `container-type: inline-size`) lets
 * `PostcardFront`'s content size itself with `cqw`/`cqh` units relative to
 * *this frame's own rendered width*, not the viewport — this frame renders
 * at very different pixel sizes depending on context (inline review-page
 * preview vs. the full `PostcardZoom` modal), and viewport-based Tailwind
 * breakpoints (`sm:`, `lg:`) would be the wrong tool for that.
 */
export default function PostcardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative aspect-[9.25/6.25] w-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm @container">
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute border border-dashed border-red-400/70"
        style={{ inset: `${POSTCARD_TRIM_INSET_PERCENT.y}% ${POSTCARD_TRIM_INSET_PERCENT.x}%` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute border border-dotted border-blue-400/70"
        style={{ inset: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}% ${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}%` }}
      />
    </div>
  );
}
