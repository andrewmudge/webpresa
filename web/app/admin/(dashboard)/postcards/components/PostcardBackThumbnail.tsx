import PostcardBack from './PostcardBack';
import type { Address } from '@/domain/models/common';

/**
 * Small, clickable preview of a postcard's back — mirrors
 * `PostcardFrontThumbnail` exactly (same sizing trick, same "click opens
 * the actual rendered S3 PDF" behavior, not a bigger version of the live
 * mockup).
 */
export interface PostcardBackThumbnailProps {
  recipientName: string;
  recipientAddress?: Address;
  /** Signed S3 URL for the rendered back PDF — omit while rendering hasn't happened yet. */
  href?: string;
  width?: number;
}

export default function PostcardBackThumbnail({ recipientName, recipientAddress, href, width = 160 }: PostcardBackThumbnailProps) {
  const content = (
    <div style={{ width, pointerEvents: 'none' }}>
      <PostcardBack recipientName={recipientName} recipientAddress={recipientAddress} showGuides={false} />
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
      aria-label={`Open ${recipientName}'s postcard back PDF`}
    >
      {content}
    </a>
  );
}
