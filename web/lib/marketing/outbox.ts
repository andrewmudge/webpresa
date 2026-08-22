import 'server-only';
import type { MarketingMessage } from '@/domain/models/marketing-message';
import type { EmailSequence } from '@/domain/models/email-template';
import type { Business } from '@/domain/models/business';
import { listAllMarketingMessages } from '@/lib/db/marketing-messages';
import { listAllBusinesses } from '@/lib/db/businesses';

export interface OutboxEntry {
  message: MarketingMessage;
  business: Business | null;
}

export interface OutboxFilters {
  emailSequence?: EmailSequence;
}

/**
 * Every actually-sent marketing email, newest first — a miniature outbox
 * linked from the "Email N Sent" KPI tiles on `/admin/marketing`, so an
 * admin can see real send content without knowing which business to open
 * first. Deliberately excludes `'skipped'`/`'failed'` messages — those stay
 * visible only in each business's own outreach timeline.
 *
 * Mirrors `dashboard.ts`'s exact conventions: no new DynamoDB calls, reuses
 * the same bounded `listAllMarketingMessages()`/`listAllBusinesses()` scans
 * and the same `Map`-based business join.
 */
export async function getMarketingOutbox(filters: OutboxFilters = {}): Promise<OutboxEntry[]> {
  const [messages, businesses] = await Promise.all([listAllMarketingMessages(), listAllBusinesses()]);

  const businessById = new Map(businesses.map((business) => [business.businessId, business]));

  const sent = messages.filter((message) => {
    if (message.outcome !== 'sent') return false;
    if (filters.emailSequence !== undefined && message.emailSequence !== filters.emailSequence) return false;
    return true;
  });

  sent.sort((a, b) => (b.sentAt ?? b.attemptedAt).localeCompare(a.sentAt ?? a.attemptedAt));

  return sent.map((message) => ({
    message,
    business: businessById.get(message.businessId) ?? null,
  }));
}
