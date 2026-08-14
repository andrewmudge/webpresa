'use server';
import { getSession } from '@/lib/auth/session';
import { dismissNeedsAttentionItem } from '@/lib/db/operations-dismissals';

/**
 * Stage 24 — dismisses one Needs Attention item from `/admin/operations`.
 * A snooze, not a delete: never touches the underlying `ScanEvent`/
 * `ScanExecution`/`Postcard`/`Lead`/`StripeWebhookFailure` record, so no
 * business/scan history is ever destroyed by this action — see
 * `lib/db/operations-dismissals.ts`. The item reappears automatically after
 * ~30 days if the same underlying problem is still unresolved.
 */
export async function dismissNeedsAttentionItemAction(itemId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await dismissNeedsAttentionItem(itemId, session.sub);
}
