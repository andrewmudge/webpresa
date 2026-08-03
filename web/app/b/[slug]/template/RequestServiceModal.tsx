'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { RequestServiceForm } from './RequestServiceForm';

interface RequestServiceContextValue {
  openRequestService: () => void;
}

const RequestServiceContext = createContext<RequestServiceContextValue | null>(null);

/** Read by `CtaButton` to open the shared request-service dialog from anywhere in the template. */
export function useRequestService(): RequestServiceContextValue {
  const ctx = useContext(RequestServiceContext);
  if (!ctx) throw new Error('useRequestService must be used within a RequestServiceProvider');
  return ctx;
}

interface RequestServiceProviderProps {
  businessName: string;
  phone?: string;
  /** The trusted business slug — the only identifier `submitLeadAction` actually needs; it re-resolves everything else server-side. */
  slug: string;
  /** Stage 20 — whether this business's plan includes lead capture (`hasPlanCapability`). */
  leadCaptureEnabled: boolean;
  children: ReactNode;
}

/**
 * Wraps the whole public preview template so every CTA button — hero,
 * header, mobile sticky bar, final CTA band, etc. — can trigger the same
 * shared request-service dialog regardless of which section it lives in.
 *
 * Renders as a centered modal on desktop and a full-screen drawer that
 * slides up from the bottom on mobile (single component, breakpoint-driven
 * via Tailwind classes rather than two separate implementations).
 */
export function RequestServiceProvider({ businessName, phone, slug, leadCaptureEnabled, children }: RequestServiceProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Stage 20 defense-in-depth: CTA resolution already omits the "Request
  // Service" button entirely for a Basic-plan business (see
  // `resolvePreviewCta` in `cta.tsx`), so `openRequestService` should never
  // actually get called when `leadCaptureEnabled` is false — but this
  // Provider is the one shared chokepoint every trigger goes through, so it
  // no-ops here too rather than trusting that CTA resolution is the only
  // path that could ever call it.
  const openRequestService = useCallback(() => {
    if (leadCaptureEnabled) setIsOpen(true);
  }, [leadCaptureEnabled]);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, close]);

  const value = useMemo(() => ({ openRequestService }), [openRequestService]);

  return (
    <RequestServiceContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center">
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-service-heading"
              className="relative z-10 flex w-full flex-col overflow-hidden bg-(--site-background) shadow-2xl
                h-[92vh] rounded-t-3xl
                md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-2xl"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between border-b border-(--site-border) px-5 py-4 shrink-0">
                <h2 id="request-service-heading" className="text-lg font-bold text-(--site-text)">
                  Request Service
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-full p-1.5 text-(--site-muted) hover:bg-(--site-surface) hover:text-(--site-text) transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-5">
                <RequestServiceForm businessName={businessName} phone={phone} slug={slug} onSuccess={close} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </RequestServiceContext.Provider>
  );
}
