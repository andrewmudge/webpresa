import { Card, TextField, TextAreaField, SaveButton } from '../FormBits';
import { updateSectionContentActionCustomer } from '../actions';
import { getCachedPreviews } from './data';

interface Props {
  businessId: string;
  isReadOnly: boolean;
}

export async function ContentTab({ businessId, isReadOnly }: Props) {
  const previews = await getCachedPreviews(businessId);
  const content = previews[0]?.content;
  const heroAction = updateSectionContentActionCustomer.bind(null, businessId, 'hero');
  const aboutAction = updateSectionContentActionCustomer.bind(null, businessId, 'about');

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
        <form action={heroAction} className="space-y-4">
          <TextField label="Headline" name="headline" defaultValue={content.hero.headline} required disabled={isReadOnly} maxLength={120} />
          <TextAreaField label="Sub-headline" name="subheadline" defaultValue={content.hero.subheadline} required disabled={isReadOnly} maxLength={300} rows={2} />
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>

      <Card title="About" description="Tells your story and builds trust with visitors.">
        <form action={aboutAction} className="space-y-4">
          <TextField label="Headline" name="tagline" defaultValue={content.tagline} required disabled={isReadOnly} maxLength={200} />
          <TextAreaField label="Description" name="aboutText" defaultValue={content.aboutText} required disabled={isReadOnly} maxLength={2000} rows={5} />
          <TextField label="Featured quote (optional)" name="quote" defaultValue={content.aboutSection?.quote} disabled={isReadOnly} maxLength={300} />
          <SaveButton disabled={isReadOnly} />
        </form>
      </Card>
    </div>
  );
}
