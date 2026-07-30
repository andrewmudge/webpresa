import { Card, TextField, TextAreaField, SaveButton } from '../FormBits';
import { updateSeoActionCustomer } from '../actions';
import { getCachedPreviews } from './data';

interface Props {
  businessId: string;
  isReadOnly: boolean;
}

export async function SeoTab({ businessId, isReadOnly }: Props) {
  const previews = await getCachedPreviews(businessId);
  const content = previews[0]?.content;

  return (
    <Card title="Search engine listing" description="What shows up when your website appears in Google search results.">
      <form action={updateSeoActionCustomer.bind(null, businessId)} className="space-y-4">
        <TextField label="Page title" name="seoTitle" defaultValue={content?.seo?.title} disabled={isReadOnly} maxLength={70} placeholder={content?.hero.headline} />
        <TextAreaField label="Page description" name="seoDescription" defaultValue={content?.seo?.description} disabled={isReadOnly} maxLength={200} rows={3} placeholder={content?.hero.subheadline} />
        <SaveButton disabled={isReadOnly} />
      </form>
    </Card>
  );
}
