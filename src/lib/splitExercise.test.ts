import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/types';
import { createSplitExercise } from './splitExercise';

describe('createSplitExercise', () => {
  it('builds the next ordered split exercise with a supplied stable ID', () => {
    const exercise: Exercise = {
      id: 'ex-8',
      name: 'Bench Press',
      muscleGroup: 'Chest / Triceps',
      equipment: 'Barbell',
      category: 'compound',
    };

    expect(
      createSplitExercise({
        id: 'se-local-1',
        exercise,
        existingExerciseCount: 2,
        targetSets: 4,
        targetRepMin: 6,
        targetRepMax: 8,
      })
    ).toEqual({
      id: 'se-local-1',
      exerciseId: 'ex-8',
      exerciseName: 'Bench Press',
      muscleGroup: 'Chest / Triceps',
      targetSets: 4,
      targetRepMin: 6,
      targetRepMax: 8,
      order: 3,
    });
  });
});
