import { POSTCARD_BLEED_INCHES, POSTCARD_BLEED_SIZE_INCHES, POSTCARD_SAFE_ZONE_INCHES } from './postcard-size';

const trimInsetXPercent = (POSTCARD_BLEED_INCHES / POSTCARD_BLEED_SIZE_INCHES.width) * 100;
const trimInsetYPercent = (POSTCARD_BLEED_INCHES / POSTCARD_BLEED_SIZE_INCHES.height) * 100;

const safeZoneInsetXPercent = ((POSTCARD_BLEED_INCHES + POSTCARD_SAFE_ZONE_INCHES) / POSTCARD_BLEED_SIZE_INCHES.width) * 100;
const safeZoneInsetYPercent = ((POSTCARD_BLEED_INCHES + POSTCARD_SAFE_ZONE_INCHES) / POSTCARD_BLEED_SIZE_INCHES.height) * 100;

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
 */
export default function PostcardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative aspect-[9.25/6.25] w-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute border border-dashed border-red-400/70"
        style={{ inset: `${trimInsetYPercent}% ${trimInsetXPercent}%` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute border border-dotted border-blue-400/70"
        style={{ inset: `${safeZoneInsetYPercent}% ${safeZoneInsetXPercent}%` }}
      />
    </div>
  );
}
