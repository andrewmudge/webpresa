import type { Business } from '@/domain/models/business';
import { Card, TextField, TextAreaField, SaveButton } from '../FormBits';
import { PhotoSlotPicker } from '../PhotoSlotPicker';
import { updateHeroCardActionCustomer, updateAboutCardActionCustomer } from '../actions';
import { getCachedPreviews } from './data';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

export async function ContentTab({ businessId, business, isReadOnly }: Props) {
  const previews = await getCachedPreviews(businessId);
  const content = previews[0]?.content;
  const photoUrls = business.photoUrls ?? [];

  if (!content) {
    return (
      <Card title="No website yet">
        <p className="text-sm text-gray-500">Your website hasn&apos;t been created yet — content will appear here once it has.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Hero" description="The first thing visitors see at the top of your website.">
        <form action={updateHeroCardActionCustomer.bind(null, businessId)} className="space-y-4">
          <TextField label="Headline" name="headline" defaultValue={content.hero.headline} required disabled={isReadOnly} maxLength={120} />
          <TextAreaField label="Sub-headline" name="subheadline" defaultValue={content.hero.subheadline} required disabled={isReadOnly} maxLength={300} rows={2} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PhotoSlotPicker
              label="Hero photo (desktop)"
              fieldName="heroPhotoUrl"
              uploadFieldName="heroPhotoFile"
              currentValue={business.heroPhotoUrl}
              photoUrls={photoUrls}
              disabled={isReadOnly}
            />
            <PhotoSlotPicker
              label="Hero photo (mobile)"
              fieldName="heroPhotoUrlMobile"
              uploadFieldName="heroPhotoFileMobile"
              currentValue={business.heroPhotoUrlMobile}
              photoUrls={photoUrls}
              disabled={isReadOnly}
            />
          </div>
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      <Card title="About" description="Tells your story and builds trust with visitors.">
        <form action={updateAboutCardActionCustomer.bind(null, businessId)} className="space-y-4">
          <TextField label="Headline" name="tagline" defaultValue={content.tagline} required disabled={isReadOnly} maxLength={200} />
          <TextAreaField label="Description" name="aboutText" defaultValue={content.aboutText} required disabled={isReadOnly} maxLength={2000} rows={5} />
          <TextField label="Featured quote (optional)" name="quote" defaultValue={content.aboutSection?.quote} disabled={isReadOnly} maxLength={300} />
          <PhotoSlotPicker
            label="About photo"
            fieldName="aboutPhotoUrl"
            uploadFieldName="aboutPhotoFile"
            currentValue={business.aboutPhotoUrl}
            photoUrls={photoUrls}
            disabled={isReadOnly}
          />
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>
    </div>
  );
}
