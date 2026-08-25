import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { BUILD_SESSION_COOKIE_NAME, verifyBuildSession, buildSessionAuthorizes } from '@/lib/auth/build-session';
import { BuildProgress } from './BuildProgress';

export const metadata: Metadata = {
  title: 'Building your website — Webpresa',
};

/**
 * Authorized purely by the build-session cookie (see `lib/auth/build-session.ts`)
 * — there is no account yet at this point in the funnel, so there is
 * nothing else to check ownership against. A visitor with no matching
 * session (wrong buildId, expired, or never started a build) is sent back
 * to start over rather than shown any detail about someone else's build.
 */
export default async function BuildProgressPage({ params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;

  const cookieStore = await cookies();
  const session = await verifyBuildSession(cookieStore.get(BUILD_SESSION_COOKIE_NAME)?.value);
  if (!buildSessionAuthorizes(session, buildId)) {
    redirect('/build');
  }

  return <BuildProgress buildId={buildId} />;
}
