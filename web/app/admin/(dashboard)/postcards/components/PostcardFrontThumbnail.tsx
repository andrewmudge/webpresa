import PostcardFront from './PostcardFront';

/**
 * Small, clickable preview of a postcard's front — reuses `PostcardFront`
 * as-is (its `cqw`/`cqh` sizing already tracks `PostcardFrame`'s own
 * rendered width via `w-full` + `aspect-[9.25/6.25]`, so a fixed-width
 * wrapper is all that's needed to shrink it, no transform/scale required).
 * Clicking opens the actual rendered S3 front PDF in a new tab — not a
 * bigger version of this live mockup — so it's wrapped in a plain `<a>`
 * rather than `PostcardZoom`'s click-to-enlarge behavior.
 */
export interface PostcardFrontThumbnailProps {
  businessName: string;
  beforeScreenshotSrc?: string;
  afterDesktopScreenshotSrc?: string;
  afterMobileScreenshotSrc?: string;
  qrDataUri?: string;
  accessCodeDisplay?: string;
  /** Signed S3 URL for the rendered front PDF — omit while rendering hasn't happened yet. */
  href?: string;
  width?: number;
}

export default function PostcardFrontThumbnail({
  businessName,
  beforeScreenshotSrc,
  afterDesktopScreenshotSrc,
  afterMobileScreenshotSrc,
  qrDataUri,
  accessCodeDisplay,
  href,
  width = 160,
}: PostcardFrontThumbnailProps) {
  const content = (
    <div style={{ width, pointerEvents: 'none' }}>
      <PostcardFront
        businessName={businessName}
        beforeScreenshotSrc={beforeScreenshotSrc}
        afterDesktopScreenshotSrc={afterDesktopScreenshotSrc}
        afterMobileScreenshotSrc={afterMobileScreenshotSrc}
        qrDataUri={qrDataUri}
        accessCodeDisplay={accessCodeDisplay}
        showGuides={false}
      />
    </div>
  );

  if (!href) {
    return <div className="overflow-hidden rounded-lg border border-gray-200 opacity-60">{content}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-lg border border-gray-200 transition-opacity hover:opacity-90"
      aria-label={`Open ${businessName}'s postcard front PDF`}
    >
      {content}
    </a>
  );
}
