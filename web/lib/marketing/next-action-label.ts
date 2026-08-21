import type { MarketingOutreach } from '@/domain/models/marketing-outreach';
import type { Business } from '@/domain/models/business';

/**
 * Plain-English "what happens next" for one outreach row — spec examples:
 * "Email 1 tomorrow at 9:14 AM", "Email 2 in 3 days", "Waiting for postcard
 * delivery", "No additional outreach — claimed" (see `implementation.md`,
 * Marketing stage, "Prospect / business outreach table", "Next Action").
 */
export function describeNextAction(outreach: MarketingOutreach, business: Business | null): string {
  if (business?.status === 'claimed') return 'No additional outreach — claimed';
  if (business?.status === 'customer') return 'No additional outreach — customer';

  if (outreach.status === 'suppressed') {
    switch (outreach.suppressionReason) {
      case 'unsubscribed':
        return 'No additional outreach — unsubscribed';
      case 'hard_bounce':
        return 'No additional outreach — bounced';
      case 'complaint':
        return 'No additional outreach — complaint';
      case 'admin':
        return 'No additional outreach — suppressed by admin';
      default:
        return 'No additional outreach — suppressed';
    }
  }
  if (outreach.status === 'completed') {
    return outreach.lastEventType === 'engaged' ? 'No additional outreach — engaged with postcard' : 'No additional outreach — sequence complete';
  }
  if (outreach.status === 'cancelled') return 'No additional outreach — cancelled';
  if (outreach.status === 'failed') return 'No additional outreach — send failed';
  if (outreach.status === 'paused') return 'Paused';

  if (outreach.status === 'active' && outreach.nextActionAt && outreach.nextActionSequence) {
    const label = `Email ${outreach.nextActionSequence}`;
    const dueAt = new Date(outreach.nextActionAt);
    const diffMs = dueAt.getTime() - Date.now();
    if (diffMs <= 0) return `${label} — due now`;

    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) {
      const timeStr = dueAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${label} today at ${timeStr}`;
    }
    if (diffDays === 1) return `${label} tomorrow`;
    return `${label} in ${diffDays} days`;
  }

  return 'Waiting for postcard delivery';
}
