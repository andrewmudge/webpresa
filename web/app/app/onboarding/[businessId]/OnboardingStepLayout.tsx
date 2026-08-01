/**
 * Shared two-column workspace for Review/Domain/Publish — left column is
 * the current step's content (~40-45% on desktop), right is the website
 * preview (~55-60%); stacks to a single column on mobile with the preview
 * below.
 */
export function OnboardingStepLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,42%)_minmax(0,58%)] lg:items-start lg:gap-10">
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
