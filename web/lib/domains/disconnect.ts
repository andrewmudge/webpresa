import 'server-only';
import { listDomainConnectionsForBusiness, deleteDomainConnectionRecord } from '@/lib/db/domain-connections';
import { removeProjectDomain } from '@/lib/vercel/domains';

export interface DisconnectDomainResult {
  disconnected: boolean;
  message?: string;
}

/**
 * Admin-only testing utility — not a customer-facing feature. Fully tears
 * down a business's domain connection (Vercel attachment, best-effort, plus
 * the DynamoDB record) so the same real domain can be reattached to a
 * different business, e.g. for repeated dev/test walkthroughs without
 * needing a fresh domain every time. `DomainConnection` is deliberately
 * keyed on `normalizedDomain` itself (see implementation.md, Stage 19.x,
 * Part 2), so this is the only way to free one up for reuse by a different
 * business — a real customer never gets this capability.
 */
export async function disconnectDomainConnectionForTesting(businessId: string): Promise<DisconnectDomainResult> {
  const connections = await listDomainConnectionsForBusiness(businessId);
  const connection = connections[0];
  if (!connection) {
    return { disconnected: false, message: 'No domain connection to remove.' };
  }

  try {
    await removeProjectDomain(connection.primaryHostname);
  } catch (err) {
    // Best-effort — don't block freeing up the DynamoDB record if the
    // Vercel side is already gone or briefly unreachable. Logged safely:
    // no token, no raw provider response.
    console.error('[disconnectDomainConnectionForTesting] Vercel removal failed (continuing):', {
      businessId,
      normalizedDomain: connection.normalizedDomain,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }

  await deleteDomainConnectionRecord(connection.normalizedDomain);
  return { disconnected: true };
}
