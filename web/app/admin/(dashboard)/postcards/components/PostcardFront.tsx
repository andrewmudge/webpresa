import PostcardFrame from './PostcardFrame';

export interface PostcardFrontProps {
  businessName: string;
  industry: string;
  logoUrl?: string;
  beforeScreenshotSrc?: string;
  afterScreenshotSrc?: string;
  /** Data URI (`data:image/png;base64,...`) of the recipient's tracked QR code. */
  qrDataUri?: string;
}

/**
 * The standardized Webpresa postcard front (Stage 22) — one fixed layout,
 * dynamically populated from business data. Purely presentational; all data
 * fetching happens in the page component that renders this.
 */
export default function PostcardFront({ businessName, industry, logoUrl, beforeScreenshotSrc, afterScreenshotSrc, qrDataUri }: PostcardFrontProps) {
  return (
    <PostcardFrame>
      <div className="flex h-full flex-col bg-white p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl && <img src={logoUrl} alt={`${businessName} logo`} className="h-10 w-10 rounded object-contain" />}
          <div>
            <p className="text-lg font-semibold text-gray-900">We built {businessName} a new website.</p>
            <p className="text-xs capitalize text-gray-500">{industry.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-1 gap-3">
          <div className="flex-1">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Before</p>
            <div className="flex h-full items-center justify-center overflow-hidden rounded border border-dashed border-gray-200 bg-gray-50">
              {beforeScreenshotSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={beforeScreenshotSrc} alt={`${businessName}'s previous website`} className="h-full w-full object-cover object-top" />
              ) : (
                <p className="p-2 text-center text-[10px] text-gray-400">No existing-site screenshot captured yet</p>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">After — by Webpresa</p>
            <div className="flex h-full items-center justify-center overflow-hidden rounded border border-dashed border-gray-200 bg-gray-50">
              {afterScreenshotSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={afterScreenshotSrc} alt={`${businessName}'s new Webpresa website`} className="h-full w-full object-cover object-top" />
              ) : (
                <p className="p-2 text-center text-[10px] text-gray-400">No generated-preview screenshot captured yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-(--color-brand) px-4 py-3">
          <div className="text-white">
            <p className="text-sm font-semibold">See your new website now</p>
            <p className="text-xs opacity-90">Scan the QR code or visit your personalized link.</p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-white p-1">
            {qrDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUri} alt="Scan to view your new website" className="h-full w-full" />
            ) : (
              <span className="text-center text-[8px] text-gray-400">No QR — postcard has no CampaignRecipient</span>
            )}
          </div>
        </div>
      </div>
    </PostcardFrame>
  );
}
