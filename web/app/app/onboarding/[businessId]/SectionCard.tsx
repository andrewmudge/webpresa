/**
 * Titled card wrapper for grouping onboarding form fields — scoped to
 * onboarding rather than evolving `FormBits.tsx`'s `Card` in place, since
 * that one is shared with the Settings/Contact tab and changing it would
 * visually change the dashboard as a side effect.
 */
export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-(--color-border) bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
