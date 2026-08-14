/**
 * Unit tests for upload validation (Stage 25 — Security Hardening).
 * No S3/AWS interaction — pure image-decode validation via `sharp`.
 */
import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('server-only', () => ({}));

import { validateImageUpload, UploadValidationError } from '@/lib/s3/upload-validation';

function fileFrom(bytes: Buffer, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

async function makePng(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .png()
    .toBuffer();
}

async function makeJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .jpeg()
    .toBuffer();
}

describe('validateImageUpload', () => {
  it('accepts a real PNG regardless of a mislabeled browser-supplied type/name', async () => {
    const bytes = await makePng();
    // Deliberately mislabeled — the browser's file.type/file.name must never be trusted.
    const file = fileFrom(bytes, 'photo.txt', 'text/plain');

    const result = await validateImageUpload(file);

    expect(result.contentType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('accepts a real JPEG and derives the correct type/extension from the decoded bytes', async () => {
    const bytes = await makeJpeg();
    const file = fileFrom(bytes, 'photo.png', 'image/png');

    const result = await validateImageUpload(file);

    expect(result.contentType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
  });

  it('rejects an SVG even when it claims to be a PNG (the stored-XSS vector this closes)', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const file = fileFrom(svg, 'evil.png', 'image/png');

    await expect(validateImageUpload(file)).rejects.toBeInstanceOf(UploadValidationError);
  });

  it('rejects a non-image file (e.g. an HTML payload) regardless of its claimed type', async () => {
    const html = Buffer.from('<html><body><script>alert(1)</script></body></html>');
    const file = fileFrom(html, 'photo.jpg', 'image/jpeg');

    await expect(validateImageUpload(file)).rejects.toBeInstanceOf(UploadValidationError);
  });

  it('rejects a file over the size cap before ever decoding it', async () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1, 1);
    const file = fileFrom(oversized, 'huge.png', 'image/png');

    await expect(validateImageUpload(file)).rejects.toBeInstanceOf(UploadValidationError);
  });
});
