import { Caveat } from 'next/font/google';
import { ArrowRight, CheckCircle2, MousePointerClick, CornerDownLeft } from 'lucide-react';
import PostcardFrame from './PostcardFrame';
import PostcardDeviceMockup from './PostcardDeviceMockup';
import PostcardDiagonalBanner from './PostcardDiagonalBanner';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT } from './postcard-size';

const caveat = Caveat({ subsets: ['latin'], weight: '600' });

const CHECKLIST_ITEMS = ['Designed for your customers', 'Optimized for local search', 'Built to turn visitors into calls'];

export interface PostcardFrontProps {
  businessName: string;
  beforeScreenshotSrc?: string;
  afterDesktopScreenshotSrc?: string;
  afterMobileScreenshotSrc?: string;
  /** Data URI (`data:image/png;base64,...`) of the recipient's tracked QR code. */
  qrDataUri?: string;
  /** Display-friendly redirect URL, e.g. `webpresa.com/r/7X9K2L` (protocol stripped). */
  redirectUrlDisplay?: string;
}

const safeZonePadding = {
  paddingLeft: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`,
  paddingRight: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`,
  paddingTop: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh`,
  paddingBottom: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh`,
};

/**
 * The standardized Webpresa postcard front (Stage 22) — one fixed layout,
 * dynamically populated from business data. Rebuilt to match the reference
 * marketing design (2026-08-05): hero headline with the business name
 * highlighted, a diagonal "Modern. Mobile Friendly. Built to Convert."
 * banner, a small current-site thumbnail → arrow → laptop/phone mockup of
 * the new site, a checklist, and a dark CTA footer with the QR code.
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
  redirectUrlDisplay,
}: PostcardFrontProps) {
  return (
    <PostcardFrame>
      <div className="flex h-full flex-col bg-white">
        {/* Header — full-bleed row: logo (safe-zone padded) + diagonal banner (edge-to-edge) */}
        <div className="flex items-stretch justify-between">
          <div className="flex items-center gap-[0.6cqw] py-[1.5cqh]" style={{ paddingLeft: safeZonePadding.paddingLeft }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webpresa_w.png" alt="" className="h-[3.2cqw] w-auto" />
            <span className="text-[1.6cqw] font-bold tracking-wide text-(--color-brand)">WEBPRESA</span>
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
          className="flex min-h-0 flex-1 gap-[2.5cqw]"
          style={{ paddingLeft: safeZonePadding.paddingLeft, paddingRight: safeZonePadding.paddingRight }}
        >
          <div className="flex min-h-0 w-[38%] flex-col justify-center gap-[1.5cqh]">
            <h1 className="text-[3.3cqw] font-bold leading-[1.05] tracking-tight text-gray-900">
              We built <span className="text-(--color-brand)">{businessName}</span> a new website.
            </h1>
            <p className="text-[1.3cqw] leading-snug text-gray-500">
              A modern site designed to get you found and <span className="text-(--color-accent) font-medium">get you more clients</span>.
            </p>

            <div>
              <p className="mb-[0.4cqh] text-[1cqw] font-semibold uppercase tracking-wide text-gray-400">Your current site</p>
              <div className="flex aspect-[16/10] w-[70%] items-center justify-center overflow-hidden rounded-[0.4cqw] border border-gray-200 bg-gray-50">
                {beforeScreenshotSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforeScreenshotSrc} alt={`${businessName}'s previous website`} className="h-full w-full object-cover object-top" />
                ) : (
                  <p className="p-[1cqw] text-center text-[1.5cqw] text-gray-400">No existing-site screenshot yet</p>
                )}
              </div>
            </div>

            <ul className="flex flex-col gap-[0.6cqh]">
              {CHECKLIST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-[0.7cqw] text-[1.2cqw] text-gray-700">
                  <CheckCircle2 className="h-[1.6cqw] w-[1.6cqw] shrink-0 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex w-[8%] items-center justify-center">
            <ArrowRight className="h-[3.5cqw] w-[3.5cqw] text-(--color-brand)" />
          </div>

          <div className="flex min-h-0 w-[54%] flex-col items-center gap-[1cqh]">
            <span className="w-fit shrink-0 rounded-full bg-(--color-brand) px-[1.2cqw] py-[0.5cqh] text-[1.1cqw] font-semibold text-white">
              YOUR NEW WEBSITE
            </span>
            {/* The device mockup is sized from this box's HEIGHT (flex-1 of
                whatever the row leaves after the badge above), with its own
                width derived from aspect-ratio — not the reverse. Sizing it
                from the column's WIDTH instead (54% of the card) was the
                actual bug: on this landscape card, that produced a box
                taller than the vertical space actually available, so it
                overflowed upward into the header and downward past the
                footer instead of being contained. */}
            <div className="min-h-0 w-full flex-1">
              <PostcardDeviceMockup desktopSrc={afterDesktopScreenshotSrc} mobileSrc={afterMobileScreenshotSrc} />
            </div>
          </div>
        </div>

        {/* Footer CTA — full-bleed band, content padded to the safe zone inside it */}
        <div className="mt-auto flex items-center justify-between bg-(--color-brand-dark) py-[2cqh]" style={safeZonePadding}>
          <div className="flex items-center gap-[1.2cqw]">
            <span className="flex h-[3.4cqw] w-[3.4cqw] shrink-0 items-center justify-center rounded-full bg-white">
              <MousePointerClick className="h-[1.8cqw] w-[1.8cqw] text-(--color-brand)" />
            </span>
            <div>
              <p className="text-[1.5cqw] font-semibold leading-tight text-white">See your new website now!</p>
              <p className="text-[1.1cqw] leading-tight text-white/70">Scan the QR code or visit:</p>
              {redirectUrlDisplay && (
                <span className="mt-[0.5cqh] inline-block rounded-md bg-white px-[0.8cqw] py-[0.3cqh] text-[1.1cqw] font-medium text-(--color-brand-dark)">
                  {redirectUrlDisplay}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-[0.8cqw]">
            <p className={`${caveat.className} rotate-[-6deg] text-[1.8cqw] leading-none text-white`}>
              Scan me!
              <br />
              It&apos;s fast!
            </p>
            <CornerDownLeft className="h-[2cqw] w-[2cqw] rotate-[-20deg] text-white/80" />
            <span className="flex h-[7cqw] w-[7cqw] shrink-0 items-center justify-center rounded-[0.8cqw] bg-white p-[0.5cqw]">
              {qrDataUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUri} alt="Scan to view your new website" className="h-full w-full" />
              ) : (
                <span className="text-center text-[0.9cqw] text-gray-400">No QR — postcard has no CampaignRecipient</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </PostcardFrame>
  );
}
