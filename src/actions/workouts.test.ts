import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '../server/auth/require-user';
import { AuthorizationError } from '../server/auth/ownership';
import { WorkoutMutationError } from '../server/workouts/errors';
import {
  completeWorkoutForUser,
  discardWorkoutForUser,
  saveWorkoutDraftForUser,
  startWorkoutForUser,
} from '../server/workouts/mutations';
import { completeWorkout, discardWorkout, saveWorkoutDraft, startWorkout } from './workouts';

vi.mock('server-only', () => ({}));
vi.mock('../server/auth/require-user', () => ({ requireUser: vi.fn() }));
vi.mock('../server/workouts/mutations', () => ({
  completeWorkoutForUser: vi.fn(), discardWorkoutForUser: vi.fn(),
  saveWorkoutDraftForUser: vi.fn(), startWorkoutForUser: vi.fn(),
}));

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const workout = { id: id('1'), sourceSplitDayId: id('2'), splitDayName: 'Push', startedAt: '2026-08-09T03:00:00.000Z', version: 1, notes: '', exercises: [] };
const completion = { id: id('1'), completedAt: '2026-08-09T04:00:00.000Z', durationMinutes: 60 };
const draft = { workoutSessionId: id('1'), version: 1, notes: '', exercises: [{ sessionExerciseId: id('2'), sets: [{ id: id('3'), weight: 50, reps: 8, isCompleted: true }] }] };

describe('workout Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({ id: 'trusted', name: 'Trusted', email: 'trusted@example.test' });
  });

  it.each([
    [startWorkout, startWorkoutForUser, { splitDayId: id('2') }, workout],
    [saveWorkoutDraft, saveWorkoutDraftForUser, draft, workout],
    [completeWorkout, completeWorkoutForUser, draft, completion],
    [discardWorkout, discardWorkoutForUser, { workoutSessionId: id('1'), version: 1 }, null],
  ] as const)('authenticates and returns authoritative mutation data', async (action, mutation, input, data) => {
    vi.mocked(mutation).mockResolvedValue(data as never);
    await expect((action as (input: never) => Promise<unknown>)(input as never)).resolves.toEqual({ ok: true, data });
    expect(mutation).toHaveBeenCalledWith('trusted', input);
  });

  it('rejects forged ownership input before mutation', async () => {
    const result = await startWorkout({ splitDayId: id('2'), userId: 'foreign' } as never);
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(startWorkoutForUser).not.toHaveBeenCalled();
  });

  it('maps foreign resources and stale versions to safe errors', async () => {
    vi.mocked(discardWorkoutForUser).mockRejectedValueOnce(new AuthorizationError());
    await expect(discardWorkout({ workoutSessionId: id('1'), version: 1 })).resolves.toMatchObject({ ok: false, code: 'NOT_FOUND' });
    vi.mocked(saveWorkoutDraftForUser).mockRejectedValueOnce(new WorkoutMutationError('CONFLICT', 'Workout changed in another tab. Reload and try again.'));
    await expect(saveWorkoutDraft(draft)).resolves.toMatchObject({ ok: false, code: 'CONFLICT' });
  });

  it('redacts unexpected database details', async () => {
    vi.mocked(startWorkoutForUser).mockRejectedValue(new Error('password=secret host=private'));
    await expect(startWorkout({ splitDayId: id('2') })).resolves.toEqual({ ok: false, code: 'INTERNAL_ERROR', message: 'Unable to update the workout. Please try again.' });
  });
});
