import { MIN_TEMPLATE_SAMPLE_SIZE, type BestTemplateResult } from '@/lib/analytics/dashboard-types';
import { formatCount, formatPercent, formatTemplateLabel } from './format';

export function BestTemplateCallout({ best }: { best: BestTemplateResult }) {
  return (
    <div className="rounded-xl border border-(--color-brand-muted) bg-(--color-brand-muted) p-4 mb-4">
      <p className="text-xs font-medium text-(--color-brand) uppercase tracking-wide mb-1">Best Performing Postcard</p>
      {best.status === 'insufficient_data' ? (
        <p className="text-sm text-gray-600">Not enough data yet — each template needs at least {MIN_TEMPLATE_SAMPLE_SIZE} sends before a winner is declared.</p>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-lg font-semibold text-gray-900 capitalize">{formatTemplateLabel(best.row.templateVariant)}</p>
          <p className="text-sm text-gray-600">{formatCount(best.row.sent)} sent</p>
          <p className="text-sm text-gray-600">{formatCount(best.row.paidCustomers)} paid conversions</p>
          <p className="text-sm font-medium text-(--color-brand)">{formatPercent(best.row.paidConversion)} paid conversion</p>
        </div>
      )}
    </div>
  );
}
