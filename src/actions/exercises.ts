'use server';

import { z } from 'zod';
import { getDb } from '@/db/client';
import { exercises } from '@/db/schema';
import { requireUser } from '@/server/auth/require-user';
import { AuthenticationError } from '@/server/auth/session';
import { createCustomExerciseSchema } from '@/server/validation/exercise';
import type { ActionResult } from '@/server/action-result';
import type { Exercise } from '@/types';

export async function createCustomExercise(
  input: unknown
): Promise<ActionResult<Exercise>> {
  try {
    const user = await requireUser();
    const parsed = createCustomExerciseSchema.parse(input);

    const [inserted] = await getDb()
      .insert(exercises)
      .values({
        name: parsed.name,
        muscleGroup: parsed.muscleGroup,
        equipment: parsed.equipment,
        category: parsed.category,
        createdByUserId: user.id,
        isCustom: true,
      })
      .returning();

    const dto: Exercise = {
      id: inserted.id,
      name: inserted.name,
      muscleGroup: inserted.muscleGroup,
      equipment: inserted.equipment,
      category: inserted.category,
      createdByUserId: inserted.createdByUserId ?? undefined,
      isCustom: inserted.isCustom,
    };

    return { ok: true, data: dto };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: error.issues[0]?.message ?? 'Invalid exercise details.',
      };
    }

    if (error instanceof AuthenticationError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Failed to create custom exercise. Please try again.',
    };
  }
}
