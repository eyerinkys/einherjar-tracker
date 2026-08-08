import { describe, expect, it } from 'vitest';
import {
  addSplitExerciseInputSchema,
  createSplitDayInputSchema,
  deleteSplitDayInputSchema,
  renameSplitDayInputSchema,
  reorderSplitDaysInputSchema,
  reorderSplitExercisesInputSchema,
  updateSplitExerciseInputSchema,
} from './split';

const firstId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';

describe('split action validation', () => {
  it('trims a nonblank split-day name and accepts exactly 100 characters', () => {
    expect(createSplitDayInputSchema.parse({ name: `  ${'P'.repeat(100)}  ` })).toEqual({
      name: 'P'.repeat(100),
    });
  });

  it.each(['', '   ', 'P'.repeat(101)])('rejects an invalid split-day name', (name) => {
    expect(createSplitDayInputSchema.safeParse({ name }).success).toBe(false);
  });

  it('accepts exactly 50 unique split-day IDs', () => {
    const splitDayIds = Array.from(
      { length: 50 },
      (_, index) => `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    );

    expect(reorderSplitDaysInputSchema.parse({ splitDayIds })).toEqual({ splitDayIds });
  });

  it('rejects duplicate or oversized split-day reorder lists', () => {
    expect(
      reorderSplitDaysInputSchema.safeParse({ splitDayIds: [firstId, firstId] }).success,
    ).toBe(false);
    expect(
      reorderSplitDaysInputSchema.safeParse({
        splitDayIds: Array.from(
          { length: 51 },
          (_, index) => `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
        ),
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate or oversized split-exercise reorder lists', () => {
    expect(
      reorderSplitExercisesInputSchema.safeParse({
        splitDayId: firstId,
        splitExerciseIds: [secondId, secondId],
      }).success,
    ).toBe(false);
    expect(
      reorderSplitExercisesInputSchema.safeParse({
        splitDayId: firstId,
        splitExerciseIds: Array.from(
          { length: 51 },
          (_, index) => `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
        ),
      }).success,
    ).toBe(false);
  });

  it('accepts target and note boundary values', () => {
    expect(
      addSplitExerciseInputSchema.parse({
        splitDayId: firstId,
        exerciseId: secondId,
        targetSets: 20,
        targetRepMin: 1,
        targetRepMax: 100,
        notes: 'N'.repeat(1_000),
      }),
    ).toMatchObject({ targetSets: 20, targetRepMin: 1, targetRepMax: 100 });
  });

  it.each([
    { targetSets: 0, targetRepMin: 1, targetRepMax: 1 },
    { targetSets: 21, targetRepMin: 1, targetRepMax: 1 },
    { targetSets: 1, targetRepMin: 0, targetRepMax: 1 },
    { targetSets: 1, targetRepMin: 1, targetRepMax: 101 },
    { targetSets: 1, targetRepMin: 10, targetRepMax: 9 },
    { targetSets: 1.5, targetRepMin: 1, targetRepMax: 1 },
  ])('rejects invalid targets %#', (targets) => {
    expect(
      updateSplitExerciseInputSchema.safeParse({
        splitExerciseId: firstId,
        ...targets,
      }).success,
    ).toBe(false);
  });

  it('rejects notes longer than 1,000 characters and malformed IDs', () => {
    expect(
      updateSplitExerciseInputSchema.safeParse({
        splitExerciseId: 'not-a-uuid',
        targetSets: 1,
        targetRepMin: 1,
        targetRepMax: 1,
        notes: 'N'.repeat(1_001),
      }).success,
    ).toBe(false);
  });

  it('rejects client-supplied ownership fields on every action input', () => {
    expect(createSplitDayInputSchema.safeParse({ name: 'Push', userId: 'forged' }).success).toBe(
      false,
    );
    expect(
      renameSplitDayInputSchema.safeParse({
        splitDayId: firstId,
        name: 'Push',
        userId: 'forged',
      }).success,
    ).toBe(false);
    expect(
      deleteSplitDayInputSchema.safeParse({ splitDayId: firstId, userId: 'forged' }).success,
    ).toBe(false);
    expect(
      addSplitExerciseInputSchema.safeParse({
        splitDayId: firstId,
        exerciseId: secondId,
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 12,
        userId: 'forged',
      }).success,
    ).toBe(false);
    expect(
      updateSplitExerciseInputSchema.safeParse({
        splitExerciseId: firstId,
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 12,
        userId: 'forged',
      }).success,
    ).toBe(false);
  });
});
