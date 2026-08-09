import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '../server/auth/require-user';
import { AuthorizationError } from '../server/auth/ownership';
import {
  getCompletedSession,
  getCompletedSessionHistory,
  getExerciseHistory,
} from '../server/queries/history';
import {
  getCompletedWorkoutHistory,
  getExerciseWorkoutHistory,
  getWorkoutSessionHistory,
} from './history';

vi.mock('server-only', () => ({}));
vi.mock('../server/auth/require-user', () => ({ requireUser: vi.fn() }));
vi.mock('../server/queries/history', () => ({
  getCompletedSession: vi.fn(),
  getCompletedSessionHistory: vi.fn(),
  getExerciseHistory: vi.fn(),
}));

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const page = { sessions: [], nextCursor: null };
const completed = {
  id: id('1'), sourceSplitDayId: null, splitDayName: 'Push',
  startedAt: '2026-08-09T03:00:00.000Z', completedAt: '2026-08-09T04:00:00.000Z',
  durationMinutes: 60, exercises: [],
};
const exerciseHistory = {
  exercise: {
    id: id('2'), name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell',
    category: 'compound' as const, isCustom: false,
  },
  sessions: [],
};

describe('history Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: 'trusted', name: 'Trusted', email: 'trusted@example.test' });
  });

  it('authenticates and passes only validated inputs plus trusted ownership to reads', async () => {
    vi.mocked(getCompletedSessionHistory).mockResolvedValue(page);
    vi.mocked(getCompletedSession).mockResolvedValue(completed);
    vi.mocked(getExerciseHistory).mockResolvedValue(exerciseHistory);

    await expect(getCompletedWorkoutHistory({ pageSize: 200 })).resolves.toEqual({ ok: true, data: page });
    expect(getCompletedSessionHistory).toHaveBeenCalledWith('trusted', { pageSize: 50 });

    await expect(getWorkoutSessionHistory({ sessionId: id('1') })).resolves.toEqual({ ok: true, data: completed });
    expect(getCompletedSession).toHaveBeenCalledWith('trusted', id('1'));

    await expect(getExerciseWorkoutHistory({ exerciseId: id('2') })).resolves.toEqual({ ok: true, data: exerciseHistory });
    expect(getExerciseHistory).toHaveBeenCalledWith('trusted', id('2'));
  });

  it.each([
    [getCompletedWorkoutHistory, { cursor: 'not-valid!' }],
    [getCompletedWorkoutHistory, { userId: 'foreign' }],
    [getWorkoutSessionHistory, { sessionId: 'bad' }],
    [getExerciseWorkoutHistory, { exerciseId: id('2'), userId: 'foreign' }],
  ] as const)('returns safe validation errors without invoking a read', async (action, input) => {
    await expect((action as (value: never) => Promise<unknown>)(input as never)).resolves.toMatchObject({
      ok: false, code: 'VALIDATION_ERROR', message: 'Please correct the history request.',
    });
    expect(getCompletedSessionHistory).not.toHaveBeenCalled();
    expect(getCompletedSession).not.toHaveBeenCalled();
    expect(getExerciseHistory).not.toHaveBeenCalled();
  });

  it('preserves enumeration-safe NOT_FOUND failures', async () => {
    vi.mocked(getCompletedSession).mockRejectedValue(new AuthorizationError());
    await expect(getWorkoutSessionHistory({ sessionId: id('1') })).resolves.toEqual({
      ok: false, code: 'NOT_FOUND', message: 'Resource not found.',
    });
  });

  it('redacts unexpected database and decoder details', async () => {
    vi.mocked(getCompletedSessionHistory).mockRejectedValue(new Error('password=secret host=private'));
    await expect(getCompletedWorkoutHistory({})).resolves.toEqual({
      ok: false, code: 'INTERNAL_ERROR', message: 'Unable to load workout history. Please try again.',
    });
  });
});
