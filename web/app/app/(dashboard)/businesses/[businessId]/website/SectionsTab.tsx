import type { Business } from '@/domain/models/business';
import { resolveStoredOrDefaultSections } from '@/lib/website-sections/resolve';
import { Card } from '../FormBits';
import { SectionsOrderEditor } from './SectionsOrderEditor';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

export function SectionsTab({ businessId, business, isReadOnly }: Props) {
  const sections = resolveStoredOrDefaultSections(business.websiteSections);

  return (
    <div className="space-y-6">
      <Card title="Page sections" description="Choose which sections appear on your website, and use the arrows to reorder them.">
        <SectionsOrderEditor businessId={businessId} sections={sections} isReadOnly={isReadOnly} />
      </Card>
    </div>
  );
}
