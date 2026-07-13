import { V } from './tokens';
import type { PreviewService } from '@/domain/models/site-preview';

interface Props {
  services: PreviewService[];
}

export function ServicesGrid({ services }: Props) {
  const [featured, ...rest] = services;

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Our Services
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 max-w-xl leading-tight">
            Professional work, done right
          </h2>
          <p className="mt-3 text-gray-500 max-w-lg">
            From routine maintenance to complex projects — we handle it all with expertise and care.
          </p>
        </div>

        {/* Services layout */}
        {services.length === 1 ? (
          // Single service: full-width
          <ServiceCard service={featured} featured />
        ) : services.length === 2 ? (
          // Two services: equal columns
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {services.map((s, i) => <ServiceCard key={i} service={s} />)}
          </div>
        ) : (
          // 3+ services: featured card + grid
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Featured service */}
            <div className="lg:col-span-2">
              <ServiceCard service={featured} featured />
            </div>
            {/* Rest */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5 content-start">
              {rest.map((s, i) => <ServiceCard key={i} service={s} />)}
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-8">
          <p className="text-sm text-gray-400">Ready to get started?</p>
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

function ServiceCard({ service, featured = false }: { service: PreviewService; featured?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-6 h-full flex flex-col transition-shadow hover:shadow-md ${
        featured
          ? 'text-white min-h-[200px]'
          : 'bg-[#F4F7FA] border border-slate-100'
      }`}
      style={featured ? { backgroundColor: V.primary } : undefined}
    >
      {/* Icon circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-sm font-bold flex-shrink-0"
        style={
          featured
            ? { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }
            : { backgroundColor: V.accent, color: '#fff' }
        }
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      </div>
      <h3 className={`font-bold text-lg mb-2 ${featured ? 'text-white' : 'text-gray-900'}`}>
        {service.name}
      </h3>
      <p className={`text-sm leading-relaxed flex-1 ${featured ? 'text-white/80' : 'text-gray-500'}`}>
        {service.description}
      </p>
    </div>
  );
}
