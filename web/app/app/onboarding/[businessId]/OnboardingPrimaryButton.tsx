'use client';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  action: (formData: FormData) => Promise<void>;
  /**
   * The fields live in a separate `<form id={externalFormId}>` elsewhere on
   * the page (referenced via the HTML `form=` attribute, the way this
   * button already sits outside its data form in the action bar) —
   * `useFormStatus` only tracks a form this button is a React-tree
   * descendant of, so it can't see that form's pending state. Read the
   * fields directly and drive pending state via `useTransition` instead,
   * the same pattern `DomainStatusPanel`'s Continue button already uses.
   */
  externalFormId: string;
  label: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary';
}

export function OnboardingPrimaryButton({ action, externalFormId, label, pendingLabel, variant = 'primary' }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const form = document.getElementById(externalFormId);
    const formData = new FormData(form instanceof HTMLFormElement ? form : undefined);
    startTransition(() => action(formData));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'w-full whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto',
        variant === 'primary'
          ? 'bg-(--color-brand) text-white hover:bg-(--color-brand-dark)'
          : 'border border-(--color-border) bg-white text-gray-700 hover:bg-gray-50',
      )}
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
