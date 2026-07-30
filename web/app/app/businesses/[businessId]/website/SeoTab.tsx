import type { PreviewContent } from '@/domain/models/site-preview';
import { Card, TextField, TextAreaField, SaveButton } from '../FormBits';
import { updateSeoActionCustomer } from '../actions';

interface Props {
  businessId: string;
  content?: PreviewContent;
  isReadOnly: boolean;
}

export function SeoTab({ businessId, content, isReadOnly }: Props) {
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
