import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '../server/auth/require-user';
import { AuthenticationError } from '../server/auth/session';
import { AuthorizationError } from '../server/auth/ownership';
import { SplitMutationError } from '../server/splits/errors';
import {
  addSplitExerciseForUser,
  createSplitDayForUser,
  deleteSplitDayForUser,
  removeSplitExerciseForUser,
  renameSplitDayForUser,
  reorderSplitDaysForUser,
  reorderSplitExercisesForUser,
  updateSplitExerciseForUser,
} from '../server/splits/mutations';
import {
  addSplitExercise,
  createSplitDay,
  deleteSplitDay,
  removeSplitExercise,
  renameSplitDay,
  reorderSplitDays,
  reorderSplitExercises,
  updateSplitExercise,
} from './split';

vi.mock('server-only', () => ({}));

vi.mock('../server/auth/require-user', () => ({ requireUser: vi.fn() }));

vi.mock('../server/splits/mutations', () => ({
  addSplitExerciseForUser: vi.fn(),
  createSplitDayForUser: vi.fn(),
  deleteSplitDayForUser: vi.fn(),
  removeSplitExerciseForUser: vi.fn(),
  renameSplitDayForUser: vi.fn(),
  reorderSplitDaysForUser: vi.fn(),
  reorderSplitExercisesForUser: vi.fn(),
  updateSplitExerciseForUser: vi.fn(),
}));

const splitDayId = '00000000-0000-4000-8000-000000000001';
const splitExerciseId = '00000000-0000-4000-8000-000000000002';
const exerciseId = '00000000-0000-4000-8000-000000000003';
const authoritativeSplit = [{ id: splitDayId, name: 'Push', order: 0, exercises: [] }];

const authenticatedUser = {
  id: 'trusted-user',
  name: 'Trusted User',
  email: 'trusted@example.test',
};

describe('split Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue(authenticatedUser);
  });

  it.each([
    ['createSplitDay', createSplitDay, createSplitDayForUser, { name: 'Push' }],
    [
      'renameSplitDay',
      renameSplitDay,
      renameSplitDayForUser,
      { splitDayId, name: 'Push Day' },
    ],
    ['deleteSplitDay', deleteSplitDay, deleteSplitDayForUser, { splitDayId }],
    [
      'reorderSplitDays',
      reorderSplitDays,
      reorderSplitDaysForUser,
      { splitDayIds: [splitDayId] },
    ],
    [
      'addSplitExercise',
      addSplitExercise,
      addSplitExerciseForUser,
      {
        splitDayId,
        exerciseId,
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 12,
      },
    ],
    [
      'removeSplitExercise',
      removeSplitExercise,
      removeSplitExerciseForUser,
      { splitExerciseId },
    ],
    [
      'reorderSplitExercises',
      reorderSplitExercises,
      reorderSplitExercisesForUser,
      { splitDayId, splitExerciseIds: [splitExerciseId] },
    ],
    [
      'updateSplitExercise',
      updateSplitExercise,
      updateSplitExerciseForUser,
      {
        splitExerciseId,
        targetSets: 4,
        targetRepMin: 6,
        targetRepMax: 10,
        notes: 'Pause at the bottom',
      },
    ],
  ] as const)('%s resolves ownership from requireUser and returns mutation data', async (_name, action, mutation, input) => {
    vi.mocked(mutation).mockResolvedValue(authoritativeSplit);

    await expect((action as (value: unknown) => Promise<unknown>)(input)).resolves.toEqual({
      ok: true,
      data: authoritativeSplit,
    });
    expect(requireUser).toHaveBeenCalledOnce();
    expect(mutation).toHaveBeenCalledWith('trusted-user', input);
  });

  it('returns field-level validation errors without invoking a mutation', async () => {
    const result = await createSplitDay({ name: '   ' });

    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    if (!result.ok) {
      expect(result.fieldErrors?.name).toBeDefined();
      expect(result.message).toBe('Please correct the highlighted fields.');
    }
    expect(createSplitDayForUser).not.toHaveBeenCalled();
  });

  it('rejects a client-supplied userId instead of trusting it', async () => {
    const result = await createSplitDay({ name: 'Push', userId: 'other-user' } as never);

    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(createSplitDayForUser).not.toHaveBeenCalled();
  });

  it('returns the same enumeration-safe result for foreign and missing resources', async () => {
    vi.mocked(renameSplitDayForUser).mockRejectedValue(new AuthorizationError());

    await expect(renameSplitDay({ splitDayId, name: 'Push' })).resolves.toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'Resource not found.',
    });
  });

  it('converts missing sessions to a safe unauthenticated result', async () => {
    vi.mocked(requireUser).mockRejectedValue(new AuthenticationError());

    await expect(deleteSplitDay({ splitDayId })).resolves.toEqual({
      ok: false,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    });
    expect(deleteSplitDayForUser).not.toHaveBeenCalled();
  });

  it('returns a safe stale-order result without database details', async () => {
    vi.mocked(reorderSplitDaysForUser).mockRejectedValue(
      new SplitMutationError('STALE_ORDER', 'Split order changed. Refresh and try again.'),
    );

    await expect(reorderSplitDays({ splitDayIds: [splitDayId] })).resolves.toEqual({
      ok: false,
      code: 'STALE_ORDER',
      message: 'Split order changed. Refresh and try again.',
    });
  });

  it('does not leak unexpected database error details', async () => {
    vi.mocked(deleteSplitDayForUser).mockRejectedValue(
      new Error('password=secret host=private.example'),
    );

    await expect(deleteSplitDay({ splitDayId })).resolves.toEqual({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to update the split. Please try again.',
    });
  });
});
