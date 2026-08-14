'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Lock, ShieldCheck, Star, Tag, RefreshCw } from 'lucide-react';
import { createCheckoutSessionAction, type CheckoutActionState } from '@/app/account/checkout/actions';
import { PLAN_CATALOG, type WebpresaPlan } from '@/domain/constants/plan-catalog';
import { cn } from '@/lib/utils';
import { TrustRow } from '../_components/TrustRow';

const CHECKOUT_TRUST_ITEMS = [
  { icon: ShieldCheck, title: 'Secure Checkout', subtitle: 'Powered by Stripe' },
  { icon: Tag, title: 'No Setup Fees', subtitle: 'Only pay your monthly plan' },
  { icon: RefreshCw, title: 'Cancel Anytime', subtitle: 'No contracts, ever' },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-(--color-brand) px-6 py-3.5 text-white transition-colors hover:bg-(--color-brand-dark) disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[260px]"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Lock size={14} />
        {pending ? 'Starting checkout…' : 'Activate My Website'}
      </span>
      <span className="text-xs font-normal text-white/70">Secure checkout powered by Stripe</span>
    </button>
  );
}

function PlanCard({ plan, defaultChecked }: { plan: WebpresaPlan; defaultChecked: boolean }) {
  const entry = PLAN_CATALOG[plan];
  const isGrowth = plan === 'growth';

  return (
    <label
      className={cn(
        'relative flex flex-col rounded-2xl border bg-white p-6 sm:p-8 cursor-pointer transition-all',
        'has-[:checked]:border-(--color-brand) has-[:checked]:ring-2 has-[:checked]:ring-(--color-brand)/15 has-[:checked]:shadow-md',
        isGrowth ? 'border-(--color-brand)/40' : 'border-(--color-border) hover:border-(--color-brand)/40',
      )}
    >
      {isGrowth && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-(--color-brand) px-3 py-1 text-xs font-semibold text-white shadow-sm">
          <Star size={12} className="fill-current" />
          Most Popular
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-lg font-semibold text-gray-900">{entry.label}</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-gray-900">
              {entry.priceDisplay.replace('/month', '')}
            </span>
            <span className="text-sm font-medium text-gray-400">/month</span>
          </div>
        </div>
        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 peer-checked:border-(--color-brand)">
          <input type="radio" name="plan" value={plan} defaultChecked={defaultChecked} className="peer sr-only" />
          <span className="h-2.5 w-2.5 rounded-full bg-(--color-brand) opacity-0 peer-checked:opacity-100" />
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-500">{entry.description}</p>

      <div className="mt-6 space-y-2.5">
        {entry.featuresIntro && (
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{entry.featuresIntro}</p>
        )}
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {entry.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
              <Check size={16} className="mt-0.5 shrink-0 text-(--color-brand)" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </label>
  );
}

interface Props {
  businessId: string;
}

/**
 * Basic/Growth plan selector + required terms checkbox, gating
 * `createCheckoutSessionAction` (Stage 18). Monthly billing only, no trial —
 * see implementation.md, Stage 18, "Approved plans". Redesigned 2026-07-31
 * as part of the activation-page polish pass — same form fields/action,
 * only presentation and component structure changed.
 */
export function PlanSelectionForm({ businessId }: Props) {
  const [state, formAction] = useActionState<CheckoutActionState, FormData>(createCheckoutSessionAction, undefined);

  return (
    <div className="mt-8">
      <h2 className="text-center text-lg font-semibold text-gray-900 sm:text-left">
        Choose your plan to activate your website
      </h2>

      <form action={formAction} className="mt-4">
        <input type="hidden" name="businessId" value={businessId} />

        {/*
          Growth is intentionally not offered at MVP launch — only Basic is
          purchasable. WEBPRESA_PLANS/PLAN_CATALOG.growth still exist and
          remain fully functional; reinstate `WEBPRESA_PLANS.map(...)` here
          (and restore the two-column grid) to offer both plans again.
        */}
        <div className="grid grid-cols-1 gap-6 max-w-md mx-auto md:mx-0">
          <PlanCard plan="basic" defaultChecked />
        </div>

        <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-(--color-border) bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" name="agreeToTerms" className="mt-0.5" />
            <span>
              I agree to the Webpresa{' '}
              <a href="/terms" className="underline hover:text-gray-900">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-gray-900">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <SubmitButton />
        </div>

        {state?.error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {state.error}
          </p>
        )}
      </form>

      <div className="mt-8">
        <TrustRow items={CHECKOUT_TRUST_ITEMS} />
      </div>
    </div>
  );
}
