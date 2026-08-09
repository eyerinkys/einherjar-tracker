import 'server-only';

import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { sessionExercises, workoutSessions, workoutSets } from '../../db/schema';
import type { ActiveWorkout, PreviousPerformanceSet } from '../../types';
import { createDrizzleHistoryReadAdapter, getPreviousPerformanceByExercise } from './history';

export interface ActiveWorkoutQueryRow {
  workoutSessionId: string;
  sourceSplitDayId: string | null;
  splitDayName: string;
  startedAt: Date;
  notes: string | null;
  version: number;
  sessionExerciseId: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseSortOrder: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  exerciseNotes: string | null;
  setId: string;
  setNumber: number;
  weight: string | null;
  reps: number | null;
  isCompleted: boolean;
}

export function mapActiveWorkoutRows(
  rows: readonly ActiveWorkoutQueryRow[],
  previousByExercise: ReadonlyMap<string, PreviousPerformanceSet[]> = new Map(),
): ActiveWorkout | null {
  const first = rows[0];
  if (!first) return null;

  const result: ActiveWorkout = {
    id: first.workoutSessionId,
    sourceSplitDayId: first.sourceSplitDayId,
    splitDayName: first.splitDayName,
    startedAt: first.startedAt.toISOString(),
    version: first.version,
    notes: first.notes ?? '',
    exercises: [],
  };

  for (const row of rows) {
    let exercise = result.exercises[result.exercises.length - 1];
    if (exercise?.id !== row.sessionExerciseId) {
      exercise = {
        id: row.sessionExerciseId,
        exerciseId: row.exerciseId ?? row.sessionExerciseId,
        exerciseName: row.exerciseName,
        targetSets: row.targetSets,
        targetRepMin: row.targetRepMin,
        targetRepMax: row.targetRepMax,
        ...(row.exerciseNotes === null ? {} : { notes: row.exerciseNotes }),
        previousPerformance: row.exerciseId === null
          ? []
          : (previousByExercise.get(row.exerciseId) ?? []),
        sets: [],
      };
      result.exercises.push(exercise);
    }
    exercise.sets.push({
      id: row.setId,
      setNumber: row.setNumber,
      weight: row.weight === null ? null : Number(row.weight),
      reps: row.reps,
      isCompleted: row.isCompleted,
    });
  }

  return result;
}

export async function getActiveWorkout(
  userId: string,
  database: ReturnType<typeof getDb> = getDb(),
): Promise<ActiveWorkout | null> {
  const rows = await database
    .select({
      workoutSessionId: workoutSessions.id,
      sourceSplitDayId: workoutSessions.sourceSplitDayId,
      splitDayName: workoutSessions.splitDayName,
      startedAt: workoutSessions.startedAt,
      notes: workoutSessions.notes,
      version: workoutSessions.version,
      sessionExerciseId: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
      exerciseName: sessionExercises.exerciseName,
      exerciseSortOrder: sessionExercises.sortOrder,
      targetSets: sessionExercises.targetSets,
      targetRepMin: sessionExercises.targetRepMin,
      targetRepMax: sessionExercises.targetRepMax,
      exerciseNotes: sessionExercises.notes,
      setId: workoutSets.id,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      isCompleted: workoutSets.isCompleted,
    })
    .from(workoutSessions)
    .innerJoin(sessionExercises, eq(sessionExercises.workoutSessionId, workoutSessions.id))
    .innerJoin(workoutSets, eq(workoutSets.sessionExerciseId, sessionExercises.id))
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, 'in_progress')))
    .orderBy(asc(sessionExercises.sortOrder), asc(sessionExercises.id), asc(workoutSets.setNumber));

  const first = rows[0];
  if (!first) return null;
  const exerciseIds = [...new Set(rows.flatMap((row) => row.exerciseId === null ? [] : [row.exerciseId]))];
  const previous = await getPreviousPerformanceByExercise(
    userId,
    first.workoutSessionId,
    first.startedAt,
    exerciseIds,
    createDrizzleHistoryReadAdapter(database),
  );
  return mapActiveWorkoutRows(rows, previous);
}
