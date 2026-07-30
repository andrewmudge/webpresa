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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F0F4F8]">
      <AppSidebar
        businesses={businesses.map((b) => ({ businessId: b.businessId, name: b.name, slug: b.slug }))}
        signedInAs={session.email}
      />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
