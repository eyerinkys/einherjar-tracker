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

const indexDefinitions = {
  account_userId_idx: 'create index account_userid_idx on account using btree (user_id)',
  exercises_created_by_user_idx: 'create index exercises_created_by_user_idx on exercises using btree (created_by_user_id)',
  session_exercises_exercise_idx: 'create index session_exercises_exercise_idx on session_exercises using btree (exercise_id)',
  session_exercises_session_sort_order_idx: 'create index session_exercises_session_sort_order_idx on session_exercises using btree (workout_session_id,sort_order)',
  session_userId_idx: 'create index session_userid_idx on session using btree (user_id)',
  split_days_user_sort_order_idx: 'create index split_days_user_sort_order_idx on split_days using btree (user_id,sort_order)',
  split_exercises_exercise_idx: 'create index split_exercises_exercise_idx on split_exercises using btree (exercise_id)',
  split_exercises_split_day_sort_order_idx: 'create index split_exercises_split_day_sort_order_idx on split_exercises using btree (split_day_id,sort_order)',
  verification_identifier_idx: 'create index verification_identifier_idx on verification using btree (identifier)',
  workout_sessions_one_in_progress_per_user: "create unique index workout_sessions_one_in_progress_per_user on workout_sessions using btree (user_id) where (status = 'in_progress')",
  workout_sessions_source_split_day_idx: 'create index workout_sessions_source_split_day_idx on workout_sessions using btree (source_split_day_id)',
  workout_sessions_user_completed_at_idx: 'create index workout_sessions_user_completed_at_idx on workout_sessions using btree (user_id,completed_at)',
  workout_sets_session_exercise_set_number_unique: 'create unique index workout_sets_session_exercise_set_number_unique on workout_sets using btree (session_exercise_id,set_number)',
} as const;

const constraintPatterns: Record<(typeof criticalConstraints)[number], RegExp> = {
  account_user_id_user_id_fk: /foreign key \(user_id\) references user\(id\) on delete cascade/,
  exercises_created_by_user_id_user_id_fk: /foreign key \(created_by_user_id\) references user\(id\) on delete set null/,
  exercises_equipment_not_blank: /check .*?(?:trim|btrim).*?equipment.*?> 0/,
  exercises_muscle_group_not_blank: /check .*?(?:trim|btrim).*?muscle_group.*?> 0/,
  exercises_name_not_blank: /check .*?(?:trim|btrim).*?name.*?> 0/,
  session_exercises_exercise_id_exercises_id_fk: /foreign key \(exercise_id\) references exercises\(id\) on delete set null/,
  session_exercises_name_not_blank: /check .*?(?:trim|btrim).*?exercise_name.*?> 0/,
  session_exercises_target_rep_max_positive: /check .*target_rep_max > 0/,
  session_exercises_target_rep_min_positive: /check .*target_rep_min > 0/,
  session_exercises_target_rep_range_valid: /check .*target_rep_min <= target_rep_max/,
  session_exercises_target_sets_positive: /check .*target_sets > 0/,
  session_exercises_workout_session_id_workout_sessions_id_fk: /foreign key \(workout_session_id\) references workout_sessions\(id\) on delete cascade/,
  session_user_id_user_id_fk: /foreign key \(user_id\) references user\(id\) on delete cascade/,
  split_days_name_not_blank: /check .*?(?:trim|btrim).*?name.*?> 0/,
  split_days_user_id_user_id_fk: /foreign key \(user_id\) references user\(id\) on delete cascade/,
  split_exercises_exercise_id_exercises_id_fk: /foreign key \(exercise_id\) references exercises\(id\) on delete no action/,
  split_exercises_split_day_id_split_days_id_fk: /foreign key \(split_day_id\) references split_days\(id\) on delete cascade/,
  split_exercises_target_rep_max_positive: /check .*target_rep_max > 0/,
  split_exercises_target_rep_min_positive: /check .*target_rep_min > 0/,
  split_exercises_target_rep_range_valid: /check .*target_rep_min <= target_rep_max/,
  split_exercises_target_sets_positive: /check .*target_sets > 0/,
  workout_sessions_completion_state_valid: /check .*status = 'in_progress'.*completed_at is null.*or.*status = 'completed'.*completed_at is not null/,
  workout_sessions_source_split_day_id_split_days_id_fk: /foreign key \(source_split_day_id\) references split_days\(id\) on delete set null/,
  workout_sessions_split_day_name_not_blank: /check .*?(?:trim|btrim).*?split_day_name.*?> 0/,
  workout_sessions_user_id_user_id_fk: /foreign key \(user_id\) references user\(id\) on delete cascade/,
  workout_sessions_version_positive: /check .*version > 0/,
  workout_sets_completed_reps_positive: /check .*is_completed = false.*or.*reps is not null.*reps > 0/,
  workout_sets_session_exercise_id_session_exercises_id_fk: /foreign key \(session_exercise_id\) references session_exercises\(id\) on delete cascade/,
  workout_sets_set_number_positive: /check .*set_number > 0/,
  workout_sets_weight_finite: /check .*weight is null.*or.*weight < 'infinity'/,
  workout_sets_weight_non_negative: /check .*weight is null.*or.*weight >= 0/,
};

export interface SchemaMetadata {
  tableNames: readonly string[];
  indexNames: readonly string[];
  indexDefinitions: readonly IndexDefinition[];
  columnTypes: readonly ColumnType[];
  constraints: readonly Constraint[];
}

export interface ColumnType {
  tableName: string;
  columnName: string;
  dataType: string;
}

export interface IndexDefinition {
  name: string;
  definition: string;
}

export interface Constraint {
  name: string;
  definition: string;
}

function missingEntries(expected: readonly string[], actual: readonly string[]): string[] {
  const actualNames = new Set(actual);
  return expected.filter((name) => !actualNames.has(name));
}

function normalizeCatalogDefinition(definition: string): string {
  return definition
    .toLowerCase()
    .replaceAll('"', '')
    .replace(/\bpublic\./g, '')
    .replace(/::[a-z_][a-z0-9_]*/g, '')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
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

  const indexedDefinitions = new Map(
    metadata.indexDefinitions.map((index) => [index.name, normalizeCatalogDefinition(index.definition)]),
  );
  for (const [name, expectedDefinition] of Object.entries(indexDefinitions)) {
    if (indexedDefinitions.get(name) !== expectedDefinition) {
      throw new Error(`Invalid database index definition: ${name}`);
    }
  }

  const constraintNames = metadata.constraints.map((constraint) => constraint.name);
  const missingConstraints = missingEntries(criticalConstraints, constraintNames);
  if (missingConstraints.length > 0) {
    throw new Error(`Missing database constraints: ${missingConstraints.join(', ')}`);
  }

  const definedConstraints = new Map(
    metadata.constraints.map((constraint) => [constraint.name, normalizeCatalogDefinition(constraint.definition)]),
  );
  for (const [name, pattern] of Object.entries(constraintPatterns)) {
    if (!pattern.test(definedConstraints.get(name) ?? '')) {
      throw new Error(`Invalid database constraint definition: ${name}`);
    }
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

}
