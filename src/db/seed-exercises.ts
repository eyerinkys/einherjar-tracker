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
  { id: '00000000-0000-4000-8000-000000000010', name: 'Barbell Back Squat', muscleGroup: 'Quads / Glutes', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000011', name: 'Barbell Deadlift', muscleGroup: 'Posterior Chain', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000012', name: 'Overhead Press', muscleGroup: 'Shoulders / Triceps', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000013', name: 'Incline Bench Press', muscleGroup: 'Upper Chest', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000014', name: 'Dumbbell Bench Press', muscleGroup: 'Chest', equipment: 'Dumbbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000015', name: 'Incline Dumbbell Press', muscleGroup: 'Upper Chest', equipment: 'Dumbbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000016', name: 'Pull-Ups', muscleGroup: 'Lats / Biceps', equipment: 'Bodyweight', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000017', name: 'Chest Dips', muscleGroup: 'Chest / Triceps', equipment: 'Bodyweight', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000018', name: 'Bent-Over Barbell Row', muscleGroup: 'Back / Lats', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000019', name: 'Single-Arm Dumbbell Row', muscleGroup: 'Lats / Back', equipment: 'Dumbbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000020', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000021', name: 'Cable Chest Flyes', muscleGroup: 'Chest', equipment: 'Cable', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000022', name: 'Push-Ups', muscleGroup: 'Chest / Core', equipment: 'Bodyweight', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000023', name: 'Face Pulls', muscleGroup: 'Rear Delts / Upper Back', equipment: 'Cable', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000024', name: 'Cable Lateral Raise', muscleGroup: 'Side Delts', equipment: 'Cable', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000025', name: 'Rear Delt Flyes', muscleGroup: 'Rear Delts', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000026', name: 'Barbell Bicep Curl', muscleGroup: 'Biceps', equipment: 'Barbell', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000027', name: 'Preacher Curl', muscleGroup: 'Biceps', equipment: 'EZ-Bar', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000028', name: 'Tricep Pushdown', muscleGroup: 'Triceps', equipment: 'Cable', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000029', name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000030', name: 'Front Squat', muscleGroup: 'Quads', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000031', name: 'Bulgarian Split Squat', muscleGroup: 'Quads / Glutes', equipment: 'Dumbbell', category: 'compound', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000032', name: 'Leg Extensions', muscleGroup: 'Quads', equipment: 'Machine', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000033', name: 'Lying Leg Curls', muscleGroup: 'Hamstrings', equipment: 'Machine', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000034', name: 'Standing Calf Raises', muscleGroup: 'Calves', equipment: 'Machine', category: 'isolation', createdByUserId: null, isCustom: false },
  { id: '00000000-0000-4000-8000-000000000035', name: 'Hanging Leg Raise', muscleGroup: 'Abs / Core', equipment: 'Bodyweight', category: 'isolation', createdByUserId: null, isCustom: false },
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
