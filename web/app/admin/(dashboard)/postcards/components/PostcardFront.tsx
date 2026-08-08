import { Caveat } from 'next/font/google';
import { Globe, Lock } from 'lucide-react';
import PostcardFrame from './PostcardFrame';
import PostcardFeatureRow from './PostcardFeatureRow';
import PostcardQrWithBadge from './PostcardQrWithBadge';
import LaptopMockup from '@/components/mockups/LaptopMockup';
import PhoneMockup from '@/components/mockups/PhoneMockup';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT, POSTCARD_BLEED_SIZE_INCHES } from './postcard-size';
import { POSTCARD_NAVY, POSTCARD_BLUE, POSTCARD_BLUE_LIGHT } from './postcard-colors';

const caveat = Caveat({ subsets: ['latin'], weight: '600' });

export interface PostcardFrontProps {
  businessName: string;
  beforeScreenshotSrc?: string;
  afterDesktopScreenshotSrc?: string;
  afterMobileScreenshotSrc?: string;
  /** Data URI (`data:image/png;base64,...`) of the recipient's tracked QR code. */
  qrDataUri?: string;
  /** Dash-grouped campaign code for the manual-entry fallback, e.g. `7X9K-2L4M-8N3P-7Q5R` (see `formatCampaignCodeForDisplay`). */
  accessCodeDisplay?: string;
}

// One shared alignment grid (2026-08-06 feedback, "improve alignment"):
// logo, headline, current-site card, and the footer QR all share this same
// left edge; the showcase column's right padding, the footer's right
// padding, and the banner's own text padding all target this same right
// edge — see each usage below for how it's applied.
const CONTENT_LEFT = `calc(${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw + 1cqw)`;
const CONTENT_RIGHT = `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`;

// 1 real inch, expressed as `cqw` — the card's full bleed width (9.25")
// maps to 100cqw, so 1" is this fraction of that. Used to place the footer's
// QR/URL blocks an exact physical distance off the OR divider (2026-08-07
// feedback), rather than an eyeballed cqw number.
const ONE_INCH_CQW = (1 / POSTCARD_BLEED_SIZE_INCHES.width) * 100;
const HALF_INCH_CQW = ONE_INCH_CQW / 2;
const EIGHTH_INCH_CQW = ONE_INCH_CQW / 8;
// 1/8 real inch, expressed as `cqh` — same idea, off the card's height
// (6.25") — used for the QR container's and the URL block's top offsets
// from the footer's own top edge. Was 1/4" (2026-08-07 feedback); revised
// down to 1/8" in the same round ("ignore my restriction about 1/4"... make
// that 1/8" from the top edge").
const BANNER_TOP_INSET_CQH = (0.125 / POSTCARD_BLEED_SIZE_INCHES.height) * 100;
const HALF_INCH_CQH = (0.5 / POSTCARD_BLEED_SIZE_INCHES.height) * 100;
const QUARTER_INCH_CQH = (0.25 / POSTCARD_BLEED_SIZE_INCHES.height) * 100;
const FOOTER_HEIGHT_CQH = 23;
// Where the OR divider's center sits, as a % of the card's full width. Was
// 33%, then 40% (2026-08-07 feedback), then 38% the next day ("move OR
// divider left... 38 instead of 40").
const OR_DIVIDER_LEFT_CQW = 38;
// QR container width. Was 13.5cqw — looked fine by eye, but `cqw` and
// `cqh` are NOT the same physical length here (the card is 9.25"×6.25", so
// 1cqw of pixel length ≈ 1.48cqh of pixel length): a 13.5cqw-wide
// aspect-square box is actually ~20cqh tall, not ~13.5cqh, which pushed its
// bottom edge past the footer's bottom safe-zone line (2026-08-07
// feedback: "bottom of the QR Code is outside the blue safe area").
// Re-derived from the real constraint instead of guessing: top offset is
// `BANNER_TOP_INSET_CQH`, the safe line sits `POSTCARD_SAFE_ZONE_INSET_PERCENT.y`
// above the footer's bottom, so max height in cqh is
// `FOOTER_HEIGHT_CQH - BANNER_TOP_INSET_CQH - safeInset`, converted back to
// cqw by dividing by the 1.48 aspect factor, minus a safety margin.
const CARD_ASPECT_W_OVER_H = POSTCARD_BLEED_SIZE_INCHES.width / POSTCARD_BLEED_SIZE_INCHES.height;
const QR_CONTAINER_CQW = (FOOTER_HEIGHT_CQH - BANNER_TOP_INSET_CQH - POSTCARD_SAFE_ZONE_INSET_PERCENT.y - 1) / CARD_ASPECT_W_OVER_H;

