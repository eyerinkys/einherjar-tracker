import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from './client';
import { BUILT_IN_EXERCISES, createBuiltInExerciseUpsert } from './seed-exercises';

describe('built-in exercise seed', () => {
  it('uses the nine approved stable IDs with their canonical metadata', () => {
    expect(BUILT_IN_EXERCISES).toEqual([
      { id: '00000000-0000-4000-8000-000000000001', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings / Glutes', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000002', name: 'Lat Pulldown', muscleGroup: 'Lats / Upper Back', equipment: 'Cable', category: 'compound', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000003', name: 'Seated Cable Row', muscleGroup: 'Upper Back / Lats', equipment: 'Cable', category: 'compound', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000004', name: 'Dumbbell Lateral Raise', muscleGroup: 'Side Delts', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000005', name: 'Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000006', name: 'Hammer Curl', muscleGroup: 'Brachialis / Biceps', equipment: 'Dumbbell', category: 'isolation', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000007', name: 'Skull Crushers', muscleGroup: 'Triceps', equipment: 'EZ-Bar', category: 'isolation', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000008', name: 'Bench Press', muscleGroup: 'Chest / Triceps', equipment: 'Barbell', category: 'compound', createdByUserId: null, isCustom: false },
      { id: '00000000-0000-4000-8000-000000000009', name: 'Leg Press', muscleGroup: 'Quads / Glutes', equipment: 'Machine', category: 'compound', createdByUserId: null, isCustom: false },
    ]);
  });

  it('upserts by stable primary key and corrects built-in metadata on reruns', () => {
    const database = createDatabaseClient('postgresql://user:password@example.com:5432/tracker?sslmode=require');
    const query = new PgDialect().sqlToQuery(createBuiltInExerciseUpsert(database).getSQL());

    expect(query.sql).toContain('on conflict ("id") do update set');
    expect(query.sql).toContain('"name" = excluded.name');
    expect(query.sql).toContain('"muscle_group" = excluded.muscle_group');
    expect(query.sql).toContain('"equipment" = excluded.equipment');
    expect(query.sql).toContain('"category" = excluded.category');
    expect(query.sql).toContain('"created_by_user_id" = $');
    expect(query.sql).toContain('"is_custom" = $');
    expect(query.params).toContain('00000000-0000-4000-8000-000000000001');
    expect(query.params).toContain('00000000-0000-4000-8000-000000000009');
    expect(query.params.filter((value) => value === null)).toHaveLength(10);
    expect(query.params.filter((value) => value === false)).toHaveLength(10);
  });
});
