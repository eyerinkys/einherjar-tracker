'use server';

import { z } from 'zod';
import {
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getDb } from '@/db/client';
import { progressPhotos } from '@/db/schema';
import { b2Client, B2_BUCKET_NAME } from '@/lib/b2';
import { requireUser } from '@/server/auth/require-user';
import { AuthenticationError } from '@/server/auth/session';
import { AuthorizationError } from '@/server/auth/ownership';
import { confirmUploadSchema, deletePhotoSchema } from '@/lib/validation/photos';
import type { ActionResult } from '@/server/action-result';
import type { ProgressPhoto } from '@/types';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Confirm a photo upload by verifying the object exists in B2 with the
 * expected key prefix, content type, and size. On HEAD failure or mismatch,
 * delete the invalid B2 object and return an error.
 */
export async function confirmPhotoUpload(
  input: unknown
): Promise<ActionResult<ProgressPhoto>> {
  try {
    const user = await requireUser();
    const parsed = confirmUploadSchema.parse(input);

    // 1. Verify storage key belongs to this user
    if (!parsed.storageKey.startsWith(`users/${user.id}/`)) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid storage key.',
      };
    }

    // 2. Perform HEAD against B2
    let head;
    try {
      head = await b2Client.send(
        new HeadObjectCommand({
          Bucket: B2_BUCKET_NAME,
          Key: parsed.storageKey,
        })
      );
    } catch {
      // HEAD failed — object does not exist or is inaccessible
      return {
        ok: false,
        code: 'UPLOAD_FAILED',
        message: 'Upload could not be verified. Please try again.',
      };
    }

    // 3. Verify content type matches
    if (head.ContentType && head.ContentType !== parsed.contentType) {
      await deleteB2Object(parsed.storageKey);
      return {
        ok: false,
        code: 'UPLOAD_INVALID',
        message: 'Uploaded file type does not match. Please try again.',
      };
    }

    // 4. Verify size is within tolerance
    if (head.ContentLength !== undefined && head.ContentLength > parsed.byteSize * 1.1) {
      await deleteB2Object(parsed.storageKey);
      return {
        ok: false,
        code: 'UPLOAD_INVALID',
        message: 'Uploaded file is too large. Please try again.',
      };
    }

    // 5. Insert metadata row since upload is confirmed
    const [row] = await getDb()
      .insert(progressPhotos)
      .values({
        userId: user.id,
        storageKey: parsed.storageKey,
        date: parsed.date,
        tag: parsed.tag,
        notes: parsed.notes ?? null,
        mimeType: parsed.contentType,
        byteSize: parsed.byteSize,
        width: parsed.width,
        height: parsed.height,
      })
      .returning();

    return { ok: true, data: await mapRowToDTO(row) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid confirmation data.',
      };
    }

    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to confirm photo upload. Please try again.',
    };
  }
}

/**
 * Get all owned photos ordered by date descending.
 */
export async function getPhotos(): Promise<ActionResult<ProgressPhoto[]>> {
  try {
    const user = await requireUser();

    const rows = await getDb()
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, user.id))
      .orderBy(desc(progressPhotos.date), desc(progressPhotos.createdAt));

    return {
      ok: true,
      data: await Promise.all(rows.map(mapRowToDTO)),
    };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to load photos. Please try again.',
    };
  }
}

/**
 * Delete a photo's metadata and object from B2.
 */
export async function deletePhoto(input: unknown): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();
    const parsed = deletePhotoSchema.parse(input);

    const [row] = await getDb()
      .select()
      .from(progressPhotos)
      .where(
        and(
          eq(progressPhotos.id, parsed.photoId),
          eq(progressPhotos.userId, user.id)
        )
      )
      .limit(1);

    if (!row) {
      return { ok: false, code: 'NOT_FOUND', message: 'Photo not found.' };
    }

    await deleteB2Object(row.storageKey);
    await deleteMetadataRow(row.id, user.id);

    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'Invalid request data.' };
    }
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: 'INTERNAL_ERROR', message: 'Unable to delete photo. Please try again.' };
  }
}

// --- Helpers ---

async function mapRowToDTO(row: typeof progressPhotos.$inferSelect): Promise<ProgressPhoto> {
  const url = await getSignedUrl(
    b2Client,
    new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: row.storageKey,
    }),
    { expiresIn: 3600 }
  );

  return {
    id: row.id,
    date: row.date,
    tag: row.tag as ProgressPhoto['tag'],
    notes: row.notes ?? undefined,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    url,
  };
}

async function deleteB2Object(key: string): Promise<void> {
  try {
    await b2Client.send(
      new DeleteObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch {
    // Best-effort cleanup — log but don't fail the caller
  }
}

async function deleteMetadataRow(photoId: string, userId: string): Promise<void> {
  await getDb()
    .delete(progressPhotos)
    .where(
      and(
        eq(progressPhotos.id, photoId),
        eq(progressPhotos.userId, userId)
      )
    );
}