const DOT_GRID_STYLE = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
  backgroundSize: '0.6cqw 0.6cqw',
};

/**
 * A hand-drawn-style curved arrow (quadratic curve + chevron head),
 * matching the "Scan Me!" corner-arrow's informal, marketing-sketch feel —
 * aimed up and to the right, toward the laptop, not straight across.
 */
function CurvedArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 70" fill="none" className={className} aria-hidden="true">
      <path d="M4 58 Q 48 4 94 20" stroke={POSTCARD_BLUE} strokeWidth="10" strokeLinecap="round" />
      <path d="M74 4 L96 20 L80 42" stroke={POSTCARD_BLUE} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/**
 * White version of the same hand-drawn-arrow idea, curving down and to the
 * right — sits under "Scan Me!" pointing into the QR code (2026-08-07
 * feedback, matching the reference postcard's footer treatment).
 */
function ScanMeArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 60" fill="none" className={className} aria-hidden="true">
      <path d="M8 6 Q 16 52 92 42" stroke="white" strokeWidth="9" strokeLinecap="round" />
      <path d="M66 26 L96 42 L74 58" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/**
 * The standardized Webpresa postcard front (Stage 22) — one fixed layout,
 * dynamically populated from business data. This is a composition, not
 * just a component tree: the website mockup (via the reusable
 * `LaptopMockup`/`PhoneMockup` from `web/components/mockups/`, not a
 * postcard-only implementation) is the visual centerpiece — the showcase
 * column is deliberately the widest region on the card, and the headline,
 * QR code, and URL are the only other elements sized to compete with it
 * for attention. Everything else (labels, the banner, the "current site"
 * card) is supporting material.
 *
 * Two layers, matching real print bleed practice: decorative background
 * elements (the diagonal banner, the footer band) span the full bleed
 * canvas edge-to-edge; everything else respects `CONTENT_LEFT`/
 * `CONTENT_RIGHT` so it never approaches the trim/cut line (see
 * `PostcardFrame`'s guide overlays and `postcard-size.ts`).
 */
