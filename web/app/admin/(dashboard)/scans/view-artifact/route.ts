import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getSignedAssetUrl } from '@/lib/s3/assets';

/**
 * GET counterpart to `viewRawArtifactAction` (`[scanId]/actions.ts`), for
 * call sites that need a real `<a target="_blank">` link rather than a
 * form-submitted Server Action. Next.js Server Actions are intercepted and
 * dispatched by React's client-side runtime, not a native browser form
 * submission — `target="_blank"` on a Server-Action form is a no-op, since
 * the browser never actually performs a form POST to redirect. A genuine
 * `<a href>` navigation has no such limitation. Same auth/validation as the
 * Server Action; same short-lived signed URL as the destination.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const key = new URL(request.url).searchParams.get('key');
  if (!key || !key.startsWith('scans/')) {
    return new NextResponse('Invalid artifact key', { status: 400 });
  }

  const url = await getSignedAssetUrl(key);
  return NextResponse.redirect(url);
}
