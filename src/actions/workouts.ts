'use server';

import { z, type ZodType } from 'zod';
import type { ActionResult } from '../server/action-result';
import { AuthorizationError } from '../server/auth/ownership';
import { requireUser } from '../server/auth/require-user';
import { AuthenticationError } from '../server/auth/session';
import {
  completeWorkoutForUser,
  discardWorkoutForUser,
  saveWorkoutDraftForUser,
  startWorkoutForUser,
  type WorkoutCompletion,
} from '../server/workouts/mutations';
import { WorkoutMutationError } from '../server/workouts/errors';
import {
  completeWorkoutInputSchema,
  discardWorkoutInputSchema,
  saveWorkoutDraftInputSchema,
  startWorkoutInputSchema,
  type CompleteWorkoutInput,
  type DiscardWorkoutInput,
  type SaveWorkoutDraftInput,
  type StartWorkoutInput,
} from '../server/validation/workout';
import type { ActiveWorkout } from '../types';

async function runWorkoutAction<TInput, TOutput>(
  schema: ZodType<TInput>, input: unknown,
  mutate: (userId: string, parsed: TInput) => Promise<TOutput>,
): Promise<ActionResult<TOutput>> {
  try {
    const authenticatedUser = await requireUser();
    const parsed = schema.parse(input);
    return { ok: true, data: await mutate(authenticatedUser.id, parsed) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const flattened = z.flattenError(error);
      return { ok: false, code: 'VALIDATION_ERROR', message: 'Please correct the workout fields.', fieldErrors: { ...flattened.fieldErrors, ...(flattened.formErrors.length ? { _form: flattened.formErrors } : {}) } as Record<string, string[]> };
    }
    if (error instanceof AuthenticationError || error instanceof AuthorizationError || error instanceof WorkoutMutationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: 'INTERNAL_ERROR', message: 'Unable to update the workout. Please try again.' };
  }
}

export async function startWorkout(input: StartWorkoutInput): Promise<ActionResult<ActiveWorkout>> {
  return runWorkoutAction(startWorkoutInputSchema, input, startWorkoutForUser);
}
export async function saveWorkoutDraft(input: SaveWorkoutDraftInput): Promise<ActionResult<ActiveWorkout>> {
  return runWorkoutAction(saveWorkoutDraftInputSchema, input, saveWorkoutDraftForUser);
}
export async function discardWorkout(input: DiscardWorkoutInput): Promise<ActionResult<null>> {
  return runWorkoutAction(discardWorkoutInputSchema, input, discardWorkoutForUser);
}
export async function completeWorkout(input: CompleteWorkoutInput): Promise<ActionResult<WorkoutCompletion>> {
  return runWorkoutAction(completeWorkoutInputSchema, input, completeWorkoutForUser);
}
