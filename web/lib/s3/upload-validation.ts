import 'server-only';
import sharp from 'sharp';

/**
 * Server-side validation for customer/admin-uploaded business assets (logo,
 * photos) — Stage 25 (Security Hardening), closing the gap `uploadBusinessAsset`
 * previously documented: uploads were stored with the browser-supplied
 * `file.type` and a client-controlled filename extension, with no size cap
 * and no check that the bytes were actually a decodable image. Combined with
 * `/api/assets/[...key]`'s extension-derived `Content-Type` (including
 * `svg`), that made a same-origin stored-XSS upload possible.
 *
 * Mirrors `lib/firecrawl/images.ts`'s existing sharp-decode-and-allowlist
 * pattern (same `MAX_BYTES`, same three-format allowlist) rather than
 * inventing a second validation approach — that path already validates
 * Firecrawl-discovered images before rehosting them; this one covers the
 * one path that didn't, raw customer/admin `File` uploads.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — same cap as lib/firecrawl/images.ts

const FORMAT_TO_CONTENT_TYPE: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const FORMAT_TO_EXTENSION: Record<string, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

export class UploadValidationError extends Error {}

export interface ValidatedImageUpload {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Decodes and validates an uploaded `File` as an image. Never trusts the
 * browser-supplied `file.type` or `file.name` — the returned `contentType`/
 * `extension` are derived exclusively from sharp's own decode of the actual
 * bytes. SVG is deliberately not in the allowlist: it's an active-content
 * format (can embed `<script>`), and no SVG-sanitization dependency exists
 * in this repo — rejecting it outright is the accepted MVP posture (see
 * `implementation.md`, Stage 25, "Output encoding / XSS").
 */
export async function validateImageUpload(file: File): Promise<ValidatedImageUpload> {
  if (file.size > MAX_BYTES) {
    throw new UploadValidationError(`File is too large — maximum size is ${MAX_BYTES / (1024 * 1024)}MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let format: string | undefined;
  try {
    ({ format } = await sharp(buffer).metadata());
  } catch {
    throw new UploadValidationError('That file could not be read as an image.');
  }

  const contentType = format ? FORMAT_TO_CONTENT_TYPE[format] : undefined;
  const extension = format ? FORMAT_TO_EXTENSION[format] : undefined;
  if (!contentType || !extension) {
    throw new UploadValidationError('Unsupported file type — only JPEG, PNG, and WebP images are allowed.');
  }

  return { buffer, contentType, extension };
}
