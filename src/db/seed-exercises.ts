import { sql } from 'drizzle-orm';
import { type createDatabaseClient } from './client';
import { exercises } from './schema';

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
] as const;

type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export function createBuiltInExerciseUpsert(database: DatabaseClient) {
  return database
    .insert(exercises)
    .values([...BUILT_IN_EXERCISES])
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

export async function seedBuiltInExercises(database: DatabaseClient): Promise<void> {
  await createBuiltInExerciseUpsert(database);
}
