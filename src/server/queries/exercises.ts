import 'server-only';

import { and, asc, eq, isNull, or, type SQL } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { exercises } from '../../db/schema';
import type { Exercise } from '../../types';

export type ExerciseLibraryRow = Pick<
  typeof exercises.$inferSelect,
  'id' | 'name' | 'muscleGroup' | 'equipment' | 'category' | 'createdByUserId' | 'isCustom'
>;

export function visibleExercisesWhere(userId: string): SQL {
  return or(
    and(eq(exercises.isCustom, false), isNull(exercises.createdByUserId)),
    and(eq(exercises.isCustom, true), eq(exercises.createdByUserId, userId)),
  )!;
}

export function mapExercise(row: ExerciseLibraryRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup,
    equipment: row.equipment,
    category: row.category,
    ...(row.createdByUserId === null ? {} : { createdByUserId: row.createdByUserId }),
    isCustom: row.isCustom,
  };
}

export function getVisibleExercises<T extends ExerciseLibraryRow>(
  rows: readonly T[],
  userId: string,
): Exercise[] {
  return rows
    .filter(
      (row) =>
        (!row.isCustom && row.createdByUserId === null) ||
        (row.isCustom && row.createdByUserId === userId),
    )
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
    .map(mapExercise);
}

export async function getExercises(userId: string): Promise<Exercise[]> {
  const rows = await getDb()
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
      equipment: exercises.equipment,
      category: exercises.category,
      createdByUserId: exercises.createdByUserId,
      isCustom: exercises.isCustom,
    })
    .from(exercises)
    .where(visibleExercisesWhere(userId))
    .orderBy(asc(exercises.name), asc(exercises.id));

  return getVisibleExercises(rows, userId);
}
