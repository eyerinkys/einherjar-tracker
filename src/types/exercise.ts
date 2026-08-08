export type ExerciseCategory = 'compound' | 'isolation';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  category: ExerciseCategory;
  createdByUserId?: string;
  isCustom?: boolean;
}
