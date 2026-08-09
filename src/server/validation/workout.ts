import { z } from 'zod';

export const MAX_WORKOUT_NOTES_LENGTH = 1_000;
export const MAX_WORKOUT_EXERCISES = 50;
export const MAX_WORKOUT_SETS = 30;
export const MAX_WORKOUT_WEIGHT_KG = 1_500;
export const MAX_WORKOUT_REPS = 1_000;

const idSchema = z.string().uuid('Invalid ID.');
const versionSchema = z.number().int().positive();

export const startWorkoutInputSchema = z.object({ splitDayId: idSchema }).strict();
export const discardWorkoutInputSchema = z
  .object({ workoutSessionId: idSchema, version: versionSchema })
  .strict();

const workoutSetDraftSchema = z
  .object({
    id: idSchema,
    weight: z.number().finite().min(0).max(MAX_WORKOUT_WEIGHT_KG).nullable(),
    reps: z.number().int().min(1).max(MAX_WORKOUT_REPS).nullable(),
    isCompleted: z.boolean(),
  })
  .strict()
  .superRefine((set, context) => {
    if (set.isCompleted && set.weight === null) {
      context.addIssue({ code: 'custom', path: ['weight'], message: 'Completed sets require a weight.' });
    }
    if (set.isCompleted && set.reps === null) {
      context.addIssue({ code: 'custom', path: ['reps'], message: 'Completed sets require reps.' });
    }
  });

const workoutExerciseDraftSchema = z
  .object({
    sessionExerciseId: idSchema,
    sets: z.array(workoutSetDraftSchema).min(1).max(MAX_WORKOUT_SETS),
  })
  .strict()
  .refine((exercise) => new Set(exercise.sets.map(({ id }) => id)).size === exercise.sets.length, {
    message: 'Set list contains duplicate IDs.',
    path: ['sets'],
  });

export const saveWorkoutDraftInputSchema = z
  .object({
    workoutSessionId: idSchema,
    version: versionSchema,
    notes: z.string().max(MAX_WORKOUT_NOTES_LENGTH),
    exercises: z.array(workoutExerciseDraftSchema).min(1).max(MAX_WORKOUT_EXERCISES),
  })
  .strict()
  .refine(
    (draft) => new Set(draft.exercises.map(({ sessionExerciseId }) => sessionExerciseId)).size === draft.exercises.length,
    { message: 'Exercise list contains duplicate IDs.', path: ['exercises'] },
  )
  .refine(
    (draft) => {
      const ids = draft.exercises.flatMap((exercise) => exercise.sets.map(({ id }) => id));
      return new Set(ids).size === ids.length;
    },
    { message: 'Workout contains duplicate set IDs.', path: ['exercises'] },
  );

export const completeWorkoutInputSchema = saveWorkoutDraftInputSchema;

export type StartWorkoutInput = z.infer<typeof startWorkoutInputSchema>;
export type DiscardWorkoutInput = z.infer<typeof discardWorkoutInputSchema>;
export type SaveWorkoutDraftInput = z.infer<typeof saveWorkoutDraftInputSchema>;
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutInputSchema>;
