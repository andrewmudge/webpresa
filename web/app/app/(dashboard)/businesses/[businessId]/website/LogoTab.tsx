import type { Business } from '@/domain/models/business';
import { Card, SaveButton } from '../FormBits';
import { PhotoSlotPicker } from '../PhotoSlotPicker';
import { updateLogoActionCustomer, updateFaviconActionCustomer, resetFaviconActionCustomer } from '../actions';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

export function LogoTab({ businessId, business, isReadOnly }: Props) {
  const photoUrls = business.photoUrls ?? [];

  return (
    <div className="space-y-6">
      <Card title="Logo" description="Shown in your website's header and, optionally, as a hero image.">
        <form action={updateLogoActionCustomer.bind(null, businessId)} className="space-y-4">
          <PhotoSlotPicker
            label="Logo"
            fieldName="logoPhotoUrl"
            uploadFieldName="logoPhotoFile"
            currentValue={business.logoUrl}
            photoUrls={photoUrls}
            disabled={isReadOnly}
            emptyLabel="Keep current"
          />
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      <Card
        title="Browser tab icon"
        description="The small icon shown in your browser tab. We create one automatically from your logo — upload your own if you'd like something different."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {business.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.faviconUrl} alt="Browser tab icon" className="w-12 h-12 rounded-lg border border-gray-200 object-contain bg-white" />
            ) : (
              <div className="w-12 h-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
                None yet
              </div>
            )}
            <p className="text-xs text-gray-500">
              {business.faviconSource === 'manual' ? 'Custom image.' : 'Automatically created from your logo.'}
            </p>
          </div>

          <form action={updateFaviconActionCustomer.bind(null, businessId)} className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              name="favicon"
              accept="image/*"
              disabled={isReadOnly}
              className="min-w-0 max-w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-50 disabled:opacity-50"
            />
            <SaveButton label="Upload" pendingLabel="Uploading…" disabled={isReadOnly} />
          </form>

          {business.faviconSource === 'manual' && (
            <form action={resetFaviconActionCustomer.bind(null, businessId)}>
              <SaveButton label="Reset to automatic" pendingLabel="Resetting…" disabled={isReadOnly} variant="secondary" />
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
