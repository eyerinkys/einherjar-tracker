import { describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '../auth/ownership';
import { WorkoutMutationError } from './errors';
import { buildInitialDraftSets, requireExactWorkoutIds, requireWorkoutVersion } from './mutations';

vi.mock('server-only', () => ({}));

describe('workout mutation concurrency and ownership invariants', () => {
  it('accepts exact reordered stable IDs and the current version', () => {
    expect(() => requireExactWorkoutIds(['a', 'b'], ['b', 'a'])).not.toThrow();
    expect(() => requireWorkoutVersion(3, 3)).not.toThrow();
  });

  it('prefills draft slots by prior set number without collapsing incomplete-set gaps', () => {
    expect(buildInitialDraftSets(3, 10, [
      { setNumber: 2, weight: '82.500000000000000001', reps: 8 },
    ])).toEqual([
      { setNumber: 1, weight: null, reps: 10 },
      { setNumber: 2, weight: '82.500000000000000001', reps: 8 },
      { setNumber: 3, weight: null, reps: 10 },
    ]);
  });

  it('returns NOT_FOUND when a submitted ID is not owned', () => {
    expect(() => requireExactWorkoutIds(['a'], ['foreign'])).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }) as AuthorizationError,
    );
  });

  it('returns CONFLICT for incomplete owned drafts and stale versions', () => {
    expect(() => requireExactWorkoutIds(['a', 'b'], ['a'])).toThrow(
      expect.objectContaining({ code: 'CONFLICT' }) as WorkoutMutationError,
    );
    expect(() => requireWorkoutVersion(4, 3)).toThrow(
      expect.objectContaining({ code: 'CONFLICT' }) as WorkoutMutationError,
    );
  });
});
