import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from './client';
import {
  BUILT_IN_EXERCISES,
  createBuiltInExerciseUpsert,
  seedBuiltInExercises,
  type BuiltInExercise,
} from './seed-exercises';

type PersistedExercise = Omit<BuiltInExercise, 'createdByUserId' | 'isCustom'> & {
  createdByUserId: string | null;
  isCustom: boolean;
};

class InMemoryExerciseSeedDatabase {
  readonly rows = new Map<string, PersistedExercise>();

  async upsertBuiltInExercises(exercises: readonly BuiltInExercise[]): Promise<void> {
    for (const exercise of exercises) {
      this.rows.set(exercise.id, { ...exercise });
    }
  }
}

describe('built-in exercise seed', () => {
  it('uses approved stable IDs with canonical metadata', () => {
    expect(BUILT_IN_EXERCISES.length).toBe(35);
    expect(BUILT_IN_EXERCISES[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Romanian Deadlift',
      muscleGroup: 'Hamstrings / Glutes',
      equipment: 'Barbell',
      category: 'compound',
      createdByUserId: null,
      isCustom: false,
    });
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
    expect(query.params).toContain('00000000-0000-4000-8000-000000000035');
    expect(query.params.filter((value) => value === null)).toHaveLength(36);
    expect(query.params.filter((value) => value === false)).toHaveLength(36);
  });

  it('inserts the built-ins once when the seed is rerun', async () => {
    const database = new InMemoryExerciseSeedDatabase();

    await seedBuiltInExercises(database);
    await seedBuiltInExercises(database);

    expect([...database.rows.values()]).toEqual(BUILT_IN_EXERCISES);
    expect(database.rows.size).toBe(35);
  });

  it('corrects a corrupted stable built-in row on rerun', async () => {
    const database = new InMemoryExerciseSeedDatabase();

    await seedBuiltInExercises(database);
    database.rows.set('00000000-0000-4000-8000-000000000001', {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Corrupted name',
      muscleGroup: 'Wrong group',
      equipment: 'Wrong equipment',
      category: 'isolation',
      createdByUserId: 'foreign-user',
      isCustom: true,
    });

    await seedBuiltInExercises(database);

    expect(database.rows.get('00000000-0000-4000-8000-000000000001')).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Romanian Deadlift',
      muscleGroup: 'Hamstrings / Glutes',
      equipment: 'Barbell',
      category: 'compound',
      createdByUserId: null,
      isCustom: false,
    });
  });
});
