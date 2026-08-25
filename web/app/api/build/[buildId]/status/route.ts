import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BUILD_SESSION_COOKIE_NAME, verifyBuildSession, buildSessionAuthorizes } from '@/lib/auth/build-session';
import { getSelfServiceBuildStatus } from '@/lib/build/complete-self-service-build';
import { resolveProgressLabel } from '@/lib/build/progress-labels';

/**
 * Polled by `/build/[buildId]`'s progress view. Customer-facing, so it
 * never exposes provider names or raw `ScanExecution`/`ScanWorkflowStep`
 * values — only the mapped `resolveProgressLabel` copy and a terminal
 * outcome. Authorized by the build-session cookie only (this route is
 * reachable long before any account/claim exists) — never trusts a bare
 * `buildId` from the URL alone.
 */
export async function GET(request: Request, { params }: { params: Promise<{ buildId: string }> }) {
  const { buildId } = await params;

  const cookieStore = await cookies();
  const session = await verifyBuildSession(cookieStore.get(BUILD_SESSION_COOKIE_NAME)?.value);
  if (!buildSessionAuthorizes(session, buildId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const status = await getSelfServiceBuildStatus(buildId);

  switch (status.outcome) {
    case 'not_found':
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    case 'failed':
      return NextResponse.json({ outcome: 'failed', message: status.message });
    case 'ready':
      return NextResponse.json({ outcome: 'ready', slug: status.slug });
    case 'in_progress': {
      const progress = resolveProgressLabel(status.currentStep, status.hasExistingWebsite);
      return NextResponse.json({ outcome: 'in_progress', ...progress });
    }
  }
}
