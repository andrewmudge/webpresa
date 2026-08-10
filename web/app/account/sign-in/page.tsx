import { AccessPageShell } from '@/components/access/AccessPageShell';
import { ACCESS_BLUE } from '@/components/access/theme';
import { SuccessAlert } from '@/components/access/fields';
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
 *
 * Redesigned 2026-08-10 to match `/r`/`/claim/continue`'s theme via the
 * shared `AccessPageShell` — sign-in only, no create-account tab (that
 * flow only ever starts from a claim token/postcard code, never here).
 */
export default async function CustomerSignInPage({ searchParams }: Props) {
  const { next, accountDeleted } = await searchParams;

  return (
    <AccessPageShell eyebrow="Welcome back" headline="Sign in to your account." subtext="Manage and grow your Webpresa website.">
      {accountDeleted === '1' && (
        <div className="mb-4">
          <SuccessAlert>Your account has been permanently deleted.</SuccessAlert>
        </div>
      )}
      <SignInForm next={next} accentColor={ACCESS_BLUE} />
    </AccessPageShell>
  );
}
