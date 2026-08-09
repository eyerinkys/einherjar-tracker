'use server';

import { z } from 'zod';
import { getDb } from '@/db/client';
import { bodyweightLogs } from '@/db/schema';
import { requireUser } from '@/server/auth/require-user';
import { AuthenticationError } from '@/server/auth/session';
import { AuthorizationError } from '@/server/auth/ownership';
import { getBodyweightSummary } from '@/server/queries/bodyweight';
import {
  logBodyweightSchema,
  deleteBodyweightSchema,
} from '@/lib/validation/bodyweight';
import type { ActionResult } from '@/server/action-result';
import type { BodyweightEntry, BodyweightSummaryDTO } from '@/types';
import { eq, and } from 'drizzle-orm';

export async function logBodyweight(input: unknown): Promise<ActionResult<BodyweightEntry>> {
  try {
    const user = await requireUser();
    const parsed = logBodyweightSchema.parse(input);

    const [row] = await getDb()
      .insert(bodyweightLogs)
      .values({
        userId: user.id,
        date: parsed.date,
        weightKg: parsed.weightKg.toString(),
        notes: parsed.notes,
      })
      .onConflictDoUpdate({
        target: [bodyweightLogs.userId, bodyweightLogs.date],
        set: {
          weightKg: parsed.weightKg.toString(),
          notes: parsed.notes,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      ok: true,
      data: {
        id: row.id,
        date: row.date,
        weightKg: Number(row.weightKg),
        notes: row.notes ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const flattened = z.flattenError(error);
      const fieldErrors = { ...flattened.fieldErrors } as Record<string, string[]>;
      if (flattened.formErrors.length > 0) {
        fieldErrors._form = flattened.formErrors;
      }
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        fieldErrors,
      };
    }

    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to log bodyweight. Please try again.',
    };
  }
}

export async function deleteBodyweightEntry(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = deleteBodyweightSchema.parse(input);

    const deleted = await getDb()
      .delete(bodyweightLogs)
      .where(and(eq(bodyweightLogs.id, parsed.id), eq(bodyweightLogs.userId, user.id)))
      .returning({ id: bodyweightLogs.id });

    if (deleted.length === 0) {
      return { ok: false, code: 'NOT_FOUND', message: 'Bodyweight entry not found.' };
    }

    return { ok: true, data: { id: deleted[0].id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const flattened = z.flattenError(error);
      const fieldErrors = { ...flattened.fieldErrors } as Record<string, string[]>;
      if (flattened.formErrors.length > 0) {
        fieldErrors._form = flattened.formErrors;
      }
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        fieldErrors,
      };
    }

    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to delete bodyweight entry. Please try again.',
    };
  }
}

export async function getBodyweightSummaryAction(): Promise<ActionResult<BodyweightSummaryDTO>> {
  try {
    const user = await requireUser();
    const summary = await getBodyweightSummary(user.id);
    return { ok: true, data: summary };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to load bodyweight data. Please try again.',
    };
  }
}
