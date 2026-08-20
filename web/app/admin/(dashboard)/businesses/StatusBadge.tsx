import type { Business } from '@/domain/models/business';

const STATUS_STYLES: Record<Business['status'], string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  outreach: 'bg-blue-50 text-blue-700',
  engaged: 'bg-purple-50 text-purple-700',
  claimed: 'bg-indigo-50 text-indigo-700',
  customer: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

/** Read-only funnel-status badge — shared by `BusinessTable.tsx` and the business detail page's Admin card, since `Business.status` is no longer admin-editable. */
export function StatusBadge({ status }: { status: Business['status'] }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>
  );
}
