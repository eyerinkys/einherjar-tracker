import { describe, expect, it } from 'vitest';
import { assertSchemaIntegrity } from './schema-integrity';

describe('assertSchemaIntegrity', () => {
  it('reports missing Phase 1 tables and critical indexes', () => {
    expect(() => assertSchemaIntegrity({ tableNames: [], indexNames: [] })).toThrow(
      'Missing database tables: account, exercises, session, session_exercises, split_days, split_exercises, user, verification, workout_sessions, workout_sets',
    );
  });

  it('accepts the expected Phase 1 database contract', () => {
    expect(() =>
      assertSchemaIntegrity({
        tableNames: [
          'account',
          'exercises',
          'session',
          'session_exercises',
          'split_days',
          'split_exercises',
          'user',
          'verification',
          'workout_sessions',
          'workout_sets',
        ],
        indexNames: [
          'workout_sessions_one_in_progress_per_user',
          'workout_sessions_user_completed_at_idx',
          'workout_sets_session_exercise_set_number_unique',
        ],
      }),
    ).not.toThrow();
  });
});
