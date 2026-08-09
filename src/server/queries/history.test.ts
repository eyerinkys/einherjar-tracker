import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { workoutSessions } from '../../db/schema';
import { historyPageInputSchema } from '../validation/history';
import {
  completedSessionChildrenWhere,
  completedSessionsWhere,
  exerciseHistoryWhere,
  getCompletedSession,
  getCompletedSessionHistory,
  getExerciseHistory,
  getPreviousPerformanceByExercise,
  getPreviousPerformanceRowsByExercise,
  mapCompletedSession,
  previousPerformanceWhere,
  type CompletedSessionChildRow,
  type CompletedSessionRow,
  type ExerciseHistoryRow,
  type HistoryReadAdapter,
  type PreviousPerformanceRow,
} from './history';

vi.mock('server-only', () => ({}));

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const firstSession: CompletedSessionRow = {
  id: id('9'), userId: 'trusted', sourceSplitDayId: null, splitDayName: 'Snapshot Push',
  status: 'completed', startedAt: new Date('2026-08-09T03:05:00.000Z'),
  completedAt: new Date('2026-08-09T04:00:00.000Z'), notes: 'Session note',
};
const firstChildren: CompletedSessionChildRow[] = [
  {
    workoutSessionId: id('9'), sessionExerciseId: id('20'), exerciseId: null,
    exerciseName: 'Deleted Snapshot Press', exerciseSortOrder: 1, targetSets: 2,
    targetRepMin: 8, targetRepMax: 10, exerciseNotes: 'Pause', setId: id('23'),
    setNumber: 2, weight: '82.500', reps: 8, isCompleted: true,
  },
  {
    workoutSessionId: id('9'), sessionExerciseId: id('10'), exerciseId: id('100'),
    exerciseName: 'Snapshot Row', exerciseSortOrder: 0, targetSets: 1,
    targetRepMin: 10, targetRepMax: 12, exerciseNotes: null, setId: id('12'),
    setNumber: 1, weight: '50.00', reps: 12, isCompleted: true,
  },
  {
    workoutSessionId: id('9'), sessionExerciseId: id('20'), exerciseId: null,
    exerciseName: 'Deleted Snapshot Press', exerciseSortOrder: 1, targetSets: 2,
    targetRepMin: 8, targetRepMax: 10, exerciseNotes: 'Pause', setId: id('22'),
    setNumber: 1, weight: '80.25', reps: 9, isCompleted: true,
  },
  {
    workoutSessionId: id('9'), sessionExerciseId: id('20'), exerciseId: null,
    exerciseName: 'Deleted Snapshot Press', exerciseSortOrder: 1, targetSets: 2,
    targetRepMin: 8, targetRepMax: 10, exerciseNotes: 'Pause', setId: id('21'),
    setNumber: 3, weight: '70', reps: 7, isCompleted: false,
  },
];

function adapter(overrides: Partial<HistoryReadAdapter> = {}): HistoryReadAdapter {
  return {
    listCompletedSessions: async () => [],
    listCompletedSessionChildren: async () => [],
    findCompletedSession: async () => null,
    findVisibleExercise: async () => null,
    listExerciseHistory: async () => [],
    listPreviousPerformance: async () => [],
    ...overrides,
  };
}

