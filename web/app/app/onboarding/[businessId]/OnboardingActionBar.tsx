/**
 * Persistent bottom action bar shared across onboarding steps — pure
 * layout (sticky positioning, responsive stacking, safe-area padding).
 * Each slot's actual behavior (a plain `<Link>`, a `useTransition`-wrapped
 * submit button, `SaveStatus`) is supplied by the calling page — this
 * component makes no assumption about what's inside them.
 */
export function OnboardingActionBar({
  back,
  status,
  primary,
}: {
  back?: React.ReactNode;
  status?: React.ReactNode;
  primary?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-(--color-border) bg-white/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <div className="mx-auto flex max-w-5xl flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center sm:justify-start">{back ?? <span />}</div>
        {status && <div className="text-center text-xs text-gray-500 sm:text-sm">{status}</div>}
        <div className="flex justify-center sm:justify-end">{primary}</div>
      </div>
    </div>
  );
}
