import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminDashboardLayout({ children }: AdminLayoutProps) {
  const session = await getSession();
  if (!session) {
    redirect('/admin/sign-in');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F0F4F8]">
      <AdminSidebar signedInAs={session.sub} />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
