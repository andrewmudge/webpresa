import type { Address } from '@/domain/models/common';
import PostcardFrame from './PostcardFrame';
import { POSTCARD_SAFE_ZONE_INSET_PERCENT, POSTCARD_INK_FREE_ZONE_PERCENT } from './postcard-size';

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

/**
 * The standardized Webpresa postcard back (Stage 22). Postal safe-zone/
 * bleed margins confirmed against Lob's live docs (`postcard-size.ts`).
 *
 * The recipient-address block in the bottom-right (sized/positioned to
 * Lob's documented ink-free zone, `POSTCARD_INK_FREE_ZONE_PERCENT`) is
 * **admin-preview context only** — confirmed against Lob's docs that Lob
 * automatically overlays the real recipient address and USPS indicia
 * there itself, and discards whatever artwork we put in that exact spot.
 * So the actual print artifact (`showGuides={false}`) renders that block
 * empty rather than drawing text Lob will never show; the admin preview
 * (`showGuides={true}`) still shows it, dashed-outlined, so a reviewer can
 * visually confirm which business a given postcard is addressed to.
 */
export default function PostcardBack({ recipientName, recipientAddress, senderName, senderAddress, showGuides = true }: PostcardBackProps) {
  return (
    <PostcardFrame showGuides={showGuides}>
      <div className="relative h-full bg-white p-6 text-sm text-gray-900">
        <div className="max-w-[45%]">
          {senderAddress ? (
            <div className="text-xs text-gray-500">
              <p className="font-medium text-gray-700">{senderName}</p>
              {formatAddress(senderAddress).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-600">
              Sender/return address not configured — set the `WEBPRESA_LOB_SENDER_*` environment variables (see deployment.md).
            </p>
          )}
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
