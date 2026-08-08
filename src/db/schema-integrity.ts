const expectedTables = [
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
] as const;

const criticalIndexes = [
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
] as const;

const criticalConstraints = [
  'account_user_id_user_id_fk',
  'exercises_created_by_user_id_user_id_fk',
  'exercises_equipment_not_blank',
  'exercises_muscle_group_not_blank',
  'exercises_name_not_blank',
  'session_exercises_exercise_id_exercises_id_fk',
  'session_exercises_name_not_blank',
  'session_exercises_target_rep_max_positive',
  'session_exercises_target_rep_min_positive',
  'session_exercises_target_rep_range_valid',
  'session_exercises_target_sets_positive',
  'session_exercises_workout_session_id_workout_sessions_id_fk',
  'session_user_id_user_id_fk',
  'split_days_name_not_blank',
  'split_days_user_id_user_id_fk',
  'split_exercises_exercise_id_exercises_id_fk',
  'split_exercises_split_day_id_split_days_id_fk',
  'split_exercises_target_rep_max_positive',
  'split_exercises_target_rep_min_positive',
  'split_exercises_target_rep_range_valid',
  'split_exercises_target_sets_positive',
  'workout_sessions_completion_state_valid',
  'workout_sessions_source_split_day_id_split_days_id_fk',
  'workout_sessions_split_day_name_not_blank',
  'workout_sessions_user_id_user_id_fk',
  'workout_sessions_version_positive',
  'workout_sets_completed_reps_positive',
  'workout_sets_session_exercise_id_session_exercises_id_fk',
  'workout_sets_set_number_positive',
  'workout_sets_weight_finite',
  'workout_sets_weight_non_negative',
] as const;

const expectedColumnTypes = [
  { tableName: 'workout_sets', columnName: 'weight', dataType: 'numeric' },
] as const;

export interface SchemaMetadata {
  tableNames: readonly string[];
  indexNames: readonly string[];
  columnTypes: readonly ColumnType[];
  constraints: readonly Constraint[];
}

export interface ColumnType {
  tableName: string;
  columnName: string;
  dataType: string;
}

export interface Constraint {
  name: string;
  definition: string;
}

function missingEntries(expected: readonly string[], actual: readonly string[]): string[] {
  const actualNames = new Set(actual);
  return expected.filter((name) => !actualNames.has(name));
}

export function assertSchemaIntegrity(metadata: SchemaMetadata): void {
  const missingTables = missingEntries(expectedTables, metadata.tableNames);
  if (missingTables.length > 0) {
    throw new Error(`Missing database tables: ${missingTables.join(', ')}`);
  }

  const missingIndexes = missingEntries(criticalIndexes, metadata.indexNames);
  if (missingIndexes.length > 0) {
    throw new Error(`Missing database indexes: ${missingIndexes.join(', ')}`);
  }

  const constraintNames = metadata.constraints.map((constraint) => constraint.name);
  const missingConstraints = missingEntries(criticalConstraints, constraintNames);
  if (missingConstraints.length > 0) {
    throw new Error(`Missing database constraints: ${missingConstraints.join(', ')}`);
  }

  const columnTypes = new Map(
    metadata.columnTypes.map((column) => [`${column.tableName}.${column.columnName}`, column.dataType]),
  );
  for (const expected of expectedColumnTypes) {
    const key = `${expected.tableName}.${expected.columnName}`;
    const actual = columnTypes.get(key);
    if (actual !== expected.dataType) {
      throw new Error(`Incorrect database column types: ${key} expected ${expected.dataType}, received ${actual ?? 'missing'}`);
    }
  }

  const sourceSplitDayForeignKey = metadata.constraints.find(
    (constraint) => constraint.name === 'workout_sessions_source_split_day_id_split_days_id_fk',
  );
  if (!/FOREIGN KEY.*source_split_day_id.*REFERENCES.*split_days.*ON DELETE SET NULL/i.test(sourceSplitDayForeignKey?.definition ?? '')) {
    throw new Error('Invalid source split-day foreign key delete behavior');
  }
}
