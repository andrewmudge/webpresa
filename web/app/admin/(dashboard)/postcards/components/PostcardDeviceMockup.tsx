export interface PostcardDeviceMockupProps {
  desktopSrc?: string;
  mobileSrc?: string;
}

/**
 * Laptop + phone device bezel mockup for the postcard's "after" website
 * screenshot — the same visual technique as
 * `web/app/account/_components/WebsiteHeroPreview.tsx` (border-bezel +
 * real `<img>`, no SVG asset), stripped of that component's `Link`/slug
 * ("View Full Preview") since the postcard has no click target here.
 *
 * Deliberately sized from the parent's HEIGHT (`h-full` — the caller must
 * give this component's wrapper a definite height, e.g. via `flex-1` in a
 * `min-h-0` flex column), with width derived from `aspect-ratio`, not the
 * other way around. Sizing this from width instead (the first version of
 * this component did) is the wrong axis on a landscape postcard: the
 * available vertical space is the scarce resource once a header and
 * footer band both take their own share, so a width-driven box reliably
 * ends up taller than what's actually left and overflows into them.
 */
export default function PostcardDeviceMockup({ desktopSrc, mobileSrc }: PostcardDeviceMockupProps) {
  if (!desktopSrc && !mobileSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[1cqw] border border-dashed border-gray-300 bg-gray-50">
        <p className="p-[2cqw] text-center text-[1.4cqh] text-gray-400">No generated-preview screenshot captured yet</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-full" style={{ aspectRatio: desktopSrc ? '16 / 10.3' : '9 / 19.5' }}>
      {desktopSrc && (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 rounded-t-[0.6cqw] border-[0.45cqw] border-b-0 border-gray-900 bg-gray-900 shadow-lg">
            <div className="h-full w-full overflow-hidden rounded-[0.15cqw] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={desktopSrc} alt="The new website" className="h-full w-full object-cover object-top" />
            </div>
          </div>
          <div className="relative h-[4%] shrink-0 rounded-b-[0.6cqw] bg-gray-300">
            <div className="absolute left-1/2 top-0 h-1/2 w-1/4 -translate-x-1/2 rounded-b bg-gray-400" />
          </div>
        </div>
      )}

      {mobileSrc && (
        <div
          className={
            desktopSrc
              ? 'absolute -bottom-[2%] -right-[8%] h-[52%] overflow-hidden rounded-[0.9cqw] border-[0.3cqw] border-gray-900 bg-gray-900 shadow-lg'
              : 'h-full overflow-hidden rounded-[0.9cqw] border-[0.3cqw] border-gray-900 bg-gray-900 shadow-lg'
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
