import type { MutableTimestampedRecord } from './common';

/**
 * Post-payment onboarding progress for one Business (Stage 19.x, Part 1).
 *
 * One record per Business — `businessId` is the table's partition key
 * directly (no separate generated `onboardingId`), the same pattern
 * `CustomerBillingProfile` (Stage 18) already uses for its one-to-one
 * `userId` key. Deliberately a standalone record, not fields on `Business`
 * — onboarding is a one-time orchestration concern layered over Stage 19's
 * reusable dashboard, not part of the business's own canonical data.
 */

export const ONBOARDING_STATUSES = ['not_started', 'in_progress', 'completed'] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

/**
 * Ordered wizard steps. `'complete'` is a terminal marker for `currentStep`
 * only — it never appears in `completedSteps` (see `ONBOARDING_COMPLETABLE_STEPS`).
 *
 * Order matters: Review runs before Domain because the business's corrected
 * name/city/state/service (captured during Review) feed Part 3's future
 * domain-name suggestions — see implementation.md, Stage 19.x, Part 1,
 * "Ordering rationale".
 */
export const ONBOARDING_COMPLETABLE_STEPS = ['welcome', 'review', 'domain', 'publish', 'tour'] as const;
export type OnboardingCompletableStep = (typeof ONBOARDING_COMPLETABLE_STEPS)[number];

export const ONBOARDING_STEPS = [...ONBOARDING_COMPLETABLE_STEPS, 'complete'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * Part 1 only ever writes `'defer'`. Part 2 adds `'existing'`; Part 3 adds
 * `'purchase'` — additive, the same pattern Stage 17/18 used for `Business`
 * fields, so this union is defined here once and each later part just uses
 * more of it rather than widening a type that already shipped.
 */
export const ONBOARDING_DOMAIN_DECISIONS = ['defer', 'existing', 'purchase'] as const;
export type OnboardingDomainDecision = (typeof ONBOARDING_DOMAIN_DECISIONS)[number];

export interface CustomerOnboarding extends MutableTimestampedRecord {
  /** Partition key — one onboarding record per business. */
  businessId: string;
  /** Cognito `sub` of the owning customer, for reference/logging only — ownership itself is always re-verified via `Business.ownerUserId`. */
  userId: string;

  status: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: OnboardingCompletableStep[];

  domainDecision?: OnboardingDomainDecision;
  /** Set starting Part 2 — resolved via `DomainConnection`'s `business-id-index`, not a dedicated onboarding-side index. */
  domainConnectionId?: string;
  domainDeferredAt?: string;

  /** Recorded as a distinct outcome from `tourSkippedAt` so "finished the tour" and "intentionally bypassed it" stay analytically distinguishable. */
  tourCompletedAt?: string;
  tourSkippedAt?: string;

  completedAt?: string;
}
