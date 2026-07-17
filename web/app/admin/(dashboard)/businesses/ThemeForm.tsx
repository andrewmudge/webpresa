'use client';
import { useActionState } from 'react';
import type { Business } from '@/domain/models/business';
import { ThemeField, SubmitButton } from './FormFields';
import type { BusinessFormState } from './actions';

interface ThemeFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  defaults?: Partial<Business>;
  submitLabel?: string;
}

/** Its own narrow card/action so saving the theme override can never touch any other business field. */
export function ThemeForm({ action, defaults, submitLabel = 'Save Theme' }: ThemeFormProps) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}
      <ThemeField label="Theme" name="theme" defaultValue={defaults?.theme} errors={errors.theme} />
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
