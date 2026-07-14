/**
 * Unit tests for logo-based theme detection (Brand Theme System Step 1).
 * `sharp` and the S3 asset helper are mocked — no real image processing or
 * AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSharpInstance = vi.hoisted(() => {
  const instance: Record<string, unknown> = {};
  instance.flatten = vi.fn(() => instance);
  instance.resize = vi.fn(() => instance);
  instance.raw = vi.fn(() => instance);
  instance.toBuffer = vi.fn();
  return instance;
});
const mockSharp = vi.hoisted(() => vi.fn(() => mockSharpInstance));
const mockGetAsset = vi.hoisted(() => vi.fn());

vi.mock('sharp', () => ({ default: mockSharp }));
vi.mock('@/lib/s3/assets', () => ({ getAsset: mockGetAsset }));
vi.mock('server-only', () => ({}));

import { detectLogoThemeFamily, classifyHsl } from '@/lib/theme/logo-color';

describe('classifyHsl', () => {
  it('classifies a very dark, low-saturation color as modernDark (black logo)', () => {
    expect(classifyHsl({ h: 0, s: 0.05, l: 0.1 })).toBe('modernDark');
  });

  it('returns null for a light, low-saturation color (no reliable brand signal)', () => {
    expect(classifyHsl({ h: 0, s: 0.05, l: 0.9 })).toBeNull();
  });

  it('classifies a bright red hue as red', () => {
    expect(classifyHsl({ h: 5, s: 0.6, l: 0.5 })).toBe('red');
  });

  it('classifies a dark red hue as warmPremium (burgundy)', () => {
    expect(classifyHsl({ h: 5, s: 0.6, l: 0.2 })).toBe('warmPremium');
  });

  it('classifies an orange hue as orange', () => {
    expect(classifyHsl({ h: 30, s: 0.6, l: 0.5 })).toBe('orange');
  });

  it('classifies a green hue as green', () => {
    expect(classifyHsl({ h: 120, s: 0.5, l: 0.4 })).toBe('green');
  });

  it('classifies a teal hue as modern', () => {
    expect(classifyHsl({ h: 180, s: 0.5, l: 0.4 })).toBe('modern');
  });

  it('classifies a mid-lightness blue hue as classicBlue', () => {
    expect(classifyHsl({ h: 220, s: 0.5, l: 0.5 })).toBe('classicBlue');
  });

  it('classifies a very dark blue hue as premiumNavy', () => {
    expect(classifyHsl({ h: 220, s: 0.5, l: 0.2 })).toBe('premiumNavy');
  });

  it('classifies a purple hue as purple', () => {
    expect(classifyHsl({ h: 280, s: 0.5, l: 0.5 })).toBe('purple');
  });
});

describe('detectLogoThemeFamily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for a logo URL outside our own asset proxy', async () => {
    const result = await detectLogoThemeFamily('https://cdn.example.com/logo.png');
    expect(result).toBeNull();
    expect(mockGetAsset).not.toHaveBeenCalled();
  });

  it('returns null when the asset is missing from S3', async () => {
    mockGetAsset.mockResolvedValueOnce(null);
    const result = await detectLogoThemeFamily('/api/assets/businesses/biz_1/assets/logo.png');
    expect(result).toBeNull();
  });

  it('classifies the average pixel color of a valid logo', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));
    // A saturated green pixel (roughly hue 120).
    (mockSharpInstance.toBuffer as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      Buffer.from([30, 130, 30]),
    );

    const result = await detectLogoThemeFamily('/api/assets/businesses/biz_1/assets/logo.png');

    expect(mockGetAsset).toHaveBeenCalledWith('businesses/biz_1/assets/logo.png');
    expect(result).toBe('green');
  });

  it('returns null and does not throw when sharp fails on a corrupt image', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('not-really-an-image'));
    (mockSharpInstance.toBuffer as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('bad image'));

    const result = await detectLogoThemeFamily('/api/assets/businesses/biz_1/assets/logo.png');

    expect(result).toBeNull();
  });
});
