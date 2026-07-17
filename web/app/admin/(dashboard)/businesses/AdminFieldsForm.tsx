'use client';
import { useActionState } from 'react';
import { BUSINESS_SOURCES, BUSINESS_STATUSES } from '@/domain/models/business';
import type { Business } from '@/domain/models/business';
import { SelectField, SubmitButton } from './FormFields';
import type { BusinessFormState } from './actions';

interface AdminFieldsFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  defaults?: Partial<Business>;
  submitLabel?: string;
}

/** Its own narrow card/action so saving source/status can never touch any other business field. */
export function AdminFieldsForm({ action, defaults, submitLabel = 'Save' }: AdminFieldsFormProps) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Source"
          name="source"
          options={BUSINESS_SOURCES}
          defaultValue={defaults?.source ?? 'manual'}
          errors={errors.source}
        />
        <SelectField
          label="Status"
          name="status"
          options={BUSINESS_STATUSES}
          defaultValue={defaults?.status}
          errors={errors.status}
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
