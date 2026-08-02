'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X, ChevronDown, ExternalLink, LayoutDashboard, Globe, CreditCard, Settings, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { customerSignOutAction } from '@/lib/auth/customer-actions';

/**
 * Customer dashboard shell — deliberately modeled on
 * `app/admin/(dashboard)/AdminSidebar.tsx`'s exact responsive pattern
 * (fixed sidebar `md:`+, hamburger-triggered slide-in drawer below it), per
 * implementation.md, Stage 19. Content and tone diverge on purpose: no
 * technical/provider language, a business switcher instead of a flat nav
 * list, and one dominant "View live site" action rather than an admin's
 * operational link list.
 *
 * Collapse/expand-to-icon-rail (Stage 19.A) is genuinely new — no
 * precedent existed anywhere in this codebase, admin included — added so a
 * customer can reclaim horizontal space for the preview-first website
 * editor. Only applies to the fixed `md:`+ sidebar; the mobile drawer is a
 * full off-canvas overlay regardless and has nothing to collapse.
 */

const COLLAPSED_STORAGE_KEY = 'webpresa:app-sidebar-collapsed';

/**
 * `localStorage` isn't available during SSR, and reading it via a plain
 * `useEffect`+`setState` (the first-pass approach) trips this repo's
 * `react-hooks/set-state-in-effect` lint rule — same fix as
 * `DraftChangesNotice.tsx` already uses for its own `localStorage` read:
 * `useSyncExternalStore` returns the server snapshot (`false`, i.e.
 * expanded) during hydration's first pass with no mismatch, then re-renders
 * with the real persisted value immediately after. `setCollapsedPreference`
 * is this store's only writer; it notifies subscribers itself rather than
 * relying on the browser's cross-tab `storage` event (which never fires in
 * the same tab that made the write).
 */
const collapsedListeners = new Set<() => void>();
function getCollapsedSnapshot(): boolean {
  return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
}
function getCollapsedServerSnapshot(): boolean {
  return false;
}
function subscribeToCollapsed(onChange: () => void): () => void {
  collapsedListeners.add(onChange);
  return () => {
    collapsedListeners.delete(onChange);
  };
}
function setCollapsedPreference(value: boolean): void {
  window.localStorage.setItem(COLLAPSED_STORAGE_KEY, value ? '1' : '0');
  collapsedListeners.forEach((listener) => listener());
}

interface BusinessSummary {
  businessId: string;
  name: string;
  slug: string;
}

interface AppSidebarProps {
  businesses: BusinessSummary[];
  signedInAs: string;
  /** From the customer's Cognito profile (`given_name`/`family_name`) —
   *  undefined for an account created before these were collected at
   *  signup, or if the lookup itself failed; `Footer` falls back to
   *  deriving something from `signedInAs` (the email) in that case. */
  firstName?: string;
  lastName?: string;
}

const NAV_ITEMS = [
  { segment: '', label: 'Overview', icon: LayoutDashboard },
  { segment: 'website', label: 'Website', icon: Globe },
  { segment: 'billing', label: 'Subscription', icon: CreditCard },
  { segment: 'settings', label: 'Settings', icon: Settings },
];

function extractBusinessId(pathname: string): string | null {
  const match = pathname.match(/^\/app\/businesses\/([^/]+)/);
  return match ? match[1] : null;
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/app" className="flex items-center gap-3" title="Webpresa">
      {/* Fully unconstrained-but-bounded on both axes when collapsed
          (`h-auto max-h-8 max-w-8`, no fixed dimension) so the browser picks
          the largest size that fits within both caps while preserving the
          logo's real aspect ratio — a fixed `h-8` here (the expanded-only
          treatment) combined with the collapsed rail's much narrower
          available width let Tailwind's `max-width:100%` preflight reset
          cap the rendered width while height stayed pinned, stretching the
          mark out of proportion. */}
      <Image
        src="/webpresa_w.png"
        alt="Webpresa"
        width={692}
        height={394}
        className={`w-auto shrink-0 ${collapsed ? 'h-auto max-h-8 max-w-8' : 'h-8'}`}
      />
      {!collapsed && (
        <div>
          <span className="text-base font-bold text-white tracking-tight">Webpresa</span>
          <p className="text-xs text-white/50 leading-none mt-0.5">My Website</p>
        </div>
      )}
    </Link>
  );
}

