/**
 * Unit tests for campaign-code display formatting and manual-entry
 * normalization (Stage 21). Pure functions, no mocks needed.
 */
import { describe, it, expect } from 'vitest';
import { normalizeCampaignCodeInput, formatCampaignCodeForDisplay } from '../code-format';

describe('formatCampaignCodeForDisplay', () => {
  it('groups a 16-character code into four dash-separated groups of four', () => {
    expect(formatCampaignCodeForDisplay('AB23CD45EF67GH89')).toBe('AB23-CD45-EF67-GH89');
  });
});

describe('normalizeCampaignCodeInput', () => {
  it('strips dashes and whitespace and uppercases', () => {
    expect(normalizeCampaignCodeInput('ab23-cd45-ef67-gh89')).toBe('AB23CD45EF67GH89');
    expect(normalizeCampaignCodeInput('  AB23 CD45 EF67 GH89  ')).toBe('AB23CD45EF67GH89');
  });

  it('is the exact inverse of formatCampaignCodeForDisplay', () => {
    const code = 'AB23CD45EF67GH89';
    expect(normalizeCampaignCodeInput(formatCampaignCodeForDisplay(code))).toBe(code);
  });

  it('is idempotent — normalizing an already-normalized code is a no-op', () => {
    const normalized = normalizeCampaignCodeInput('AB23-CD45-EF67-GH89');
    expect(normalizeCampaignCodeInput(normalized)).toBe(normalized);
  });
});
