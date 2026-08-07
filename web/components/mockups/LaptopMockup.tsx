export interface LaptopMockupProps {
  screenshotSrc?: string;
  screenshotAlt?: string;
  className?: string;
}

/**
 * A reusable, realistic laptop device frame around a website screenshot —
 * dark bezel, camera cutout, bottom chin, a wider metallic base suggesting
 * perspective, and a soft shadow underneath. Built for the Stage 22
 * postcard (`web/app/admin/(dashboard)/postcards/`) but deliberately
 * generic (no postcard-specific props/state) so it can be reused anywhere
 * else in the app a "here's your website" visual is useful (landing pages,
 * dashboard previews, marketing pages).
 *
 * All coordinates are hand-derived in one flat SVG `viewBox` (`CANVAS`
 * below), with the screenshot placed as a plain `<img>` positioned by
 * percentages of that same viewBox — one auditable mapping, not a chain of
 * CSS `aspect-ratio`/flex computations. An earlier postcard-only version of
 * this idea built the bezel from CSS `border-width` instead and broke
 * twice from exactly that kind of chained-unit fragility.
 *
 * The root element is `position: absolute; inset: 0; margin: auto` with
 * `aspect-ratio` + `max-width`/`max-height: 100%` and no explicit width or
 * height — the CSS "contain" pattern for a fixed-ratio box that must never
 * overflow its parent. This requires `position: absolute` specifically: a
 * plain `position: relative` box with the same aspect-ratio/max-width/
 * max-height and no other sizing hint collapses to 0×0, because every
 * visible child here (the SVG, the screenshot) is itself `position:
 * absolute` and contributes nothing to normal-flow intrinsic sizing. The
 * caller's wrapper must be `position: relative` and itself sized (e.g. via
 * `flex-1` in a `min-h-0` column) for this to have something to contain
 * against.
 */

// Canvas height trimmed from 710→701 to match the shorter base below (664
// bezel + 37 base, no gap between them).
const CANVAS = { width: 1030, height: 701 };

// Bezel: 1000 wide (15 margin each side within the 1030 canvas, matching
// the base's own width below), 664 tall down to where the base begins.
const BEZEL = { x: 15, y: 0, width: 1000, height: 664, rx: 14 };
const BEZEL_HIGHLIGHT = { x: 16, y: 1, width: 998, height: 662, rx: 13 };
// Screen: bezel inset by 16 on the sides, 24 on top, leaving a 35-tall
// bottom chin (664 - 24 - 605 = 35) for the camera/branding dot below it.
const SCREEN = { x: 31, y: 24, width: 968, height: 605 };
const CAMERA = { cx: 515, cy: 12, r: 4 };
const CHIN_DOT = { cx: 515, cy: 646, r: 3 };
// Base: full canvas width again (1030, 15 wider than the bezel on each
// side) — briefly matched to the bezel's width in an earlier round
// (2026-08-07 feedback), but that was itself reverted the same day ("I was
// wrong... the gray area does need to stick out left and right relative to
// the edges of the monitor" — real laptops taper their keyboard deck wider
// than the screen). The 20% height reduction (46→37) stays.
const BASE = { x: 0, y: 664, width: 1030, height: 37, rx: 6 };
const BASE_NOTCH = { x: 475, y: 664, width: 80, height: 6, rx: 3 };

const SCREEN_PERCENT = {
  left: (SCREEN.x / CANVAS.width) * 100, // 3.01%
  top: (SCREEN.y / CANVAS.height) * 100, // 3.38%
  width: (SCREEN.width / CANVAS.width) * 100, // 93.98%
  height: (SCREEN.height / CANVAS.height) * 100, // 85.21%
};

export default function LaptopMockup({ screenshotSrc, screenshotAlt = 'Website preview', className }: LaptopMockupProps) {
  return (
    <div className={`absolute inset-0 m-auto ${className ?? ''}`} style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}`, maxWidth: '100%', maxHeight: '100%' }}>
      <svg
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{ filter: 'drop-shadow(0 14px 22px rgba(11,30,61,0.32))' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="laptop-base-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="55%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
        </defs>
        <rect {...BEZEL} fill="#0b0f19" />
        <rect {...BEZEL_HIGHLIGHT} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <circle {...CAMERA} fill="#1f2937" />
        <circle {...CHIN_DOT} fill="#1f2937" />
        <rect {...BASE} fill="url(#laptop-base-gradient)" />
        <rect {...BASE_NOTCH} fill="#4b5563" />
      </svg>

      {screenshotSrc && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${SCREEN_PERCENT.left}%`,
            top: `${SCREEN_PERCENT.top}%`,
            width: `${SCREEN_PERCENT.width}%`,
            height: `${SCREEN_PERCENT.height}%`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshotSrc} alt={screenshotAlt} className="h-full w-full object-cover object-top" />
        </div>
      )}
    </div>
  );
}
