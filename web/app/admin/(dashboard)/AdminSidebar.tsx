'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { signOut } from '@/lib/auth/actions';

const NAV_ITEMS = [
  { href: '/admin/businesses', label: 'Businesses' },
  { href: '/admin/previews', label: 'Previews' },
  { href: '/admin/scans', label: 'Scans' },
  { href: '/admin/postcards', label: 'Postcards' },
];

function Brand() {
  return (
    <Link href="/admin/businesses" className="flex items-center gap-3">
      <Image src="/webpresa_logo.png" alt="Webpresa" width={32} height={32} className="rounded" />
      <div>
        <span className="text-base font-bold text-white tracking-tight">Webpresa</span>
        <p className="text-xs text-white/50 leading-none mt-0.5">Admin</p>
      </div>
    </Link>
  );
}

function NavLink({ href, onClick, children }: { href: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  );
}

function SignOutFooter({ signedInAs }: { signedInAs: string }) {
  return (
    <div className="px-3 py-4 border-t border-white/10">
      <p className="text-xs text-white/40 px-2 mb-2">
        Signed in as <span className="font-medium text-white/70">{signedInAs}</span>
      </p>
      <form action={signOut}>
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

export function AdminSidebar({ signedInAs }: { signedInAs: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — unchanged fixed-width layout at md: and up. */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-brand shadow-lg">
        <div className="px-5 py-5 border-b border-white/10">
          <Brand />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <SignOutFooter signedInAs={signedInAs} />
      </aside>

      {/* Mobile top bar + hamburger toggle — md:hidden. */}
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

      {/* Mobile drawer */}
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
              className="md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-brand shadow-lg"
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
              <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Admin navigation">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <SignOutFooter signedInAs={signedInAs} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
