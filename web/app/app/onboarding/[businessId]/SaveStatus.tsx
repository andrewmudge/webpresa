/**
 * Small save-state indicator for `OnboardingActionBar`'s center slot.
 * Every onboarding action ends in a `redirect()` — forward on success, or
 * back to the same page with `?error=` on failure — so there's no resting
 * point for a persistent "Saved" confirmation here; this only ever reflects
 * a real `useTransition` pending flag or a real error, never a fabricated
 * autosave state. `aria-live` so screen readers hear the transition.
 */
export function SaveStatus({ pending, error }: { pending?: boolean; error?: string | null }) {
  if (error) {
    return (
      <span role="alert" className="font-medium text-red-600">
        Couldn&apos;t save — {error}
      </span>
    );
  }
  if (pending) {
    return (
      <span aria-live="polite" className="text-gray-500">
        Saving…
      </span>
    );
  }
  return null;
}
