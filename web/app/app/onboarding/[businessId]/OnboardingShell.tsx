import Image from 'next/image';
import { HelpCircle, LogOut } from 'lucide-react';
import { customerSignOutAction } from '@/lib/auth/customer-actions';

/**
 * Distraction-free onboarding chrome — replaces the normal dashboard
 * sidebar (removed for onboarding via the `(dashboard)` route-group split,
 * see `app/app/(dashboard)/layout.tsx`) with a lightweight header: logo,
 * the business being set up, a Need-help contact, and a visually secondary
 * sign-out. Owns the full page shell (background/container) since nothing
 * above it in the tree does anymore.
 */
export function OnboardingShell({ businessName, children }: { businessName?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen page-ambient-bg">
      <header className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/webpresa_logo_horizontal_cropped_nobg.png"
            alt="Webpresa"
            width={1460}
            height={238}
            className="h-7 w-auto shrink-0"
          />
          {businessName && (
            <>
              <span className="shrink-0 text-gray-300" aria-hidden="true">/</span>
              <span className="truncate text-sm font-medium text-gray-500">{businessName}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <a
            href="mailto:hello@webpresa.com"
            className="hidden items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 sm:flex"
          >
            <HelpCircle size={15} />
            Need help?
          </a>
          <form action={customerSignOutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 pb-28 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
