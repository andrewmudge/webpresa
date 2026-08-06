export interface PostcardDeviceMockupProps {
  desktopSrc?: string;
  mobileSrc?: string;
}

/**
 * Laptop + phone device bezel mockup for the postcard's "after" website
 * screenshot — the same visual technique as
 * `web/app/account/_components/WebsiteHeroPreview.tsx` (border-bezel +
 * real `<img>`, no SVG asset), stripped of that component's `Link`/slug
 * ("View Full Preview") since the postcard has no click target here, and
 * sized with `cqw` units so the bezel scales with `PostcardFrame`'s own
 * rendered width rather than the viewport.
 */
export default function PostcardDeviceMockup({ desktopSrc, mobileSrc }: PostcardDeviceMockupProps) {
  if (!desktopSrc && !mobileSrc) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-[1cqw] border border-dashed border-gray-300 bg-gray-50">
        <p className="p-[2cqw] text-center text-[2.2cqw] text-gray-400">No generated-preview screenshot captured yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {desktopSrc && (
        <>
          <div className="rounded-t-[0.8cqw] border-[0.6cqw] border-b-0 border-gray-900 bg-gray-900 shadow-lg">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[0.15cqw] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={desktopSrc} alt="The new website" className="absolute inset-0 h-full w-full object-cover object-top" />
            </div>
          </div>
          <div className="relative h-[0.7cqw] rounded-b-[0.8cqw] bg-gray-300">
            <div className="absolute left-1/2 top-0 h-[0.25cqw] w-1/4 -translate-x-1/2 rounded-b bg-gray-400" />
          </div>
        </>
      )}

      {mobileSrc && (
        <div
          className={
            desktopSrc
              ? 'absolute -bottom-[3cqw] -right-[2cqw] w-[22cqw] overflow-hidden rounded-[1.2cqw] border-[0.35cqw] border-gray-900 bg-gray-900 shadow-lg'
              : 'mx-auto w-[45cqw] overflow-hidden rounded-[1.2cqw] border-[0.35cqw] border-gray-900 bg-gray-900 shadow-lg'
          }
          style={{ aspectRatio: '9 / 19.5' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mobileSrc} alt={desktopSrc ? '' : 'The new website (mobile)'} className="h-full w-full object-cover object-top" />
        </div>
      )}
    </div>
  );
}
