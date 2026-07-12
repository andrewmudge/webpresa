import { redirect } from 'next/navigation';
import Link from 'next/link';
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
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-gray-200">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="text-lg font-bold text-[--color-brand]">Webpresa</span>
          <p className="text-xs text-gray-400 mt-0.5">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
          <NavLink href="/admin/businesses">Businesses</NavLink>
          <NavLink href="/admin/previews">Previews</NavLink>
          <NavLink href="/admin/scans">Scans</NavLink>
          <NavLink href="/admin/postcards">Postcards</NavLink>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 px-2 mb-2">
            Signed in as <span className="font-medium text-gray-600">{session.sub}</span>
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left text-sm text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded transition-colors"
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
      className="block px-2 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-50 hover:text-[--color-brand] transition-colors"
    >
      {children}
    </Link>
  );
}
