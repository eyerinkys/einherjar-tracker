'use server';

import { z, type ZodType } from 'zod';
import type { ActionResult } from '../server/action-result';
import { AuthorizationError } from '../server/auth/ownership';
import { requireUser } from '../server/auth/require-user';
import { AuthenticationError } from '../server/auth/session';
import {
  getCompletedSession,
  getCompletedSessionHistory,
  getExerciseHistory,
} from '../server/queries/history';
import {
  exerciseHistoryInputSchema,
  historyPageInputSchema,
  historySessionInputSchema,
  type ExerciseHistoryInput,
  type HistoryPageInput,
  type HistorySessionInput,
} from '../server/validation/history';
import type {
  CompletedWorkoutHistoryPage,
  CompletedWorkoutSession,
  ExerciseHistory,
} from '../types';

async function runHistoryAction<TInput, TOutput>(
  schema: ZodType<TInput>,
  input: unknown,
  read: (userId: string, parsed: TInput) => Promise<TOutput>,
): Promise<ActionResult<TOutput>> {
  try {
    const authenticatedUser = await requireUser();
    const parsed = schema.parse(input);
    return { ok: true, data: await read(authenticatedUser.id, parsed) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const flattened = z.flattenError(error);
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Please correct the history request.',
        fieldErrors: {
          ...flattened.fieldErrors,
          ...(flattened.formErrors.length > 0 ? { _form: flattened.formErrors } : {}),
        } as Record<string, string[]>,
      };
    }
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to load workout history. Please try again.',
    };
  }
}

export async function getCompletedWorkoutHistory(
  input: HistoryPageInput,
): Promise<ActionResult<CompletedWorkoutHistoryPage>> {
  return runHistoryAction(historyPageInputSchema, input, getCompletedSessionHistory);
}

export async function getWorkoutSessionHistory(
  input: HistorySessionInput,
): Promise<ActionResult<CompletedWorkoutSession>> {
  return runHistoryAction(
    historySessionInputSchema,
    input,
    (userId, parsed) => getCompletedSession(userId, parsed.sessionId),
  );
}

export async function getExerciseWorkoutHistory(
  input: ExerciseHistoryInput,
): Promise<ActionResult<ExerciseHistory>> {
  return runHistoryAction(
    exerciseHistoryInputSchema,
    input,
    (userId, parsed) => getExerciseHistory(userId, parsed.exerciseId),
  );
}
