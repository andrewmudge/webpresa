interface SaveBannerProps {
  isReadOnly?: boolean;
  /** Already-encoded, as it arrives from a `?error=...` search param. */
  error?: string;
  saved?: string;
  readOnlyMessage?: string;
}

/**
 * The read-only / error / saved banner trio, previously copy-pasted
 * verbatim across `website/page.tsx`, `design/page.tsx`, and
 * `settings/page.tsx` (implementation.md, Stage 19.A). One shared
 * component now; `readOnlyMessage` covers the one real wording difference
 * that existed between call sites.
 */
export function SaveBanner({ isReadOnly, error, saved, readOnlyMessage = 'Editing is paused until your billing issue is resolved.' }: SaveBannerProps) {
  if (!isReadOnly && !error && !saved) return null;

  return (
    <div className="space-y-2">
      {isReadOnly && (
        <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {readOnlyMessage}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {saved && !error && (
        <div role="status" className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Saved.
        </div>
      )}
    </div>
  );
}
