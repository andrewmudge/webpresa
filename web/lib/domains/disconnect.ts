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
 * Part 2). This one takes `connections[0]` unconditionally (including an
 * already-`'disconnected'` record) since it's only ever used against a
 * throwaway dev/test business — see `disconnectDomainConnectionForCustomer`
 * below for the real, customer-facing equivalent.
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

/**
 * Customer-facing "change domain" (Settings → Domain). Same hard-delete
 * shape as the admin utility above, deliberately — `startDomainConnection`
 * (`lib/domains/connect.ts`) treats any *existing*, non-`'draft'` record for
 * a `normalizedDomain` as already-attached and returns early without
 * re-running the Vercel attach step; a soft `status: 'disconnected'` flip
 * would silently fail to reconnect if the customer picked the same domain
 * again. A hard delete frees `normalizedDomain` cleanly so any future
 * connection attempt — same domain or a new one — always goes through the
 * real create/attach path. There's no domain-history UI in this app that
 * depends on old disconnected records surviving.
 */
export async function disconnectDomainConnectionForCustomer(businessId: string): Promise<DisconnectDomainResult> {
  const connections = await listDomainConnectionsForBusiness(businessId);
  const connection = connections.find((c) => c.status !== 'disconnected');
  if (!connection) {
    return { disconnected: false, message: 'No domain connection to remove.' };
  }

  try {
    await removeProjectDomain(connection.primaryHostname);
  } catch (err) {
    // Best-effort, same as `disconnectDomainConnectionForTesting` — don't
    // block freeing up the DynamoDB record if the Vercel side is already
    // gone or briefly unreachable.
    console.error('[disconnectDomainConnectionForCustomer] Vercel removal failed (continuing):', {
      businessId,
      normalizedDomain: connection.normalizedDomain,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }

  await deleteDomainConnectionRecord(connection.normalizedDomain);
  return { disconnected: true };
}
