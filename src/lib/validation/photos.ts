import { z } from 'zod';

/** Maximum stored image size: 3 MB */
export const MAX_STORED_BYTE_SIZE = 3 * 1024 * 1024;

/** Maximum source file size before compression: 20 MB */
export const MAX_SOURCE_BYTE_SIZE = 20 * 1024 * 1024;

/** Maximum long-edge pixel dimension for resized output */
export const MAX_LONG_EDGE = 1600;

export const PHOTO_TAGS = ['front', 'side', 'back'] as const;

export const ACCEPTED_SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const presignRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tag: z
    .enum(PHOTO_TAGS)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  notes: z.string().max(1000, 'Notes must be at most 1,000 characters').optional(),
  contentType: z.literal('image/webp', {
    message: 'Content type must be image/webp',
  }),
  width: z.number().int().min(1, 'Width must be at least 1').max(10000, 'Width must be at most 10,000'),
  height: z.number().int().min(1, 'Height must be at least 1').max(10000, 'Height must be at most 10,000'),
  byteSize: z
    .number()
    .int()
    .min(1, 'File must not be empty')
    .max(MAX_STORED_BYTE_SIZE, `File must be at most ${MAX_STORED_BYTE_SIZE / 1024 / 1024} MB`),
});

export const confirmUploadSchema = presignRequestSchema.extend({
  storageKey: z.string().min(1, 'Storage key is required'),
});

export type PresignRequestInput = z.infer<typeof presignRequestSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const deletePhotoSchema = z.object({
  photoId: z.string().uuid('Photo ID must be a valid UUID'),
});

export type DeletePhotoInput = z.infer<typeof deletePhotoSchema>;
