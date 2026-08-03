import { SignInForm } from './SignInForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ next?: string; accountDeleted?: string }>;
}

/**
 * Customer sign-in for a returning owner resuming checkout without a claim
 * token (Stage 17) — claiming a new business always starts at
 * `/claim/[claimToken]`, never here. `accountDeleted=1` is the landing
 * state after a successful Delete Account (Settings, Danger Zone) — the
 * session is already cleared by the time this renders.
 */
export default async function CustomerSignInPage({ searchParams }: Props) {
  const { next, accountDeleted } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8">
          <div className="mb-8 text-center">
            <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>
          {accountDeleted === '1' && (
            <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              Your account has been permanently deleted.
            </div>
          )}
          <SignInForm next={next} />
        </div>
      </div>
    </div>
  );
}
