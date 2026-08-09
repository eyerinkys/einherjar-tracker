import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../../db/client';
import {
  exercises,
  sessionExercises,
  splitDays,
  splitExercises,
  user,
  workoutSessions,
  workoutSets,
} from '../../db/schema';
import type { ActiveWorkout } from '../../types';
import { AuthorizationError, requireOwnedRecord, ownedWhere } from '../auth/ownership';
import {
  createDrizzleHistoryReadAdapter,
  getPreviousPerformanceRowsByExercise,
  type SelectedPreviousPerformanceRow,
} from '../queries/history';
import { getActiveWorkout } from '../queries/workouts';
import type {
  CompleteWorkoutInput,
  DiscardWorkoutInput,
  SaveWorkoutDraftInput,
  StartWorkoutInput,
} from '../validation/workout';
import { WorkoutMutationError } from './errors';

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface WorkoutCompletion {
  id: string;
  completedAt: string;
  durationMinutes: number;
}

export function requireWorkoutVersion(currentVersion: number, submittedVersion: number) {
  if (currentVersion !== submittedVersion) {
    throw new WorkoutMutationError('CONFLICT', 'Workout changed in another tab. Reload and try again.');
  }
}

export function requireExactWorkoutIds(currentIds: readonly string[], submittedIds: readonly string[]) {
  const current = new Set(currentIds);
  if (submittedIds.some((id) => !current.has(id))) throw new AuthorizationError();
  if (
    currentIds.length !== submittedIds.length ||
    current.size !== currentIds.length ||
    new Set(submittedIds).size !== submittedIds.length
  ) {
    throw new WorkoutMutationError('CONFLICT', 'Workout structure changed. Reload and try again.');
  }
}

export function buildInitialDraftSets(
  targetSets: number,
  targetRepMin: number,
  previousSets: readonly Pick<SelectedPreviousPerformanceRow, 'setNumber' | 'weight' | 'reps'>[] = [],
) {
  const previousBySetNumber = new Map(previousSets.map((set) => [set.setNumber, set]));
  return Array.from({ length: targetSets }, (_, index) => {
    const setNumber = index + 1;
    const previous = previousBySetNumber.get(setNumber);
    return {
      setNumber,
      weight: previous?.weight ?? null,
      reps: previous?.reps ?? targetRepMin,
    };
  });
}

async function lockUser(tx: Transaction, userId: string) {
  const rows = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
  return requireOwnedRecord(rows[0]);
}

async function lockOwnedActiveWorkout(
  tx: Transaction,
  userId: string,
  workoutSessionId: string,
  version: number,
) {
  const rows = await tx
    .select({ id: workoutSessions.id, version: workoutSessions.version, startedAt: workoutSessions.startedAt })
    .from(workoutSessions)
    .where(and(
      eq(workoutSessions.id, workoutSessionId),
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, 'in_progress'),
    ))
    .for('update');
  const workout = requireOwnedRecord(rows[0]);
  requireWorkoutVersion(workout.version, version);
  return workout;
}

export async function startWorkoutForUser(
  userId: string,
  input: StartWorkoutInput,
  database: Database = getDb(),
): Promise<ActiveWorkout> {
  await database.transaction(async (tx) => {
    await lockUser(tx, userId);
    const existing = await tx
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, 'in_progress')))
      .limit(1);
    if (existing[0]) return;

    const ownedDayRows = await tx
      .select({ id: splitDays.id, name: splitDays.name })
      .from(splitDays)
      .where(ownedWhere(splitDays.userId, userId, eq(splitDays.id, input.splitDayId)))
      .for('update');
    const ownedDay = requireOwnedRecord(ownedDayRows[0]);
    const sourceExercises = await tx
      .select({
        exerciseId: splitExercises.exerciseId,
        exerciseName: exercises.name,
        sortOrder: splitExercises.sortOrder,
        targetSets: splitExercises.targetSets,
        targetRepMin: splitExercises.targetRepMin,
        targetRepMax: splitExercises.targetRepMax,
        notes: splitExercises.notes,
      })
      .from(splitExercises)
      .innerJoin(exercises, eq(exercises.id, splitExercises.exerciseId))
      .where(eq(splitExercises.splitDayId, ownedDay.id))
      .orderBy(asc(splitExercises.sortOrder), asc(splitExercises.id));
    if (sourceExercises.length === 0) {
      throw new WorkoutMutationError('EMPTY_WORKOUT', 'Add at least one exercise before starting this workout.');
    }

    const [createdSession] = await tx.insert(workoutSessions).values({
      userId,
      sourceSplitDayId: ownedDay.id,
      splitDayName: ownedDay.name,
    }).returning({ id: workoutSessions.id, startedAt: workoutSessions.startedAt });
    const previous = await getPreviousPerformanceRowsByExercise(
      userId,
      createdSession.id,
      createdSession.startedAt,
      sourceExercises.map(({ exerciseId }) => exerciseId),
      createDrizzleHistoryReadAdapter(tx),
    );

    for (const source of sourceExercises) {
      const [createdExercise] = await tx.insert(sessionExercises).values({
        workoutSessionId: createdSession.id,
        exerciseId: source.exerciseId,
        exerciseName: source.exerciseName,
        sortOrder: source.sortOrder,
        targetSets: source.targetSets,
        targetRepMin: source.targetRepMin,
        targetRepMax: source.targetRepMax,
        notes: source.notes,
      }).returning({ id: sessionExercises.id });
      const previousSets = previous.get(source.exerciseId);
      await tx.insert(workoutSets).values(
        buildInitialDraftSets(source.targetSets, source.targetRepMin, previousSets).map((set) => ({
          ...set,
          sessionExerciseId: createdExercise.id,
          isCompleted: false,
        })),
      );
    }
  });

  const workout = await getActiveWorkout(userId, database);
  if (!workout) throw new Error('Active workout could not be loaded after start.');
  return workout;
}

