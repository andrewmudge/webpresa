import { V } from './tokens';
import { externalLinkAttrs, type ResolvedCta } from './cta';

interface Props {
  serviceAreas: string[];
  primary: ResolvedCta | null;
  /** Admin-editable heading override (`content.serviceAreasSection`). Falls back to the built-in copy below when absent. */
  sectionHeadline?: string;
  sectionSubheadline?: string;
}

// Only rendered when serviceAreas has entries
export function ServiceAreaSection({ serviceAreas, primary, sectionHeadline, sectionSubheadline }: Props) {
  if (!serviceAreas || serviceAreas.length === 0) return null;

  return (
    <section id="areas" className="py-20 bg-(--site-surface)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
          Coverage
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text) mb-3">
          {sectionHeadline || 'Areas We Serve'}
        </h2>
        <p className="text-(--site-muted) mb-10 max-w-md mx-auto">
          {sectionSubheadline || 'Providing fast, reliable service across the region.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {serviceAreas.map((area) => (
            <span
              key={area}
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: V.primary, color: V.primary }}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {area}
            </span>
          ))}
        </div>
        {primary && (
          <div className="mt-10">
            <a
              href={primary.href}
              {...externalLinkAttrs(primary)}
              className="text-sm font-bold transition-opacity hover:opacity-80"
              style={{ color: V.primary }}
            >
              {primary.label} →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
