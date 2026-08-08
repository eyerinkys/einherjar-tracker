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
  indexDefinitions: [
    { name: 'account_userId_idx', definition: 'CREATE INDEX "account_userId_idx" ON public.account USING btree (user_id)' },
    { name: 'exercises_created_by_user_idx', definition: 'CREATE INDEX "exercises_created_by_user_idx" ON public.exercises USING btree (created_by_user_id)' },
    { name: 'session_exercises_exercise_idx', definition: 'CREATE INDEX "session_exercises_exercise_idx" ON public.session_exercises USING btree (exercise_id)' },
    { name: 'session_exercises_session_sort_order_idx', definition: 'CREATE INDEX "session_exercises_session_sort_order_idx" ON public.session_exercises USING btree (workout_session_id, sort_order)' },
    { name: 'session_userId_idx', definition: 'CREATE INDEX "session_userId_idx" ON public.session USING btree (user_id)' },
    { name: 'split_days_user_sort_order_idx', definition: 'CREATE INDEX "split_days_user_sort_order_idx" ON public.split_days USING btree (user_id, sort_order)' },
    { name: 'split_exercises_exercise_idx', definition: 'CREATE INDEX "split_exercises_exercise_idx" ON public.split_exercises USING btree (exercise_id)' },
    { name: 'split_exercises_split_day_sort_order_idx', definition: 'CREATE INDEX "split_exercises_split_day_sort_order_idx" ON public.split_exercises USING btree (split_day_id, sort_order)' },
    { name: 'verification_identifier_idx', definition: 'CREATE INDEX "verification_identifier_idx" ON public.verification USING btree (identifier)' },
    { name: 'workout_sessions_one_in_progress_per_user', definition: "CREATE UNIQUE INDEX \"workout_sessions_one_in_progress_per_user\" ON public.workout_sessions USING btree (user_id) WHERE (status = 'in_progress'::workout_session_status)" },
    { name: 'workout_sessions_source_split_day_idx', definition: 'CREATE INDEX "workout_sessions_source_split_day_idx" ON public.workout_sessions USING btree (source_split_day_id)' },
    { name: 'workout_sessions_user_completed_at_idx', definition: 'CREATE INDEX "workout_sessions_user_completed_at_idx" ON public.workout_sessions USING btree (user_id, completed_at)' },
    { name: 'workout_sets_session_exercise_set_number_unique', definition: 'CREATE UNIQUE INDEX "workout_sets_session_exercise_set_number_unique" ON public.workout_sets USING btree (session_exercise_id, set_number)' },
  ],
  columnTypes: [{ tableName: 'workout_sets', columnName: 'weight', dataType: 'numeric' }],
  constraints: [
    { name: 'account_user_id_user_id_fk', definition: 'FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE' },
    { name: 'exercises_created_by_user_id_user_id_fk', definition: 'FOREIGN KEY (created_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL' },
    { name: 'exercises_equipment_not_blank', definition: 'CHECK (length(trim(equipment)) > 0)' },
    { name: 'exercises_muscle_group_not_blank', definition: 'CHECK (length(trim(muscle_group)) > 0)' },
    { name: 'exercises_name_not_blank', definition: 'CHECK (length(trim(name)) > 0)' },
    { name: 'session_exercises_exercise_id_exercises_id_fk', definition: 'FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL' },
    { name: 'session_exercises_name_not_blank', definition: 'CHECK (length(trim(exercise_name)) > 0)' },
    { name: 'session_exercises_target_rep_max_positive', definition: 'CHECK (target_rep_max > 0)' },
    { name: 'session_exercises_target_rep_min_positive', definition: 'CHECK (target_rep_min > 0)' },
    { name: 'session_exercises_target_rep_range_valid', definition: 'CHECK (target_rep_min <= target_rep_max)' },
    { name: 'session_exercises_target_sets_positive', definition: 'CHECK (target_sets > 0)' },
    { name: 'session_exercises_workout_session_id_workout_sessions_id_fk', definition: 'FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE' },
    { name: 'session_user_id_user_id_fk', definition: 'FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE' },
    { name: 'split_days_name_not_blank', definition: 'CHECK (length(trim(name)) > 0)' },
    { name: 'split_days_user_id_user_id_fk', definition: 'FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE' },
    { name: 'split_exercises_exercise_id_exercises_id_fk', definition: 'FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE NO ACTION' },
    { name: 'split_exercises_split_day_id_split_days_id_fk', definition: 'FOREIGN KEY (split_day_id) REFERENCES split_days(id) ON DELETE CASCADE' },
    { name: 'split_exercises_target_rep_max_positive', definition: 'CHECK (target_rep_max > 0)' },
    { name: 'split_exercises_target_rep_min_positive', definition: 'CHECK (target_rep_min > 0)' },
    { name: 'split_exercises_target_rep_range_valid', definition: 'CHECK (target_rep_min <= target_rep_max)' },
    { name: 'split_exercises_target_sets_positive', definition: 'CHECK (target_sets > 0)' },
    { name: 'workout_sessions_completion_state_valid', definition: "CHECK ((status = 'in_progress' AND completed_at IS NULL) OR (status = 'completed' AND completed_at IS NOT NULL))" },
    { name: 'workout_sessions_source_split_day_id_split_days_id_fk', definition: 'FOREIGN KEY (source_split_day_id) REFERENCES split_days(id) ON DELETE SET NULL' },
    { name: 'workout_sessions_split_day_name_not_blank', definition: 'CHECK (length(trim(split_day_name)) > 0)' },
    { name: 'workout_sessions_user_id_user_id_fk', definition: 'FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE' },
    { name: 'workout_sessions_version_positive', definition: 'CHECK (version > 0)' },
    { name: 'workout_sets_completed_reps_positive', definition: 'CHECK (is_completed = false OR (reps IS NOT NULL AND reps > 0))' },
    { name: 'workout_sets_session_exercise_id_session_exercises_id_fk', definition: 'FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE' },
    { name: 'workout_sets_set_number_positive', definition: 'CHECK (set_number > 0)' },
    { name: 'workout_sets_weight_finite', definition: "CHECK (weight IS NULL OR weight < 'Infinity'::numeric)" },
    { name: 'workout_sets_weight_non_negative', definition: 'CHECK (weight IS NULL OR weight >= 0)' },
  ],
};

