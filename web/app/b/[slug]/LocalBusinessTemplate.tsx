import type { SitePreview } from '@/domain/models/site-preview';
import Link from 'next/link';
import { ClaimBanner } from './ClaimBanner';

interface Props {
  preview: SitePreview;
  businessName: string;
  isClaimed: boolean;
  isDraft: boolean;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

function formatTelLink(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '')}`;
}

function isValidPhone(phone: string | undefined): phone is string {
  if (!phone) return false;
  return phone.replace(/\D/g, '').length >= 7;
}

function isValidEmail(email: string | undefined): email is string {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function LocalBusinessTemplate({
  preview,
  businessName,
  isClaimed,
  isDraft,
  isAdmin,
}: Props) {
  const { content, theme } = preview;
  const phone = isValidPhone(content.contact.phone) ? content.contact.phone : null;
  const email = isValidEmail(content.contact.email) ? content.contact.email : null;

  return (
    <div
      style={
        {
          '--preview-primary': theme.primaryColor,
          '--preview-accent': theme.accentColor,
          fontFamily: theme.fontFamily,
        } as React.CSSProperties
      }
      className="min-h-screen bg-white text-gray-900"
    >
      {/* Admin draft banner */}
      {isDraft && isAdmin && (
        <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-semibold py-2 px-4">
          DRAFT — visible to admins only
        </div>
      )}

      {/* Claim banner (unclaimed, published) */}
      {!isClaimed && !isDraft && <ClaimBanner businessName={businessName} />}

      {/* ---------------------------------------------------------------- */}
      {/* Navbar                                                           */}
      {/* ---------------------------------------------------------------- */}
      <header
        className="sticky top-0 z-40 shadow-sm"
        style={{ backgroundColor: 'var(--preview-primary)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="text-white font-bold text-lg truncate">{businessName}</span>
          {phone && (
            <a
              href={formatTelLink(phone)}
              className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {phone}
            </a>
          )}
          <a
            href="#contact"
            className="text-sm font-semibold rounded-lg px-4 py-1.5 transition-colors"
            style={{
              backgroundColor: 'var(--preview-accent)',
              color: '#fff',
            }}
          >
            {content.hero.ctaText}
          </a>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section
        className="py-20 px-4 sm:px-6 text-center"
        style={{ backgroundColor: 'var(--preview-primary)' }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            {content.hero.headline}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            {content.hero.subheadline}
          </p>
          <a
            href="#contact"
            className="inline-block rounded-xl px-8 py-3 text-base font-bold shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--preview-accent)', color: '#fff' }}
          >
            {content.hero.ctaText}
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Tagline strip                                                    */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-gray-50 border-b border-gray-100 py-6 px-4 text-center">
        <p className="text-lg font-medium text-gray-700 italic">{content.tagline}</p>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Services                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-10"
            style={{ color: 'var(--preview-primary)' }}
          >
            Our Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.services.map((service, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="w-10 h-10 rounded-full mb-4 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: 'var(--preview-accent)' }}
                >
                  {i + 1}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* About                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-6"
            style={{ color: 'var(--preview-primary)' }}
          >
            About Us
          </h2>
          <p className="text-gray-600 leading-relaxed text-base sm:text-lg">
            {content.aboutText}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Contact                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="contact" className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-10"
            style={{ color: 'var(--preview-primary)' }}
          >
            Contact Us
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center sm:items-stretch">
            {phone && (
              <a
                href={formatTelLink(phone)}
                className="flex items-center gap-3 rounded-xl px-6 py-4 text-white font-semibold w-full sm:w-auto justify-center transition-opacity hover:opacity-90 shadow"
                style={{ backgroundColor: 'var(--preview-primary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-3 rounded-xl px-6 py-4 font-semibold w-full sm:w-auto justify-center transition-colors border-2 shadow"
                style={{
                  borderColor: 'var(--preview-primary)',
                  color: 'var(--preview-primary)',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {email}
              </a>
            )}
          </div>
          {content.contact.address && (
            <p className="mt-8 text-center text-gray-500 text-sm">
              <svg
                className="w-4 h-4 inline mr-1 -mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {content.contact.address}
            </p>
          )}
          {!phone && !email && !content.contact.address && (
            <p className="text-center text-gray-400 mt-4">Contact information coming soon.</p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer
        className="py-8 px-4 text-center text-sm"
        style={{ backgroundColor: 'var(--preview-primary)', color: 'rgba(255,255,255,0.6)' }}
      >
        <p className="font-medium text-white/80 mb-1">{businessName}</p>
          {!isClaimed && (
            <p className="text-xs">
              Website by{' '}
              <Link href="/" className="underline hover:text-white transition-colors">
                Webpresa
              </Link>
            </p>
          )}
      </footer>
    </div>
  );
}
