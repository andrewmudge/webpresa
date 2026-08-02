import { Card } from './FormBits';
import { formatDateTime, type ActivityEntry } from './overview-status';

/** No dedicated activity/event log exists in this app — entries are synthesized from real record timestamps by `buildRecentActivity`. No "View all activity" link, since no such route exists. */
export function RecentActivityCard({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card title="Recent Activity">
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <li key={entry.id} className="py-3">
              <p className="text-sm font-medium text-gray-900">{entry.label}</p>
              <p className="text-xs text-gray-500">
                <time dateTime={entry.timestamp}>{formatDateTime(entry.timestamp) ?? ''}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
