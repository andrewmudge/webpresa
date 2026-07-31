'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { publishPreviewAction, type PublishPreviewState } from './actions';
import type { SitePreview } from '@/domain/models/site-preview';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Publishing…' : 'Publish'}
    </button>
  );
}

interface Props {
  businessId: string;
  previewId: string;
  /** The version number shown in the confirmation copy only. */
  version: number;
  /** Omits the "Makes vX publicly visible..." caption — for the compact header placement. */
  compact?: boolean;
}

export function PublishPreviewButton({ businessId, previewId, version, compact }: Props) {
  const boundAction = publishPreviewAction.bind(null, businessId, previewId);
  const [state, formAction] = useActionState<PublishPreviewState, FormData>(boundAction, undefined);

  return (
    <form action={formAction}>
      <SubmitButton />
      {!compact && (
        <p className="mt-1 text-xs text-gray-400">Makes v{version} publicly visible at this business&apos;s live URL.</p>
      )}
      {state?.error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}

/**
 * Header-row publish control — always present next to "Review draft" /
 * "Delete" once a site has ever been generated, so publishing doesn't
 * require scrolling to the bottom "Preview" card. Mirrors the same
 * draft/ready-vs-published resolution `PreviewLink` (page.tsx) already uses,
 * so the two stay in agreement. When the newest preview is already
 * `published` (nothing newer to promote), renders a disabled button instead
 * of hiding it, so it's clear publishing was considered and there's simply
 * nothing pending.
 */
export function HeaderPublishControl({
  businessId,
  previews,
}: {
  businessId: string;
  previews: SitePreview[];
}) {
  const latest = previews[0];
  if (!latest) return null;

  if (latest.status === 'draft' || latest.status === 'ready') {
    return <PublishPreviewButton businessId={businessId} previewId={latest.previewId} version={latest.version} compact />;
  }

  if (latest.status === 'published') {
    return (
      <button
        type="button"
        disabled
        title="No Pending Changes, Site is Live"
        className="rounded-lg border border-gray-200 bg-gray-50 text-gray-400 px-4 py-2 text-sm font-medium cursor-not-allowed"
      >
        Publish
      </button>
    );
  }

  return null;
}
