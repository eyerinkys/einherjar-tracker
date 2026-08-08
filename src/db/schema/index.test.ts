import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  exercises,
  sessionExercises,
  splitDays,
  splitExercises,
  workoutSessions,
  workoutSets,
} from './index';

describe('Phase 1 workout schema', () => {
  it('keeps domain ownership and completed-history snapshots relational', () => {
    expect(getTableConfig(exercises).name).toBe('exercises');
    expect(splitDays.userId.notNull).toBe(true);
    expect(splitExercises.splitDayId.notNull).toBe(true);
    expect(workoutSessions.sourceSplitDayId.notNull).toBe(false);
    expect(sessionExercises.exerciseName.notNull).toBe(true);
    expect(workoutSets.reps.notNull).toBe(false);
  });

  it('enforces one active workout per user and unique set positions', () => {
    const sessionIndexes = getTableConfig(workoutSessions).indexes;
    const setIndexes = getTableConfig(workoutSets).indexes;

    expect(sessionIndexes.some((index) => index.config.name === 'workout_sessions_one_in_progress_per_user')).toBe(true);
    expect(setIndexes.some((index) => index.config.name === 'workout_sets_session_exercise_set_number_unique')).toBe(true);
  });

  it('keeps completed workout state and load values valid', () => {
    const sessionChecks = getTableConfig(workoutSessions).checks.map((check) => check.name);
    const setChecks = getTableConfig(workoutSets).checks.map((check) => check.name);

    expect(sessionChecks).toContain('workout_sessions_completion_state_valid');
    expect(setChecks).toContain('workout_sets_weight_finite');
  });

  it('stores workout loads as exact PostgreSQL numerics', () => {
    const weight = getTableConfig(workoutSets).columns.find((column) => column.name === 'weight');

    expect(weight?.columnType).toBe('PgNumeric');
  });
});
