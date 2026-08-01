import { Lock } from 'lucide-react';
import { WebsitePreviewCard } from '@/app/app/(dashboard)/businesses/[businessId]/WebsitePreviewCard';

interface Props {
  slug: string;
  /** What to show in the fake address bar — the connected custom domain if one is `active`, otherwise the real `/b/{slug}` URL. Never a fabricated address. */
  displayUrl: string;
  hasDraft?: boolean;
  lastUpdated?: string;
}

/**
 * Browser-frame wrapper around the existing `WebsitePreviewCard` (untouched,
 * unchanged for its dashboard call site) — adds an address-bar row showing
 * the real resolved URL. Deliberately not a second preview mechanism:
 * `WebsitePreviewCard` still owns the actual iframe, Desktop/Mobile toggle,
 * loading/failed states, and "Open full preview" link.
 */
export function WebsitePreviewPanel({ slug, displayUrl, hasDraft, lastUpdated }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-(--color-border) bg-gray-50 px-4 py-2.5 shadow-sm">
        <span className="flex shrink-0 gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-(--color-border) bg-white px-3 py-1 text-xs text-gray-600">
          <Lock size={11} className="shrink-0 text-gray-400" aria-hidden="true" />
          <span className="truncate">{displayUrl}</span>
        </span>
      </div>
      <WebsitePreviewCard slug={slug} hasDraft={hasDraft} lastUpdated={lastUpdated} />
    </div>
  );
}
