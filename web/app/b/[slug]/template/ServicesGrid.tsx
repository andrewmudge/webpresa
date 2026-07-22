import Image from 'next/image';
import { V } from './tokens';
import type { PreviewService } from '@/domain/models/site-preview';

interface Props {
  services: PreviewService[];
  /** An uploaded business photo always wins over the placeholder below. */
  featuredImageUrl?: string;
  /** Admin-editable heading override (`content.servicesSection`). Falls back to the built-in copy below when absent. */
  sectionHeadline?: string;
  sectionSubheadline?: string;
}

const MAX_FULL_SERVICES = 5;

export function ServicesGrid({ services, featuredImageUrl, sectionHeadline, sectionSubheadline }: Props) {
  const fullServices = services.slice(0, MAX_FULL_SERVICES);
  const compactServices = services.slice(MAX_FULL_SERVICES);
  const [featured, ...rest] = fullServices;

  return (
    <section id="services" className="py-20 bg-(--site-background)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Our Services
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text) max-w-xl leading-tight">
            {sectionHeadline || 'Professional work, done right'}
          </h2>
          <p className="mt-3 text-(--site-muted) max-w-lg">
            {sectionSubheadline ||
              'From routine maintenance to complex projects — we handle it all with expertise and care.'}
          </p>
        </div>

        {/* Services layout — capped to MAX_FULL_SERVICES full cards; any
            remaining services render as name-only pills below. */}
        {fullServices.length === 1 ? (
          // Single service: full-width
          <ServiceCard service={featured} featured imageUrl={featuredImageUrl} />
        ) : fullServices.length === 2 ? (
          // Two services: equal columns
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fullServices.map((s, i) => <ServiceCard key={i} service={s} />)}
          </div>
        ) : (
          // 3+ services: featured card + grid
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Featured service */}
            <div className="lg:col-span-2">
              <ServiceCard service={featured} featured imageUrl={featuredImageUrl} />
            </div>
            {/* Rest */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5 content-start">
              {rest.map((s, i) => <ServiceCard key={i} service={s} />)}
            </div>
          </div>
        )}

        {/* Secondary services: name only, no card chrome */}
        {compactServices.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {compactServices.map((s, i) => (
              <span
                key={i}
                className="rounded-full border border-(--site-border) bg-(--site-surface) px-4 py-2 text-sm font-medium text-(--site-text)"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}

        {/* CTA row */}
        <div className="mt-10 flex items-center justify-between border-t border-(--site-border) pt-8">
          <p className="text-sm text-(--site-muted)">Ready to get started?</p>
          <a
            href="#contact"
            className="text-sm font-bold rounded-xl px-5 py-2.5 text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: V.primary }}
          >
            Request service →
          </a>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  featured = false,
  imageUrl,
}: {
  service: PreviewService;
  featured?: boolean;
  imageUrl?: string;
}) {
  // Only apply the picture-background treatment when a real photo is
  // available — with no photo, the featured card matches the plain default
  // card look every other service card already uses, rather than falling
  // back to any placeholder image.
  const showPicture = featured && !!imageUrl;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 h-full flex flex-col transition-shadow hover:shadow-md bg-(--site-surface) border border-(--site-border) ${
        showPicture ? 'min-h-[200px] lg:border-0' : ''
      }`}
    >
      {/* Picture background on large displays only — matches the other cards below lg */}
      {showPicture && (
        <>
          <Image
            src={imageUrl!}
            alt=""
            fill
            className="hidden lg:block object-cover object-center"
            sizes="(min-width: 1024px) 40vw, 0px"
          />
          <div className="hidden lg:block absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
        </>
      )}

      {/* Icon circle */}
      <div
        className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center mb-4 text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: V.accent, color: '#fff' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      </div>
      {/* text-shadow must be a breakpoint-scoped class, not inline `style` —
          inline styles can't be responsive, and the picture background this
          shadow exists for is itself `hidden lg:block`. Applying it
          unconditionally left mobile with a shadow behind plain text and no
          image to justify it. */}
      <h3
        className={`relative z-10 font-bold text-lg mb-2 text-(--site-text) ${showPicture ? 'lg:text-white lg:[text-shadow:0_1px_3px_rgba(0,0,0,0.8)]' : ''}`}
      >
        {service.name}
      </h3>
      <p
        className={`relative z-10 text-sm leading-relaxed flex-1 line-clamp-4 text-(--site-muted) ${showPicture ? 'lg:text-white/80 lg:[text-shadow:0_1px_3px_rgba(0,0,0,0.8)]' : ''}`}
      >
        {service.description}
      </p>
    </div>
  );
}
