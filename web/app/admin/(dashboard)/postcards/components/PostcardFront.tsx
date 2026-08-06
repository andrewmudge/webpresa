import { Caveat } from 'next/font/google';
import { Globe, Lock, CornerDownRight } from 'lucide-react';
import PostcardFrame from './PostcardFrame';
import PostcardDeviceMockup from './PostcardDeviceMockup';
import PostcardDiagonalBanner from './PostcardDiagonalBanner';
import PostcardQrWithBadge from './PostcardQrWithBadge';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT } from './postcard-size';
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

const safeZonePadding = {
  paddingLeft: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`,
  paddingRight: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`,
  paddingTop: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh`,
  paddingBottom: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh`,
};

const DOT_GRID_STYLE = {
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
  backgroundSize: '0.6cqw 0.6cqw',
};

/**
 * A hand-drawn-style curved arrow (quadratic curve + chevron head),
 * matching the "Scan Me!" corner-arrow's informal, marketing-sketch feel —
 * used in place of a plain straight `ArrowRight` for the before→after
 * connector.
 */
function CurvedArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 60" fill="none" className={className} aria-hidden="true">
      <path d="M4 46 Q 46 4 92 22" stroke={POSTCARD_BLUE} strokeWidth="9" strokeLinecap="round" />
      <path d="M74 8 L94 22 L78 42" stroke={POSTCARD_BLUE} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/**
 * The standardized Webpresa postcard front (Stage 22) — one fixed layout,
 * dynamically populated from business data: generic hero headline (no
 * business-name interpolation), a diagonal "Modern. Mobile Friendly. Built
 * to Convert." banner, a current-site thumbnail → arrow → laptop/phone
 * mockup of the new site, and a dark CTA footer offering two paths — scan
 * the QR, or go to `webpresa.com/access` and enter the printed access code
 * — both resolving to the same real `CampaignRecipient`/campaign-code
 * mechanism from Stage 21.
 *
 * Two layers, matching real print bleed practice: decorative background
 * elements (the diagonal banner, the footer band) span the full bleed
 * canvas edge-to-edge; everything else sits inside `safeZonePadding` so it
 * never approaches the trim/cut line (see `PostcardFrame`'s guide overlays
 * and `postcard-size.ts`).
 *
 * Proportions (2026-08-06 feedback, reference-matched): left content ≈39%
 * width, showcase ≈58% width, footer band ≈28% of the card's height
 * (`height: 28cqh` — exact, since `cqh` is 1% of `PostcardFrame`'s own
 * height).
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
      <div className="flex h-full flex-col bg-white">
        {/* Header — full-bleed row: wordmark (safe-zone padded, plus extra
            margin so it clears the dotted guide with room to spare) +
            diagonal banner (edge-to-edge, touches the top and right bleed
            via `justify-between` on this row). */}
        <div className="flex items-stretch justify-between">
          <div
            className="flex items-center pb-[1.8cqh] pt-[2.6cqh]"
            style={{ paddingLeft: `calc(${safeZonePadding.paddingLeft} + 1.5cqw)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webpresa_logo.png" alt="Webpresa" className="w-[16cqw]" />
          </div>
          <div className="w-[52cqw]">
            <PostcardDiagonalBanner />
          </div>
        </div>

        {/* Main content — safe-zone padded. min-h-0 throughout: these are
            flex children whose height must come from the flex layout, not
            their own content — flex items default to min-height:auto,
            which otherwise lets content force a taller box than its share
            of the row. */}
        <div
          className="flex min-h-0 flex-1 gap-[1.5cqw]"
          style={{ paddingLeft: safeZonePadding.paddingLeft, paddingRight: safeZonePadding.paddingRight }}
        >
          <div className="flex min-h-0 w-[39%] flex-col gap-[1.5cqh]">
            {/* Headline gets a fixed 60% share of the column's height, the
                current-site card gets 38% — explicit shares, not "headline
                grows to fill whatever's left," which previously starved
                the card down to almost nothing once the headline font got
                big. */}
            <div className="flex min-h-0 flex-[0_0_60%] flex-col justify-center">
              <h1 className="text-[5cqw] font-black leading-[1.03] tracking-tight">
                <span style={{ color: POSTCARD_NAVY }}>Websites</span>
                <br />
                <span style={{ color: POSTCARD_NAVY }}>are hard.</span>
                <br />
                <span style={{ color: POSTCARD_BLUE }}>We already</span>
                <br />
                <span style={{ color: POSTCARD_BLUE }}>built yours.</span>
              </h1>
            </div>

            <div className="relative min-h-0 flex-[0_0_38%]">
              <span className="absolute -top-[1.6cqh] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900 px-[1.4cqw] py-[0.5cqh] text-[1.15cqw] font-bold text-white shadow-sm">
                YOUR CURRENT SITE
              </span>
              <div className="h-full w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 pt-[1.8cqh] shadow-[0_4px_12px_rgba(11,30,61,0.1)]">
                {beforeScreenshotSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforeScreenshotSrc} alt={`${businessName}'s previous website`} className="h-full w-full object-cover object-top" />
                ) : (
                  <p className="p-[1cqw] text-center text-[1.3cqw] text-gray-400">No existing-site screenshot yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-[3%] items-center justify-center">
            <CurvedArrow className="h-[3.6cqw] w-[6cqw]" />
          </div>

          <div className="flex min-h-0 w-[58%] flex-col items-center gap-[1.2cqh]">
            <span
              className="w-fit shrink-0 rounded-full px-[2cqw] py-[0.8cqh] text-[1.5cqw] font-extrabold text-white shadow-[0_4px_14px_rgba(0,72,170,0.4)]"
              style={{ background: `linear-gradient(135deg, ${POSTCARD_BLUE_LIGHT}, ${POSTCARD_BLUE})` }}
            >
              YOUR NEW WEBSITE
            </span>
            {/* `relative`: PostcardDeviceMockup's root is `absolute inset-0
                m-auto` — it needs a positioned, sized ancestor to contain
                against. */}
            <div className="relative min-h-0 w-full flex-1">
              <PostcardDeviceMockup desktopSrc={afterDesktopScreenshotSrc} mobileSrc={afterMobileScreenshotSrc} />
            </div>
          </div>
        </div>

        {/* Footer CTA — full-bleed band, fixed at 28% of the card's height
            (not content-driven padding — that previously left dead
            padding rules that Tailwind classes couldn't actually override
            once inline styles also touched padding). Content padded to the
            safe zone horizontally; vertically centered via `items-center`
            against the fixed height. Two equally-valid paths to the same
            destination: scan the QR, or go type the access code in at
            webpresa.com/access (a real route — see web/app/access/page.tsx).
            Section widths are explicit so the OR divider lands at roughly
            1/3 of the whole card's width. */}
        <div
          className="relative mt-auto flex shrink-0 items-center overflow-hidden"
          style={{
            height: '28cqh',
            paddingLeft: safeZonePadding.paddingLeft,
            paddingRight: safeZonePadding.paddingRight,
            background: `radial-gradient(ellipse at center, ${POSTCARD_BLUE} 0%, ${POSTCARD_NAVY} 75%)`,
          }}
        >
          {/* Decorative dot-grid texture, both far corners — no image asset needed. */}
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-[13cqw] w-[13cqw] opacity-25" style={DOT_GRID_STYLE} />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-[13cqw] w-[13cqw] rotate-180 opacity-25" style={DOT_GRID_STYLE} />

          <div className="flex w-[30cqw] shrink-0 items-center justify-center gap-[0.8cqw]">
            <div className="relative flex shrink-0 items-end gap-[0.5cqw]">
              <p className={`${caveat.className} rotate-[-4deg] pb-[1cqw] text-[2.2cqw] leading-none text-white`}>Scan Me!</p>
              <CornerDownRight className="h-[2.2cqw] w-[2.2cqw] shrink-0 pb-[0.3cqw] text-white" />
            </div>
            <div className="w-[13cqw] shrink-0">
              <PostcardQrWithBadge qrDataUri={qrDataUri} />
            </div>
          </div>

          <div className="relative flex w-[3cqw] shrink-0 items-center justify-center">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25" />
            <span
              className="relative flex h-[3.4cqw] w-[3.4cqw] shrink-0 items-center justify-center rounded-full bg-white text-[1.2cqw] font-extrabold"
              style={{ color: POSTCARD_BLUE }}
            >
              OR
            </span>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-start pl-[1.2cqw]">
            <div className="flex flex-col gap-[1.3cqh]">
              <div className="flex items-center gap-[1.1cqw]">
                <span className="flex h-[2.9cqw] w-[2.9cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Globe className="h-[1.6cqw] w-[1.6cqw] text-white" />
                </span>
                <div>
                  <p className="text-[1.15cqw] font-bold tracking-wide" style={{ color: POSTCARD_BLUE_LIGHT }}>
                    GO TO:
                  </p>
                  <p className="text-[2.7cqw] font-bold leading-tight text-white">webpresa.com/access</p>
                </div>
              </div>
              <div className="h-px bg-white/20" />
              <div className="flex items-center gap-[1.1cqw]">
                <span className="flex h-[2.9cqw] w-[2.9cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Lock className="h-[1.6cqw] w-[1.6cqw] text-white" />
                </span>
                <div>
                  <p className="text-[1.15cqw] font-bold tracking-wide" style={{ color: POSTCARD_BLUE_LIGHT }}>
                    ENTER YOUR ACCESS CODE:
                  </p>
                  {accessCodeDisplay && (
                    <span className="mt-[0.3cqh] inline-block rounded-lg bg-white px-[1cqw] py-[0.4cqh] font-mono text-[2.2cqw] font-bold tracking-widest text-gray-900">
                      {accessCodeDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PostcardFrame>
  );
}
