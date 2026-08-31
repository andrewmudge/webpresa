import { Mail, Globe, Lock, Smartphone, SquarePen, ShieldCheck } from 'lucide-react';
import type { Address } from '@/domain/models/common';
import PostcardFrame from './PostcardFrame';
import PostcardQrWithBadge from './PostcardQrWithBadge';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT, POSTCARD_INK_FREE_ZONE_PERCENT, POSTCARD_BLEED_SIZE_INCHES } from './postcard-size';
import { POSTCARD_NAVY, POSTCARD_BLUE, POSTCARD_BLUE_LIGHT } from './postcard-colors';

export interface PostcardBackProps {
  recipientName: string;
  recipientAddress?: Address;
  /** Data URI (`data:image/png;base64,...`) of the recipient's tracked QR code — the exact same value passed to `PostcardFront`'s `qrDataUri`, so front and back encode the identical destination. */
  qrDataUri?: string;
  /** Dash-grouped campaign code for the manual-entry fallback, e.g. `7X9K-2L4M-8N3P-7Q5R` (see `formatCampaignCodeForDisplay`) — the same value passed to `PostcardFront`. */
  accessCodeDisplay?: string;
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
const CONTENT_BOTTOM = `calc(${POSTCARD_SAFE_ZONE_INSET_PERCENT.y}cqh + 0.8cqh)`;

/** Left marketing panel's width — the QR/access-code block below derives its own left edge from this, so the two can never drift out of sync. */
const MARKETING_PANEL_WIDTH_PERCENT = 56;

// --- QR + access-code block (top-right region, above the ink-free zone) --
// Real-inch → cqw/cqh conversion, matching PostcardFront's own pattern (see
// its ONE_INCH_CQW comment) — every size/offset below is derived from a
// physical inch measurement, never eyeballed.
const ONE_INCH_CQW = (1 / POSTCARD_BLEED_SIZE_INCHES.width) * 100;

// Horizontal: starts 1cqw past the marketing panel's own right edge (same
// "+1cqw" gap CONTENT_LEFT already uses off the safe-zone line) so the two
// blocks never visually collide, and ends flush with the right safe-zone line.
const BLOCK_GAP_CQW = 1;
const QR_BLOCK_LEFT_CQW = MARKETING_PANEL_WIDTH_PERCENT + BLOCK_GAP_CQW;
const QR_BLOCK_WIDTH_CQW = 100 - QR_BLOCK_LEFT_CQW - POSTCARD_SAFE_ZONE_INSET_PERCENT.x;

// Vertical: top starts 1cqh past the top safe-zone line (same pattern as
// CONTENT_TOP). Height is capped via `maxHeight` (below) 1cqh above the
// ink-free zone's own top edge (derived from POSTCARD_INK_FREE_ZONE_PERCENT's
// own height/bottom offset, not re-measured) — a hard ceiling so no row's
// line-height/descender can ever graze the zone Lob overlays, even if a
// future edit adds a row without re-checking the budget by hand. Available
// budget works out to ~3.25"; the QR box (1.8") + caption + divider + two
// icon rows fits with a small margin — verified against the real render
// (screenshot review), not just this arithmetic.
const QR_BLOCK_TOP_CQH = POSTCARD_SAFE_ZONE_INSET_PERCENT.y + 1;
const INK_FREE_ZONE_TOP_CQH = 100 - POSTCARD_INK_FREE_ZONE_PERCENT.height - POSTCARD_INK_FREE_ZONE_PERCENT.bottom;
const QR_BLOCK_MAX_HEIGHT_CQH = INK_FREE_ZONE_TOP_CQH - 1 - QR_BLOCK_TOP_CQH;

// QR box: 1.8" wide — a clearly-scannable, visually dominant square, roomier
// than PostcardFront's ~1" footer QR since this block owns a whole column
// instead of a footer corner.
const QR_BOX_WIDTH_INCHES = 1.8;
const QR_BOX_WIDTH_CQW = QR_BOX_WIDTH_INCHES * ONE_INCH_CQW;

/**
 * The standardized Webpresa postcard back (Stage 22, redesigned per a
 * reference mockup, 2026-08-21). Postal safe-zone/bleed margins confirmed
 * against Lob's live docs (`postcard-size.ts`).
 *
 * A left marketing panel (logo, headline, feature list, contact footer —
 * the general brand pitch, distinct from the front's personalized
 * before/after showcase) sized to roughly the width the Lob-reserved
 * ink-free zone leaves free. No return/sender address is rendered — per
 * the user, checking Lob's/USPS's own docs confirmed one isn't required on
 * this mail class, so the block that used to sit above the ink-free zone
 * was removed rather than left in reduced form.
 *
 * The recipient-address block (sized/positioned to Lob's documented
 * ink-free zone, `POSTCARD_INK_FREE_ZONE_PERCENT`) is **admin-preview
 * context only** — confirmed against Lob's docs that Lob automatically
 * overlays the real recipient address and USPS indicia there itself, and
 * discards whatever artwork we put in that exact spot. So the actual print
 * artifact (`showGuides={false}`) renders that block empty rather than
 * drawing text Lob will never show; the admin preview (`showGuides={true}`)
 * still shows it, dashed-outlined, so a reviewer can visually confirm which
 * business a given postcard is addressed to. It and the missing-address
 * warning stay direct children of the outer full-card `relative` wrapper
 * (not nested inside the marketing panel) so their `right`/`bottom` offsets
 * resolve against the *whole* card, matching how
 * `POSTCARD_INK_FREE_ZONE_PERCENT` itself is defined.
 *
 * A QR + access-code block sits in the open region above the ink-free zone
 * (the same `qrDataUri`/`accessCodeDisplay` the front already carries, so
 * both sides point to the identical destination). Unlike the address
 * preview/warning above, it renders regardless of `showGuides` — it's real
 * print artwork, not a review-only guide.
 */
export default function PostcardBack({ recipientName, recipientAddress, qrDataUri, accessCodeDisplay, showGuides = true }: PostcardBackProps) {
  return (
    <PostcardFrame showGuides={showGuides}>
      <div className="relative h-full bg-white">
        {/* Left marketing panel — logo, headline, feature list, contact footer.
            Feature list and footer sized up (2026-08-21 feedback: "still white
            space below built for trust... make the questions and learn more
            sections bigger... make the 3 claims larger") so the panel's own
            content fills the column instead of leaving slack in the middle
            and at the bottom. Three direct flex children: the top block
            (natural height), the feature list (`flex-1 justify-center` — the
            one flexible child, so it's vertically centered in whatever space
            is actually left between the subtext and the footer, not just
            top-anchored under a fixed margin — 2026-08-21 feedback: "center
            [the 3 claims] between the bottom of the subheader and the bottom
            of the contact card... still a white gap below"), and the footer
            (natural height, pinned to the bottom for free since the feature
            list is the only child absorbing slack). */}
        <div
          className="flex h-full flex-col"
          style={{ width: '56%', paddingLeft: CONTENT_LEFT, paddingTop: CONTENT_TOP, paddingBottom: CONTENT_BOTTOM, paddingRight: '2cqw' }}
        >
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webpresa_logo_horizontal_cropped_nobg.png" alt="Webpresa" className="h-[3.6cqh] w-auto" />
            <div className="mt-[1.2cqh] h-[0.35cqh] w-[7cqw]" style={{ backgroundColor: POSTCARD_BLUE }} />

            {/* Three lines, each on its own line (2026-08-21 feedback), not
                two lines with the third wrapping onto the second. */}
            <h2 className="mt-[2cqh] text-[2.8cqw] font-black leading-[1.15] tracking-tight" style={{ color: POSTCARD_NAVY }}>
              <span className="block">We build websites</span>
              <span className="block">so you can build</span>
              <span className="block" style={{ color: POSTCARD_BLUE }}>
                your business.
              </span>
            </h2>

            {/* Explicit two-line wrap (2026-08-21 feedback), not the browser's
                natural reflow. */}
            <p className="mt-[1.6cqh] text-[1.3cqw] leading-snug text-gray-600">
              A modern, mobile-friendly website that helps you
              <br />
              look professional and attract more customers.
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            {FEATURES.map((feature, i) => (
              <div key={feature.label}>
                {i > 0 && <div className="my-[1.3cqh] h-px w-full bg-gray-200" />}
                <div className="flex items-center gap-[1.2cqw]">
                  <span
                    className="flex h-[4.2cqw] w-[4.2cqw] shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${POSTCARD_BLUE}1A` }}
                  >
                    <feature.Icon className="h-[2.2cqw] w-[2.2cqw]" style={{ color: POSTCARD_BLUE }} strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-[1.85cqw] font-bold" style={{ color: POSTCARD_BLUE }}>
                      {feature.label}
                    </p>
                    <p className="text-[1.4cqw] text-gray-600">{feature.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-stretch overflow-hidden rounded-lg" style={{ backgroundColor: POSTCARD_NAVY }}>
              <div className="flex flex-1 items-center gap-[1.1cqw] px-[1.4cqw] py-[1.2cqh]">
                <span className="flex h-[3.4cqw] w-[3.4cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Mail className="h-[1.8cqw] w-[1.8cqw] text-white" />
                </span>
                <div>
                  <p className="text-[1.35cqw] font-bold text-white">Questions?</p>
                  <p className="text-[1.15cqw] text-white/75">We&apos;re happy to help.</p>
                  <p className="text-[1.35cqw] font-bold text-white">support@webpresa.com</p>
                </div>
              </div>
              <div className="w-px self-stretch bg-white/20" />
              <div className="flex flex-1 items-center gap-[1.1cqw] px-[1.4cqw] py-[1.2cqh]">
                <span className="flex h-[3.4cqw] w-[3.4cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
                  <Globe className="h-[1.8cqw] w-[1.8cqw] text-white" />
                </span>
                <div>
                  <p className="text-[1.35cqw] font-bold text-white">Learn more</p>
                  <p className="text-[1.35cqw] font-bold text-white">webpresa.com</p>
                </div>
              </div>
            </div>

            <p className="mt-[0.6cqh] text-center text-[0.95cqw] font-extrabold uppercase tracking-wide" style={{ color: POSTCARD_BLUE }}>
              Proudly building better websites for local businesses.
            </p>
          </div>
        </div>

        {/* QR + access-code block — top-right region, above the ink-free
            zone. Positioned as a direct child of the outer `relative h-full`
            wrapper (not nested in the marketing panel) so its left/top/width
            resolve against the *whole* card — same reasoning as the
            ink-free-zone preview box below. Unlike that box, this renders in
            BOTH showGuides states: it's real print artwork the Lambda-
            rendered PDF must contain, not a preview-only guide overlay.
            Front and back intentionally show the identical qrDataUri/
            accessCodeDisplay — see PostcardBackProps' doc comments. */}
        <div
          className="absolute flex flex-col items-center overflow-hidden text-center"
          style={{
            left: `${QR_BLOCK_LEFT_CQW}cqw`,
            top: `${QR_BLOCK_TOP_CQH}cqh`,
            width: `${QR_BLOCK_WIDTH_CQW}cqw`,
            maxHeight: `${QR_BLOCK_MAX_HEIGHT_CQH}cqh`,
          }}
        >
          <div style={{ width: `${QR_BOX_WIDTH_CQW}cqw` }}>
            <PostcardQrWithBadge qrDataUri={qrDataUri} />
          </div>

          <p className="mt-[1.5cqh] text-[1.7cqw] font-black uppercase tracking-wide" style={{ color: POSTCARD_NAVY }}>
            Scan to view your website
          </p>

          <p className="mt-[1cqh] text-[1.1cqw] font-semibold uppercase tracking-wide text-gray-400">— OR —</p>

          <div className="mt-[1.3cqh] flex items-center gap-[0.8cqw]">
            <span className="flex h-[2.4cqw] w-[2.4cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
              <Globe className="h-[1.3cqw] w-[1.3cqw] text-white" />
            </span>
            <div className="text-left">
              <p className="text-[1cqw] font-bold uppercase tracking-wide" style={{ color: POSTCARD_NAVY }}>
                GO TO:
              </p>
              <p className="text-[2cqw] font-bold leading-tight" style={{ color: POSTCARD_BLUE }}>
                webpresa.com/access
              </p>
            </div>
          </div>

          <div className="mt-[1.3cqh] flex items-center gap-[0.8cqw]">
            <span className="flex h-[2.4cqw] w-[2.4cqw] shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: POSTCARD_BLUE_LIGHT }}>
              <Lock className="h-[1.3cqw] w-[1.3cqw] text-white" />
            </span>
            <div className="text-left">
              <p className="text-[1cqw] font-bold uppercase tracking-wide" style={{ color: POSTCARD_NAVY }}>
                ENTER YOUR ACCESS CODE:
              </p>
              {accessCodeDisplay && (
                <span
                  className="mt-[0.2cqh] inline-block rounded-lg border-2 bg-white px-[0.9cqw] py-[0.25cqh] font-mono text-[1.7cqw] font-bold tracking-widest"
                  style={{ borderColor: POSTCARD_BLUE, color: POSTCARD_NAVY }}
                >
                  {accessCodeDisplay}
                </span>
              )}
            </div>
          </div>
        </div>

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
