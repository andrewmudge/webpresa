import type { Lead } from '@/domain/models/lead';
import { retryLeadNotificationAction } from './lead-actions';

/**
 * Stage 20 admin troubleshooting view — notification status/attempts and a
 * manual retry, the same diagnostic surface an admin needs when a business
 * owner reports "I'm not getting my leads". Never displays a raw SES
 * payload or provider secret — `lastNotificationError` only ever holds a
 * short exception name/code (see `lib/ses/send-lead-notification.ts`).
 */

const NOTIFICATION_STATUS_TONE: Record<Lead['notificationStatus'], string> = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

interface Props {
  businessId: string;
  leads: Lead[]; // newest first
}

export function LeadsSection({ businessId, leads }: Props) {
  return (
    <div id="leads-section" className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 scroll-mt-20">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leads</h3>
        <span className="text-xs text-gray-400">{leads.length} total</span>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-gray-400">No leads submitted yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="pb-2 pr-4">Submitted</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Notification</th>
                <th className="pb-2 pr-4">Attempts</th>
                <th className="pb-2 pr-4">Error</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.leadId}>
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{new Date(lead.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-gray-900">{lead.name}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium border ${NOTIFICATION_STATUS_TONE[lead.notificationStatus]}`}
                    >
                      {lead.notificationStatus}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{lead.notificationAttempts}</td>
                  <td className="py-2 pr-4 text-xs text-red-600 max-w-xs truncate" title={lead.lastNotificationError}>
                    {lead.lastNotificationError ?? ''}
                  </td>
                  <td className="py-2">
                    {lead.notificationStatus === 'failed' && (
                      <form action={retryLeadNotificationAction.bind(null, businessId, lead.leadId)}>
                        <button
                          type="submit"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Retry
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
