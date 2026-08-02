import type { Business } from '@/domain/models/business';
import { Card, SaveButton } from '../FormBits';
import { PhotoSlotPicker } from '../PhotoSlotPicker';
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
  );
}
