import Image from 'next/image';
import type { Business } from '@/domain/models/business';
import { Card, SaveButton } from '../FormBits';
import { updateLogoActionCustomer } from '../actions';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

export function LogoTab({ businessId, business, isReadOnly }: Props) {
  const photoUrls = business.photoUrls ?? [];

  return (
    <Card title="Logo" description="Shown in your website's header and, optionally, as a hero image.">
      <form action={updateLogoActionCustomer.bind(null, businessId)} className="space-y-3">
        {business.logoUrl && (
          <div className="relative h-14 w-14 rounded border border-gray-200 overflow-hidden">
            <Image src={business.logoUrl} alt="Current logo" fill className="object-contain" unoptimized />
          </div>
        )}
        <select
          name="logoPhotoUrl"
          defaultValue=""
          disabled={isReadOnly}
          className="w-full sm:w-72 rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
        >
          <option value="">Keep current</option>
          <option value="none">No logo</option>
          {photoUrls.map((url, i) => (
            <option key={url} value={url}>
              Photo {i + 1}
            </option>
          ))}
        </select>
        <SaveButton disabled={isReadOnly} />
      </form>
    </Card>
  );
}
