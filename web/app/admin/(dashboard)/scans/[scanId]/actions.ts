'use server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getSignedAssetUrl } from '@/lib/s3/assets';

/**
 * Redirects to a short-lived signed URL for a private scan artifact
 * (`crawl.json`/`extracted.json`) — these are never proxied publicly (only
 * `scans/{businessId}/{scanId}/images/` is, see `app/api/assets/[...key]/
 * route.ts`), so admin viewing goes through `getSignedAssetUrl` instead.
 */
export async function viewRawArtifactAction(key: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  if (!key.startsWith('scans/')) throw new Error('Invalid artifact key');

  const url = await getSignedAssetUrl(key);
  redirect(url);
}
