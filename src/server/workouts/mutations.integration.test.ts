import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../db/schema';
import { exercises, sessionExercises, splitDays, user, workoutSessions, workoutSets } from '../../db/schema';
import { getActiveWorkout } from '../queries/workouts';
import { addSplitExerciseForUser, createSplitDayForUser, deleteSplitDayForUser, renameSplitDayForUser, updateSplitExerciseForUser } from '../splits/mutations';
import { completeWorkoutForUser, discardWorkoutForUser, saveWorkoutDraftForUser, startWorkoutForUser } from './mutations';

vi.mock('server-only', () => ({}));

const connectionString = process.env.WORKOUT_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const enabled = process.env.RUN_WORKOUT_DATABASE_TESTS === '1';

describe.runIf(Boolean(connectionString && enabled))('workout lifecycle against PostgreSQL', () => {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString });
  const database = drizzle({ client: pool, schema });
  const suffix = randomUUID();
  const firstUserId = `phase4-first-${suffix}`;
  const secondUserId = `phase4-second-${suffix}`;
  const exerciseId = randomUUID();

  beforeAll(async () => {
    await database.insert(user).values([
      { id: firstUserId, name: 'Phase 4 First', email: `${firstUserId}@example.test`, emailVerified: false },
      { id: secondUserId, name: 'Phase 4 Second', email: `${secondUserId}@example.test`, emailVerified: false },
    ]);
    await database.insert(exercises).values({ id: exerciseId, name: 'Phase 4 Press', muscleGroup: 'Chest', equipment: 'Barbell', category: 'compound', isCustom: false });
  });

  afterAll(async () => {
    await database.delete(workoutSessions).where(inArray(workoutSessions.userId, [firstUserId, secondUserId]));
    await database.delete(splitDays).where(inArray(splitDays.userId, [firstUserId, secondUserId]));
    await database.delete(exercises).where(eq(exercises.id, exerciseId));
    await database.delete(user).where(inArray(user.id, [firstUserId, secondUserId]));
    expect(await database.select({ id: workoutSessions.id }).from(workoutSessions).where(inArray(workoutSessions.userId, [firstUserId, secondUserId]))).toEqual([]);
    expect(await database.select({ id: splitDays.id }).from(splitDays).where(inArray(splitDays.userId, [firstUserId, secondUserId]))).toEqual([]);
    expect(await database.select({ id: exercises.id }).from(exercises).where(eq(exercises.id, exerciseId))).toEqual([]);
    expect(await database.select({ id: user.id }).from(user).where(inArray(user.id, [firstUserId, secondUserId]))).toEqual([]);
    await pool.end();
  });

  it('persists resume/save/complete atomically while preserving snapshots and ownership', async () => {
    const split = await createSplitDayForUser(firstUserId, { name: 'Original Push' }, database);
    const splitDayId = split[0].id;
    const withExercise = await addSplitExerciseForUser(firstUserId, {
      splitDayId, exerciseId, targetSets: 2, targetRepMin: 8, targetRepMax: 10, notes: 'Original pause',
    }, database);
    const splitExerciseId = withExercise[0].exercises[0].id;

    const started = await startWorkoutForUser(firstUserId, { splitDayId }, database);
    expect((await startWorkoutForUser(firstUserId, { splitDayId }, database)).id).toBe(started.id);
    expect(await getActiveWorkout(firstUserId, database)).toEqual(started);
    await expect(startWorkoutForUser(secondUserId, { splitDayId }, database)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(database.insert(workoutSessions).values({ userId: firstUserId, sourceSplitDayId: splitDayId, splitDayName: 'Duplicate' })).rejects.toBeTruthy();

    const addedSetId = randomUUID();
    const saved = await saveWorkoutDraftForUser(firstUserId, {
      workoutSessionId: started.id, version: started.version, notes: 'Persist me',
      exercises: [{ sessionExerciseId: started.exercises[0].id, sets: [
        { id: started.exercises[0].sets[0].id, weight: 82.5, reps: 8, isCompleted: true },
        { id: addedSetId, weight: 80, reps: 9, isCompleted: false },
      ] }],
    }, database);
    expect(saved).toMatchObject({ version: 2, notes: 'Persist me' });
    expect(saved.exercises[0].sets.map(({ id, setNumber }) => [id, setNumber])).toEqual([[started.exercises[0].sets[0].id, 1], [addedSetId, 2]]);

    await expect(saveWorkoutDraftForUser(firstUserId, {
      workoutSessionId: saved.id, version: 1, notes: 'Stale',
      exercises: saved.exercises.map((entry) => ({ sessionExerciseId: entry.id, sets: entry.sets.map(({ id, weight, reps, isCompleted }) => ({ id, weight, reps, isCompleted })) })),
    }, database)).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(discardWorkoutForUser(secondUserId, { workoutSessionId: saved.id, version: saved.version }, database)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const savedDraftInput = {
      workoutSessionId: saved.id,
      version: saved.version,
      notes: saved.notes,
      exercises: saved.exercises.map((entry) => ({ sessionExerciseId: entry.id, sets: entry.sets.map(({ id, weight, reps, isCompleted }) => ({ id, weight, reps, isCompleted })) })),
    };
    await expect(saveWorkoutDraftForUser(secondUserId, savedDraftInput, database)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(completeWorkoutForUser(secondUserId, savedDraftInput, database)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const noCompletedInput = {
      workoutSessionId: saved.id, version: saved.version, notes: 'Must roll back',
      exercises: saved.exercises.map((entry) => ({ sessionExerciseId: entry.id, sets: entry.sets.map(({ id, weight, reps }) => ({ id, weight, reps, isCompleted: false })) })),
    };
    await expect(completeWorkoutForUser(firstUserId, noCompletedInput, database)).rejects.toMatchObject({ code: 'NO_COMPLETED_SETS' });
    expect(await getActiveWorkout(firstUserId, database)).toMatchObject({ version: saved.version, notes: 'Persist me' });

    await renameSplitDayForUser(firstUserId, { splitDayId, name: 'Changed Push' }, database);
    await updateSplitExerciseForUser(firstUserId, { splitExerciseId, targetSets: 4, targetRepMin: 3, targetRepMax: 5, notes: 'Changed note' }, database);
    const completed = await completeWorkoutForUser(firstUserId, {
      workoutSessionId: saved.id, version: saved.version, notes: 'Finished',
      exercises: saved.exercises.map((entry) => ({ sessionExerciseId: entry.id, sets: entry.sets.map((set, index) => ({ id: set.id, weight: set.weight, reps: set.reps, isCompleted: index === 0 })) })),
    }, database);
    expect(completed).toMatchObject({ id: saved.id });
    expect(await getActiveWorkout(firstUserId, database)).toBeNull();
    await expect(completeWorkoutForUser(firstUserId, {
      workoutSessionId: saved.id, version: saved.version, notes: 'Retry',
      exercises: saved.exercises.map((entry) => ({ sessionExerciseId: entry.id, sets: entry.sets.map((set, index) => ({ id: set.id, weight: set.weight, reps: set.reps, isCompleted: index === 0 })) })),
    }, database)).resolves.toEqual(completed);
    expect(await database.select({ id: workoutSessions.id }).from(workoutSessions).where(eq(workoutSessions.id, saved.id))).toHaveLength(1);

    await deleteSplitDayForUser(firstUserId, { splitDayId }, database);
    const [snapshot] = await database.select({ splitDayName: workoutSessions.splitDayName, sourceSplitDayId: workoutSessions.sourceSplitDayId, exerciseName: sessionExercises.exerciseName, targetSets: sessionExercises.targetSets, targetRepMin: sessionExercises.targetRepMin, targetRepMax: sessionExercises.targetRepMax, notes: sessionExercises.notes })
      .from(workoutSessions).innerJoin(sessionExercises, eq(sessionExercises.workoutSessionId, workoutSessions.id)).where(eq(workoutSessions.id, saved.id));
    expect(snapshot).toEqual({ splitDayName: 'Original Push', sourceSplitDayId: null, exerciseName: 'Phase 4 Press', targetSets: 2, targetRepMin: 8, targetRepMax: 10, notes: 'Original pause' });
    const retainedSets = await database.select({ isCompleted: workoutSets.isCompleted }).from(workoutSets).innerJoin(sessionExercises, eq(sessionExercises.id, workoutSets.sessionExerciseId)).where(eq(sessionExercises.workoutSessionId, saved.id));
    expect(retainedSets).toEqual([{ isCompleted: true }]);
  }, 30_000);
});
