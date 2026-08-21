import { Mail, Globe, Smartphone, SquarePen, ShieldCheck } from 'lucide-react';
import type { Address } from '@/domain/models/common';
import PostcardFrame from './PostcardFrame';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT, POSTCARD_INK_FREE_ZONE_PERCENT } from './postcard-size';
import { POSTCARD_NAVY, POSTCARD_BLUE, POSTCARD_BLUE_LIGHT } from './postcard-colors';

export interface PostcardBackProps {
  recipientName: string;
  recipientAddress?: Address;
  senderName?: string;
  senderAddress?: Address;
  /** Forwarded to `PostcardFrame` — see its own doc comment. `false` for the Stage 22 Phase 2 print-rendering pages. */
  showGuides?: boolean;
}

function formatAddress(address: Address): string[] {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`, address.country].filter(
    (line): line is string => Boolean(line),
  );
}

const FEATURES = [
  { Icon: Smartphone, label: 'Modern & Mobile Friendly', sub: 'Looks great on every device.' },
  { Icon: SquarePen, label: 'Easy to Update', sub: 'Edit text, images, and more anytime—no tech skills needed.' },
  { Icon: ShieldCheck, label: 'Built for Trust', sub: 'Professional design that builds credibility and confidence.' },
] as const;

const CONTENT_LEFT = `calc(${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw + 1cqw)`;
const CONTENT_TOP = `calc(${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh + 1cqh)`;
const CONTENT_BOTTOM = `${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh`;

/** Left edge of Lob's ink-free zone, as a % of the full bleed canvas — the sender address aligns to this, sitting just above the box. */
const INK_FREE_ZONE_LEFT_CQW = 100 - POSTCARD_INK_FREE_ZONE_PERCENT.right - POSTCARD_INK_FREE_ZONE_PERCENT.width;
/** Distance from the card's bottom edge to the *top* of the ink-free zone — the sender address's own bottom offset builds on this plus a small gap. */
const INK_FREE_ZONE_TOP_FROM_BOTTOM_CQH = POSTCARD_INK_FREE_ZONE_PERCENT.bottom + POSTCARD_INK_FREE_ZONE_PERCENT.height;

/**
 * The standardized Webpresa postcard back (Stage 22, redesigned per a
 * reference mockup, 2026-08-21). Postal safe-zone/bleed margins confirmed
 * against Lob's live docs (`postcard-size.ts`).
 *
 * A left marketing panel (logo, headline, feature list, contact footer —
 * the general brand pitch, distinct from the front's personalized
 * before/after showcase) sized to roughly the width the Lob-reserved
 * ink-free zone leaves free, plus the sender/return address positioned
 * directly above that ink-free zone on the right, left-aligned to its left
 * edge (matching a standard postcard's return-address placement just above
 * the recipient block) rather than at the top of the card.
 *
 * The recipient-address block (sized/positioned to Lob's documented
 * ink-free zone, `POSTCARD_INK_FREE_ZONE_PERCENT`) is **admin-preview
 * context only** — confirmed against Lob's docs that Lob automatically
 * overlays the real recipient address and USPS indicia there itself, and
 * discards whatever artwork we put in that exact spot. So the actual print
 * artifact (`showGuides={false}`) renders that block empty rather than
 * drawing text Lob will never show; the admin preview (`showGuides={true}`)
 * still shows it, dashed-outlined, so a reviewer can visually confirm which
 * business a given postcard is addressed to. The sender address, the
 * ink-free-zone box, and the missing-address warning are all direct
 * children of the outer full-card `relative` wrapper (not nested inside the
 * marketing panel) so their `left`/`right`/`bottom` offsets resolve against
 * the *whole* card, matching how `POSTCARD_INK_FREE_ZONE_PERCENT` itself is
 * defined.
 */
export default function PostcardBack({ recipientName, recipientAddress, senderName, senderAddress, showGuides = true }: PostcardBackProps) {
  return (
    <PostcardFrame showGuides={showGuides}>
      <div className="relative h-full bg-white">
        {/* Left marketing panel — logo, headline, feature list, contact footer.
            The top content block is `flex-1 justify-center`, not top-aligned,
            so it's vertically centered in the space above the footer instead
            of sitting flush at the top with one large leftover gap before the
            footer (2026-08-21 feedback: "everything is scrunched at the top"). */}
        <div
          className="flex h-full flex-col"
          style={{ width: '56%', paddingLeft: CONTENT_LEFT, paddingTop: CONTENT_TOP, paddingBottom: CONTENT_BOTTOM, paddingRight: '2cqw' }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webpresa_logo_horizontal_cropped_nobg.png" alt="Webpresa" className="h-[3.6cqh] w-auto" />
            <div className="mt-[1.2cqh] h-[0.35cqh] w-[7cqw]" style={{ backgroundColor: POSTCARD_BLUE }} />

            <h2 className="mt-[2cqh] text-[2.8cqw] font-black leading-[1.15] tracking-tight" style={{ color: POSTCARD_NAVY }}>
              <span className="block">We build websites</span>
              <span className="block">
                so you can build <span style={{ color: POSTCARD_BLUE }}>your business.</span>
              </span>
            </h2>

            <p className="mt-[1.6cqh] text-[1.3cqw] leading-snug text-gray-600">
              A modern, mobile-friendly website that helps you look professional and attract more customers.
            </p>

            <div className="mt-[2.2cqh] flex flex-col">
              {FEATURES.map((feature, i) => (
                <div key={feature.label}>
                  {i > 0 && <div className="my-[1.3cqh] h-px w-full bg-gray-200" />}
                  <div className="flex items-center gap-[1cqw]">
                    <span
                      className="flex h-[3.2cqw] w-[3.2cqw] shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${POSTCARD_BLUE}1A` }}
                    >
                      <feature.Icon className="h-[1.7cqw] w-[1.7cqw]" style={{ color: POSTCARD_BLUE }} strokeWidth={2} />
                    </span>
                    <div>
                      <p className="text-[1.45cqw] font-bold" style={{ color: POSTCARD_BLUE }}>
                        {feature.label}
                      </p>
                      <p className="text-[1.15cqw] text-gray-600">{feature.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-[1.5cqh]">
            <div className="flex items-stretch overflow-hidden rounded-lg" style={{ backgroundColor: POSTCARD_NAVY }}>
              <div className="flex flex-1 items-center gap-[0.8cqw] px-[1.1cqw] py-[0.7cqh]">
                <span className="flex h-[2.3cqw] w-[2.3cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Mail className="h-[1.2cqw] w-[1.2cqw] text-white" />
                </span>
                <div>
                  <p className="text-[0.95cqw] font-bold text-white">Questions?</p>
                  <p className="text-[0.85cqw] text-white/75">We&apos;re happy to help.</p>
                  <p className="text-[0.95cqw] font-bold text-white">support@webpresa.com</p>
                </div>
              </div>
              <div className="w-px self-stretch bg-white/20" />
              <div className="flex flex-1 items-center gap-[0.8cqw] px-[1.1cqw] py-[0.7cqh]">
                <span className="flex h-[2.3cqw] w-[2.3cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Globe className="h-[1.2cqw] w-[1.2cqw] text-white" />
                </span>
                <div>
                  <p className="text-[0.95cqw] font-bold text-white">Learn more</p>
                  <p className="text-[0.95cqw] font-bold text-white">webpresa.com</p>
                </div>
              </div>
            </div>

            <p className="mt-[0.6cqh] text-center text-[0.85cqw] font-extrabold uppercase tracking-wide" style={{ color: POSTCARD_BLUE }}>
              Proudly building better websites for local businesses.
            </p>
          </div>
        </div>

        {/* Sender/return address — positioned above Lob's ink-free zone, left-aligned to its left edge. */}
        {senderAddress && (
          <div
            className="absolute uppercase"
            style={{ left: `${INK_FREE_ZONE_LEFT_CQW}cqw`, bottom: `calc(${INK_FREE_ZONE_TOP_FROM_BOTTOM_CQH}cqh + 1.2cqh)` }}
          >
            <div className="text-[1.05cqw] leading-relaxed text-gray-700">
              {senderName && <p className="font-bold">{senderName}</p>}
              {formatAddress(senderAddress).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {showGuides && (
          <div
            className="absolute flex flex-col justify-end border border-dashed border-gray-300 p-2"
            style={{
              width: `${POSTCARD_INK_FREE_ZONE_PERCENT.width}cqw`,
              height: `${POSTCARD_INK_FREE_ZONE_PERCENT.height}cqh`,
              right: `${POSTCARD_INK_FREE_ZONE_PERCENT.right}cqw`,
              bottom: `${POSTCARD_INK_FREE_ZONE_PERCENT.bottom}cqh`,
            }}
          >
            <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Lob prints the address here — not our artwork</p>
            {recipientAddress ? (
              <div className="text-xs text-gray-700">
                <p className="font-medium">{recipientName}</p>
                {formatAddress(recipientAddress).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-red-600">No mailing address on file for this business — required before submission.</p>
            )}
          </div>
        )}

        {!showGuides && !recipientAddress && (
          // Even though our own artwork in the ink-free zone is discarded,
          // a missing address is still a genuine submission blocker — Lob
          // has nothing to overlay. Surface it in the print artifact too
          // (inside the safe zone, not the ink-free zone) so it's visible
          // even if someone inspects the rendered PDF directly.
          <p className="absolute text-xs text-red-600" style={{ left: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.x}cqw`, bottom: `${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh` }}>
            No mailing address on file for this business.
          </p>
        )}
      </div>
    </PostcardFrame>
  );
}
