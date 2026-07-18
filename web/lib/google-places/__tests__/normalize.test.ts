import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  normalizeDomain,
  normalizeName,
  buildAddressFromComponents,
  summarizeOpeningHours,
} from '../normalize';

describe('normalizePhone', () => {
  it('strips formatting to digits only', () => {
    expect(normalizePhone('(512) 555-0100')).toBe('5125550100');
  });

  it('strips a leading US/Canada country code so it matches the bare 10-digit form', () => {
    expect(normalizePhone('+1 512-555-0100')).toBe('5125550100');
    expect(normalizePhone('(512) 555-0100')).toBe('5125550100');
  });

  it('returns undefined for empty/missing input', () => {
    expect(normalizePhone(undefined)).toBeUndefined();
    expect(normalizePhone('')).toBeUndefined();
    expect(normalizePhone('   ')).toBeUndefined();
  });
});

describe('normalizeDomain', () => {
  it('extracts a lowercased hostname without www.', () => {
    expect(normalizeDomain('https://www.Acme-Plumbing.com/contact')).toBe('acme-plumbing.com');
  });

  it('adds a protocol when missing before parsing', () => {
    expect(normalizeDomain('acme-plumbing.com')).toBe('acme-plumbing.com');
  });

  it('returns undefined for missing or unparseable input', () => {
    expect(normalizeDomain(undefined)).toBeUndefined();
    expect(normalizeDomain('not a url at all ::::')).toBeUndefined();
  });
});

describe('normalizeName', () => {
  it('lowercases, strips punctuation/diacritics, and collapses whitespace', () => {
    expect(normalizeName("Acme Plumbing & Héating, Co.")).toBe('acme plumbing heating co');
  });

  it('returns an empty string for missing input', () => {
    expect(normalizeName(undefined)).toBe('');
  });
});

describe('buildAddressFromComponents', () => {
  it('builds a structured Address from Google addressComponents', () => {
    const address = buildAddressFromComponents([
      { longText: '123', types: ['street_number'] },
      { longText: 'Main St', types: ['route'] },
      { longText: 'Austin', types: ['locality'] },
      { shortText: 'TX', types: ['administrative_area_level_1'] },
      { longText: '78701', types: ['postal_code'] },
      { shortText: 'US', types: ['country'] },
    ]);

    expect(address).toEqual({
      line1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'US',
    });
  });

  it('returns undefined when a required component is missing', () => {
    const address = buildAddressFromComponents([
      { longText: '123', types: ['street_number'] },
      { longText: 'Main St', types: ['route'] },
      // no locality/city
      { shortText: 'TX', types: ['administrative_area_level_1'] },
      { longText: '78701', types: ['postal_code'] },
      { shortText: 'US', types: ['country'] },
    ]);
    expect(address).toBeUndefined();
  });

  it('returns undefined for missing/empty components', () => {
    expect(buildAddressFromComponents(undefined)).toBeUndefined();
    expect(buildAddressFromComponents([])).toBeUndefined();
  });
});

describe('summarizeOpeningHours', () => {
  it('joins weekday descriptions into one summary string', () => {
    expect(
      summarizeOpeningHours({ weekdayDescriptions: ['Monday: 8AM–6PM', 'Tuesday: 8AM–6PM'] }),
    ).toBe('Monday: 8AM–6PM; Tuesday: 8AM–6PM');
  });

  it('returns undefined when no descriptions are present', () => {
    expect(summarizeOpeningHours(undefined)).toBeUndefined();
    expect(summarizeOpeningHours({ weekdayDescriptions: [] })).toBeUndefined();
  });
});
