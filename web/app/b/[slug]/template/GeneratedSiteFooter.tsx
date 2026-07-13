import Link from 'next/link';
import { V, isValidPhone, isValidEmail, toTelHref, toMailtoHref } from './tokens';
import type { PreviewService } from '@/domain/models/site-preview';

interface Props {
  businessName: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  services?: PreviewService[];
  serviceAreas?: string[];
  isClaimed: boolean;
}

export function GeneratedSiteFooter({
  businessName,
  phone,
  email,
  address,
  hours,
  services,
  serviceAreas,
  isClaimed,
}: Props) {
  const hasPhone = isValidPhone(phone);
  const hasEmail = isValidEmail(email);
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: V.primary }} className="text-white/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-white font-extrabold text-lg mb-3">{businessName}</p>
            {address && <p className="text-sm leading-relaxed mb-2">{address}</p>}
            {hasPhone && (
              <p className="text-sm mb-1">
                <a href={toTelHref(phone!)} className="hover:text-white transition-colors">{phone}</a>
              </p>
            )}
            {hasEmail && (
              <p className="text-sm">
                <a href={toMailtoHref(email!)} className="hover:text-white transition-colors">{email}</a>
              </p>
            )}
            {hours && <p className="text-sm mt-3 text-white/60">{hours}</p>}
          </div>

          {/* Services */}
          {services && services.length > 0 && (
            <div>
              <p className="text-white font-bold text-sm mb-4 uppercase tracking-wide">Services</p>
              <ul className="space-y-2">
                {services.slice(0, 6).map((s) => (
                  <li key={s.name}>
                    <a href="#services" className="text-sm hover:text-white transition-colors">
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Service areas */}
          {serviceAreas && serviceAreas.length > 0 && (
            <div>
              <p className="text-white font-bold text-sm mb-4 uppercase tracking-wide">Service Areas</p>
              <ul className="space-y-2">
                {serviceAreas.slice(0, 6).map((area) => (
                  <li key={area}>
                    <a href="#areas" className="text-sm hover:text-white transition-colors">{area}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Company */}
          <div>
            <p className="text-white font-bold text-sm mb-4 uppercase tracking-wide">Company</p>
            <ul className="space-y-2">
              <li><a href="#about" className="text-sm hover:text-white transition-colors">About</a></li>
              <li><a href="#services" className="text-sm hover:text-white transition-colors">Services</a></li>
              <li><a href="#contact" className="text-sm hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/40">
            &copy; {year} {businessName}. All rights reserved.
          </p>
          {!isClaimed && (
            <p className="text-xs text-white/30">
              Website by{' '}
              <Link href="/" className="hover:text-white/60 transition-colors underline">Webpresa</Link>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
