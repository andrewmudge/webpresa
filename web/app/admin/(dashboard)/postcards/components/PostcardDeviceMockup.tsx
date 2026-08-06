export interface PostcardDeviceMockupProps {
  desktopSrc?: string;
  mobileSrc?: string;
}

/**
 * Laptop + phone device mockup for the postcard's "after" website
 * screenshot.
 *
 * Coordinates are hand-derived in one flat SVG `viewBox` and the real
 * screenshots are placed as plain `<img>` elements positioned by
 * percentages of that same viewBox — one clean, auditable mapping instead
 * of several nested unit systems compounding each other (an earlier CSS
 * `border-width`-bezel version broke twice for exactly that reason — see
 * git history for 2026-08-06).
 *
 * `VIEWBOX` is the single source of truth: every other number here is
 * derived from it by hand and shown in a comment next to its own value.
 */

const VIEWBOX = { width: 970, height: 965 };

// Laptop outer bezel: x=0 y=0 w=880 h=565 (screen 840×525 inset 20 on
// every side, i.e. 16:10 screen ratio) + a 24-tall "metallic" stand bar
// directly below it (filled with a gradient, not a flat color, for the
// "subtle metallic bottom edge" — see `STAND_GRADIENT_ID`).
const LAPTOP_BEZEL = { x: 0, y: 0, width: 880, height: 565, rx: 14 };
const LAPTOP_STAND = { x: 0, y: 565, width: 880, height: 24, rx: 5 };
const LAPTOP_STAND_NOTCH = { x: 400, y: 565, width: 80, height: 7, rx: 3 };
// Screen = bezel inset by 20 on every side: (20,20) to (860,545).
const LAPTOP_SCREEN_PERCENT = {
  left: (20 / VIEWBOX.width) * 100, // 2.06%
  top: (20 / VIEWBOX.height) * 100, // 2.07%
  width: (840 / VIEWBOX.width) * 100, // 86.60%
  height: (525 / VIEWBOX.height) * 100, // 54.40%
};

// Phone outer bezel: positioned overlapping the laptop's bottom-right
// corner — top-left at (621,224), 338 wide × 728 tall (~30% bigger than
// the previous 260×560, per 2026-08-06 feedback, still ~9:19.5 portrait).
const PHONE_BEZEL = { x: 621, y: 224, width: 338, height: 728, rx: 30 };
// Screen = bezel inset by 22 on every side: (643,246) to (937,930).
const PHONE_SCREEN_PERCENT = {
  left: (643 / VIEWBOX.width) * 100, // 66.29%
  top: (246 / VIEWBOX.height) * 100, // 25.49%
  width: (294 / VIEWBOX.width) * 100, // 30.31%
  height: (684 / VIEWBOX.height) * 100, // 70.88%
};

const STAND_GRADIENT_ID = 'postcard-laptop-stand-gradient';

export default function PostcardDeviceMockup({ desktopSrc, mobileSrc }: PostcardDeviceMockupProps) {
  if (!desktopSrc && !mobileSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <p className="p-4 text-center text-sm text-gray-400">No generated-preview screenshot captured yet</p>
      </div>
    );
  }

  return (
    // `position: absolute` + `inset: 0` + `margin: auto`, with
    // `aspectRatio` and `maxWidth`/`maxHeight: 100%` but no explicit width
    // or height — the standard CSS "contain" pattern for a fixed-ratio box
    // that must never overflow either axis of its parent (which must be
    // `position: relative` and sized — see `PostcardFront.tsx`'s right
    // column). This needs `position: absolute` specifically: a plain
    // `position: relative` box with the same aspect-ratio/max-width/
    // max-height and nothing else collapses to 0×0 and stops rendering
    // entirely — every visible child here (the SVG, the screenshots) is
    // itself `absolute`, so a `relative` parent has no normal-flow content
    // to derive an intrinsic size from. An absolutely-positioned box with
    // `inset: 0` DOES have a defined containing block to size against,
    // which is what makes the "shrink to fit both axes" computation
    // actually resolve to something instead of nothing.
    <div className="absolute inset-0 m-auto" style={{ aspectRatio: `${VIEWBOX.width} / ${VIEWBOX.height}`, maxWidth: '100%', maxHeight: '100%' }}>
      {/* Bezels — painted first, behind the screenshots. Soft drop-shadow
          on the whole SVG (not per-shape box-shadow) so both the laptop
          and phone silhouettes get a shadow that follows their actual
          shape, not their bounding box. */}
      <svg
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{ filter: 'drop-shadow(0 8px 16px rgba(11,30,61,0.28))' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={STAND_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="55%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
        </defs>
        {desktopSrc && (
          <>
            <rect {...LAPTOP_BEZEL} fill="#111827" />
            <rect {...LAPTOP_STAND} fill={`url(#${STAND_GRADIENT_ID})`} />
            <rect {...LAPTOP_STAND_NOTCH} fill="#4b5563" />
          </>
        )}
        {mobileSrc && <rect {...PHONE_BEZEL} fill="#111827" />}
      </svg>

      {/* Screenshots — plain <img>s positioned at the same coordinates the
          SVG bezels above were drawn from, converted to percentages. */}
      {desktopSrc && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${LAPTOP_SCREEN_PERCENT.left}%`,
            top: `${LAPTOP_SCREEN_PERCENT.top}%`,
            width: `${LAPTOP_SCREEN_PERCENT.width}%`,
            height: `${LAPTOP_SCREEN_PERCENT.height}%`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={desktopSrc} alt="The new website" className="h-full w-full object-cover object-top" />
        </div>
      )}

      {mobileSrc && (
        <div
          className="absolute overflow-hidden rounded-[8%]"
          style={{
            left: `${PHONE_SCREEN_PERCENT.left}%`,
            top: `${PHONE_SCREEN_PERCENT.top}%`,
            width: `${PHONE_SCREEN_PERCENT.width}%`,
            height: `${PHONE_SCREEN_PERCENT.height}%`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mobileSrc} alt={desktopSrc ? '' : 'The new website (mobile)'} className="h-full w-full object-cover object-top" />
        </div>
      )}
    </div>
  );
}