function BusinessSwitcher({ businesses, currentId, collapsed }: { businesses: BusinessSummary[]; currentId: string | null; collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  if (businesses.length === 0 || collapsed) return null;
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

function Nav({ currentId, onNavigate, collapsed }: { currentId: string | null; onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  if (!currentId) return null;

  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="Website navigation">
      {NAV_ITEMS.map((item) => {
        const href = `/app/businesses/${currentId}${item.segment ? `/${item.segment}` : ''}`;
        const isActive = item.segment ? pathname.startsWith(href) : pathname === href;
        const Icon = item.icon;
        return (
          <Link
            key={item.segment}
            href={href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              collapsed ? 'justify-center' : ''
            } ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Prefers the customer's real name (Cognito `given_name`/`family_name`,
 * collected at signup); falls back to deriving something reasonable from
 * their email for accounts that predate that collection or when the
 * Cognito lookup fails — never blank, never the raw sub.
 */
function resolveDisplayIdentity(signedInAs: string, firstName?: string, lastName?: string): { name: string; initial: string } {
  if (firstName) {
    const name = lastName ? `${firstName} ${lastName}` : firstName;
    return { name, initial: firstName[0].toUpperCase() };
  }
  const emailLocalPart = signedInAs.split('@')[0] || signedInAs;
  return { name: emailLocalPart, initial: (emailLocalPart[0] ?? '?').toUpperCase() };
}

function Footer({ signedInAs, firstName, lastName, collapsed }: { signedInAs: string; firstName?: string; lastName?: string; collapsed?: boolean }) {
  const { name, initial } = resolveDisplayIdentity(signedInAs, firstName, lastName);

  return (
    <div className="px-3 py-4 border-t border-white/10">
      <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`} title={collapsed ? name : undefined}>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {initial}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            <form action={customerSignOutAction}>
              <button type="submit" className="text-xs text-white/50 hover:text-white transition-colors">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
      {collapsed && (
        <form action={customerSignOutAction} className="mt-2">
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="flex w-full items-center justify-center rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </form>
      )}
    </div>
  );
}

export function AppSidebar({ businesses, signedInAs, firstName, lastName }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeToCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot);
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();
  const currentId = extractBusinessId(pathname);
  const currentBusiness = businesses.find((b) => b.businessId === currentId);

  function toggleCollapsed() {
    setCollapsedPreference(!collapsed);
  }

  return (
    <>
      <aside
        className={`hidden md:flex flex-shrink-0 flex-col bg-brand shadow-lg transition-[width] motion-reduce:transition-none duration-150 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`border-b border-white/10 ${collapsed ? 'px-3 py-4' : 'px-5 py-5'}`}>
          <div className={`flex items-center ${collapsed ? 'flex-col gap-3' : 'justify-between gap-2'}`}>
            <Brand collapsed={collapsed} />
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="shrink-0 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>
        <BusinessSwitcher businesses={businesses} currentId={currentId} collapsed={collapsed} />
        <Nav currentId={currentId} collapsed={collapsed} />
        {currentBusiness && (
          <div className="px-3 pb-2">
            <a
              href={`/b/${currentBusiness.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? 'View live site' : undefined}
              aria-label={collapsed ? 'View live site' : undefined}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span>View live site</span>}
            </a>
          </div>
        )}
        <Footer signedInAs={signedInAs} firstName={firstName} lastName={lastName} collapsed={collapsed} />
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
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: shouldReduceMotion ? 0 : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: shouldReduceMotion ? 0 : '-100%' }}
              transition={{ type: shouldReduceMotion ? false : 'tween', duration: shouldReduceMotion ? 0 : 0.2 }}
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
              <Footer signedInAs={signedInAs} firstName={firstName} lastName={lastName} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
