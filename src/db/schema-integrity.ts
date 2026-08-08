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
  'workout_sessions_one_in_progress_per_user',
  'workout_sessions_user_completed_at_idx',
  'workout_sets_session_exercise_set_number_unique',
] as const;

export interface SchemaMetadata {
  tableNames: readonly string[];
  indexNames: readonly string[];
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
}
