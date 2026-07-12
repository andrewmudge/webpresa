import { V, toTelHref, isValidPhone } from './tokens';

interface Props {
  ctaText: string;
  phone?: string;
}

export function FinalCTA({ ctaText, phone }: Props) {
  const hasPhone = isValidPhone(phone);

  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ backgroundColor: V.primary }}
    >
      {/* Decorative circles */}
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-5 bg-white" />
      <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full opacity-5 bg-white" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
          Ready for a fix? Let&apos;s talk.
        </h2>
        <p className="text-white/75 mb-10 max-w-md mx-auto">
          Schedule service today — fast response, professional results.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-bold transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{ backgroundColor: V.accent, color: '#fff' }}
          >
            {ctaText}
          </a>
          {hasPhone && (
            <a
              href={toTelHref(phone!)}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-bold text-white bg-white/15 border border-white/25 transition-all hover:bg-white/25"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
