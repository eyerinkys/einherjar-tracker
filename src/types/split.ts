export interface SplitExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  order: number;
  notes?: string;
}

export interface SplitDay {
  id: string;
  name: string;
  order: number;
  exercises: SplitExercise[];
}
