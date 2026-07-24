'use server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { scoreBusinessWebsite } from '@/lib/scoring/score-business';
import { getBusinessById, putBusiness, updateBusiness } from '@/lib/db/businesses';
import { QUALIFICATION_RESULTS } from '@/domain/models/website-assessment';

/**
 * Stage 15 (AI Prospect Qualification & Website Analysis) admin actions —
 * kept in their own module, following this directory's established
 * one-concern-per-file split (see `enrichment-actions.ts`, `screenshot-
 * actions.ts`). `scoreWebsiteAction` mirrors `enrichWebsiteAction`'s
 * redirect + query-param result pattern; the override actions mirror
 * `applyFoundContactFieldAction`'s single-field-update shape.
 */

function outcomeQueryParam(status: string): string {
  return `?scoringResult=${encodeURIComponent(status)}`;
}

export async function scoreWebsiteAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await scoreBusinessWebsite(businessId);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}

const QUALIFICATION_SET = new Set<string>(QUALIFICATION_RESULTS);

/**
 * Admin override — stored on `adminReviewedScore`/`adminReviewedQualification`
 * only. Never touches `qualification`/`websiteQualityScore` (the AI-produced
 * values), so the original assessment always remains recoverable per the
 * Stage 15 acceptance criteria.
 */
export async function overrideScoreAction(businessId: string, redirectTo: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const scoreRaw = String(formData.get('adminReviewedScore') ?? '').trim();
  const qualificationRaw = String(formData.get('adminReviewedQualification') ?? '').trim();

  const score = scoreRaw === '' ? undefined : Number(scoreRaw);
  const qualification = QUALIFICATION_SET.has(qualificationRaw)
    ? (qualificationRaw as (typeof QUALIFICATION_RESULTS)[number])
    : undefined;

  if (score !== undefined && (!Number.isInteger(score) || score < 0 || score > 100)) {
    redirect(`${redirectTo}?scoreOverride=invalid`);
  }

  await updateBusiness(businessId, {
    ...(score !== undefined ? { adminReviewedScore: score } : {}),
    ...(qualification ? { adminReviewedQualification: qualification } : {}),
  });

  redirect(`${redirectTo}?scoreOverride=saved`);
}

/**
 * Reverts the admin override back to the AI's own assessment — the override
 * fields themselves are cleared, never the underlying assessment. Uses
 * `putBusiness` with the two fields omitted rather than `updateBusiness`,
 * since `updateBusiness` builds its DynamoDB `UpdateExpression` directly
 * from the values it's given and is never safe to call with an explicit
 * `undefined` (see its doc comment in `lib/db/businesses.ts`) — omitting a
 * key from a full `putBusiness` write is this codebase's established way to
 * actually clear an optional field.
 */
export async function clearScoreOverrideAction(businessId: string, redirectTo: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const business = await getBusinessById(businessId);
  if (!business) throw new Error('Business not found');

  const cleared = { ...business, updatedAt: new Date().toISOString() };
  delete cleared.adminReviewedScore;
  delete cleared.adminReviewedQualification;
  await putBusiness(cleared);

  redirect(`${redirectTo}?scoreOverride=cleared`);
}
