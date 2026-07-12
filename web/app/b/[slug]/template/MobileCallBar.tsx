'use client';
import { V, toTelHref, isValidPhone } from './tokens';

interface Props {
  phone?: string;
  ctaText: string;
}

// Sticky bar at the bottom of the viewport on mobile only.
// Hides on md+ screens — the header handles CTAs there.
export function MobileCallBar({ phone, ctaText }: Props) {
  const hasPhone = isValidPhone(phone);
  if (!hasPhone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-area-inset-bottom">
      <div className="flex gap-0 border-t border-white/20 shadow-2xl">
        <a
          href={toTelHref(phone!)}
          className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold text-white"
          style={{ backgroundColor: V.primary }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          Call Now
        </a>
        <a
          href="#contact"
          className="flex-1 flex items-center justify-center py-4 text-sm font-bold text-white"
          style={{ backgroundColor: V.accent }}
        >
          {ctaText}
        </a>
      </div>
    </div>
  );
}
