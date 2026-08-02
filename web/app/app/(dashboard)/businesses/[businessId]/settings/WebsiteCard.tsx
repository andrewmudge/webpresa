import Link from 'next/link';
import { Globe, ExternalLink } from 'lucide-react';
import type { WebsiteStatus } from '@/lib/customer-editing/site-status';
import { Card, Badge, type BadgeTone } from '../FormBits';

interface Props {
  businessId: string;
  slug: string;
  status: WebsiteStatus;
  liveUrl: string;
}

const STATUS_DISPLAY: Record<WebsiteStatus['state'], { label: string; tone: BadgeTone }> = {
  live: { label: 'Published', tone: 'green' },
  draft: { label: 'Draft changes', tone: 'amber' },
  none: { label: 'Unpublished', tone: 'gray' },
};

/**
 * Concise website-status summary, not a full editor (implementation.md's
 * Website card requirements) — no auto-publish row, since that feature
 * doesn't exist anywhere in this app. "Unpublished changes" is expressed
 * as the truthful version gap between the newest and published preview
 * (both real, stored `version` numbers) rather than a fabricated edit
 * count — this app has no per-field change log to count from.
 */
export function WebsiteCard({ businessId, slug, status, liveUrl }: Props) {
  const display = STATUS_DISPLAY[status.state];
  const versionGap =
    status.hasDraft && status.latest && status.publishedPreview ? status.latest.version - status.publishedPreview.version : 0;
  const lastPublished = status.publishedPreview
    ? new Date(status.publishedPreview.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <Card title="Website" description="A concise status summary.">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-(--color-brand-muted) flex items-center justify-center shrink-0">
          <Globe size={18} className="text-(--color-brand)" aria-hidden="true" />
        </div>
        <Badge tone={display.tone}>{display.label}</Badge>
      </div>

      <dl className="space-y-2 text-sm mb-4">
        {versionGap > 0 && (
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500">Unpublished changes</dt>
            <dd className="text-gray-900">
              {versionGap} version{versionGap === 1 ? '' : 's'} ahead
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">Last published</dt>
          <dd className="text-gray-900">{lastPublished || 'Never'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500 shrink-0">Live URL</dt>
          <dd className="text-gray-900 text-right break-all">
            {status.state === 'live' || status.state === 'draft' ? (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-(--color-brand) hover:underline">
                {liveUrl.replace(/^https?:\/\//, '')}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500 shrink-0">Preview URL</dt>
          <dd className="text-gray-900 text-right break-all">
            <a href={`/b/${slug}`} target="_blank" rel="noopener noreferrer" className="text-(--color-brand) hover:underline">
              /b/{slug}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </dd>
        </div>
      </dl>

      <Link
        href={`/app/businesses/${businessId}/website`}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-(--color-brand) text-white hover:bg-(--color-brand-dark) transition-colors"
      >
        Open Website
        <ExternalLink size={14} aria-hidden="true" />
      </Link>
    </Card>
  );
}
