import { requireCustomerSession } from '@/lib/auth/customer-authorization';
import { getBusinessesByOwnerUserId } from '@/lib/db/businesses';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Customer dashboard shell (Stage 19) — the first shared layout under the
 * customer-facing tree (`/account/*` has never had one). Only a session
 * check happens here, mirroring `app/admin/(dashboard)/layout.tsx` — which
 * business a request is allowed to touch, and in what access mode, is
 * decided independently by each page/action (see `actions.ts`'s
 * `requireEditAccess`), never assumed from having reached this shell.
 */
export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await requireCustomerSession();
  const businesses = await getBusinessesByOwnerUserId(session.sub);

  return (
    // `h-screen` (a hard cap), not `min-h-screen` (only a floor) — with
    // just a minimum, this wrapper grows past 100vh on any page taller than
    // the viewport, so the *window* ends up doing the actual scrolling and
    // <main>'s `overflow-auto` never truly engages as a scroll container,
    // even though `overflow: auto` still makes browsers treat it as the
    // nearest scrolling ancestor for `position: sticky` bookkeeping. The
    // net effect: a sticky element inside <main> never sees any real scroll
    // events (main itself never moves) and just scrolls away like anything
    // else. Capping this wrapper to exactly the viewport height forces
    // <main> to be the one that actually scrolls, which is what makes
    // sticky work inside it (see the website editor's section nav).
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-[#F0F4F8]">
      <AppSidebar
        businesses={businesses.map((b) => ({ businessId: b.businessId, name: b.name, slug: b.slug }))}
        signedInAs={session.email}
      />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
