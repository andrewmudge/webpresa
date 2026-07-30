'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createCheckoutSessionAction, type CheckoutActionState } from '@/app/account/checkout/actions';
import { WEBPRESA_PLANS, type WebpresaPlan } from '@/domain/constants/plans';

const PLAN_DETAILS: Record<WebpresaPlan, { label: string; price: string; description: string }> = {
  basic: {
    label: 'Basic',
    price: '$39/month',
    description: 'Single-page professionally designed website with city-specific SEO for your primary city.',
  },
  growth: {
    label: 'Growth',
    price: '$79/month',
    description: 'Expanded website with multiple city-specific SEO pages and Growth-tier lead forms.',
  },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Starting checkout…' : 'Continue to checkout'}
    </button>
  );
}

interface Props {
  businessId: string;
}

/**
 * Basic/Growth plan selector + required terms checkbox, gating
 * `createCheckoutSessionAction` (Stage 18). Monthly billing only, no trial —
 * see implementation.md, Stage 18, "Approved plans".
 */
export function PlanSelectionForm({ businessId }: Props) {
  const [state, formAction] = useActionState<CheckoutActionState, FormData>(createCheckoutSessionAction, undefined);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      {WEBPRESA_PLANS.map((plan) => (
        <label
          key={plan}
          className="flex items-start gap-3 rounded-lg border border-(--color-border) p-3 cursor-pointer hover:border-(--color-brand) has-[:checked]:border-(--color-brand) has-[:checked]:bg-(--color-brand)/5"
        >
          <input type="radio" name="plan" value={plan} defaultChecked={plan === 'basic'} className="mt-1" />
          <span>
            <span className="block text-sm font-semibold text-gray-900">
              {PLAN_DETAILS[plan].label} — {PLAN_DETAILS[plan].price}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">{PLAN_DETAILS[plan].description}</span>
          </span>
        </label>
      ))}

      <label className="flex items-start gap-2 text-xs text-gray-500 pt-1">
        <input type="checkbox" name="agreeToTerms" className="mt-0.5" />
        <span>
          I agree to the Webpresa{' '}
          <a href="/terms" className="underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
