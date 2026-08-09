import type { CompressedImage } from '@/types';
import {
  MAX_LONG_EDGE,
  MAX_SOURCE_BYTE_SIZE,
  MAX_STORED_BYTE_SIZE,
  ACCEPTED_SOURCE_TYPES,
} from '@/lib/validation/photos';

/**
 * Compress an image file to WebP for upload.
 *
 * - Rejects files >20 MB before processing.
 * - Rejects non-image MIME types (accepts JPEG, PNG, WebP).
 * - Resizes to a maximum 1,600px long edge, maintaining aspect ratio.
 * - Encodes to WebP at ~0.82 quality.
 * - Verifies output ≤3 MB.
 *
 * Uses native browser APIs (createImageBitmap + Canvas) for orientation-safe
 * decoding. No external compression library needed.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  // 1. Validate source type
  if (!ACCEPTED_SOURCE_TYPES.includes(file.type as typeof ACCEPTED_SOURCE_TYPES[number])) {
    throw new Error(
      `Unsupported image type: ${file.type}. Accepted types: ${ACCEPTED_SOURCE_TYPES.join(', ')}`
    );
  }

  // 2. Validate source size
  if (file.size > MAX_SOURCE_BYTE_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum source size is ${MAX_SOURCE_BYTE_SIZE / 1024 / 1024} MB.`
    );
  }

  // 3. Decode image (createImageBitmap handles EXIF orientation)
  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // 4. Calculate target dimensions
  const longEdge = Math.max(origW, origH);
  let targetW = origW;
  let targetH = origH;

  if (longEdge > MAX_LONG_EDGE) {
    const scale = MAX_LONG_EDGE / longEdge;
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
  }

  // 5. Draw to canvas at target dimensions
  let blob: Blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context.');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
  } else {
    // Fallback for environments without OffscreenCanvas
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context.');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed.'))),
        'image/webp',
        0.82
      );
    });
  }

  bitmap.close();

  // 6. Verify output size
  if (blob.size > MAX_STORED_BYTE_SIZE) {
    throw new Error(
      `Compressed image is too large (${(blob.size / 1024 / 1024).toFixed(1)} MB). Maximum stored size is ${MAX_STORED_BYTE_SIZE / 1024 / 1024} MB.`
    );
  }

  return { blob, width: targetW, height: targetH };
}
