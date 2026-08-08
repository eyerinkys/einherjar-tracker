import 'server-only';

import { asc, eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { exercises, splitDays, splitExercises } from '../../db/schema';
import type { SplitDay } from '../../types';

export interface SplitQueryRow {
  splitDayId: string;
  splitDayName: string;
  splitDaySortOrder: number;
  splitExerciseId: string | null;
  exerciseId: string | null;
  exerciseName: string | null;
  muscleGroup: string | null;
  targetSets: number | null;
  targetRepMin: number | null;
  targetRepMax: number | null;
  splitExerciseSortOrder: number | null;
  notes: string | null;
}

export function splitRowsForUserWhere(userId: string) {
  return eq(splitDays.userId, userId);
}

export function mapSplitRows(rows: readonly SplitQueryRow[]): SplitDay[] {
  const result: SplitDay[] = [];
  let currentDay: SplitDay | undefined;

  for (const row of rows) {
    if (currentDay?.id !== row.splitDayId) {
      currentDay = {
        id: row.splitDayId,
        name: row.splitDayName,
        order: result.length + 1,
        exercises: [],
      };
      result.push(currentDay);
    }

    if (
      row.splitExerciseId !== null &&
      row.exerciseId !== null &&
      row.exerciseName !== null &&
      row.muscleGroup !== null &&
      row.targetSets !== null &&
      row.targetRepMin !== null &&
      row.targetRepMax !== null
    ) {
      currentDay.exercises.push({
        id: row.splitExerciseId,
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        muscleGroup: row.muscleGroup,
        targetSets: row.targetSets,
        targetRepMin: row.targetRepMin,
        targetRepMax: row.targetRepMax,
        order: currentDay.exercises.length + 1,
        ...(row.notes === null ? {} : { notes: row.notes }),
      });
    }
  }

  return result;
}

export async function getSplitDays(
  userId: string,
  database: ReturnType<typeof getDb> = getDb(),
): Promise<SplitDay[]> {
  const rows = await database
    .select({
      splitDayId: splitDays.id,
      splitDayName: splitDays.name,
      splitDaySortOrder: splitDays.sortOrder,
      splitExerciseId: splitExercises.id,
      exerciseId: splitExercises.exerciseId,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      targetSets: splitExercises.targetSets,
      targetRepMin: splitExercises.targetRepMin,
      targetRepMax: splitExercises.targetRepMax,
      splitExerciseSortOrder: splitExercises.sortOrder,
      notes: splitExercises.notes,
    })
    .from(splitDays)
    .leftJoin(splitExercises, eq(splitExercises.splitDayId, splitDays.id))
    .leftJoin(exercises, eq(exercises.id, splitExercises.exerciseId))
    .where(splitRowsForUserWhere(userId))
    .orderBy(
      asc(splitDays.sortOrder),
      asc(splitDays.id),
      asc(splitExercises.sortOrder),
      asc(splitExercises.id),
    );

  return mapSplitRows(rows);
}