async function writeDraft(
  tx: Transaction,
  userId: string,
  input: SaveWorkoutDraftInput,
) {
  const workout = await lockOwnedActiveWorkout(tx, userId, input.workoutSessionId, input.version);
  const currentExercises = await tx
    .select({ id: sessionExercises.id })
    .from(sessionExercises)
    .where(eq(sessionExercises.workoutSessionId, workout.id))
    .orderBy(asc(sessionExercises.sortOrder), asc(sessionExercises.id));
  requireExactWorkoutIds(currentExercises.map(({ id }) => id), input.exercises.map(({ sessionExerciseId }) => sessionExerciseId));

  const submittedSetIds = input.exercises.flatMap(({ sets }) => sets.map(({ id }) => id));
  if (submittedSetIds.length > 0) {
    const storedSubmittedSets = await tx
      .select({ id: workoutSets.id, sessionExerciseId: workoutSets.sessionExerciseId })
      .from(workoutSets)
      .where(inArray(workoutSets.id, submittedSetIds));
    const submittedParent = new Map(input.exercises.flatMap((exercise) => exercise.sets.map((set) => [set.id, exercise.sessionExerciseId] as const)));
    if (storedSubmittedSets.some((set) => submittedParent.get(set.id) !== set.sessionExerciseId)) {
      throw new AuthorizationError();
    }
  }

  for (const exercise of input.exercises) {
    await tx.delete(workoutSets).where(eq(workoutSets.sessionExerciseId, exercise.sessionExerciseId));
    await tx.insert(workoutSets).values(exercise.sets.map((set, index) => ({
      id: set.id,
      sessionExerciseId: exercise.sessionExerciseId,
      setNumber: index + 1,
      weight: set.weight === null ? null : String(set.weight),
      reps: set.reps,
      isCompleted: set.isCompleted,
    })));
  }

  const [updated] = await tx.update(workoutSessions).set({
    notes: input.notes.trim() || null,
    version: input.version + 1,
    updatedAt: new Date(),
  }).where(and(
    eq(workoutSessions.id, workout.id),
    eq(workoutSessions.userId, userId),
    eq(workoutSessions.status, 'in_progress'),
    eq(workoutSessions.version, input.version),
  )).returning({ id: workoutSessions.id });
  requireOwnedRecord(updated);
  return workout;
}

export async function saveWorkoutDraftForUser(
  userId: string,
  input: SaveWorkoutDraftInput,
  database: Database = getDb(),
): Promise<ActiveWorkout> {
  await database.transaction((tx) => writeDraft(tx, userId, input));
  const workout = await getActiveWorkout(userId, database);
  if (!workout) throw new Error('Active workout could not be loaded after save.');
  return workout;
}

export async function discardWorkoutForUser(
  userId: string,
  input: DiscardWorkoutInput,
  database: Database = getDb(),
): Promise<null> {
  await database.transaction(async (tx) => {
    await lockOwnedActiveWorkout(tx, userId, input.workoutSessionId, input.version);
    const deleted = await tx.delete(workoutSessions).where(and(
      eq(workoutSessions.id, input.workoutSessionId),
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, 'in_progress'),
      eq(workoutSessions.version, input.version),
    )).returning({ id: workoutSessions.id });
    requireOwnedRecord(deleted[0]);
  });
  return null;
}

export async function completeWorkoutForUser(
  userId: string,
  input: CompleteWorkoutInput,
  database: Database = getDb(),
): Promise<WorkoutCompletion> {
  const completedAt = new Date();
  return database.transaction(async (tx) => {
    const existingRows = await tx
      .select({
        id: workoutSessions.id,
        status: workoutSessions.status,
        version: workoutSessions.version,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
      })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.id, input.workoutSessionId),
        eq(workoutSessions.userId, userId),
      ))
      .for('update');
    const existing = requireOwnedRecord(existingRows[0]);
    if (existing.status === 'completed') {
      requireWorkoutVersion(existing.version, input.version + 1);
      if (existing.completedAt === null) throw new Error('Completed workout is missing its completion time.');
      return {
        id: existing.id,
        completedAt: existing.completedAt.toISOString(),
        durationMinutes: Math.max(0, Math.round((existing.completedAt.getTime() - existing.startedAt.getTime()) / 60_000)),
      };
    }

    const workout = await writeDraft(tx, userId, input);
    const completedSets = input.exercises.reduce((count, exercise) => count + exercise.sets.filter(({ isCompleted }) => isCompleted).length, 0);
    if (completedSets === 0) {
      throw new WorkoutMutationError('NO_COMPLETED_SETS', 'Complete at least one set before finishing the workout.');
    }
    const exerciseIds = input.exercises.map(({ sessionExerciseId }) => sessionExerciseId);
    await tx.delete(workoutSets).where(and(
      inArray(workoutSets.sessionExerciseId, exerciseIds),
      eq(workoutSets.isCompleted, false),
    ));
    const [completed] = await tx.update(workoutSessions).set({
      status: 'completed',
      completedAt,
      version: input.version + 1,
      updatedAt: completedAt,
    }).where(and(
      eq(workoutSessions.id, workout.id),
      eq(workoutSessions.userId, userId),
      eq(workoutSessions.status, 'in_progress'),
      eq(workoutSessions.version, input.version + 1),
    )).returning({ id: workoutSessions.id, startedAt: workoutSessions.startedAt });
    const result = requireOwnedRecord(completed);
    return {
      id: result.id,
      completedAt: completedAt.toISOString(),
      durationMinutes: Math.max(0, Math.round((completedAt.getTime() - result.startedAt.getTime()) / 60_000)),
    };
  });
}
