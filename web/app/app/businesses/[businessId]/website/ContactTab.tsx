import Link from 'next/link';
import type { Business } from '@/domain/models/business';
import { CTA_ACTION_TYPES } from '@/domain/models/site-preview';
import { Card, TextField, SaveButton } from '../FormBits';
import { updateCtaActionCustomer } from '../actions';
import { getCachedPreviews } from './data';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

const CTA_TYPE_LABELS: Record<(typeof CTA_ACTION_TYPES)[number], string> = {
  phone: 'Call',
  email: 'Email',
  sms: 'Text message',
  external_url: 'Link to a page',
  request_service: 'Open request form',
  none: 'Hidden',
};

export async function ContactTab({ businessId, business, isReadOnly }: Props) {
  const previews = await getCachedPreviews(businessId);
  const content = previews[0]?.content;
  const cta = content?.cta ?? business.cta;

  return (
    <div className="space-y-6">
      <Card title="Contact information" description="Your phone, email, and address as shown to customers.">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">Phone</dt>
            <dd className="text-gray-900">{business.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{business.email || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Address</dt>
            <dd className="text-gray-900">
              {business.address ? `${business.address.line1}, ${business.address.city}, ${business.address.state} ${business.address.postalCode}` : '—'}
            </dd>
          </div>
        </dl>
        <Link href={`/app/businesses/${businessId}/settings`} className="mt-3 inline-block text-sm font-medium text-(--color-brand) hover:underline">
          Edit business information →
        </Link>
      </Card>

      <Card title="Call-to-action buttons" description="What happens when a visitor taps your website's main buttons.">
        <form action={updateCtaActionCustomer.bind(null, businessId)} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-800">Primary button</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Action</span>
                <select name="primaryType" defaultValue={cta?.primary.type ?? 'phone'} disabled={isReadOnly} className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50">
                  {CTA_ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CTA_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="Button label" name="primaryLabel" defaultValue={cta?.primary.label} disabled={isReadOnly} maxLength={40} />
            </div>
            <TextField label="Destination (link, if applicable)" name="primaryValue" defaultValue={cta?.primary.value} disabled={isReadOnly} placeholder="https://…" />
          </fieldset>

          <fieldset className="space-y-3 pt-2 border-t border-gray-100">
            <legend className="text-sm font-semibold text-gray-800 pt-3">Secondary button</legend>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="secondaryEnabled" defaultChecked={!!cta?.secondary} disabled={isReadOnly} className="h-4 w-4 rounded border-gray-300 text-(--color-brand)" />
              Show a secondary button
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Action</span>
                <select name="secondaryType" defaultValue={cta?.secondary?.type ?? 'request_service'} disabled={isReadOnly} className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50">
                  {CTA_ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CTA_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="Button label" name="secondaryLabel" defaultValue={cta?.secondary?.label} disabled={isReadOnly} maxLength={40} />
            </div>
            <TextField label="Destination (link, if applicable)" name="secondaryValue" defaultValue={cta?.secondary?.value} disabled={isReadOnly} placeholder="https://…" />
          </fieldset>

          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>
    </div>
  );
}
