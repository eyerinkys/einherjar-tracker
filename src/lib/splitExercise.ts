import type { Exercise, SplitExercise } from '@/types';

interface CreateSplitExerciseInput {
  id: string;
  exercise: Exercise;
  existingExerciseCount: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
}

export function createSplitExercise({
  id,
  exercise,
  existingExerciseCount,
  targetSets,
  targetRepMin,
  targetRepMax,
}: CreateSplitExerciseInput): SplitExercise {
  return {
    id,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    targetSets,
    targetRepMin,
    targetRepMax,
    order: existingExerciseCount + 1,
  };
}
