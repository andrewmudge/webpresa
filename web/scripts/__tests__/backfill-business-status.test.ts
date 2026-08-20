/**
 * Unit tests for the backfill script's pure priority-order derivation.
 * The AWS-wiring `main()` is guarded to only run on direct script
 * execution (see `import.meta.url` check), so importing this module here
 * is safe — no real AWS calls, no accidental live run.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { computeBackfillStatus } from '../backfill-business-status';

describe('computeBackfillStatus', () => {
  it('returns customer when subscriptionStatus is active — even if other lower-priority signals disagree', () => {
    expect(
      computeBackfillStatus({ subscriptionStatus: 'active', ownerUserId: undefined }, [], []),
    ).toBe('customer');
  });

  it('returns cancelled when subscriptionStatus is canceled', () => {
    expect(
      computeBackfillStatus({ subscriptionStatus: 'canceled', ownerUserId: 'user_1' }, [], []),
    ).toBe('cancelled');
  });

  it('returns claimed when ownerUserId is present and there is no subscriptionStatus', () => {
    expect(
      computeBackfillStatus({ subscriptionStatus: undefined, ownerUserId: 'user_1' }, [], []),
    ).toBe('claimed');
  });

  it('returns engaged when any recipient has firstScanAt set', () => {
    expect(
      computeBackfillStatus(
        { subscriptionStatus: undefined, ownerUserId: undefined },
        [{ firstScanAt: undefined }, { firstScanAt: '2026-08-01T00:00:00.000Z' }],
        [],
      ),
    ).toBe('engaged');
  });

  it('returns outreach when any postcard was submitted/mailed/delivered', () => {
    expect(
      computeBackfillStatus(
        { subscriptionStatus: undefined, ownerUserId: undefined },
        [],
        [{ status: 'pending' }, { status: 'mailed' }],
      ),
    ).toBe('outreach');
  });

  it('does not count a merely-pending/submitting/failed postcard as outreach', () => {
    expect(
      computeBackfillStatus(
        { subscriptionStatus: undefined, ownerUserId: undefined },
        [],
        [{ status: 'pending' }, { status: 'submitting' }, { status: 'failed' }],
      ),
    ).toBe('pending');
  });

  it('defaults to pending when no signal is present', () => {
    expect(
      computeBackfillStatus({ subscriptionStatus: undefined, ownerUserId: undefined }, [], []),
    ).toBe('pending');
  });
});
