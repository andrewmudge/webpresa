import Image from 'next/image';
import { V } from './tokens';
import { externalLinkAttrs, type ResolvedCta } from './cta';

interface Differentiator {
  title: string;
  description: string;
}

interface Props {
  differentiators: Differentiator[];
  aboutImageUrl?: string;
  businessName: string;
  primary: ResolvedCta | null;
}

// Only rendered when differentiators data is present
export function WhyChooseUs({ differentiators, aboutImageUrl, businessName, primary }: Props) {
  if (!differentiators || differentiators.length === 0) return null;

  return (
    <section className="py-20 bg-(--site-surface)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image column */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-(--site-border)">
              {aboutImageUrl ? (
                <Image
                  src={aboutImageUrl}
                  alt={`${businessName} team`}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                /* Placeholder when no image */
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: V.primary }}
                >
                  <svg className="w-20 h-20 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              )}
            </div>
            {/* Floating accent card */}
            <div
              className="absolute -bottom-4 -right-4 rounded-xl px-5 py-3 shadow-lg text-white"
              style={{ backgroundColor: V.accent }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Our promise</p>
              <p className="text-sm font-bold mt-0.5">Quality you can count on</p>
            </div>
          </div>

          {/* Content column */}
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
              Why Choose Us
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text) leading-tight mb-8">
              The experience your property deserves
            </h2>
            <ul className="space-y-5">
              {differentiators.map((d, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--site-primary) 10%, transparent)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: V.primary }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-(--site-text)">{d.title}</p>
                    <p className="text-sm text-(--site-muted) mt-0.5 leading-relaxed">{d.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            {primary && (
              <div className="mt-8">
                <a
                  href={primary.href}
                  {...externalLinkAttrs(primary)}
                  className="inline-flex items-center gap-2 text-sm font-bold"
                  style={{ color: V.primary }}
                >
                  {primary.label}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
