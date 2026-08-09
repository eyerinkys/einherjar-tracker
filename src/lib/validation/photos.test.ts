import { describe, it, expect } from 'vitest';
import {
  presignRequestSchema,
  confirmUploadSchema,
  MAX_STORED_BYTE_SIZE,
} from './photos';

describe('presignRequestSchema', () => {
  const valid = {
    date: '2026-08-01',
    tag: 'front' as const,
    notes: 'Test note',
    contentType: 'image/webp' as const,
    width: 800,
    height: 600,
    byteSize: 500_000,
  };

  it('accepts a valid presign request', () => {
    expect(presignRequestSchema.parse(valid)).toEqual(valid);
  });

  it('accepts null tag', () => {
    const result = presignRequestSchema.parse({ ...valid, tag: null });
    expect(result.tag).toBeNull();
  });

  it('accepts missing tag as null', () => {
    const { tag: _, ...noTag } = valid;
    const result = presignRequestSchema.parse(noTag);
    expect(result.tag).toBeNull();
  });

  it('accepts all three tag values', () => {
    for (const tag of ['front', 'side', 'back'] as const) {
      expect(presignRequestSchema.parse({ ...valid, tag }).tag).toBe(tag);
    }
  });

  it('rejects invalid tag', () => {
    expect(() => presignRequestSchema.parse({ ...valid, tag: 'top' })).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() => presignRequestSchema.parse({ ...valid, date: '08-01-2026' })).toThrow();
    expect(() => presignRequestSchema.parse({ ...valid, date: '2026/08/01' })).toThrow();
  });

  it('rejects non-webp content type', () => {
    expect(() => presignRequestSchema.parse({ ...valid, contentType: 'image/jpeg' })).toThrow();
    expect(() => presignRequestSchema.parse({ ...valid, contentType: 'image/png' })).toThrow();
  });

  it('rejects zero or negative dimensions', () => {
    expect(() => presignRequestSchema.parse({ ...valid, width: 0 })).toThrow();
    expect(() => presignRequestSchema.parse({ ...valid, height: -1 })).toThrow();
  });

  it('rejects dimensions above 10,000', () => {
    expect(() => presignRequestSchema.parse({ ...valid, width: 10001 })).toThrow();
    expect(() => presignRequestSchema.parse({ ...valid, height: 10001 })).toThrow();
  });

  it('rejects non-integer dimensions', () => {
    expect(() => presignRequestSchema.parse({ ...valid, width: 800.5 })).toThrow();
  });

  it('rejects empty file', () => {
    expect(() => presignRequestSchema.parse({ ...valid, byteSize: 0 })).toThrow();
  });

  it('rejects file exceeding 3 MB', () => {
    expect(() => presignRequestSchema.parse({ ...valid, byteSize: MAX_STORED_BYTE_SIZE + 1 })).toThrow();
  });

  it('accepts file at exactly 3 MB', () => {
    expect(presignRequestSchema.parse({ ...valid, byteSize: MAX_STORED_BYTE_SIZE }).byteSize).toBe(MAX_STORED_BYTE_SIZE);
  });

  it('rejects notes exceeding 1,000 characters', () => {
    expect(() => presignRequestSchema.parse({ ...valid, notes: 'x'.repeat(1001) })).toThrow();
  });

  it('accepts notes at exactly 1,000 characters', () => {
    const notes = 'x'.repeat(1000);
    expect(presignRequestSchema.parse({ ...valid, notes }).notes).toBe(notes);
  });

  it('accepts missing notes', () => {
    const { notes: _, ...noNotes } = valid;
    expect(presignRequestSchema.parse(noNotes).notes).toBeUndefined();
  });
});

describe('confirmUploadSchema', () => {
  const valid = {
    storageKey: 'users/user-1/abc-def',
    date: '2026-08-01',
    tag: 'front' as const,
    notes: 'Looking leaner.',
    contentType: 'image/webp' as const,
    width: 800,
    height: 1200,
    byteSize: 500 * 1024,
  };

  it('accepts a valid confirmation', () => {
    expect(confirmUploadSchema.parse(valid)).toEqual(valid);
  });

  it('rejects missing fields', () => {
    expect(() => confirmUploadSchema.parse({ ...valid, storageKey: '' })).toThrow();
    expect(() => confirmUploadSchema.parse({ ...valid, date: undefined })).toThrow();
  });
});
