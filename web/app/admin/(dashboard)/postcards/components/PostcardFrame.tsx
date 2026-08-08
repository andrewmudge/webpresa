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
 * `[container-type:size]` lets `PostcardFront`'s content size itself with
 * `cqw`/`cqh` units relative to *this frame's own rendered width and
 * height*, not the viewport — this frame renders at very different pixel
 * sizes depending on context (inline review-page preview vs. the full
 * `PostcardZoom` modal), and viewport-based Tailwind breakpoints (`sm:`,
 * `lg:`) would be the wrong tool for that.
 *
 * Deliberately `size` (both axes), not Tailwind's `@container` utility
 * (`container-type: inline-size`, width only) — `cqh` needs block-axis
 * containment too, which `inline-size` doesn't provide. Every `cqh` value
 * across the postcard components (footer height, gaps, offsets) was
 * silently resolving against something other than this card for as long as
 * this was `inline-size`-only (2026-08-06 — found while debugging the
 * footer rendering far too tall and content overflowing behind it: `cqw`
 * values were fine throughout every round, `cqh` values were never
 * actually measuring the card). Safe to set `size` here specifically since
 * it requires the container's own size to come from *outside* its content
 * to avoid a circular dependency, which already holds — this element's
 * size comes from `w-full` + `aspect-[9.25/6.25]`, never its children.
 */
export interface PostcardFrameProps {
  children: React.ReactNode;
  /**
   * Whether to draw the trim/safe-zone guide overlays *and* the preview-only
   * card chrome (rounded corners, border, drop shadow — none of which are
   * artwork either, just screen presentation for a card sitting on a white
   * admin page). Default `true` (the admin preview/zoom use). The Stage 22
   * Phase 2 internal render pages
   * (`/internal/postcards/[postcardId]/render/[side]`) — the ones the
   * postcard-render Lambda actually turns into the print PDF handed to Lob
   * — pass `false`: none of this may appear on the physical postcard.
   */
  showGuides?: boolean;
}

export default function PostcardFrame({ children, showGuides = true }: PostcardFrameProps) {
  return (
    <div
      className={`relative aspect-[9.25/6.25] w-full overflow-hidden bg-white [container-type:size] ${
        showGuides ? 'rounded-lg border border-gray-300 shadow-sm' : ''
      }`}
    >
      {children}
      {showGuides && (
        <>
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
        </>
      )}
    </div>
  );
}
