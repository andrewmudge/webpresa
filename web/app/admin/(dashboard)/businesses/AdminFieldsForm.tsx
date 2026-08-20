'use client';
import { useActionState } from 'react';
import { BUSINESS_SOURCES } from '@/domain/models/business';
import type { Business } from '@/domain/models/business';
import { SelectField, SubmitButton } from './FormFields';
import { StatusBadge } from './StatusBadge';
import type { BusinessFormState } from './actions';

interface AdminFieldsFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  defaults?: Partial<Business>;
  submitLabel?: string;
}

/** Its own narrow card/action so saving source can never touch any other business field. */
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
        {defaults?.status && (
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Status</span>
            <div className="flex items-center h-[42px]">
              <StatusBadge status={defaults.status} />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
