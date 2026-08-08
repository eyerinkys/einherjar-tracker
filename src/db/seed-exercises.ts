import { sql } from 'drizzle-orm';
import { type createDatabaseClient } from './client';
import { exercises } from './schema';

export interface BuiltInExercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  category: 'compound' | 'isolation';
  createdByUserId: null;
  isCustom: false;
}

export const BUILT_IN_EXERCISES = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings / Glutes', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Lat Pulldown', muscleGroup: 'Lats / Upper Back', equipment: 'Cable', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Seated Cable Row', muscleGroup: 'Upper Back / Lats', equipment: 'Cable', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000004', name: 'Dumbbell Lateral Raise', muscleGroup: 'Side Delts', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000006', name: 'Hammer Curl', muscleGroup: 'Brachialis / Biceps', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000007', name: 'Skull Crushers', muscleGroup: 'Triceps', equipment: 'EZ-Bar', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000008', name: 'Bench Press', muscleGroup: 'Chest / Triceps', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000009', name: 'Leg Press', muscleGroup: 'Quads / Glutes', equipment: 'Machine', category: 'compound', createdByUserId: null, isCustom: false },
] as const satisfies readonly BuiltInExercise[];

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export interface ExerciseSeedDatabase {
  upsertBuiltInExercises(exercises: readonly BuiltInExercise[]): Promise<void>;
}

export function createBuiltInExerciseUpsert(
  database: DatabaseClient,
  builtInExercises: readonly BuiltInExercise[] = BUILT_IN_EXERCISES,
) {
  return database
    .insert(exercises)
    .values([...builtInExercises])
    .onConflictDoUpdate({
      target: exercises.id,
      set: {
        name: sql`excluded.name`,
        muscleGroup: sql`excluded.muscle_group`,
        equipment: sql`excluded.equipment`,
        category: sql`excluded.category`,
        createdByUserId: null,
        isCustom: false,
        updatedAt: sql`now()`,
      },
    });
}

export function createDrizzleExerciseSeedDatabase(database: DatabaseClient): ExerciseSeedDatabase {
  return {
    async upsertBuiltInExercises(builtInExercises) {
      await createBuiltInExerciseUpsert(database, builtInExercises);
    },
  };
}

export async function seedBuiltInExercises(database: ExerciseSeedDatabase): Promise<void> {
  await database.upsertBuiltInExercises(BUILT_IN_EXERCISES);
}