export default function PostcardFront({
  businessName,
  beforeScreenshotSrc,
  afterDesktopScreenshotSrc,
  afterMobileScreenshotSrc,
  qrDataUri,
  accessCodeDisplay,
}: PostcardFrontProps) {
  return (
    <PostcardFrame>
      <div className="relative flex h-full flex-col bg-white">
        {/* Header — wordmark only now. The feature row moved out of this
            flex row entirely (2026-08-08 feedback: center it on the
            desktop display's own horizontal center, not on the header
            row) — its target position, measured directly in-browser, falls
            below this row's own 9cqh height, so it's an absolutely
            positioned sibling of this row instead (see below), not nested
            inside it. */}
        <div className="flex items-start" style={{ height: '9cqh' }}>
          {/* items-start + explicit paddingTop: the logo must clear the
              safe-zone line from the top, same as every other content edge
              (2026-08-06 feedback: "logo is out of the safe area"). Using
              `webpresa_logo_horizontal_cropped_nobg.png` (2026-08-07
              feedback) instead of the square mark — a proper wide wordmark
              crop, sized by height with `w-auto` so its real aspect ratio
              (1460×238) is preserved. */}
          <div className="flex items-start" style={{ paddingLeft: CONTENT_LEFT, paddingTop: `calc(${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh + 0.4cqh)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webpresa_logo_horizontal_cropped_nobg.png" alt="Webpresa" className="h-[3.2cqh] w-auto" />
          </div>
        </div>

        {/* Feature row: horizontally centered on the desktop display's own
            center (67.23cqw from the card's left edge, measured — not the
            card's or header row's center). Vertical position history, all
            2026-08-08: started centered in the gap between the top
            safe-zone line (4cqh) and the laptop's own top edge (top:
            7.84cqh, equal gaps above/below); moved up 1/4" (`QUARTER_INCH_CQH`
            = 4cqh) to 3.84cqh ("move their position up by 1/4""); that was
            "too much", so moved back down by half of that move (2cqh) to
            `5.84cqh` ("move down by 50% of what you moved up") — no longer
            centered in the original gap. The 67.23/starting-7.84 baseline
            numbers come from this specific fixed layout (column widths,
            canvas aspect ratios) which doesn't vary per business, so
            they're safe to hardcode rather than compute from CSS at
            render time. */}
        <div className="absolute" style={{ left: '67.23cqw', top: '5.84cqh', transform: 'translateX(-50%)' }}>
          <PostcardFeatureRow />
        </div>

        {/* Main content — min-h-0 throughout: these are flex children whose
            height must come from the flex layout, not their own content —
            flex items default to min-height:auto, which otherwise lets
            content force a taller box than its share of the row. Showcase
            column is 65% of the width (up from an earlier 54–58%, and from
            62% once the separate 3%-wide arrow column was folded into the
            current-site card itself — 2026-08-07 feedback) — the
            website is the product being sold here, so it gets the most
            space on the card, not the headline. */}
        <div className="flex min-h-0 flex-1 gap-[1.2cqw]" style={{ paddingLeft: CONTENT_LEFT, paddingRight: CONTENT_RIGHT }}>
          {/* gap must exceed the "YOUR CURRENT SITE" badge's upward offset
              (-top-[1.6cqh] below) — otherwise the badge, which pokes above
              its own card, overlaps the headline box regardless of how
              well the headline text itself fits its share. */}
          <div className="flex min-h-0 w-[35%] flex-col gap-[2.2cqh]">
            {/* Headline's share reduced (52%→44%) and the card's grown
                (30%→38%) — the old-site preview was getting starved of
                height and rendering cut off (2026-08-06 feedback: "old
                preview should always be displayed"). The headline is the
                one that should flex to fit what's left, not the preview. */}
            {/* items-center (unchanged) + text-left (2026-08-07 feedback:
                "left justified... left edge should be where the second we
                currently sits"): `items-center` on this column still
                shrink-wraps the `h1`'s own box to its widest line ("We
                already", per a direct measurement — 110px wide vs. the
                other three lines' 84–106px) and centers *that* box in the
                column — unchanged from the centered version. Switching
                only the `h1`'s own `text-align` to `left` then left-aligns
                every line within that already-positioned box, so they all
                start exactly where "We already" (the widest line) already
                sat under full centering — achieving the requested result
                with no manual offset math needed. */}
            <div className="flex min-h-0 flex-[0_0_44%] flex-col items-center justify-center">
              <h1 className="text-left text-[3.9cqw] font-black tracking-tight" style={{ lineHeight: 1.05 }}>
                <span className="block" style={{ color: POSTCARD_NAVY }}>
                  Websites
                </span>
                <span className="block" style={{ color: POSTCARD_NAVY }}>
                  are hard.
                </span>
                <span className="mt-[0.6cqh] block" style={{ color: POSTCARD_BLUE }}>
                  We already
                </span>
                <span className="block" style={{ color: POSTCARD_BLUE }}>
                  built yours.
                </span>
              </h1>
            </div>

            <div className="relative min-h-0 flex-[0_0_38%]">
              <span className="absolute -top-[1.6cqh] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900 px-[1.4cqw] py-[0.5cqh] text-[1.1cqw] font-bold text-white shadow-sm">
                YOUR CURRENT SITE
              </span>
              {/* Solid theme-blue "mat" frame around the preview
                  (2026-08-09 feedback: "a very opaque theme blue
                  background around the current site preview") — a fully
                  opaque fill, not a light tint, with the existing
                  white/gray card inset inside it via padding.
                  `POSTCARD_NAVY`, not `POSTCARD_BLUE`: the lighter blue
                  was "too light" the same day. */}
              <div className="h-full w-full overflow-hidden rounded-2xl p-[0.6cqw] shadow-[0_3px_10px_rgba(11,30,61,0.08)]" style={{ backgroundColor: POSTCARD_NAVY }}>
                {/* No `pt-` here (there used to be one, to clear room for
                    the "YOUR CURRENT SITE" badge poking above): once the
                    navy mat frame was added, that padding left a visible
                    white gap between the mat's inner edge and the preview
                    itself (2026-08-09 feedback). The badge has its own
                    opaque background and `z-10`, so it stays legible
                    sitting directly on top of the preview without it. */}
                <div className="h-full w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {beforeScreenshotSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={beforeScreenshotSrc} alt={`${businessName}'s previous website`} className="h-full w-full object-cover object-top" />
                  ) : (
                    <p className="p-[1cqw] text-center text-[1.3cqw] text-gray-400">No existing-site screenshot yet</p>
                  )}
                </div>
              </div>
              {/* Nested inside the card itself (not a separate flex column
                  spanning the whole row, as before) and positioned `top:
                  20%` of *this card's own* height, per 2026-08-07 feedback
                  ("20% of the way down from the top of the current preview
                  display to the bottom") — the old column-based placement
                  tracked the row's full height, not the card's. */}
              {/* 20% smaller (h/w 5/7cqw → 4/5.6cqw) and pushed further
                  right so its tip sits closer to the desktop display
                  (2026-08-08 feedback: "arrow... is too large... move more
                  to the right"). */}
              <div className="absolute z-10" style={{ top: '20%', right: '-4cqw' }}>
                <CurvedArrow className="h-[4cqw] w-[5.6cqw]" />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 w-[65%] flex-col items-center">
            {/* `relative`: LaptopMockup/PhoneMockup roots are `absolute
                inset-0 m-auto` — each needs a positioned, sized ancestor
                to contain against. The inner div below is deliberately
                sized to the *same* aspect ratio as LaptopMockup's own
                internal canvas (1030/701) — since the ratios match exactly,
                LaptopMockup fills it at `maxWidth`/`maxHeight` (86.25% —
                75% shrunk the prior round, then grown 15% per 2026-08-07
                feedback: "I was wrong on reducing the size... increase by
                15%") with no letterboxing, so this div's box is a reliable
                stand-in for "the laptop's own
                rendered bounding box" (whose bottom edge is always the
                laptop's base, by construction — see LaptopMockup.tsx). The
                phone's box is positioned `bottom: 0%` against *that*, not
                the looser outer flex-1 container, so its position is
                reliable regardless of how much letterboxing the outer
                container would otherwise cause. The "YOUR NEW WEBSITE"
                badge is nested in here too (not a flex sibling above, per
                the old layout) and positioned `top-0` with a `-50%`
                translateY, so its own vertical center sits exactly on the
                laptop's top edge and it visually overlays the laptop
                rather than pushing it down (2026-08-07 feedback). */}
            <div className="relative min-h-0 w-full flex-1">
              <div className="absolute inset-0 m-auto" style={{ aspectRatio: '1030 / 701', maxWidth: '86.25%', maxHeight: '86.25%' }}>
                <LaptopMockup screenshotSrc={afterDesktopScreenshotSrc} screenshotAlt={`${businessName}'s new website`} />
                <span
                  className="absolute left-1/2 top-0 z-10 w-fit -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-[1.6cqw] py-[0.6cqh] text-[1.1cqw] font-extrabold text-white shadow-[0_4px_14px_rgba(0,72,170,0.4)]"
                  style={{ background: `linear-gradient(135deg, ${POSTCARD_BLUE_LIGHT}, ${POSTCARD_BLUE})` }}
                >
                  YOUR NEW WEBSITE
                </span>
                {afterMobileScreenshotSrc && (
                  // `right`/`bottom` here are % of *this wrapper's* own box
                  // (= the laptop's exact rendered box, per the comment
                  // above), not the card.
                  // right: -13.88% puts the phone's own *right edge* at the
                  // midpoint between the laptop's right edge and the card's
                  // right safe-zone line — but NOT via the straightforward
                  // math (-4.09%, i.e. containing-block-right-edge +
                  // 4.09% of its width). That value was tried, measured
                  // in-browser, and landed ~45px short: this wrapper is
                  // absolutely positioned + auto-sized via aspect-ratio +
                  // max-width/max-height (the "contain" pattern used
                  // throughout these mockups), and percentage resolution
                  // for *its own children* doesn't reliably match its
                  // rendered box in every engine — a real discrepancy, not
                  // a units mixup like the earlier QR one. -13.88% was
                  // reached by measuring `right:0%` and `right:-4.09%`
                  // directly (two points, since the relationship is still
                  // linear — same slope as the wrapper's own width, just a
                  // different baseline) and solving for the value that
                  // actually lands on the midpoint; verified to land within
                  // 0.01px. (A same-day revision briefly tried -24.09%,
                  // i.e. the phone's *center* at the midpoint instead of
                  // its right edge, but that was corrected right back:
                  // "you moved the phone too far to the right... once
                  // again the right edge... should be halfway".)
                  // bottom: -7.68% is 0.25" below the laptop's bottom
                  // (reduced from an initial 0.5" — "raise the mobile
                  // phone so it is only 1/4" below") — this axis matched
                  // the straightforward math exactly (measured 23.98px
                  // against a target of 24px), so only `right` needed
                  // empirical calibration.
                  <div className="absolute" style={{ width: '40%', height: '64%', right: '-13.88%', bottom: '-7.68%' }}>
                    <PhoneMockup screenshotSrc={afterMobileScreenshotSrc} screenshotAlt={`${businessName}'s new website (mobile)`} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA — full-bleed band, fixed at `FOOTER_HEIGHT_CQH`% of
            the card's height. The OR divider sits at `OR_DIVIDER_LEFT_CQW`
            (33%) from the left edge, not centered (2026-08-07 feedback);
            the QR and URL/access-code blocks are positioned an exact half
            inch (`HALF_INCH_CQW`) off *that* on each side, rather than off
            the card's center. */}
        <div
          className="relative mt-auto shrink-0 overflow-hidden"
          style={{
            height: `${FOOTER_HEIGHT_CQH}cqh`,
            background: `radial-gradient(ellipse at center, ${POSTCARD_BLUE} 0%, ${POSTCARD_NAVY} 78%)`,
          }}
        >
          {/* Decorative dot-grid texture, both far corners — no image asset needed. */}
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-[13cqw] w-[13cqw] opacity-25" style={DOT_GRID_STYLE} />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[13cqw] w-[13cqw] rotate-180 opacity-25" style={DOT_GRID_STYLE} />
          {/* Soft center glow. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[24cqw] w-[24cqw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}
          />

          {/* QR container: top edge lands `BANNER_TOP_INSET_CQH` below the
              footer's top edge, sized via `QR_CONTAINER_CQW` — re-derived
              (see the constant's own comment) after the bottom edge was
              found overflowing the safe zone: `cqw` and `cqh` aren't the
              same physical length on a 9.25"×6.25" card, so a
              13.5cqw-*wide* aspect-square box was actually ~20cqh *tall*.
              The extra `EIGHTH_INCH_CQW` in `right` moves it 1/8" further
              left of its QR/OR-relative position (2026-08-09 feedback). */}
          <div className="absolute" style={{ top: `${BANNER_TOP_INSET_CQH}cqh`, right: `calc(${100 - OR_DIVIDER_LEFT_CQW}cqw + ${HALF_INCH_CQW}cqw + ${EIGHTH_INCH_CQW}cqw)`, width: `${QR_CONTAINER_CQW}cqw` }}>
            <PostcardQrWithBadge qrDataUri={qrDataUri} />
          </div>

          {/* "Scan Me!" + a white curved arrow underneath pointing into the
              QR. Shifted 1/2" left and 1/2" down from its QR-top-aligned
              position (2026-08-08 feedback), then 1/4" back *up* the same
              day ("move scan me and accompanying arrow up 1/4""), net
              `HALF_INCH_CQH - QUARTER_INCH_CQH` down from the QR's own top.
              Font 20% larger (2.2cqw→2.64cqw) per the same message. The
              same `EIGHTH_INCH_CQW` the QR container got is added here too
              (2026-08-09), so this stays attached to the QR's left edge
              rather than drifting apart from it. */}
          <div
            className="absolute flex flex-col items-end"
            style={{
              top: `calc(${BANNER_TOP_INSET_CQH}cqh + ${HALF_INCH_CQH}cqh - ${QUARTER_INCH_CQH}cqh)`,
              right: `calc(${100 - OR_DIVIDER_LEFT_CQW}cqw + ${HALF_INCH_CQW}cqw + ${EIGHTH_INCH_CQW}cqw + ${QR_CONTAINER_CQW}cqw + 1cqw + ${HALF_INCH_CQW}cqw)`,
              width: '9cqw',
            }}
          >
            <p className={`${caveat.className} text-right text-[2.64cqw] leading-[0.95] text-white`}>Scan Me!</p>
            <ScanMeArrow className="mt-[0.25cqh] h-[2.52cqw] w-[4.56cqw]" />
          </div>

          {/* OR divider: moved off-center — 33%, then 40% (2026-08-07
              feedback), then 38% the next day — font sized up. */}
          <div
            className="absolute flex h-[70%] w-[4.5cqw] items-center justify-center"
            style={{ top: '50%', left: `${OR_DIVIDER_LEFT_CQW}cqw`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/35" />
            <span
              className="relative flex h-[4.4cqw] w-[4.4cqw] shrink-0 items-center justify-center rounded-full bg-white text-[2cqw] font-extrabold shadow-[0_3px_8px_rgba(0,0,0,0.25)]"
              style={{ color: POSTCARD_BLUE }}
            >
              OR
            </span>
          </div>

          {/* Left edge sits `OR_DIVIDER_LEFT_CQW + 1"` from the footer's
              left edge (was 0.5" — 2026-08-08 feedback: "make it 1""), and
              top edge (not vertically centered) sits `BANNER_TOP_INSET_CQH`
              below the footer's top — the same line the QR container's own
              top sits on. Font sizes grown back up from an earlier round's
              safety-margin values now that a fixed top offset (rather than
              vertical centering) makes the remaining headroom to the
              bottom safe-zone line predictable — verified by screenshot
              against the safe-zone guide line, not just computed. */}
          <div
            className="absolute flex flex-col items-start gap-[0.6cqh]"
            style={{ top: `${BANNER_TOP_INSET_CQH}cqh`, left: `calc(${OR_DIVIDER_LEFT_CQW}cqw + ${ONE_INCH_CQW}cqw)` }}
          >
            <div className="flex items-center gap-[0.9cqw]">
              <span className="flex h-[2.6cqw] w-[2.6cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                <Globe className="h-[1.4cqw] w-[1.4cqw] text-white" />
              </span>
              <div>
                <p className="text-[1.05cqw] font-bold tracking-wide text-white">
                  GO TO:
                </p>
                <p className="text-[2.6cqw] font-bold leading-tight text-white">webpresa.com/access</p>
              </div>
            </div>
            <div className="h-px w-full bg-white/25" />
            <div className="flex items-center gap-[0.9cqw]">
              <span className="flex h-[2.6cqw] w-[2.6cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                <Lock className="h-[1.4cqw] w-[1.4cqw] text-white" />
              </span>
              <div>
                <p className="text-[1.05cqw] font-bold tracking-wide text-white">
                  ENTER YOUR ACCESS CODE:
                </p>
                {accessCodeDisplay && (
                  <span className="mt-[0.2cqh] inline-block rounded-lg bg-white px-[1cqw] py-[0.2cqh] font-mono text-[2.1cqw] font-bold tracking-widest text-gray-900 shadow-[0_3px_8px_rgba(0,0,0,0.15)]">
                    {accessCodeDisplay}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PostcardFrame>
  );
}
