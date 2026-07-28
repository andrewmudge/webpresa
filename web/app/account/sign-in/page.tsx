import { SignInForm } from './SignInForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ next?: string }>;
}

/**
 * Customer sign-in for a returning owner resuming checkout without a claim
 * token (Stage 17) — claiming a new business always starts at
 * `/claim/[claimToken]`, never here.
 */
export default async function CustomerSignInPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8">
          <div className="mb-8 text-center">
            <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
          </div>
          <SignInForm next={next} />
        </div>
      </div>
    </div>
  );
}
