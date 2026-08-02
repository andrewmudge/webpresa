import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { Card } from './FormBits';
import type { WebsiteHealthItem, WebsiteHealthState, HealthSummary } from './overview-status';

const STATE_ICON: Record<WebsiteHealthState, React.ReactNode> = {
  healthy: <CheckCircle2 size={18} className="text-green-600" aria-hidden="true" />,
  attention: <AlertTriangle size={18} className="text-amber-600" aria-hidden="true" />,
  critical: <XCircle size={18} className="text-red-600" aria-hidden="true" />,
  unknown: <HelpCircle size={18} className="text-gray-400" aria-hidden="true" />,
};

const STATE_LABEL: Record<WebsiteHealthState, string> = {
  healthy: 'Healthy',
  attention: 'Needs attention',
  critical: 'Issue',
  unknown: 'Status unknown',
};

const SUMMARY_TONE_CLASSES: Record<HealthSummary['tone'], string> = {
  healthy: 'text-green-700',
  attention: 'text-amber-700',
  critical: 'text-red-700',
  setup: 'text-amber-700',
};

/** The primary content card — a truthful checklist of what Webpresa can actually verify about this website. */
export function WebsiteHealthCard({ summary, items }: { summary: HealthSummary; items: WebsiteHealthItem[] }) {
  return (
    <Card title="Website Health">
      <p className={`text-sm font-medium ${SUMMARY_TONE_CLASSES[summary.tone]}`}>{summary.message}</p>
      <ul className="mt-4 divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <span className="mt-0.5 shrink-0" role="img" aria-label={STATE_LABEL[item.state]}>
              {STATE_ICON[item.state]}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
