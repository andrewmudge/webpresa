import { Caveat } from 'next/font/google';
import { Globe, Lock, CornerDownRight } from 'lucide-react';
import PostcardFrame from './PostcardFrame';
import PostcardDiagonalBanner from './PostcardDiagonalBanner';
import PostcardQrWithBadge from './PostcardQrWithBadge';
import LaptopMockup from '@/components/mockups/LaptopMockup';
import PhoneMockup from '@/components/mockups/PhoneMockup';
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

// One shared alignment grid (2026-08-06 feedback, "improve alignment"):
// logo, headline, current-site card, and the footer QR all share this same
// left edge; the showcase column's right padding, the footer's right
// padding, and the banner's own text padding all target this same right
// edge — see each usage below for how it's applied.
const CONTENT_LEFT = `calc(${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw + 1cqw)`;
const CONTENT_RIGHT = `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`;

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
      <div className="flex h-full flex-col bg-white">
        {/* Header — full-bleed row: wordmark (on the shared CONTENT_LEFT
            edge) + diagonal banner (edge-to-edge, touches the top and
            right bleed via `justify-between` on this row). */}
        <div className="flex items-stretch justify-between">
          <div className="flex items-center pb-[1.2cqh] pt-[2.4cqh]" style={{ paddingLeft: CONTENT_LEFT }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webpresa_logo.png" alt="Webpresa" className="w-[16cqw]" />
          </div>
          <div className="w-[52cqw]">
            <PostcardDiagonalBanner />
          </div>
        </div>

        {/* Main content — min-h-0 throughout: these are flex children whose
            height must come from the flex layout, not their own content —
            flex items default to min-height:auto, which otherwise lets
            content force a taller box than its share of the row. Showcase
            column is 62% of the width (up from an earlier 54–58%) — the
            website is the product being sold here, so it gets the most
            space on the card, not the headline. */}
        <div className="flex min-h-0 flex-1 gap-[1.2cqw]" style={{ paddingLeft: CONTENT_LEFT, paddingRight: CONTENT_RIGHT }}>
          <div className="flex min-h-0 w-[35%] flex-col gap-[0.6cqh]">
            <div className="flex min-h-0 flex-[0_0_56%] flex-col justify-center">
              <h1 className="text-[5.2cqw] font-black tracking-tight" style={{ lineHeight: 1.0 }}>
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

            <div className="relative min-h-0 flex-[0_0_32%]">
              <span className="absolute -top-[1.6cqh] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900 px-[1.4cqw] py-[0.5cqh] text-[1.1cqw] font-bold text-white shadow-sm">
                YOUR CURRENT SITE
              </span>
              <div className="h-full w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 pt-[1.6cqh] shadow-[0_3px_10px_rgba(11,30,61,0.08)]">
                {beforeScreenshotSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforeScreenshotSrc} alt={`${businessName}'s previous website`} className="h-full w-full object-cover object-top" />
                ) : (
                  <p className="p-[1cqw] text-center text-[1.3cqw] text-gray-400">No existing-site screenshot yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-[3%] items-end justify-center pb-[8cqh]">
            <CurvedArrow className="h-[5cqw] w-[7cqw]" />
          </div>

          <div className="flex min-h-0 w-[62%] flex-col items-center gap-[0.8cqh]">
            <span
              className="w-fit shrink-0 rounded-full px-[2cqw] py-[0.8cqh] text-[1.5cqw] font-extrabold text-white shadow-[0_4px_14px_rgba(0,72,170,0.4)]"
              style={{ background: `linear-gradient(135deg, ${POSTCARD_BLUE_LIGHT}, ${POSTCARD_BLUE})` }}
            >
              YOUR NEW WEBSITE
            </span>
            {/* `relative`: LaptopMockup/PhoneMockup roots are `absolute
                inset-0 m-auto` — each needs a positioned, sized ancestor
                to contain against. The laptop fills the whole box; the
                phone gets its own smaller absolutely-positioned box
                overlapping the laptop's lower-right corner. */}
            <div className="relative min-h-0 w-full flex-1">
              <LaptopMockup screenshotSrc={afterDesktopScreenshotSrc} screenshotAlt={`${businessName}'s new website`} />
              {afterMobileScreenshotSrc && (
                <div className="absolute" style={{ width: '40%', height: '64%', right: '-1%', bottom: '-6%' }}>
                  <PhoneMockup screenshotSrc={afterMobileScreenshotSrc} screenshotAlt={`${businessName}'s new website (mobile)`} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA — full-bleed band, fixed at 29% of the card's height.
            QR sits on the shared CONTENT_LEFT edge (matching the logo,
            headline, and current-site card above); the URL/access-code
            block is right-aligned to CONTENT_RIGHT (matching the showcase
            column and the banner's own text padding) — see the module-level
            comment on `CONTENT_LEFT`/`CONTENT_RIGHT`. "Scan Me!" is an
            absolutely-positioned label above the QR rather than a
            side-by-side flex sibling, specifically so it doesn't push the
            QR off the shared left edge. */}
        <div
          className="relative mt-auto flex shrink-0 items-center overflow-hidden"
          style={{
            height: '29cqh',
            paddingLeft: CONTENT_LEFT,
            paddingRight: CONTENT_RIGHT,
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

          <div className="relative shrink-0" style={{ width: '13cqw' }}>
            <div className="absolute -top-[3.6cqh] left-0 flex items-end gap-[0.4cqw]">
              <p className={`${caveat.className} rotate-[-4deg] text-[2.1cqw] leading-none text-white`}>Scan Me!</p>
              <CornerDownRight className="h-[2cqw] w-[2cqw] shrink-0 pb-[0.2cqw] text-white" />
            </div>
            <PostcardQrWithBadge qrDataUri={qrDataUri} />
          </div>

          <div className="relative flex h-[70%] w-[4.5cqw] shrink-0 items-center justify-center">
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/35" />
            <span
              className="relative flex h-[3.6cqw] w-[3.6cqw] shrink-0 items-center justify-center rounded-full bg-white text-[1.25cqw] font-extrabold shadow-[0_3px_8px_rgba(0,0,0,0.25)]"
              style={{ color: POSTCARD_BLUE }}
            >
              OR
            </span>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end">
            <div className="flex flex-col items-start gap-[1.3cqh]">
              <div className="flex items-center gap-[1.1cqw]">
                <span className="flex h-[3cqw] w-[3cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Globe className="h-[1.7cqw] w-[1.7cqw] text-white" />
                </span>
                <div>
                  <p className="text-[1.15cqw] font-bold tracking-wide" style={{ color: POSTCARD_BLUE_LIGHT }}>
                    GO TO:
                  </p>
                  <p className="text-[2.8cqw] font-bold leading-tight text-white">webpresa.com/access</p>
                </div>
              </div>
              <div className="h-px w-full bg-white/25" />
              <div className="flex items-center gap-[1.1cqw]">
                <span className="flex h-[3cqw] w-[3cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Lock className="h-[1.7cqw] w-[1.7cqw] text-white" />
                </span>
                <div>
                  <p className="text-[1.15cqw] font-bold tracking-wide" style={{ color: POSTCARD_BLUE_LIGHT }}>
                    ENTER YOUR ACCESS CODE:
                  </p>
                  {accessCodeDisplay && (
                    <span className="mt-[0.3cqh] inline-block rounded-lg bg-white px-[1.1cqw] py-[0.45cqh] font-mono text-[2.4cqw] font-bold tracking-widest text-gray-900 shadow-[0_3px_8px_rgba(0,0,0,0.15)]">
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
