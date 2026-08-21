import Link from 'next/link';
import { listEmailTemplates } from '@/lib/db/marketing-email-templates';
import { ensureMarketingCampaignExists } from '@/lib/marketing/campaign';
import { MARKETING_CAMPAIGN_ID } from '@/lib/marketing/constants';
import { TemplateEditorCard } from './TemplateEditorCard';

export const dynamic = 'force-dynamic';

export default async function MarketingTemplatesPage() {
  // Lazily seeds the 3 default templates on first-ever visit, same as any
  // other reader of the campaign — see ensureMarketingCampaignExists.
  await ensureMarketingCampaignExists();
  const templates = await listEmailTemplates(MARKETING_CAMPAIGN_ID);
  const sorted = templates.slice().sort((a, b) => a.emailSequence - b.emailSequence);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Email Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Postcard Follow-Up campaign — 3 steps</p>
        </div>
        <Link href="/admin/marketing" className="text-sm text-(--color-brand) hover:underline">
          ← Back to Marketing
        </Link>
      </div>

      <div className="space-y-6">
        {sorted.map((template) => (
          // Keying on version forces a remount (and fresh local editor
          // state) whenever this template is saved/reset elsewhere in the
          // same session, rather than trying to sync controlled-input state
          // against changing props.
          <TemplateEditorCard key={`${template.emailSequence}-${template.version}`} template={template} />
        ))}
      </div>
    </div>
  );
}
