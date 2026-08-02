import { CheckCircle2, Pencil, Globe, Star, type LucideIcon } from 'lucide-react';
import { Card } from './FormBits';
import { formatDateTime, type ActivityEntry } from './overview-status';

/** `ActivityEntry.id` is one of the fixed set `buildRecentActivity` emits — see `overview-status.ts`. */
const ACTIVITY_ICON: Record<string, { icon: LucideIcon; classes: string }> = {
  published: { icon: CheckCircle2, classes: 'bg-green-100 text-green-700' },
  'draft-saved': { icon: Pencil, classes: 'bg-violet-100 text-violet-700' },
  'domain-started': { icon: Globe, classes: 'bg-blue-100 text-blue-700' },
  'domain-connected': { icon: Globe, classes: 'bg-green-100 text-green-700' },
  claimed: { icon: Star, classes: 'bg-amber-100 text-amber-700' },
};

const DEFAULT_ICON: { icon: LucideIcon; classes: string } = { icon: CheckCircle2, classes: 'bg-gray-100 text-gray-500' };

/** No dedicated activity/event log exists in this app — entries are synthesized from real record timestamps by `buildRecentActivity`. No "View all activity" link, since no such route exists. */
export function RecentActivityCard({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card title="Recent Activity">
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map((entry) => {
            const { icon: Icon, classes } = ACTIVITY_ICON[entry.id] ?? DEFAULT_ICON;
            return (
              <li key={entry.id} className="flex items-start gap-3 py-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${classes}`}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{entry.label}</p>
                  <p className="text-xs text-gray-500">
                    <time dateTime={entry.timestamp}>{formatDateTime(entry.timestamp) ?? ''}</time>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
