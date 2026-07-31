import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { listPreviewsForBusiness } from '@/lib/db/site-previews';
import { Card, TextField, TextAreaField, SaveButton } from '../FormBits';
import { updateBusinessInfoAction } from '../actions';
import { NotificationToggle } from './NotificationToggle';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}

export default async function SettingsPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error, saved } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') redirect(`/app/businesses/${businessId}`);
  const isReadOnly = mode === 'billing_recovery';

  const previews = await listPreviewsForBusiness(businessId);
  const publishedPreview = previews.find((p) => p.status === 'published');
  const latest = previews[0];
  const hasDraft = !!latest && latest.status !== 'published' && !!publishedPreview;
  const websiteState = publishedPreview ? (hasDraft ? 'Draft changes' : 'Live') : 'No live site';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Business information and website status.</p>
      </div>

      {isReadOnly && (
        <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Editing is paused until your billing issue is resolved.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {saved && !error && (
        <div role="status" className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Saved.
        </div>
      )}

      <Card title="Business information">
        <form action={updateBusinessInfoAction.bind(null, businessId)} className="space-y-4">
          <TextField label="Business name" name="name" defaultValue={business.name} required disabled={isReadOnly} maxLength={200} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Phone" name="phone" defaultValue={business.phone} disabled={isReadOnly} />
            <TextField label="Email" name="email" type="email" defaultValue={business.email} disabled={isReadOnly} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Address line 1" name="addressLine1" defaultValue={business.address?.line1} disabled={isReadOnly} />
            <TextField label="City" name="addressCity" defaultValue={business.address?.city} disabled={isReadOnly} />
            <TextField label="State" name="addressState" defaultValue={business.address?.state} disabled={isReadOnly} />
            <TextField label="ZIP / Postal code" name="addressPostalCode" defaultValue={business.address?.postalCode} disabled={isReadOnly} />
          </div>
          <TextAreaField
            label="Social links (one per line)"
            name="socialLinks"
            defaultValue={business.socialLinks?.join('\n')}
            placeholder="https://facebook.com/yourbusiness"
            disabled={isReadOnly}
            rows={3}
          />
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      <Card title="Website status">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="text-gray-900 font-medium">{websiteState}</dd>
          </div>
          {publishedPreview && (
            <>
              <div>
                <dt className="text-gray-500">Published</dt>
                <dd className="text-gray-900 font-medium">
                  {new Date(publishedPreview.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Public address</dt>
                <dd className="text-gray-900 font-medium">/b/{business.slug}</dd>
              </div>
            </>
          )}
        </dl>
      </Card>

      <Card title="Notifications">
        <NotificationToggle
          businessId={businessId}
          defaultEnabled={business.draftChangesNoticeEnabled !== false}
          disabled={isReadOnly}
        />
      </Card>
    </div>
  );
}
