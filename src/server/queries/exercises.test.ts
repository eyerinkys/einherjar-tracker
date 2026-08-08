import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { exercises } from '../../db/schema';
import { getVisibleExercises, visibleExercisesWhere } from './exercises';

vi.mock('server-only', () => ({}));

const rows = [
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Zulu Built-in',
    muscleGroup: 'Back',
    equipment: 'Cable',
    category: 'compound' as const,
    createdByUserId: null,
    isCustom: false,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Alpha Custom',
    muscleGroup: 'Arms',
    equipment: 'Dumbbell',
    category: 'isolation' as const,
    createdByUserId: 'trusted-user',
    isCustom: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Alpha Built-in',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    category: 'compound' as const,
    createdByUserId: null,
    isCustom: false,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Alpha Custom',
    muscleGroup: 'Legs',
    equipment: 'Machine',
    category: 'compound' as const,
    createdByUserId: 'trusted-user',
    isCustom: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Foreign Custom',
    muscleGroup: 'Back',
    equipment: 'Cable',
    category: 'compound' as const,
    createdByUserId: 'other-user',
    isCustom: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    name: 'Invalid Shared Flag',
    muscleGroup: 'Back',
    equipment: 'Cable',
    category: 'compound' as const,
    createdByUserId: 'other-user',
    isCustom: false,
  },
];

describe('exercise library read adapter', () => {
  it('returns shared built-ins and the trusted user custom exercises in name then ID order', () => {
    expect(getVisibleExercises(rows, 'trusted-user')).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Alpha Built-in',
        muscleGroup: 'Chest',
        equipment: 'Barbell',
        category: 'compound',
        isCustom: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Alpha Custom',
        muscleGroup: 'Arms',
        equipment: 'Dumbbell',
        category: 'isolation',
        createdByUserId: 'trusted-user',
        isCustom: true,
      },
      {
        id: '00000000-0000-4000-8000-000000000004',
        name: 'Alpha Custom',
        muscleGroup: 'Legs',
        equipment: 'Machine',
        category: 'compound',
        createdByUserId: 'trusted-user',
        isCustom: true,
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Zulu Built-in',
        muscleGroup: 'Back',
        equipment: 'Cable',
        category: 'compound',
        isCustom: false,
      },
    ]);
  });

  it('does not reveal another user custom exercise', () => {
    expect(getVisibleExercises(rows, 'other-user').map((exercise) => exercise.id)).not.toContain(
      '00000000-0000-4000-8000-000000000002',
    );
  });

  it('maps only the Exercise UI DTO fields', () => {
    const rowWithDatabaseFields = {
      ...rows[0],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    expect(getVisibleExercises([rowWithDatabaseFields], 'trusted-user')[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Zulu Built-in',
      muscleGroup: 'Back',
      equipment: 'Cable',
      category: 'compound',
      isCustom: false,
    });
  });

  it('binds visibility to the trusted user and orders at the database boundary', () => {
    const query = new PgDialect().sqlToQuery(
      sql`select ${exercises.id} from ${exercises} where ${visibleExercisesWhere('trusted-user')} order by ${exercises.name}, ${exercises.id}`,
    );

    expect(query.sql).toContain('"exercises"."is_custom" = $1');
    expect(query.sql).toContain('"exercises"."created_by_user_id" is null');
    expect(query.sql).toContain('"exercises"."is_custom" = $2');
    expect(query.sql).toContain('"exercises"."created_by_user_id" = $3');
    expect(query.params).toEqual([false, true, 'trusted-user']);
    expect(query.sql).toContain('order by "exercises"."name", "exercises"."id"');
  });
});
