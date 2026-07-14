'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CTA_ACTION_TYPES } from '@/domain/models/site-preview';
import type { CtaActionType, PreviewCta, PreviewCtaConfig } from '@/domain/models/site-preview';
import type { CtaFormState } from './actions';

const ACTION_TYPE_LABELS: Record<CtaActionType, string> = {
  phone: 'Call (phone)',
  email: 'Email',
  sms: 'Text (SMS)',
  external_url: 'External link',
  none: 'Hidden — no button',
};

function destinationHelp(type: CtaActionType): string | null {
  switch (type) {
    case 'phone':
    case 'sms':
      return 'Uses the preview phone number by default. Leave blank unless overriding.';
    case 'email':
      return 'Uses the preview email by default. Leave blank unless overriding.';
    case 'external_url':
      return 'Required — must be a valid https:// URL (quote form, booking page, Calendly, etc).';
    default:
      return null;
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : 'Save CTA'}
    </button>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <>
      {errors.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
    </>
  );
}

interface CtaConfigFormProps {
  action: (prevState: CtaFormState, formData: FormData) => Promise<CtaFormState>;
  defaults: PreviewCtaConfig;
}

export function CtaConfigForm({ action, defaults }: CtaConfigFormProps) {
  const [state, formAction] = useActionState<CtaFormState, FormData>(action, undefined);
  const errors = state?.errors ?? {};

  const [primaryType, setPrimaryType] = useState<CtaActionType>(defaults.primary.type);
  const [secondaryEnabled, setSecondaryEnabled] = useState(!!defaults.secondary);
  const [secondaryType, setSecondaryType] = useState<CtaActionType>(
    defaults.secondary?.type ?? 'phone',
  );

  const secondaryDefaults: PreviewCta = defaults.secondary ?? { type: 'phone', label: '' };

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Primary CTA */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Primary CTA</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryType" className="block text-sm font-medium text-gray-700 mb-1">
              Action type
            </label>
            <select
              id="primaryType"
              name="primaryType"
              defaultValue={defaults.primary.type}
              onChange={(e) => setPrimaryType(e.target.value as CtaActionType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
            >
              {CTA_ACTION_TYPES.map((t) => (
                <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <FieldErrors errors={errors.primaryType} />
          </div>
          {primaryType !== 'none' && (
            <div>
              <label htmlFor="primaryLabel" className="block text-sm font-medium text-gray-700 mb-1">
                Button label
              </label>
              <input
                id="primaryLabel"
                name="primaryLabel"
                type="text"
                maxLength={40}
                defaultValue={defaults.primary.label}
                placeholder="Call Now"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
              <FieldErrors errors={errors.primaryLabel} />
            </div>
          )}
          {primaryType !== 'none' && (
            <div className="md:col-span-2">
              <label htmlFor="primaryValue" className="block text-sm font-medium text-gray-700 mb-1">
                Destination {primaryType === 'external_url' && <span className="text-red-500">*</span>}
              </label>
              <input
                id="primaryValue"
                name="primaryValue"
                type="text"
                defaultValue={defaults.primary.value ?? ''}
                placeholder={primaryType === 'external_url' ? 'https://…' : undefined}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              />
              {destinationHelp(primaryType) && (
                <p className="mt-1 text-xs text-gray-400">{destinationHelp(primaryType)}</p>
              )}
              <FieldErrors errors={errors.primaryValue} />
            </div>
          )}
        </div>
      </section>

      {/* Secondary CTA */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <input
            id="secondaryEnabled"
            name="secondaryEnabled"
            type="checkbox"
            defaultChecked={!!defaults.secondary}
            onChange={(e) => setSecondaryEnabled(e.target.checked)}
            className="rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand)"
          />
          <label htmlFor="secondaryEnabled" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Secondary CTA
          </label>
        </div>
        {secondaryEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="secondaryType" className="block text-sm font-medium text-gray-700 mb-1">
                Action type
              </label>
              <select
                id="secondaryType"
                name="secondaryType"
                defaultValue={secondaryDefaults.type}
                onChange={(e) => setSecondaryType(e.target.value as CtaActionType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
              >
                {CTA_ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{ACTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <FieldErrors errors={errors.secondaryType} />
            </div>
            {secondaryType !== 'none' && (
              <div>
                <label htmlFor="secondaryLabel" className="block text-sm font-medium text-gray-700 mb-1">
                  Button label
                </label>
                <input
                  id="secondaryLabel"
                  name="secondaryLabel"
                  type="text"
                  maxLength={40}
                  defaultValue={secondaryDefaults.label}
                  placeholder="Email Us"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
                />
                <FieldErrors errors={errors.secondaryLabel} />
              </div>
            )}
            {secondaryType !== 'none' && (
              <div className="md:col-span-2">
                <label htmlFor="secondaryValue" className="block text-sm font-medium text-gray-700 mb-1">
                  Destination {secondaryType === 'external_url' && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="secondaryValue"
                  name="secondaryValue"
                  type="text"
                  defaultValue={secondaryDefaults.value ?? ''}
                  placeholder={secondaryType === 'external_url' ? 'https://…' : undefined}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
                />
                {destinationHelp(secondaryType) && (
                  <p className="mt-1 text-xs text-gray-400">{destinationHelp(secondaryType)}</p>
                )}
                <FieldErrors errors={errors.secondaryValue} />
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
