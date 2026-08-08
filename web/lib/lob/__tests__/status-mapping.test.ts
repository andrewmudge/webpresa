import { describe, it, expect } from 'vitest';
import { mapLobEventToPostcardStatus } from '../status-mapping';

const OCCURRED_AT = '2026-08-08T12:00:00.000Z';

describe('mapLobEventToPostcardStatus', () => {
  it('maps postcard.mailed to status mailed with mailedAt', () => {
    expect(mapLobEventToPostcardStatus('postcard.mailed', OCCURRED_AT)).toEqual({ status: 'mailed', mailedAt: OCCURRED_AT });
  });

  it('maps postcard.delivered to status delivered with deliveredAt', () => {
    expect(mapLobEventToPostcardStatus('postcard.delivered', OCCURRED_AT)).toEqual({ status: 'delivered', deliveredAt: OCCURRED_AT });
  });

  it('maps postcard.returned_to_sender to status failed with a failureReason', () => {
    const result = mapLobEventToPostcardStatus('postcard.returned_to_sender', OCCURRED_AT);
    expect(result.status).toBe('failed');
    expect(result.failureReason).toBeTruthy();
  });

  it.each(['postcard.in_transit', 'postcard.in_local_area', 'postcard.processed_for_delivery', 'postcard.re-routed'])(
    'does not change the rollup for the in-flight tracking event %s',
    (eventType) => {
      expect(mapLobEventToPostcardStatus(eventType, OCCURRED_AT)).toEqual({});
    },
  );

  it('returns an empty mapping for an unrecognized event type (forward-compatible no-op)', () => {
    expect(mapLobEventToPostcardStatus('postcard.something_new', OCCURRED_AT)).toEqual({});
  });
});
