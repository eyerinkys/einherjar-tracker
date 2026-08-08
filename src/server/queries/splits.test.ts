import { describe, expect, it, vi } from 'vitest';
import { mapSplitRows, splitRowsForUserWhere } from './splits';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { splitDays } from '../../db/schema';

vi.mock('server-only', () => ({}));

const firstDayId = '00000000-0000-4000-8000-000000000001';
const secondDayId = '00000000-0000-4000-8000-000000000002';

describe('split query adapter', () => {
  it('returns an empty split for no rows', () => {
    expect(mapSplitRows([])).toEqual([]);
  });

  it('maps ordered database rows to gapless SplitDay and SplitExercise DTOs', () => {
    expect(
      mapSplitRows([
        {
          splitDayId: firstDayId,
          splitDayName: 'Pull',
          splitDaySortOrder: 4,
          splitExerciseId: '00000000-0000-4000-8000-000000000012',
          exerciseId: '00000000-0000-4000-8000-000000000022',
          exerciseName: 'Row',
          muscleGroup: 'Back',
          targetSets: 4,
          targetRepMin: 8,
          targetRepMax: 12,
          splitExerciseSortOrder: 7,
          notes: null,
        },
        {
          splitDayId: firstDayId,
          splitDayName: 'Pull',
          splitDaySortOrder: 4,
          splitExerciseId: '00000000-0000-4000-8000-000000000011',
          exerciseId: '00000000-0000-4000-8000-000000000021',
          exerciseName: 'Curl',
          muscleGroup: 'Arms',
          targetSets: 3,
          targetRepMin: 10,
          targetRepMax: 15,
          splitExerciseSortOrder: 9,
          notes: 'Controlled eccentric',
        },
        {
          splitDayId: secondDayId,
          splitDayName: 'Push',
          splitDaySortOrder: 8,
          splitExerciseId: null,
          exerciseId: null,
          exerciseName: null,
          muscleGroup: null,
          targetSets: null,
          targetRepMin: null,
          targetRepMax: null,
          splitExerciseSortOrder: null,
          notes: null,
        },
      ]),
    ).toEqual([
      {
        id: firstDayId,
        name: 'Pull',
        order: 0,
        exercises: [
          {
            id: '00000000-0000-4000-8000-000000000012',
            exerciseId: '00000000-0000-4000-8000-000000000022',
            exerciseName: 'Row',
            muscleGroup: 'Back',
            targetSets: 4,
            targetRepMin: 8,
            targetRepMax: 12,
            order: 0,
          },
          {
            id: '00000000-0000-4000-8000-000000000011',
            exerciseId: '00000000-0000-4000-8000-000000000021',
            exerciseName: 'Curl',
            muscleGroup: 'Arms',
            targetSets: 3,
            targetRepMin: 10,
            targetRepMax: 15,
            order: 1,
            notes: 'Controlled eccentric',
          },
        ],
      },
      { id: secondDayId, name: 'Push', order: 1, exercises: [] },
    ]);
  });

  it('binds split reads to the supplied server-side owner', () => {
    const query = new PgDialect().sqlToQuery(
      sql`select ${splitDays.id} from ${splitDays} where ${splitRowsForUserWhere('trusted-user')}`,
    );

    expect(query.sql).toContain('"split_days"."user_id" = $1');
    expect(query.params).toEqual(['trusted-user']);
  });
});
