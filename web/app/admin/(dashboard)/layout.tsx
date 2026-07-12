import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/auth/session';
import { signOut } from '@/lib/auth/actions';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminDashboardLayout({ children }: AdminLayoutProps) {
  const session = await getSession();
  if (!session) {
    redirect('/admin/sign-in');
  }

  return (
    <div className="min-h-screen flex bg-[#F0F4F8]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-brand shadow-lg">
        {/* Brand */}
        <Link href="/admin/businesses" className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <Image
            src="/webpresa_logo.png"
            alt="Webpresa"
            width={32}
            height={32}
            className="rounded"
          />
          <div>
            <span className="text-base font-bold text-white tracking-tight">Webpresa</span>
            <p className="text-xs text-white/50 leading-none mt-0.5">Admin</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Admin navigation">
          <NavLink href="/admin/businesses">Businesses</NavLink>
          <NavLink href="/admin/previews">Previews</NavLink>
          <NavLink href="/admin/scans">Scans</NavLink>
          <NavLink href="/admin/postcards">Postcards</NavLink>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <p className="text-xs text-white/40 px-2 mb-2">
            Signed in as <span className="font-medium text-white/70">{session.sub}</span>
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
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavLink — highlights the active route
// ---------------------------------------------------------------------------

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  );
}
