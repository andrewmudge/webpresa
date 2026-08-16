interface Props {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}

export function LegalDocument({ title, effectiveDate, children }: Props) {
  return (
    <article>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Effective Date: {effectiveDate}</p>

      <div
        className="
          mt-8
          [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:first:mt-0
          [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900
          [&_p]:mt-4 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-gray-600
          [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5
          [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-gray-600
          [&_strong]:font-semibold [&_strong]:text-gray-900
          [&_a]:text-(--color-brand) [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-(--color-brand-dark)
        "
      >
        {children}
      </div>
    </article>
  );
}
