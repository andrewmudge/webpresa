import { ResetPasswordForm } from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ email?: string }>;
}

/**
 * Public confirm-step for the Cognito `ForgotPassword` flow — reached after
 * "Send password reset email" (Settings' Account card, or a future
 * sign-in-page link) emails a code. No session required; the code itself
 * proves email ownership, same trust model as `/claim/[claimToken]`.
 */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8">
          <div className="mb-8 text-center">
            <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
            <p className="text-sm text-gray-500 mt-1">Reset your password</p>
          </div>
          <ResetPasswordForm email={email} />
        </div>
      </div>
    </div>
  );
}