describe('completed workout history queries', () => {
  it('maps snapshot fields, nullable deleted sources, completed sets, exact order, numeric values, and UTC duration', () => {
    expect(mapCompletedSession(firstSession, firstChildren)).toEqual({
      id: id('9'), sourceSplitDayId: null, splitDayName: 'Snapshot Push',
      startedAt: '2026-08-09T03:05:00.000Z', completedAt: '2026-08-09T04:00:00.000Z',
      durationMinutes: 55, notes: 'Session note',
      exercises: [
        {
          id: id('10'), exerciseId: id('100'), exerciseName: 'Snapshot Row',
          targetSets: 1, targetRepMin: 10, targetRepMax: 12,
          sets: [{ id: id('12'), setNumber: 1, weight: 50, reps: 12 }],
        },
        {
          id: id('20'), exerciseId: null, exerciseName: 'Deleted Snapshot Press',
          targetSets: 2, targetRepMin: 8, targetRepMax: 10, notes: 'Pause',
          sets: [
            { id: id('22'), setNumber: 1, weight: 80.25, reps: 9 },
            { id: id('23'), setNumber: 2, weight: 82.5, reps: 8 },
          ],
        },
      ],
    });
  });

  it('returns stable descending pages and a cursor only when another row exists', async () => {
    const tiedOlder = { ...firstSession, id: id('8') };
    const oldest = { ...firstSession, id: id('7'), completedAt: new Date('2026-08-08T04:00:00.000Z') };
    const read = adapter({
      listCompletedSessions: async (_userId, _cursor, limit) => [oldest, tiedOlder, firstSession].slice(0, limit),
      listCompletedSessionChildren: async () => firstChildren,
    });

    const page = await getCompletedSessionHistory('trusted', { pageSize: 2 }, read);

    expect(page.sessions.map(({ id: sessionId }) => sessionId)).toEqual([id('9'), id('8')]);
    expect(historyPageInputSchema.parse({ cursor: page.nextCursor }).cursor).toEqual({
      completedAt: firstSession.completedAt,
      id: id('8'),
    });

    const finalPage = await getCompletedSessionHistory('trusted', { pageSize: 2 }, adapter({
      listCompletedSessions: async () => [oldest],
      listCompletedSessionChildren: async () => [],
    }));
    expect(finalPage.nextCursor).toBeNull();
  });

  it('binds completed-only owner scoping and cursor ties in SQL', () => {
    const where = completedSessionsWhere('trusted', {
      completedAt: new Date('2026-08-09T04:00:00.000Z'),
      id: id('8'),
    });
    const query = new PgDialect().sqlToQuery(sql`select ${workoutSessions.id} from ${workoutSessions} where ${where}`);

    expect(query.sql).toContain('"workout_sessions"."user_id" = $1');
    expect(query.sql).toContain('"workout_sessions"."status" = $2');
    expect(query.sql).toContain('"workout_sessions"."completed_at" < $3');
    expect(query.sql).toContain('"workout_sessions"."completed_at" = $4');
    expect(query.sql).toContain('"workout_sessions"."id" < $5');
    expect(query.params).toEqual(['trusted', 'completed', '2026-08-09T04:00:00.000Z', '2026-08-09T04:00:00.000Z', id('8')]);
  });

  it('keeps child and exercise-history reads behind completed owner-scoped parents', () => {
    const childQuery = new PgDialect().sqlToQuery(sql`select ${workoutSessions.id} from ${workoutSessions} where ${completedSessionChildrenWhere('trusted', [id('9')])}`);
    expect(childQuery.sql).toContain('"workout_sessions"."user_id" = $1');
    expect(childQuery.sql).toContain('"workout_sessions"."status" = $2');
    expect(childQuery.sql).toContain('"workout_sessions"."id" in ($3)');
    expect(childQuery.sql).toContain('"workout_sets"."is_completed" = $4');
    expect(childQuery.params).toEqual(['trusted', 'completed', id('9'), true]);

    const exerciseQuery = new PgDialect().sqlToQuery(sql`select ${workoutSessions.id} from ${workoutSessions} where ${exerciseHistoryWhere('trusted', id('100'))}`);
    expect(exerciseQuery.sql).toContain('"workout_sessions"."user_id" = $1');
    expect(exerciseQuery.sql).toContain('"workout_sessions"."status" = $2');
    expect(exerciseQuery.sql).toContain('"session_exercises"."exercise_id" = $3');
    expect(exerciseQuery.sql).toContain('"workout_sets"."is_completed" = $4');
    expect(exerciseQuery.params).toEqual(['trusted', 'completed', id('100'), true]);
  });

  it('makes foreign and missing completed-session details indistinguishable', async () => {
    await expect(getCompletedSession('trusted', id('9'), adapter())).rejects.toMatchObject({
      code: 'NOT_FOUND', message: 'Resource not found.',
    });
  });
});

