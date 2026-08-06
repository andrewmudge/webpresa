export interface PostcardDeviceMockupProps {
  desktopSrc?: string;
  mobileSrc?: string;
}

/**
 * Laptop + phone device mockup for the postcard's "after" website
 * screenshot.
 *
 * Rebuilt (2026-08-06) from a CSS `border-width` bezel sized through a
 * chained `aspect-ratio`/`flex-1`/`cqh` computation — that chain broke
 * twice (the mockup overflowed its row and covered the header) because it
 * was too hard to verify by reading the code alone. This version instead
 * hand-derives fixed coordinates in one flat SVG `viewBox` and places the
 * real screenshots as plain `<img>` elements positioned by percentages of
 * that same viewBox — one clean, auditable mapping instead of several
 * nested unit systems compounding each other.
 *
 * `VIEWBOX` below is the single source of truth: every other number here
 * (bezel rects drawn by the SVG, and the `SCREEN`/`PHONE_SCREEN` percentage
 * boxes the `<img>`s use) is derived from it by hand and shown in a
 * comment next to its own value, so the arithmetic can be checked without
 * running anything.
 */

const VIEWBOX = { width: 920, height: 790 };

// Laptop outer bezel: x=0 y=0 w=880 h=561 (screen 852×532.5 inset 14 on
// top/left/right/bottom, i.e. 16:10 screen ratio) + a 20-tall stand bar
// directly below it.
const LAPTOP_BEZEL = { x: 0, y: 0, width: 880, height: 561, rx: 10 };
const LAPTOP_STAND = { x: 0, y: 561, width: 880, height: 20, rx: 4 };
const LAPTOP_STAND_NOTCH = { x: 400, y: 561, width: 80, height: 6, rx: 3 };
// Screen = bezel inset by 14 on every side: (14,14) to (866,546.5).
const LAPTOP_SCREEN_PERCENT = {
  left: (14 / VIEWBOX.width) * 100, // 1.52%
  top: (14 / VIEWBOX.height) * 100, // 1.77%
  width: (852 / VIEWBOX.width) * 100, // 92.61%
  height: (532.5 / VIEWBOX.height) * 100, // 67.41%
};

// Phone outer bezel: positioned overlapping the laptop's bottom-right
// corner — top-left at (660,230), 260 wide × 560 tall (~9:19.5 portrait).
const PHONE_BEZEL = { x: 660, y: 230, width: 260, height: 560, rx: 24 };
// Screen = bezel inset by 20 on every side: (680,250) to (900,770). Wider
// than the laptop's proportional inset on purpose — at 8 units (the first
// version of this component) the resulting border was only ~0.9% of the
// whole mockup's width and read as "not there" once actually rendered.
const PHONE_SCREEN_PERCENT = {
  left: (680 / VIEWBOX.width) * 100, // 73.91%
  top: (250 / VIEWBOX.height) * 100, // 31.65%
  width: (220 / VIEWBOX.width) * 100, // 23.91%
  height: (520 / VIEWBOX.height) * 100, // 65.82%
};

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
    // column). This needs `position: absolute` specifically: a previous
    // version used a plain `position: relative` box with the same
    // aspect-ratio/max-width/max-height and nothing else, which collapsed
    // to 0×0 and stopped rendering entirely — every visible child here
    // (the SVG, the screenshots) is itself `absolute`, so a `relative`
    // parent has no normal-flow content to derive an intrinsic size from.
    // An absolutely-positioned box with `inset: 0` DOES have a defined
    // containing block to size itself against, which is what makes the
    // aspect-ratio + max-width/max-height "shrink to fit both axes"
    // computation actually resolve to something instead of nothing.
    <div className="absolute inset-0 m-auto" style={{ aspectRatio: `${VIEWBOX.width} / ${VIEWBOX.height}`, maxWidth: '100%', maxHeight: '100%' }}>
      {/* Bezels — painted first, behind the screenshots. */}
      <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {desktopSrc && (
          <>
            <rect {...LAPTOP_BEZEL} fill="#111827" />
            <rect {...LAPTOP_STAND} fill="#d1d5db" />
            <rect {...LAPTOP_STAND_NOTCH} fill="#9ca3af" />
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