describe('assertSchemaIntegrity', () => {
  it('reports missing Phase 1 tables and critical indexes', () => {
    expect(() => assertSchemaIntegrity({ tableNames: [], indexNames: [], indexDefinitions: [], columnTypes: [], constraints: [] })).toThrow(
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
    ).toThrow('Invalid database constraint definition: workout_sessions_source_split_day_id_split_days_id_fk');
  });

  it('requires every Phase 1 foreign-key and history index', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        indexNames: completeMetadata.indexNames.filter((name) => name !== 'account_userId_idx'),
      }),
    ).toThrow('Missing database indexes: account_userId_idx');
  });

  it('rejects a same-named active-workout index without uniqueness or the in-progress predicate', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        indexDefinitions: completeMetadata.indexDefinitions.map((index) =>
          index.name === 'workout_sessions_one_in_progress_per_user'
            ? { ...index, definition: 'CREATE INDEX workout_sessions_one_in_progress_per_user ON workout_sessions USING btree (user_id)' }
            : index,
        ),
      }),
    ).toThrow('Invalid database index definition: workout_sessions_one_in_progress_per_user');
  });

  it('rejects a same-named unique set index with reversed columns', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        indexDefinitions: completeMetadata.indexDefinitions.map((index) =>
          index.name === 'workout_sets_session_exercise_set_number_unique'
            ? { ...index, definition: 'CREATE UNIQUE INDEX workout_sets_session_exercise_set_number_unique ON workout_sets USING btree (set_number, session_exercise_id)' }
            : index,
        ),
      }),
    ).toThrow('Invalid database index definition: workout_sets_session_exercise_set_number_unique');
  });

  it('rejects a same-named weakened target-set check', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        constraints: completeMetadata.constraints.map((constraint) =>
          constraint.name === 'split_exercises_target_sets_positive'
            ? { ...constraint, definition: 'CHECK (target_sets >= 0)' }
            : constraint,
        ),
      }),
    ).toThrow('Invalid database constraint definition: split_exercises_target_sets_positive');
  });

  it('rejects a same-named foreign key with weakened delete behavior', () => {
    expect(() =>
      assertSchemaIntegrity({
        ...completeMetadata,
        constraints: completeMetadata.constraints.map((constraint) =>
          constraint.name === 'workout_sessions_source_split_day_id_split_days_id_fk'
            ? { ...constraint, definition: 'FOREIGN KEY (source_split_day_id) REFERENCES split_days(id) ON DELETE CASCADE' }
            : constraint,
        ),
      }),
    ).toThrow('Invalid database constraint definition: workout_sessions_source_split_day_id_split_days_id_fk');
  });
});
