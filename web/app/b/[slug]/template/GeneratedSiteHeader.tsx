'use client';
import { useState } from 'react';
import { V, toTelHref, isValidPhone } from './tokens';

interface Props {
  businessName: string;
  phone?: string;
  serviceAreas?: string[];
  services?: { name: string }[];
}

export function GeneratedSiteHeader({ businessName, phone, serviceAreas, services }: Props) {
  const [open, setOpen] = useState(false);
  const hasPhone = isValidPhone(phone);

  const navLinks = [
    ...(services && services.length > 0 ? [{ label: 'Services', href: '#services' }] : []),
    { label: 'About', href: '#about' },
    ...(serviceAreas && serviceAreas.length > 0 ? [{ label: 'Service Areas', href: '#areas' }] : []),
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo / name */}
        <a href="#" className="font-extrabold text-lg tracking-tight" style={{ color: V.primary }}>
          {businessName}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Site navigation">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {hasPhone && (
            <a
              href={toTelHref(phone!)}
              className="flex items-center gap-1.5 text-sm font-semibold rounded-full border-2 px-4 py-1.5 transition-colors hover:text-white"
              style={{ borderColor: V.primary, color: V.primary }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = V.primary;
                (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '';
                (e.currentTarget as HTMLAnchorElement).style.color = V.primary;
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              {phone}
            </a>
          )}
          <a
            href="#contact"
            className="text-sm font-bold rounded-full px-5 py-2 text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: V.accent }}
          >
            Get a Quote
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            {hasPhone && (
              <a
                href={toTelHref(phone!)}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
                style={{ backgroundColor: V.primary }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Call {phone}
              </a>
            )}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-xl py-3 text-sm font-bold text-white"
              style={{ backgroundColor: V.accent }}
            >
              Get a Free Quote
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
