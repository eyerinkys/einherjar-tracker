'use server';

import { z, type ZodType } from 'zod';
import type { ActionResult } from '../server/action-result';
import { AuthorizationError } from '../server/auth/ownership';
import { requireUser } from '../server/auth/require-user';
import { AuthenticationError } from '../server/auth/session';
import {
  addSplitExerciseForUser,
  createSplitDayForUser,
  deleteSplitDayForUser,
  removeSplitExerciseForUser,
  renameSplitDayForUser,
  reorderSplitDaysForUser,
  reorderSplitExercisesForUser,
  updateSplitExerciseForUser,
} from '../server/splits/mutations';
import { SplitMutationError } from '../server/splits/errors';
import {
  addSplitExerciseInputSchema,
  createSplitDayInputSchema,
  deleteSplitDayInputSchema,
  removeSplitExerciseInputSchema,
  renameSplitDayInputSchema,
  reorderSplitDaysInputSchema,
  reorderSplitExercisesInputSchema,
  updateSplitExerciseInputSchema,
  type AddSplitExerciseInput,
  type CreateSplitDayInput,
  type DeleteSplitDayInput,
  type RemoveSplitExerciseInput,
  type RenameSplitDayInput,
  type ReorderSplitDaysInput,
  type ReorderSplitExercisesInput,
  type UpdateSplitExerciseInput,
} from '../server/validation/split';
import type { SplitDay } from '../types';

async function runSplitAction<TInput>(
  schema: ZodType<TInput>,
  input: unknown,
  mutate: (userId: string, parsedInput: TInput) => Promise<SplitDay[]>,
): Promise<ActionResult<SplitDay[]>> {
  try {
    const authenticatedUser = await requireUser();
    const parsedInput = schema.parse(input);
    return { ok: true, data: await mutate(authenticatedUser.id, parsedInput) };
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

    if (error instanceof SplitMutationError) {
      return { ok: false, code: error.code, message: error.message };
    }

    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to update the split. Please try again.',
    };
  }
}

export async function createSplitDay(
  input: CreateSplitDayInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(createSplitDayInputSchema, input, createSplitDayForUser);
}

export async function renameSplitDay(
  input: RenameSplitDayInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(renameSplitDayInputSchema, input, renameSplitDayForUser);
}

export async function deleteSplitDay(
  input: DeleteSplitDayInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(deleteSplitDayInputSchema, input, deleteSplitDayForUser);
}

export async function reorderSplitDays(
  input: ReorderSplitDaysInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(reorderSplitDaysInputSchema, input, reorderSplitDaysForUser);
}

export async function addSplitExercise(
  input: AddSplitExerciseInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(addSplitExerciseInputSchema, input, addSplitExerciseForUser);
}

export async function removeSplitExercise(
  input: RemoveSplitExerciseInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(removeSplitExerciseInputSchema, input, removeSplitExerciseForUser);
}

export async function reorderSplitExercises(
  input: ReorderSplitExercisesInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(reorderSplitExercisesInputSchema, input, reorderSplitExercisesForUser);
}

export async function updateSplitExercise(
  input: UpdateSplitExerciseInput,
): Promise<ActionResult<SplitDay[]>> {
  return runSplitAction(updateSplitExerciseInputSchema, input, updateSplitExerciseForUser);
}
