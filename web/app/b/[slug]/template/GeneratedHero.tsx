import Image from 'next/image';
import { V, toTelHref, isValidPhone } from './tokens';

interface Props {
  headline: string;
  subheadline: string;
  ctaText: string;
  phone?: string;
  serviceArea?: string;
  heroImageUrl?: string;
}

export function GeneratedHero({
  headline,
  subheadline,
  ctaText,
  phone,
  serviceArea,
  heroImageUrl,
}: Props) {
  const hasPhone = isValidPhone(phone);

  return (
    <section className="relative flex items-center min-h-[88vh] overflow-hidden">
      {/* Background image or primary-color gradient fallback */}
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: V.primary }} />
      )}

      {/* Dark gradient overlay — always present for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: heroImageUrl
            ? 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 w-full">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          {serviceArea && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 px-4 py-1.5 mb-5">
              <svg className="w-3.5 h-3.5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-white/90">Serving {serviceArea}</span>
            </div>
          )}

          {/* Headline */}
          <h1
            className="font-extrabold text-white leading-[1.1] mb-5 tracking-tight"
            style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4rem)' }}
          >
            {headline}
          </h1>

          {/* Sub-headline */}
          <p className="text-white/85 mb-8 leading-relaxed max-w-xl" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}>
            {subheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              style={{ backgroundColor: V.accent }}
            >
              {ctaText}
            </a>
            {hasPhone && (
              <a
                href={toTelHref(phone!)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-white bg-white/15 backdrop-blur-sm border border-white/30 transition-all hover:bg-white/25"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
