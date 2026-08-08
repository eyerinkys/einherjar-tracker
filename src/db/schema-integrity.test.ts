import { describe, expect, it } from 'vitest';
import { assertSchemaIntegrity } from './schema-integrity';

const completeMetadata = {
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
    'account_userId_idx',
    'exercises_created_by_user_idx',
    'session_exercises_exercise_idx',
    'session_exercises_session_sort_order_idx',
    'session_userId_idx',
    'split_days_user_sort_order_idx',
    'split_exercises_exercise_idx',
    'split_exercises_split_day_sort_order_idx',
    'verification_identifier_idx',
    'workout_sessions_one_in_progress_per_user',
    'workout_sessions_source_split_day_idx',
    'workout_sessions_user_completed_at_idx',
    'workout_sets_session_exercise_set_number_unique',
  ],
  columnTypes: [{ tableName: 'workout_sets', columnName: 'weight', dataType: 'numeric' }],
  constraints: [
    { name: 'account_user_id_user_id_fk', definition: '' },
    { name: 'exercises_created_by_user_id_user_id_fk', definition: '' },
    { name: 'exercises_equipment_not_blank', definition: '' },
    { name: 'exercises_muscle_group_not_blank', definition: '' },
    { name: 'exercises_name_not_blank', definition: '' },
    { name: 'session_exercises_exercise_id_exercises_id_fk', definition: '' },
    { name: 'session_exercises_name_not_blank', definition: '' },
    { name: 'session_exercises_target_rep_max_positive', definition: '' },
    { name: 'session_exercises_target_rep_min_positive', definition: '' },
    { name: 'session_exercises_target_rep_range_valid', definition: '' },
    { name: 'session_exercises_target_sets_positive', definition: '' },
    { name: 'session_exercises_workout_session_id_workout_sessions_id_fk', definition: '' },
    { name: 'session_user_id_user_id_fk', definition: '' },
    { name: 'split_days_name_not_blank', definition: '' },
    { name: 'split_days_user_id_user_id_fk', definition: '' },
    { name: 'split_exercises_exercise_id_exercises_id_fk', definition: '' },
    { name: 'split_exercises_split_day_id_split_days_id_fk', definition: '' },
    { name: 'split_exercises_target_rep_max_positive', definition: '' },
    { name: 'split_exercises_target_rep_min_positive', definition: '' },
    { name: 'split_exercises_target_rep_range_valid', definition: '' },
    { name: 'split_exercises_target_sets_positive', definition: '' },
    { name: 'workout_sessions_completion_state_valid', definition: '' },
    { name: 'workout_sessions_source_split_day_id_split_days_id_fk', definition: 'FOREIGN KEY (source_split_day_id) REFERENCES split_days(id) ON DELETE SET NULL' },
    { name: 'workout_sessions_split_day_name_not_blank', definition: '' },
    { name: 'workout_sessions_user_id_user_id_fk', definition: '' },
    { name: 'workout_sessions_version_positive', definition: '' },
    { name: 'workout_sets_completed_reps_positive', definition: '' },
    { name: 'workout_sets_session_exercise_id_session_exercises_id_fk', definition: '' },
    { name: 'workout_sets_set_number_positive', definition: '' },
    { name: 'workout_sets_weight_finite', definition: '' },
    { name: 'workout_sets_weight_non_negative', definition: '' },
  ],
};

describe('assertSchemaIntegrity', () => {
  it('reports missing Phase 1 tables and critical indexes', () => {
    expect(() => assertSchemaIntegrity({ tableNames: [], indexNames: [], columnTypes: [], constraints: [] })).toThrow(
      'Missing database tables: account, exercises, session, session_exercises, split_days, split_exercises, user, verification, workout_sessions, workout_sets',
    );
  });

  it('accepts the expected Phase 1 database contract', () => {
    expect(() => assertSchemaIntegrity(completeMetadata)).not.toThrow();
  });

  it('rejects a floating-point workout weight column', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        columnTypes: [{ tableName: 'workout_sets', columnName: 'weight', dataType: 'double precision' }],
      }),
    ).toThrow('Incorrect database column types: workout_sets.weight expected numeric, received double precision');
  });

  it('rejects a source split foreign key without SET NULL history preservation', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        constraints: completeMetadata.constraints.map((constraint) =>
          constraint.name === 'workout_sessions_source_split_day_id_split_days_id_fk'
            ? { ...constraint, definition: 'FOREIGN KEY (source_split_day_id) REFERENCES split_days(id)' }
            : constraint,
        ),
      }),
    ).toThrow('Invalid source split-day foreign key delete behavior');
  });

  it('requires every Phase 1 foreign-key and history index', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        indexNames: completeMetadata.indexNames.filter((name) => name !== 'account_userId_idx'),
      }),
    ).toThrow('Missing database indexes: account_userId_idx');
  });
});
