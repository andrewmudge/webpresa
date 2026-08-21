import type { MarketingOutreachStatus } from '@/domain/models/marketing-outreach';

const STATUS_STYLES: Record<MarketingOutreachStatus, string> = {
  active: 'bg-blue-50 text-blue-700',
  paused: 'bg-yellow-50 text-yellow-700',
  suppressed: 'bg-red-50 text-red-600',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-50 text-red-700',
};

export function OutreachStatusBadge({ status }: { status: MarketingOutreachStatus }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{status}</span>;
}
