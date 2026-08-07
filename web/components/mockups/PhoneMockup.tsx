export interface PhoneMockupProps {
  screenshotSrc?: string;
  screenshotAlt?: string;
  className?: string;
}

/**
 * A reusable, realistic phone device frame around a website screenshot —
 * thick bezel with a large modern corner radius, an inset screen that
 * never touches the outer edge, a top speaker slit + camera cutout, side
 * button highlights, and a soft shadow. See `LaptopMockup.tsx` (same
 * directory) for the full rationale behind the SVG-viewBox +
 * percentage-positioned-`<img>` technique and the `absolute inset-0
 * m-auto` sizing contract — this component follows the identical pattern.
 */

const CANVAS = { width: 406, height: 866 };

// Bezel: 400 wide, inset 3 from each side of the 406-wide canvas — that 3px
// margin is where the side buttons (drawn outside the bezel rect, inside
// the canvas) live.
const BEZEL = { x: 3, y: 0, width: 400, height: 866, rx: 48 };
const BEZEL_HIGHLIGHT = { x: 4, y: 1, width: 398, height: 864, rx: 47 };
// Screen: bezel inset by 14 on the sides and bottom, 22 on top (room for
// the speaker/camera row above it).
const SCREEN = { x: 17, y: 22, width: 372, height: 830 };
const SPEAKER = { x: 178, y: 9, width: 50, height: 5, rx: 2.5 };
const CAMERA = { cx: 243, cy: 11, r: 5 };
const LEFT_BUTTON_1 = { x: 0, y: 160, width: 3, height: 45, rx: 1.5 };
const LEFT_BUTTON_2 = { x: 0, y: 220, width: 3, height: 45, rx: 1.5 };
const RIGHT_BUTTON = { x: 403, y: 190, width: 3, height: 65, rx: 1.5 };

const SCREEN_PERCENT = {
  left: (SCREEN.x / CANVAS.width) * 100, // 4.19%
  top: (SCREEN.y / CANVAS.height) * 100, // 2.54%
  width: (SCREEN.width / CANVAS.width) * 100, // 91.63%
  height: (SCREEN.height / CANVAS.height) * 100, // 95.84%
};

// Matches the screen's own corner radius proportionally (36 of 406 wide ≈
// 8.9%, applied via CSS `border-radius` on the `<img>` wrapper — SVG `rx`
// and CSS `border-radius` percentages aren't the same coordinate system,
// but visually reading "a bit less rounded than the bezel" is what matters
// here, not an exact match).
const SCREEN_RADIUS_PERCENT = '9%';

export default function PhoneMockup({ screenshotSrc, screenshotAlt = 'Website preview (mobile)', className }: PhoneMockupProps) {
  return (
    <div className={`absolute inset-0 m-auto ${className ?? ''}`} style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}`, maxWidth: '100%', maxHeight: '100%' }}>
      <svg
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{ filter: 'drop-shadow(0 10px 18px rgba(11,30,61,0.3))' }}
        aria-hidden="true"
      >
        <rect {...BEZEL} fill="#0b0f19" />
        <rect {...BEZEL_HIGHLIGHT} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <rect {...SPEAKER} fill="#1f2937" />
        <circle {...CAMERA} fill="#1f2937" />
        <rect {...LEFT_BUTTON_1} fill="#1f2937" />
        <rect {...LEFT_BUTTON_2} fill="#1f2937" />
        <rect {...RIGHT_BUTTON} fill="#1f2937" />
      </svg>

      {screenshotSrc && (
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${SCREEN_PERCENT.left}%`,
            top: `${SCREEN_PERCENT.top}%`,
            width: `${SCREEN_PERCENT.width}%`,
            height: `${SCREEN_PERCENT.height}%`,
            borderRadius: SCREEN_RADIUS_PERCENT,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshotSrc} alt={screenshotAlt} className="h-full w-full object-cover object-top" />
        </div>
      )}
    </div>
  );
}
