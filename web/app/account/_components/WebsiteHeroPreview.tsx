import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  slug: string;
  desktopSrc?: string;
  mobileSrc?: string;
}

/**
 * Laptop + phone device mockup shared by the activation
 * (`/account/claim-status`) and checkout-success pages, showing the
 * business's own already-captured Playwright screenshot (Stage 14 —
 * `generated_preview` target) rather than a live embed. Deliberately a
 * static image: no iframe load/failure states to manage, since this is
 * just displaying something already captured and stored in S3 — see
 * `getLatestPreviewScreenshots` (`lib/screenshots/latest-preview-screenshot.ts`),
 * which resolves a short-lived signed URL for whichever viewport(s) the
 * latest capture actually has.
 *
 * "View Full Preview" always links to the real `/b/[slug]` page — the
 * screenshot is a quick, always-available glance, not a substitute for
 * seeing the actual (higher-fidelity, interactive) site.
 */
export function WebsiteHeroPreview({ slug, desktopSrc, mobileSrc }: Props) {
  if (!desktopSrc && !mobileSrc) return null;

  return (
    <div className="mx-auto w-full max-w-lg lg:max-w-none">
      <div className="relative">
        {desktopSrc && (
          <>
            <div className="rounded-t-xl border-[10px] border-b-0 border-gray-900 bg-gray-900 shadow-2xl">
              <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={desktopSrc}
                  alt="Your website"
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </div>
            </div>
            <div className="relative h-3 rounded-b-xl bg-gray-300 sm:h-4">
              <div className="absolute left-1/2 top-0 h-1 w-1/4 -translate-x-1/2 rounded-b bg-gray-400" />
            </div>
          </>
        )}

        {mobileSrc && (
          <div
            className={cn(
              'overflow-hidden rounded-2xl border-[6px] border-gray-900 bg-gray-900 shadow-xl',
              desktopSrc
                ? 'absolute -bottom-6 -right-4 hidden w-24 sm:block sm:w-28 lg:-right-8 lg:w-32'
                : 'mx-auto w-40 sm:w-48',
            )}
            style={{ aspectRatio: '9 / 19.5' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mobileSrc}
              alt={desktopSrc ? '' : 'Your website (mobile)'}
              className="h-full w-full object-cover object-top"
            />
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          href={`/b/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-brand) hover:underline"
        >
          View Full Preview
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
