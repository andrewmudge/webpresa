import 'server-only';
import type { Business } from '@/domain/models/business';
import { createBusiness } from '@/domain/factories/business.factory';
import { putBusiness, updateBusiness, resolveUniqueSlug } from '@/lib/db/businesses';
import { startScanWorkflow } from '@/lib/workflow/run-scan-workflow';
import { log } from '@/lib/logging/log';
import { resolveDuplicateForSelfService } from './resolve-duplicate';
import {
  SelfServiceBuildInputSchema,
  SelfServiceBuildCreateInputSchema,
  type SelfServiceBuildInput,
  type SelfServiceBuildCreateInput,
} from './schema';

/**
 * Self-service build orchestration — the anonymous-visitor counterpart to
 * the admin "Discover → Import → Run Scan" sequence. Reuses every existing
 * write path (`createBusiness`, `updateBusiness`, `startScanWorkflow`)
 * unchanged; the only new orchestration here is sequencing them for a
 * caller with no admin session and resolving duplicates against Webpresa's
 * existing business list first (`resolveDuplicateForSelfService`).
 *
 * Split into two steps — `createOrAttachSelfServiceBusiness` then
 * `triggerSelfServiceScan` — rather than one combined function, because the
 * `/build` Server Action needs a real `businessId` to upload logo/photo
 * files under (`uploadBusinessAsset` requires one) *before* the scan
 * workflow starts generating a preview from `Business.photoUrls`. Calling
 * `startSelfServiceBuild` end-to-end (below) is fine for a submission with
 * no fresh files to upload; the Server Action calls the two steps
 * separately, uploading in between, whenever there are files.
 *
 * `requestedBy` on the resulting `ScanExecution` is the businessId itself —
 * there is no admin username behind a self-service trigger.
 */

export const SELF_SERVICE_BLOCKED_MESSAGE =
  'This business may already be set up with Webpresa. If it’s yours, enter your access code or sign in instead.';

export type CreateOrAttachOutcome =
  | { status: 'ready'; businessId: string }
  | { status: 'blocked'; message: string };

/**
 * Resolves duplicates, creates (or attaches to an existing unclaimed)
 * `Business`, and writes every visitor-entered canonical field *except*
 * `logoUrl`/`photoUrls` — those are set by a follow-up `updateBusiness`
 * call once the caller has uploaded any files under the returned
 * `businessId` (see the module doc comment above).
 */
export async function createOrAttachSelfServiceBusiness(
  rawInput: SelfServiceBuildCreateInput,
): Promise<CreateOrAttachOutcome> {
  const input = SelfServiceBuildCreateInputSchema.parse(rawInput);

  const duplicate = await resolveDuplicateForSelfService({
    name: input.name,
    ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.address !== undefined && { address: { ...input.address, country: 'US' } }),
  });

  if (duplicate.outcome === 'blocked') {
    log({ level: 'warn', event: 'build.self_service.blocked_duplicate', component: 'self-service-build' });
    return { status: 'blocked', message: SELF_SERVICE_BLOCKED_MESSAGE };
  }

  let businessId: string;

  if (duplicate.outcome === 'attach') {
    businessId = duplicate.businessId;
  } else {
    const created = createBusiness({ name: input.name, industry: input.industry, source: 'self_service' });
    const uniqueSlug = await resolveUniqueSlug(created.slug);
    const record: Business = { ...created, slug: uniqueSlug };
    await putBusiness(record);
    businessId = record.businessId;
  }

  // Visitor-entered fields are canonical for either a fresh business or an
  // unclaimed one being attached to — `resolveDuplicateForSelfService`
  // already fails closed on any owned business before reaching this point,
  // so there is nothing here that could belong to someone else's account.
  await updateBusiness(businessId, {
    name: input.name,
    industry: input.industry,
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
    ...(input.address !== undefined && { address: { ...input.address, country: 'US' } }),
    ...(input.servicesOffered !== undefined && { servicesOffered: input.servicesOffered }),
    ...(input.serviceAreas !== undefined && { serviceAreas: input.serviceAreas }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.differentiators !== undefined && { differentiators: input.differentiators }),
    ...(input.socialLinks !== undefined && { socialLinks: input.socialLinks }),
  });

  return { status: 'ready', businessId };
}

export type TriggerScanOutcome =
  | { status: 'started'; scanExecutionId: string }
  | { status: 'conflict'; message: string }
  | { status: 'failed'; message: string };

export async function triggerSelfServiceScan(businessId: string): Promise<TriggerScanOutcome> {
  const result = await startScanWorkflow(businessId, businessId, 'self_service');

  if (result.status !== 'started' || !result.scanExecutionId) {
    log({
      level: 'warn',
      event: 'build.self_service.start_failed',
      component: 'self-service-build',
      businessId,
      message: result.message,
    });
    return {
      status: result.status === 'conflict' ? 'conflict' : 'failed',
      message: result.message ?? 'Could not start the build.',
    };
  }

  log({ event: 'build.self_service.started', component: 'self-service-build', businessId, scanExecutionId: result.scanExecutionId });
  return { status: 'started', scanExecutionId: result.scanExecutionId };
}

export type StartSelfServiceBuildOutcome =
  | { status: 'started'; businessId: string; scanExecutionId: string }
  | { status: 'blocked'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'failed'; message: string };

/**
 * Convenience composition of the two steps above for a submission with no
 * fresh photo/logo files to upload (`logoUrl`/`photoUrls`, if present, are
 * already-resolved `/api/assets/...` paths). The `/build` Server Action
 * calls the two steps directly instead, uploading files in between, when
 * there's anything fresh to upload.
 */
export async function startSelfServiceBuild(rawInput: SelfServiceBuildInput): Promise<StartSelfServiceBuildOutcome> {
  const input = SelfServiceBuildInputSchema.parse(rawInput);

  const created = await createOrAttachSelfServiceBusiness(input);
  if (created.status === 'blocked') {
    return { status: 'blocked', message: created.message };
  }

  if (input.logoUrl !== undefined || input.photoUrls !== undefined) {
    await updateBusiness(created.businessId, {
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.photoUrls !== undefined && { photoUrls: input.photoUrls }),
    });
  }

  const triggered = await triggerSelfServiceScan(created.businessId);
  if (triggered.status !== 'started') {
    return { status: triggered.status, message: triggered.message };
  }

  return { status: 'started', businessId: created.businessId, scanExecutionId: triggered.scanExecutionId };
}
