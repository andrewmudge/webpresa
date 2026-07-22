'use client';
import { useState } from 'react';
import Image from 'next/image';
import { V } from './tokens';
import { CtaIcon, type ResolvedCta } from './cta';
import { CtaButton } from './CtaButton';

interface Props {
  businessName: string;
  logoUrl?: string;
  serviceAreas?: string[];
  services?: { name: string }[];
  primary: ResolvedCta | null;
  secondary: ResolvedCta | null;
}

export function GeneratedSiteHeader({ businessName, logoUrl, serviceAreas, services, primary, secondary }: Props) {
  const [open, setOpen] = useState(false);

  const navLinks = [
    ...(services && services.length > 0 ? [{ label: 'Services', href: '#services' }] : []),
    { label: 'About', href: '#about' },
    ...(serviceAreas && serviceAreas.length > 0 ? [{ label: 'Service Areas', href: '#areas' }] : []),
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-(--site-background) border-b border-(--site-border) shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo / name — an uploaded logo always wins over the plain text name */}
        <a href="#" className="flex items-center shrink-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
              width={160}
              height={40}
              className="h-8 sm:h-9 w-auto object-contain"
              priority
            />
          ) : (
            <span className="font-extrabold text-lg tracking-tight" style={{ color: V.primary }}>
              {businessName}
            </span>
          )}
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Site navigation">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-(--site-muted) hover:text-(--site-text) transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {secondary && (
            <CtaButton
              cta={secondary}
              className="flex items-center gap-1.5 text-sm font-semibold rounded-full border-2 px-4 py-1.5 transition-colors hover:text-white"
              style={{ borderColor: V.primary, color: V.primary }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = V.primary;
                (e.currentTarget as HTMLElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '';
                (e.currentTarget as HTMLElement).style.color = V.primary;
              }}
            >
              <CtaIcon type={secondary.type} className="w-4 h-4" />
              {secondary.label}
            </CtaButton>
          )}
          {primary && (
            <CtaButton
              cta={primary}
              className="text-sm font-bold rounded-full px-5 py-2 text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: V.accent }}
            >
              {primary.label}
            </CtaButton>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-(--site-muted) hover:bg-(--site-surface)"
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
        <div className="md:hidden border-t border-(--site-border) bg-(--site-background) px-4 pb-4 pt-2 space-y-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-(--site-muted) hover:text-(--site-text)"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            {secondary && (
              <CtaButton
                cta={secondary}
                onNavigate={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
                style={{ backgroundColor: V.primary }}
              >
                <CtaIcon type={secondary.type} className="w-4 h-4" />
                {secondary.label}
              </CtaButton>
            )}
            {primary && (
              <CtaButton
                cta={primary}
                onNavigate={() => setOpen(false)}
                className="flex items-center justify-center rounded-xl py-3 text-sm font-bold text-white"
                style={{ backgroundColor: V.accent }}
              >
                {primary.label}
              </CtaButton>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
