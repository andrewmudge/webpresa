import type { Address } from '@/domain/models/common';
import PostcardFrame from './PostcardFrame';

export interface PostcardBackProps {
  recipientName: string;
  recipientAddress?: Address;
  senderName?: string;
  senderAddress?: Address;
}

function formatAddress(address: Address): string[] {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`, address.country].filter(
    (line): line is string => Boolean(line),
  );
}

/**
 * The standardized Webpresa postcard back (Stage 22). Exact postal
 * safe-zone/bleed margins and USPS indicia placement are Lob's own
 * documented spec for the chosen postcard size — not yet looked up (see
 * `web/docs/deployment.md`, "Stage 22" open questions) — so this layout is
 * a reasonable approximation, not yet the final print-accurate template.
 */
export default function PostcardBack({ recipientName, recipientAddress, senderName, senderAddress }: PostcardBackProps) {
  return (
    <PostcardFrame>
      <div className="flex h-full bg-white p-6 text-sm text-gray-900">
        <div className="flex-1 border-r border-dashed border-gray-200 pr-4">
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
        <div className="flex flex-1 flex-col justify-end pl-4 text-sm">
          {recipientAddress ? (
            <div>
              <p className="font-medium">{recipientName}</p>
              {formatAddress(recipientAddress).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-red-600">No mailing address on file for this business — required before submission.</p>
          )}
        </div>
      </div>
    </PostcardFrame>
  );
}
