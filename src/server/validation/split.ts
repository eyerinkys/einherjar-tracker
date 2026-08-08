import { z } from 'zod';

export const MAX_SPLIT_DAYS = 50;
export const MAX_SPLIT_EXERCISES = 50;
export const MAX_SPLIT_DAY_NAME_LENGTH = 100;
export const MAX_TARGET_SETS = 20;
export const MAX_TARGET_REPS = 100;
export const MAX_NOTES_LENGTH = 1_000;

export const splitDayNameSchema = z
  .string()
  .trim()
  .min(1, 'Split day name is required.')
  .max(MAX_SPLIT_DAY_NAME_LENGTH, 'Split day name is too long.');

export const splitIdSchema = z.string().uuid('Invalid ID.');
export const targetSetsSchema = z.number().int().min(1).max(MAX_TARGET_SETS);
export const targetRepsSchema = z.number().int().min(1).max(MAX_TARGET_REPS);
export const splitNotesSchema = z.string().max(MAX_NOTES_LENGTH).optional();

const targetFields = {
  targetSets: targetSetsSchema,
  targetRepMin: targetRepsSchema,
  targetRepMax: targetRepsSchema,
  notes: splitNotesSchema,
};

function validRepRange<T extends { targetRepMin: number; targetRepMax: number }>(value: T) {
  return value.targetRepMin <= value.targetRepMax;
}

function uniqueIdList(maximum: number) {
  return z
    .array(splitIdSchema)
    .max(maximum)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Order list contains duplicate IDs.',
    });
}

export const createSplitDayInputSchema = z.object({ name: splitDayNameSchema }).strict();

export const renameSplitDayInputSchema = z
  .object({ splitDayId: splitIdSchema, name: splitDayNameSchema })
  .strict();

export const deleteSplitDayInputSchema = z.object({ splitDayId: splitIdSchema }).strict();

export const reorderSplitDaysInputSchema = z
  .object({ splitDayIds: uniqueIdList(MAX_SPLIT_DAYS) })
  .strict();

export const addSplitExerciseInputSchema = z
  .object({ splitDayId: splitIdSchema, exerciseId: splitIdSchema, ...targetFields })
  .strict()
  .refine(validRepRange, {
    message: 'Minimum reps cannot exceed maximum reps.',
    path: ['targetRepMin'],
  });

export const removeSplitExerciseInputSchema = z
  .object({ splitExerciseId: splitIdSchema })
  .strict();

export const reorderSplitExercisesInputSchema = z
  .object({
    splitDayId: splitIdSchema,
    splitExerciseIds: uniqueIdList(MAX_SPLIT_EXERCISES),
  })
  .strict();

export const updateSplitExerciseInputSchema = z
  .object({ splitExerciseId: splitIdSchema, ...targetFields })
  .strict()
  .refine(validRepRange, {
    message: 'Minimum reps cannot exceed maximum reps.',
    path: ['targetRepMin'],
  });

export type CreateSplitDayInput = z.infer<typeof createSplitDayInputSchema>;
export type RenameSplitDayInput = z.infer<typeof renameSplitDayInputSchema>;
export type DeleteSplitDayInput = z.infer<typeof deleteSplitDayInputSchema>;
export type ReorderSplitDaysInput = z.infer<typeof reorderSplitDaysInputSchema>;
export type AddSplitExerciseInput = z.infer<typeof addSplitExerciseInputSchema>;
export type RemoveSplitExerciseInput = z.infer<typeof removeSplitExerciseInputSchema>;
export type ReorderSplitExercisesInput = z.infer<typeof reorderSplitExercisesInputSchema>;
export type UpdateSplitExerciseInput = z.infer<typeof updateSplitExerciseInputSchema>;
