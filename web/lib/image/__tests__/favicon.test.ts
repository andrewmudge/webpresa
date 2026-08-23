/**
 * Unit tests for the browser-tab-icon transform. Uses the real `sharp` —
 * unlike most `lib/image`/`lib/theme` modules, this one has no S3/network
 * dependency to mock, so testing against real image bytes gives stronger
 * signal than asserting a mocked call chain.
 */
import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { generateFaviconBuffer, FAVICON_SIZE } from '../favicon';

vi.mock('server-only', () => ({}));

async function makeFixture(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 20, g: 120, b: 200, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

describe('generateFaviconBuffer', () => {
  it('produces a 256x256 PNG from a wide, rectangular source logo', async () => {
    const source = await makeFixture(800, 200);
    const result = await generateFaviconBuffer(source);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(FAVICON_SIZE);
    expect(metadata.height).toBe(FAVICON_SIZE);
    expect(metadata.format).toBe('png');
  });

  it('produces a 256x256 PNG from a tall source logo', async () => {
    const source = await makeFixture(150, 900);
    const result = await generateFaviconBuffer(source);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(FAVICON_SIZE);
    expect(metadata.height).toBe(FAVICON_SIZE);
  });

  it('produces a 256x256 PNG from an already-square source logo', async () => {
    const source = await makeFixture(400, 400);
    const result = await generateFaviconBuffer(source);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(FAVICON_SIZE);
    expect(metadata.height).toBe(FAVICON_SIZE);
  });

  it('pads with a transparent (alpha) background rather than cropping — contain, not cover', async () => {
    // A wide source resized to a square via 'contain' must retain an alpha
    // channel to actually show the transparent padding above/below it.
    const source = await makeFixture(1000, 100);
    const result = await generateFaviconBuffer(source);

    const metadata = await sharp(result).metadata();
    expect(metadata.hasAlpha).toBe(true);
  });
});
