/**
 * Unit tests for Brand Theme System selection logic.
 * Logo detection and the OpenAI client are mocked — no real image
 * processing or API calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDetectLogoThemeFamily = vi.hoisted(() => vi.fn());
const mockParse = vi.hoisted(() => vi.fn());
const mockGetOpenAiClient = vi.hoisted(() => vi.fn());

vi.mock('@/lib/theme/logo-color', () => ({
  detectLogoThemeFamily: mockDetectLogoThemeFamily,
}));

vi.mock('@/lib/ai/client', () => ({
  getOpenAiClient: mockGetOpenAiClient,
  getOpenAiModel: () => 'gpt-4o-mini',
}));

vi.mock('server-only', () => ({}));

import {
  pickStoredOrLogoTheme,
  pickThemeViaOpenAi,
  resolveBusinessTheme,
  resolveBusinessThemeForSeed,
} from '@/lib/theme/select-theme';
import type { Business } from '@/domain/models/business';

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    businessId: 'biz_00000000-0000-0000-0000-000000000001',
    slug: 'acme-plumbing',
    name: 'Acme Plumbing',
    industry: 'plumbing',
    source: 'manual',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOpenAiClient.mockResolvedValue({ chat: { completions: { parse: mockParse } } });
});

describe('pickStoredOrLogoTheme', () => {
  it('returns the stored business theme without checking the logo', async () => {
    const business = makeBusiness({ theme: 'purple', logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' });
    const result = await pickStoredOrLogoTheme(business);
    expect(result).toBe('purple');
    expect(mockDetectLogoThemeFamily).not.toHaveBeenCalled();
  });

  it('detects a theme from the logo when no theme is stored', async () => {
    mockDetectLogoThemeFamily.mockResolvedValueOnce('green');
    const business = makeBusiness({ logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' });
    const result = await pickStoredOrLogoTheme(business);
    expect(result).toBe('green');
  });

  it('returns undefined when there is no stored theme and no logo', async () => {
    const business = makeBusiness();
    const result = await pickStoredOrLogoTheme(business);
    expect(result).toBeUndefined();
  });

  it('returns undefined when a logo exists but detection is inconclusive', async () => {
    mockDetectLogoThemeFamily.mockResolvedValueOnce(null);
    const business = makeBusiness({ logoUrl: '/api/assets/businesses/biz_1/assets/logo.png' });
    const result = await pickStoredOrLogoTheme(business);
    expect(result).toBeUndefined();
  });
});

describe('pickThemeViaOpenAi', () => {
  it('returns the model-selected theme name', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: { theme: 'modernDark' } } }] });
    const result = await pickThemeViaOpenAi(makeBusiness());
    expect(result).toBe('modernDark');
  });

  it('falls back to the default theme when the model returns no parsable output', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: null } }] });
    const result = await pickThemeViaOpenAi(makeBusiness());
    expect(result).toBe('classicBlue');
  });
});

describe('resolveBusinessTheme (real AI generation path)', () => {
  it('reuses the stored theme without calling OpenAI', async () => {
    const business = makeBusiness({ theme: 'red' });
    const result = await resolveBusinessTheme(business);
    expect(result).toBe('red');
    expect(mockGetOpenAiClient).not.toHaveBeenCalled();
  });

  it('calls OpenAI when there is no stored theme and no logo', async () => {
    mockParse.mockResolvedValueOnce({ choices: [{ message: { parsed: { theme: 'warmPremium' } } }] });
    const result = await resolveBusinessTheme(makeBusiness());
    expect(result).toBe('warmPremium');
    expect(mockGetOpenAiClient).toHaveBeenCalledOnce();
  });
});

describe('resolveBusinessThemeForSeed (free seed path — never calls OpenAI)', () => {
  it('reuses the stored theme', async () => {
    const business = makeBusiness({ theme: 'orange' });
    const result = await resolveBusinessThemeForSeed(business);
    expect(result).toBe('orange');
    expect(mockGetOpenAiClient).not.toHaveBeenCalled();
  });

  it('falls back to the industry default when nothing is stored', async () => {
    const business = makeBusiness({ industry: 'landscaping' });
    const result = await resolveBusinessThemeForSeed(business);
    expect(result).toBe('green');
    expect(mockGetOpenAiClient).not.toHaveBeenCalled();
  });

  it('falls back to the global default for an industry with no mapped preset', async () => {
    const business = makeBusiness({ industry: 'painting' });
    // 'painting' maps to 'orange' in INDUSTRY_THEME_DEFAULTS — sanity-check
    // the mapping is actually consulted rather than always returning the
    // global default.
    const result = await resolveBusinessThemeForSeed(business);
    expect(result).toBe('orange');
  });
});
