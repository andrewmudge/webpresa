import { describe, it, expect } from 'vitest';
import { mapGoogleTypeToIndustry, isIndustry, GOOGLE_SEARCH_QUERY_LABELS } from '../industry-map';
import { INDUSTRIES } from '@/domain/constants/industries';

describe('mapGoogleTypeToIndustry', () => {
  it('maps a known primaryType directly', () => {
    expect(mapGoogleTypeToIndustry('plumber', undefined)).toBe('plumbing');
    expect(mapGoogleTypeToIndustry('hair_salon', [])).toBe('salon');
  });

  it('falls back to scanning types when primaryType is unmapped', () => {
    expect(mapGoogleTypeToIndustry('unknown_thing', ['point_of_interest', 'electrician'])).toBe(
      'electrical',
    );
  });

  it('returns undefined when nothing matches', () => {
    expect(mapGoogleTypeToIndustry('museum', ['point_of_interest', 'establishment'])).toBeUndefined();
    expect(mapGoogleTypeToIndustry(undefined, undefined)).toBeUndefined();
  });
});

describe('isIndustry', () => {
  it('accepts every canonical industry', () => {
    for (const industry of INDUSTRIES) {
      expect(isIndustry(industry)).toBe(true);
    }
  });

  it('rejects unknown or empty values', () => {
    expect(isIndustry('')).toBe(false);
    expect(isIndustry('not-an-industry')).toBe(false);
  });
});

describe('GOOGLE_SEARCH_QUERY_LABELS', () => {
  it('has a label for every industry', () => {
    for (const industry of INDUSTRIES) {
      expect(typeof GOOGLE_SEARCH_QUERY_LABELS[industry]).toBe('string');
      expect(GOOGLE_SEARCH_QUERY_LABELS[industry].length).toBeGreaterThan(0);
    }
  });
});
