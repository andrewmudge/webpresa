/**
 * Unit tests for desktop hero image dimension classification. `sharp` and
 * the S3 asset helper are mocked — no real image processing or AWS calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSharpInstance = vi.hoisted(() => {
  const instance: Record<string, unknown> = {};
  instance.metadata = vi.fn();
  return instance;
});
const mockSharp = vi.hoisted(() => vi.fn(() => mockSharpInstance));
const mockGetAsset = vi.hoisted(() => vi.fn());

vi.mock('sharp', () => ({ default: mockSharp }));
vi.mock('@/lib/s3/assets', () => ({ getAsset: mockGetAsset }));
vi.mock('server-only', () => ({}));

import {
  checkHeroPhotoDimensions,
  describeHeroDimensionWarning,
  describeHeroDimensionWarningsForPhotos,
} from '@/lib/image/hero-dimensions';

describe('checkHeroPhotoDimensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is not eligible for a URL outside our own asset proxy', async () => {
    const result = await checkHeroPhotoDimensions('https://cdn.example.com/hero.png');
    expect(result).toEqual({ isFullBleedEligible: false });
    expect(mockGetAsset).not.toHaveBeenCalled();
  });

  it('is not eligible when the asset is missing from S3', async () => {
    mockGetAsset.mockResolvedValueOnce(null);
    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');
    expect(result).toEqual({ isFullBleedEligible: false });
  });

  it('is eligible for an exact 1920x1080 image', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ width: 1920, height: 1080 });

    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');

    expect(mockGetAsset).toHaveBeenCalledWith('businesses/biz_1/assets/photos/0.jpg');
    expect(result).toEqual({ isFullBleedEligible: true, width: 1920, height: 1080 });
  });

  it('is eligible for an exact 1600x900 image', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ width: 1600, height: 900 });

    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');

    expect(result).toEqual({ isFullBleedEligible: true, width: 1600, height: 900 });
  });

  it('is not eligible for any other dimensions, but still returns the measured size', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ width: 1200, height: 800 });

    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');

    expect(result).toEqual({ isFullBleedEligible: false, width: 1200, height: 800 });
  });

  it('is eligible within the 100px tolerance of 1920x1080 (e.g. 1850x1150)', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ width: 1850, height: 1150 });

    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');

    expect(result).toEqual({ isFullBleedEligible: true, width: 1850, height: 1150 });
  });

  it('is eligible within the 100px tolerance of 1600x900 (e.g. 1650x950)', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ width: 1650, height: 950 });

    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');

    expect(result).toEqual({ isFullBleedEligible: true, width: 1650, height: 950 });
  });

  it('is not eligible just outside the 100px tolerance (e.g. 1801x1080)', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('fake-image-bytes'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ width: 1801, height: 1181 });

    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');

    expect(result).toEqual({ isFullBleedEligible: false, width: 1801, height: 1181 });
  });

  it('is not eligible and does not throw when sharp fails on a corrupt image', async () => {
    mockGetAsset.mockResolvedValueOnce(Buffer.from('not-really-an-image'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('bad image'));

    const result = await checkHeroPhotoDimensions('/api/assets/businesses/biz_1/assets/photos/0.jpg');

    expect(result).toEqual({ isFullBleedEligible: false });
  });
});

describe('describeHeroDimensionWarning', () => {
  it('returns null when eligible', () => {
    expect(describeHeroDimensionWarning({ isFullBleedEligible: true, width: 1920, height: 1080 })).toBeNull();
  });

  it('returns a message with measured dimensions when not eligible', () => {
    const message = describeHeroDimensionWarning({ isFullBleedEligible: false, width: 1200, height: 800 });
    expect(message).toContain('1200×800px');
    expect(message).toContain('split layout');
  });

  it('returns a message without dimensions when they could not be measured', () => {
    const message = describeHeroDimensionWarning({ isFullBleedEligible: false });
    expect(message).not.toContain('currently');
    expect(message).toContain('split layout');
  });
});

describe('describeHeroDimensionWarningsForPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('checks every photo independently, keyed by its own URL', async () => {
    mockGetAsset
      .mockResolvedValueOnce(Buffer.from('photo-0'))
      .mockResolvedValueOnce(Buffer.from('photo-1'));
    (mockSharpInstance.metadata as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ width: 1920, height: 1080 })
      .mockResolvedValueOnce({ width: 1200, height: 800 });

    const result = await describeHeroDimensionWarningsForPhotos([
      '/api/assets/businesses/biz_1/assets/photos/0.jpg',
      '/api/assets/businesses/biz_1/assets/photos/1.jpg',
    ]);

    expect(result['/api/assets/businesses/biz_1/assets/photos/0.jpg']).toBeNull();
    expect(result['/api/assets/businesses/biz_1/assets/photos/1.jpg']).toContain('1200×800px');
  });

  it('returns an empty object for no photos', async () => {
    expect(await describeHeroDimensionWarningsForPhotos([])).toEqual({});
    expect(mockGetAsset).not.toHaveBeenCalled();
  });
});
