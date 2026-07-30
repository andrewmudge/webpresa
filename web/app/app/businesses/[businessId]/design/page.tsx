import Image from 'next/image';
import { redirect } from 'next/navigation';
import { requireCustomerSession, requireBusinessOwnership, requireBusinessAccess } from '@/lib/auth/customer-authorization';
import { THEME_OPTIONS } from '@/lib/themes';
import { Card, SaveButton } from '../FormBits';
import { PhotoSlotPicker } from '../PhotoSlotPicker';
import { updateThemeActionCustomer, updatePhotoSlotsAction } from '../actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}

export default async function DesignEditorPage({ params, searchParams }: Props) {
  const { businessId } = await params;
  const { error, saved } = await searchParams;
  const session = await requireCustomerSession();
  const business = await requireBusinessOwnership(session.sub, businessId);
  const { mode } = await requireBusinessAccess(session.sub, businessId);

  if (mode === 'none') redirect(`/app/businesses/${businessId}`);
  const isReadOnly = mode === 'billing_recovery';
  const photoUrls = business.photoUrls ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Design</h1>
        <p className="mt-1 text-sm text-gray-500">Choose your look and where your photos appear.</p>
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

      <Card title="Theme" description="A curated color and style preset for your website.">
        <form action={updateThemeActionCustomer.bind(null, businessId)} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {THEME_OPTIONS.map((theme) => (
              <label
                key={theme.name}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 p-2 cursor-pointer has-[:checked]:border-(--color-brand) has-[:checked]:ring-2 has-[:checked]:ring-(--color-brand)"
              >
                <input type="radio" name="theme" value={theme.name} defaultChecked={business.theme === theme.name} disabled={isReadOnly} className="sr-only" />
                <span className="flex gap-1">
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: theme.primary }} />
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: theme.accent }} />
                </span>
                <span className="text-xs text-gray-700 text-center">{theme.displayName}</span>
              </label>
            ))}
          </div>
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      {photoUrls.length > 0 && (
        <Card title="Hero &amp; section photos" description="Choose which uploaded photo appears in each spot on your website.">
          <form action={updatePhotoSlotsAction.bind(null, businessId)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <PhotoSlotPicker label="Hero (desktop)" fieldName="heroPhotoUrl" uploadFieldName="heroPhotoFile" currentValue={business.heroPhotoUrl} photoUrls={photoUrls} disabled={isReadOnly} />
              <PhotoSlotPicker label="Hero (mobile)" fieldName="heroPhotoUrlMobile" uploadFieldName="heroPhotoFileMobile" currentValue={business.heroPhotoUrlMobile} photoUrls={photoUrls} disabled={isReadOnly} />
              <PhotoSlotPicker label="About section" fieldName="aboutPhotoUrl" uploadFieldName="aboutPhotoFile" currentValue={business.aboutPhotoUrl} photoUrls={photoUrls} disabled={isReadOnly} />
              <PhotoSlotPicker label="Why Choose Us section" fieldName="whyChooseUsPhotoUrl" uploadFieldName="whyChooseUsPhotoFile" currentValue={business.whyChooseUsPhotoUrl} photoUrls={photoUrls} disabled={isReadOnly} />
              <PhotoSlotPicker label="Services section" fieldName="servicesPhotoUrl" uploadFieldName="servicesPhotoFile" currentValue={business.servicesPhotoUrl} photoUrls={photoUrls} disabled={isReadOnly} />
              <div className="border border-gray-100 rounded-lg p-3 space-y-2">
                <span className="block text-sm font-medium text-gray-700">Logo</span>
                <select name="logoPhotoUrl" defaultValue="" disabled={isReadOnly} className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50">
                  <option value="">Keep current</option>
                  <option value="none">No logo</option>
                  {photoUrls.map((url, i) => (
                    <option key={url} value={url}>
                      Photo {i + 1}
                    </option>
                  ))}
                </select>
                {business.logoUrl && (
                  <div className="relative h-10 w-10 rounded border border-gray-200 overflow-hidden">
                    <Image src={business.logoUrl} alt="Current logo" fill className="object-contain" unoptimized />
                  </div>
                )}
              </div>
            </div>
            <SaveButton disabled={isReadOnly} />
          </form>
        </Card>
      )}

      {photoUrls.length === 0 && (
        <Card title="Hero &amp; section photos">
          <p className="text-sm text-gray-500">
            Upload photos on the <a href={`/app/businesses/${businessId}/website?tab=photos`} className="text-(--color-brand) underline">Website → Photos</a> tab first, then assign them here.
          </p>
        </Card>
      )}
    </div>
  );
}
