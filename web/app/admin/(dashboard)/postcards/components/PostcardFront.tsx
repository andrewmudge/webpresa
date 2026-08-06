import { Caveat } from 'next/font/google';
import { Globe, Lock, CornerDownRight } from 'lucide-react';
import PostcardFrame from './PostcardFrame';
import PostcardDeviceMockup from './PostcardDeviceMockup';
import PostcardDiagonalBanner from './PostcardDiagonalBanner';
import PostcardQrWithBadge from './PostcardQrWithBadge';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT } from './postcard-size';
import { POSTCARD_BLUE } from './postcard-colors';

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

/**
 * A hand-drawn-style curved arrow (quadratic curve + chevron head),
 * matching the "Scan Me!" corner-arrow's informal, marketing-sketch feel —
 * used in place of a plain straight `ArrowRight` for the before→after
 * connector, per 2026-08-06 feedback ("a stylish arrow... similar to the
 * one in scan me").
 */
function CurvedArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 60" fill="none" className={className} aria-hidden="true">
      <path d="M4 44 Q 46 6 92 24" stroke={POSTCARD_BLUE} strokeWidth="7" strokeLinecap="round" />
      <path d="M76 12 L94 24 L80 40" stroke={POSTCARD_BLUE} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/**
 * The standardized Webpresa postcard front (Stage 22) — one fixed layout,
 * dynamically populated from business data. Rebuilt (2026-08-06) to match
 * the final reference design: generic hero headline (no business-name
 * interpolation), a diagonal "Modern. Mobile Friendly. Built to Convert."
 * banner, a current-site thumbnail → arrow → laptop/phone mockup of the
 * new site, and a dark CTA footer offering two paths — scan the QR, or go
 * to `webpresa.com/access` and enter the printed access code — both
 * resolving to the same real `CampaignRecipient`/campaign-code mechanism
 * from Stage 21.
 *
 * Two layers, matching real print bleed practice: decorative background
 * elements (the diagonal banner, the footer band) span the full bleed
 * canvas edge-to-edge; everything else sits inside `safeZonePadding` so it
 * never approaches the trim/cut line (see `PostcardFrame`'s guide overlays
 * and `postcard-size.ts`).
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
        {/* Header — full-bleed row: logo (safe-zone padded, plus extra
            margin so it clears the dotted guide with room to spare, not
            sitting flush on it) + diagonal banner (edge-to-edge). */}
        <div className="flex items-stretch justify-between">
          <div
            className="flex items-center gap-[0.7cqw] pb-[1.5cqh] pt-[2.2cqh]"
            style={{ paddingLeft: `calc(${safeZonePadding.paddingLeft} + 1.5cqw)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webpresa_logo.png" alt="" className="h-[3.6cqw] w-auto" />
            <span className="text-[1.6cqw] font-bold tracking-wide" style={{ color: POSTCARD_BLUE }}>
              WEBPRESA
            </span>
          </div>
          <div className="w-[50cqw]">
            <PostcardDiagonalBanner />
          </div>
        </div>

        {/* Main content — safe-zone padded. min-h-0 throughout: these are flex
            children in columns whose height must come from the flex layout
            (so the device mockup below is properly bounded by the space
            actually left after the header/footer), not from their own
            content — flex items default to min-height:auto, which otherwise
            lets content force a taller box than its share of the row. */}
        <div
          className="flex min-h-0 flex-1 gap-[2cqw]"
          style={{ paddingLeft: safeZonePadding.paddingLeft, paddingRight: safeZonePadding.paddingRight }}
        >
          <div className="flex min-h-0 w-[36%] flex-col justify-center gap-[1.2cqh]">
            <h1 className="text-[3.1cqw] font-bold leading-[1.05] tracking-tight text-gray-900">
              Websites
              <br />
              are hard.
              <br />
              <span style={{ color: POSTCARD_BLUE }}>We already</span>
              <br />
              <span style={{ color: POSTCARD_BLUE }}>built yours.</span>
            </h1>

            <div className="relative mt-[0.8cqh] w-[80%]">
              <span className="absolute -top-[1.4cqh] left-[6%] z-10 rounded-full bg-gray-900 px-[1cqw] py-[0.35cqh] text-[0.9cqw] font-semibold text-white">
                YOUR CURRENT SITE
              </span>
              <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[0.4cqw] border border-gray-200 bg-gray-50 pt-[1.5cqh]">
                {beforeScreenshotSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforeScreenshotSrc} alt={`${businessName}'s previous website`} className="h-full w-full object-cover object-top" />
                ) : (
                  <p className="p-[1cqw] text-center text-[1.3cqw] text-gray-400">No existing-site screenshot yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-[6%] items-center justify-center">
            <CurvedArrow className="h-[3.2cqw] w-[5.2cqw]" />
          </div>

          {/* w-[58%], up from 54%: reclaims the width the arrow column gave
              up above (6% vs. the old 8%) so the mockup keeps roughly the
              same footprint — the actual fix for the mockup being cut off
              and crossing outside the safe zone is the "contain" sizing in
              PostcardDeviceMockup.tsx (max-width/max-height + aspect-ratio
              inside this centering flex box), not this width number. */}
          <div className="flex min-h-0 w-[58%] flex-col items-center gap-[1cqh]">
            <span className="w-fit shrink-0 rounded-full px-[1.2cqw] py-[0.5cqh] text-[1.1cqw] font-semibold text-white" style={{ backgroundColor: POSTCARD_BLUE }}>
              YOUR NEW WEBSITE
            </span>
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <PostcardDeviceMockup desktopSrc={afterDesktopScreenshotSrc} mobileSrc={afterMobileScreenshotSrc} />
            </div>
          </div>
        </div>

        {/* Footer CTA — full-bleed band, content padded to the safe zone
            inside it. Two equally-valid paths to the same destination: scan
            the QR, or go type the access code in at webpresa.com/access
            (a real route — see web/app/access/page.tsx).

            Section widths are explicit (not content-sized) so the OR
            divider lands at roughly 1/3 of the *whole card's* width, not
            just after however wide the QR happens to be — the left zone's
            width is safe-zone-padding + 30cqw ≈ card-width/3. */}
        <div className="relative mt-auto flex items-stretch overflow-hidden py-[1.8cqh]" style={{ ...safeZonePadding, backgroundColor: POSTCARD_BLUE }}>
          {/* Decorative dot-grid texture, bottom-left corner only — no image asset needed. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-[10cqw] w-[10cqw] opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '0.6cqw 0.6cqw' }}
          />

          <div className="flex w-[30cqw] shrink-0 items-center justify-end gap-[0.8cqw]">
            <div className="relative flex shrink-0 items-end gap-[0.5cqw]">
              <p className={`${caveat.className} rotate-[-4deg] pb-[1.2cqw] text-[2.3cqw] leading-none text-white`}>Scan Me!</p>
              <CornerDownRight className="h-[2.3cqw] w-[2.3cqw] shrink-0 pb-[0.4cqw] text-white/80" />
            </div>
            <div className="w-[13cqw] shrink-0">
              <PostcardQrWithBadge qrDataUri={qrDataUri} />
            </div>
          </div>

          <div className="relative flex w-[3cqw] shrink-0 items-center justify-center">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25" />
            <span className="relative flex h-[2.4cqw] w-[2.4cqw] shrink-0 items-center justify-center rounded-full bg-white text-[1cqw] font-bold" style={{ color: POSTCARD_BLUE }}>
              OR
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-[1cqh] pl-[1.5cqw]">
            <div className="flex items-center gap-[1cqw]">
              <Globe className="h-[2cqw] w-[2cqw] shrink-0 text-white/70" />
              <div className="min-w-0">
                <p className="text-[1cqw] font-semibold tracking-wide text-(--color-accent)">GO TO:</p>
                <p className="truncate text-[2cqw] font-bold leading-tight text-white">webpresa.com/access</p>
              </div>
            </div>
            <div className="h-px bg-white/20" />
            <div className="flex items-center gap-[1cqw]">
              <Lock className="h-[2cqw] w-[2cqw] shrink-0 text-white/70" />
              <div className="min-w-0">
                <p className="text-[1cqw] font-semibold tracking-wide text-(--color-accent)">ENTER YOUR ACCESS CODE:</p>
                {accessCodeDisplay && (
                  <span className="mt-[0.3cqh] inline-block rounded-md bg-white px-[0.8cqw] py-[0.25cqh] text-[1.7cqw] font-bold tracking-wide text-gray-900">
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
