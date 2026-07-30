'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, ExternalLink } from 'lucide-react';
import { customerSignOutAction } from '@/lib/auth/customer-actions';

/**
 * Customer dashboard shell — deliberately modeled on
 * `app/admin/(dashboard)/AdminSidebar.tsx`'s exact responsive pattern
 * (fixed sidebar `md:`+, hamburger-triggered slide-in drawer below it), per
 * implementation.md, Stage 19. Content and tone diverge on purpose: no
 * technical/provider language, a business switcher instead of a flat nav
 * list, and one dominant "View live site" action rather than an admin's
 * operational link list.
 */

interface BusinessSummary {
  businessId: string;
  name: string;
  slug: string;
}

interface AppSidebarProps {
  businesses: BusinessSummary[];
  signedInAs: string;
}

const NAV_ITEMS = [
  { segment: '', label: 'Overview' },
  { segment: 'website', label: 'Website' },
  { segment: 'design', label: 'Design' },
  { segment: 'billing', label: 'Billing' },
  { segment: 'settings', label: 'Settings' },
];

function extractBusinessId(pathname: string): string | null {
  const match = pathname.match(/^\/app\/businesses\/([^/]+)/);
  return match ? match[1] : null;
}

function Brand() {
  return (
    <Link href="/app" className="flex items-center gap-3">
      <Image src="/webpresa_w.png" alt="Webpresa" width={692} height={394} className="h-8 w-auto shrink-0" />
      <div>
        <span className="text-base font-bold text-white tracking-tight">Webpresa</span>
        <p className="text-xs text-white/50 leading-none mt-0.5">My Website</p>
      </div>
    </Link>
  );
}

function BusinessSwitcher({ businesses, currentId }: { businesses: BusinessSummary[]; currentId: string | null }) {
  const [open, setOpen] = useState(false);
  if (businesses.length === 0) return null;
  const current = businesses.find((b) => b.businessId === currentId);

  if (businesses.length === 1 || !currentId) {
    return (
      <div className="px-3 pt-3 pb-1">
        <p className="text-xs font-medium text-white/50 truncate">{current?.name ?? businesses[0].name}</p>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-1 relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
      >
        <span className="truncate font-medium">{current?.name ?? 'Select business'}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-3 right-3 mt-1 rounded-lg bg-white shadow-lg border border-gray-200 py-1 z-50">
          {businesses.map((b) => (
            <Link
              key={b.businessId}
              href={`/app/businesses/${b.businessId}`}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 text-sm truncate ${
                b.businessId === currentId ? 'font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Nav({ currentId, onNavigate }: { currentId: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();
  if (!currentId) return null;

  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="Website navigation">
      {NAV_ITEMS.map((item) => {
        const href = `/app/businesses/${currentId}${item.segment ? `/${item.segment}` : ''}`;
        const isActive = item.segment ? pathname.startsWith(href) : pathname === href;
        return (
          <Link
            key={item.segment}
            href={href}
            onClick={onNavigate}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Footer({ signedInAs }: { signedInAs: string }) {
  return (
    <div className="px-3 py-4 border-t border-white/10 space-y-1">
      <p className="text-xs text-white/40 px-2 mb-2 truncate">Signed in as {signedInAs}</p>
      <form action={customerSignOutAction}>
        <button
          type="submit"
          className="w-full text-left text-sm text-white/50 hover:text-white px-2 py-1.5 rounded transition-colors hover:bg-white/10"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export function AppSidebar({ businesses, signedInAs }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentId = extractBusinessId(pathname);
  const currentBusiness = businesses.find((b) => b.businessId === currentId);

  return (
    <>
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-brand shadow-lg">
        <div className="px-5 py-5 border-b border-white/10">
          <Brand />
        </div>
        <BusinessSwitcher businesses={businesses} currentId={currentId} />
        <Nav currentId={currentId} />
        {currentBusiness && (
          <div className="px-3 pb-2">
            <a
              href={`/b/${currentBusiness.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              View live site <ExternalLink size={13} />
            </a>
          </div>
        )}
        <Footer signedInAs={signedInAs} />
      </aside>

      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-brand px-4 py-3 shadow-lg">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-brand shadow-lg"
            >
              <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <BusinessSwitcher businesses={businesses} currentId={currentId} />
              <Nav currentId={currentId} onNavigate={() => setMobileOpen(false)} />
              {currentBusiness && (
                <div className="px-3 pb-2">
                  <a
                    href={`/b/${currentBusiness.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    View live site <ExternalLink size={13} />
                  </a>
                </div>
              )}
              <Footer signedInAs={signedInAs} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
