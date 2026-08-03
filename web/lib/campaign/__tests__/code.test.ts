/**
 * Unit tests for campaign-code generation (Stage 21).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { generateCampaignCode } from '../code';

describe('generateCampaignCode', () => {
  it('produces a 16-character Crockford-Base32-only code (80 bits, no dashes)', () => {
    const code = generateCampaignCode();
    expect(code).toHaveLength(16);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/); // excludes I, L, O, U
    expect(code).not.toContain('-');
  });

  it('generates a different code on every call', () => {
    expect(generateCampaignCode()).not.toBe(generateCampaignCode());
  });

  it('never contains ambiguous characters I, L, O, U', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateCampaignCode();
      expect(code).not.toMatch(/[ILOU]/);
    }
  });
});