describe('per-exercise completed history', () => {
  const exercise = {
    id: id('100'), name: 'Current Name', muscleGroup: 'Chest', equipment: 'Barbell',
    category: 'compound' as const, createdByUserId: null, isCustom: false,
  };
  const historyRows: ExerciseHistoryRow[] = [
    {
      workoutSessionId: id('3'), sessionExerciseId: id('30'), splitDayName: 'Newer Day',
      startedAt: new Date('2026-08-03T03:00:00.000Z'), completedAt: new Date('2026-08-03T04:00:00.000Z'),
      exerciseName: 'Snapshot New Name', targetSets: 1, targetRepMin: 6, targetRepMax: 8,
      exerciseNotes: null, setId: id('32'), setNumber: 2, weight: '90', reps: 6, isCompleted: false,
    },
    {
      workoutSessionId: id('3'), sessionExerciseId: id('30'), splitDayName: 'Newer Day',
      startedAt: new Date('2026-08-03T03:00:00.000Z'), completedAt: new Date('2026-08-03T04:00:00.000Z'),
      exerciseName: 'Snapshot New Name', targetSets: 1, targetRepMin: 6, targetRepMax: 8,
      exerciseNotes: null, setId: id('31'), setNumber: 1, weight: '90', reps: 8, isCompleted: true,
    },
    {
      workoutSessionId: id('1'), sessionExerciseId: id('10'), splitDayName: 'Older Day',
      startedAt: new Date('2026-08-01T03:00:00.000Z'), completedAt: new Date('2026-08-01T04:00:00.000Z'),
      exerciseName: 'Snapshot Old Name', targetSets: 1, targetRepMin: 8, targetRepMax: 10,
      exerciseNotes: 'Old note', setId: id('11'), setNumber: 1, weight: '80.5', reps: 10, isCompleted: true,
    },
  ];

  it('returns visible empty history and chronological snapshot entries with stable child order', async () => {
    const empty = await getExerciseHistory('trusted', id('100'), adapter({ findVisibleExercise: async () => exercise }));
    expect(empty).toEqual({ exercise: { ...exercise, createdByUserId: undefined }, sessions: [] });

    const populated = await getExerciseHistory('trusted', id('100'), adapter({
      findVisibleExercise: async () => exercise,
      listExerciseHistory: async () => historyRows,
    }));
    expect(populated.sessions.map(({ sessionId }) => sessionId)).toEqual([id('1'), id('3')]);
    expect(populated.sessions[0]).toMatchObject({
      exerciseName: 'Snapshot Old Name', notes: 'Old note',
      sets: [{ id: id('11'), setNumber: 1, weight: 80.5, reps: 10 }],
    });
    expect(populated.sessions[1].sets).toEqual([{ id: id('31'), setNumber: 1, weight: 90, reps: 8 }]);
  });

  it('denies missing and foreign custom exercises with the same safe error', async () => {
    await expect(getExerciseHistory('trusted', id('101'), adapter())).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('previous performance selection', () => {
  const activeStartedAt = new Date('2026-08-09T04:00:00.000Z');
  const exerciseId = id('100');
  const candidate = (
    overrides: Partial<PreviousPerformanceRow> = {},
  ): PreviousPerformanceRow => ({
    userId: 'trusted', status: 'completed', exerciseId,
    workoutSessionId: id('8'), sessionExerciseId: id('80'),
    completedAt: new Date('2026-08-09T03:59:00.000Z'), setId: id('81'),
    setNumber: 1, weight: '82.50', reps: 8, isCompleted: true,
    ...overrides,
  });

  it('selects the latest stable completed exercise strictly before the active start and orders completed sets', async () => {
    const rows = [
      candidate({ setId: id('82'), setNumber: 2, weight: '80', reps: 9 }),
      candidate({ workoutSessionId: id('9'), sessionExerciseId: id('90'), setId: id('91'), weight: '85', reps: 7 }),
      candidate({ workoutSessionId: id('9'), sessionExerciseId: id('90'), setId: id('92'), setNumber: 2, weight: '85', reps: 6 }),
      candidate({ workoutSessionId: id('7'), sessionExerciseId: id('70'), completedAt: new Date('2026-08-08T03:00:00.000Z') }),
      candidate({ workoutSessionId: id('6'), status: 'in_progress' }),
      candidate({ workoutSessionId: id('5'), userId: 'foreign' }),
      candidate({ workoutSessionId: id('4'), completedAt: activeStartedAt }),
      candidate({ workoutSessionId: id('3'), completedAt: new Date('2026-08-09T05:00:00.000Z') }),
      candidate({ workoutSessionId: id('2'), isCompleted: false }),
      candidate({ workoutSessionId: id('1'), exerciseId: id('101') }),
      candidate({ workoutSessionId: id('999'), sessionExerciseId: id('999'), completedAt: new Date('2026-08-01T00:00:00.000Z') }),
    ];
    const read = adapter({ listPreviousPerformance: async () => rows });

    const previous = await getPreviousPerformanceByExercise(
      'trusted', id('999'), activeStartedAt, [exerciseId], read,
    );

    expect(previous).toEqual(new Map([[exerciseId, [
      { weight: 85, reps: 7 },
      { weight: 85, reps: 6 },
    ]]]));
  });

  it('preserves exact numeric text until the frontend DTO boundary', async () => {
    const exactWeight = '82.500000000000000001';
    const read = adapter({
      listPreviousPerformance: async () => [candidate({ weight: exactWeight })],
    });

    const selected = await getPreviousPerformanceRowsByExercise(
      'trusted', id('999'), activeStartedAt, [exerciseId], read,
    );
    expect(selected.get(exerciseId)?.[0].weight).toBe(exactWeight);

    const dto = await getPreviousPerformanceByExercise(
      'trusted', id('999'), activeStartedAt, [exerciseId], read,
    );
    expect(dto.get(exerciseId)).toEqual([{ weight: 82.5, reps: 8 }]);
  });

  it('binds every exclusion and requested exercise to the database predicate', () => {
    const where = previousPerformanceWhere(
      'trusted', id('999'), activeStartedAt, [exerciseId],
    );
    const query = new PgDialect().sqlToQuery(sql`select ${workoutSessions.id} from ${workoutSessions} where ${where}`);

    expect(query.sql).toContain('"workout_sessions"."user_id" = $1');
    expect(query.sql).toContain('"workout_sessions"."status" = $2');
    expect(query.sql).toContain('"workout_sessions"."id" <> $3');
    expect(query.sql).toContain('"workout_sessions"."completed_at" < $4');
    expect(query.sql).toContain('"workout_sets"."is_completed" = $5');
    expect(query.sql).toContain('"session_exercises"."exercise_id" in ($6)');
    expect(query.params).toEqual([
      'trusted', 'completed', id('999'), '2026-08-09T04:00:00.000Z', true, exerciseId,
    ]);
  });
});
