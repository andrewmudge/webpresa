import { V, toTelHref, toMailtoHref, isValidPhone, isValidEmail } from './tokens';

interface Props {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
}

export function ContactSection({ phone, email, address, hours }: Props) {
  const hasPhone = isValidPhone(phone);
  const hasEmail = isValidEmail(email);

  return (
    <section id="contact" className="py-20 bg-(--site-background)">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Get in Touch
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text) mb-3">
            Ready to get started?
          </h2>
          <p className="text-(--site-muted) max-w-md mx-auto">
            Reach out and we&apos;ll get back to you promptly.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          {hasPhone && (
            <a
              href={toTelHref(phone!)}
              className="w-full sm:w-[calc(50%-0.5rem)] lg:w-60 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-white transition-all hover:scale-[1.02] hover:shadow-lg text-center"
              style={{ backgroundColor: V.primary }}
            >
              <svg className="w-7 h-7 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-xs uppercase tracking-wide font-semibold opacity-75">Call us</span>
              <span className="text-base font-bold">{phone}</span>
            </a>
          )}

          {hasEmail && (
            <a
              href={toMailtoHref(email!)}
              className="w-full sm:w-[calc(50%-0.5rem)] lg:w-60 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 transition-all hover:scale-[1.02] hover:shadow-md border-2 text-center"
              style={{ borderColor: V.primary, color: V.primary }}
            >
              <svg className="w-7 h-7 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs uppercase tracking-wide font-semibold opacity-60">Email us</span>
              <span className="text-sm font-bold break-all">{email}</span>
            </a>
          )}

          {(address || hours) && (
            <div
              className="w-full sm:w-[calc(50%-0.5rem)] lg:w-60 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 bg-(--site-surface) border border-(--site-border) text-center"
            >
              <svg className="w-7 h-7 text-(--site-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {address && <p className="text-xs text-(--site-muted) font-medium leading-relaxed">{address}</p>}
              {hours && <p className="text-xs text-(--site-muted) mt-1">{hours}</p>}
            </div>
          )}

          {!hasPhone && !hasEmail && !address && !hours && (
            <div className="w-full text-center text-(--site-muted) py-6">
              <p className="text-sm">Contact information coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
