import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { uploadBusinessAsset } from '@/lib/s3/business-assets';
import { UploadValidationError } from '@/lib/s3/upload-validation';
import { hashIp } from '@/lib/claim/validate-token';
import { buildSelfServiceBuildRateLimitKey, checkAndIncrementSelfServiceBuildRateLimit } from '@/lib/db/claims';

/**
 * Uploads a single `/build` intake photo/logo immediately on file selection
 * — *before* the business exists and *before* the final "Build My Website"
 * submit. Necessary because bundling every file into that one final Server
 * Action request hit Vercel's platform-level ~4.5MB serverless function
 * request-body ceiling (separate from, and unconditionally lower than,
 * this app's own `serverActions.bodySizeLimit: '15mb'` in `next.config.ts`,
 * which only governs Next.js's own check and can't raise the platform's).
 * One photo at a time comfortably stays under that limit; six bundled
 * together plus a logo routinely didn't.
 *
 * No `businessId` exists yet at this point in the flow, so uploads are
 * scoped under a client-generated draft id instead (`draftId` — a
 * `crypto.randomUUID()` minted once when the wizard mounts, carrying no
 * privilege of its own — see `BuildWizard.tsx`). `uploadBusinessAsset`
 * doesn't care whether that first argument is a real `Business.businessId`;
 * it's only ever used as an S3 key-prefix segment, and `/api/assets/[...key]`
 * serves anything under `businesses/` with no per-id authorization check —
 * this app's asset proxy has never been access-controlled by business
 * ownership, self-service or otherwise. The resulting `/api/assets/...`
 * URL is submitted back as a plain hidden-input value on the final form
 * (`SelfServiceBuildInputSchema`'s existing `logoUrl`/`photoUrls` fields
 * already accept an already-uploaded path — this route is what produces
 * one), so `submitBuildAction` itself never touches raw file bytes again.
 */

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_TTL_BUFFER_MS = RATE_LIMIT_WINDOW_MS * 2;
// Generous relative to the 3/day build submission limit — one visitor
// legitimately uploads up to 7 files (1 logo + 6 photos) per draft, with
// room for a few retries/re-selections before finishing the wizard.
const PER_IP_UPLOAD_RATE_LIMIT = 40;

async function resolveIpHash(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

function isValidDraftId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const ipHash = await resolveIpHash();
  const windowBucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS).toString();
  const withinLimit = await checkAndIncrementSelfServiceBuildRateLimit({
    bucketKey: buildSelfServiceBuildRateLimitKey(`self_service_upload#ip#${ipHash}`, windowBucket),
    limit: PER_IP_UPLOAD_RATE_LIMIT,
    ttlEpochSeconds: Math.floor((Date.now() + RATE_LIMIT_TTL_BUFFER_MS) / 1000),
  });
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many uploads from this connection. Please try again later.' }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const draftId = String(formData.get('draftId') ?? '');
  const kind = formData.get('kind');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (!isValidDraftId(draftId)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (kind !== 'logo' && kind !== 'photo') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const keyPrefix = kind === 'logo' ? 'logo' : `photos/${crypto.randomUUID()}`;
    const url = await uploadBusinessAsset(draftId, file, keyPrefix);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Something went wrong uploading that file. Please try again.' }, { status: 500 });
  }
}
