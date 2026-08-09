import { describe, expect, it, vi } from 'vitest';
import { mapActiveWorkoutRows, type ActiveWorkoutQueryRow } from './workouts';

vi.mock('server-only', () => ({}));

const rows: ActiveWorkoutQueryRow[] = [
  {
    workoutSessionId: 'session-1', sourceSplitDayId: 'day-1', splitDayName: 'Push',
    startedAt: new Date('2026-08-09T03:00:00.000Z'), notes: null, version: 3,
    sessionExerciseId: 'session-exercise-1', exerciseId: 'exercise-1', exerciseName: 'Bench Press',
    exerciseSortOrder: 0, targetSets: 2, targetRepMin: 8, targetRepMax: 10, exerciseNotes: 'Pause',
    setId: 'set-1', setNumber: 1, weight: '82.50', reps: 8, isCompleted: true,
  },
  {
    workoutSessionId: 'session-1', sourceSplitDayId: 'day-1', splitDayName: 'Push',
    startedAt: new Date('2026-08-09T03:00:00.000Z'), notes: null, version: 3,
    sessionExerciseId: 'session-exercise-1', exerciseId: 'exercise-1', exerciseName: 'Bench Press',
    exerciseSortOrder: 0, targetSets: 2, targetRepMin: 8, targetRepMax: 10, exerciseNotes: 'Pause',
    setId: 'set-2', setNumber: 2, weight: null, reps: null, isCompleted: false,
  },
];

describe('active workout mapping', () => {
  it('maps exact database values to a serializable ordered DTO without storage fields', () => {
    expect(mapActiveWorkoutRows(rows)).toEqual({
      id: 'session-1', sourceSplitDayId: 'day-1', splitDayName: 'Push',
      startedAt: '2026-08-09T03:00:00.000Z', version: 3, notes: '',
      exercises: [{
        id: 'session-exercise-1', exerciseId: 'exercise-1', exerciseName: 'Bench Press',
        targetSets: 2, targetRepMin: 8, targetRepMax: 10, notes: 'Pause',
        previousPerformance: [],
        sets: [
          { id: 'set-1', setNumber: 1, weight: 82.5, reps: 8, isCompleted: true },
          { id: 'set-2', setNumber: 2, weight: null, reps: null, isCompleted: false },
        ],
      }],
    });
  });

  it('returns null for no active workout rows', () => {
    expect(mapActiveWorkoutRows([])).toBeNull();
  });

  it('hydrates previous performance selected by the shared exercise-history contract', () => {
    const previous = new Map([['exercise-1', [
      { setNumber: 1, weight: 80, reps: 10 },
      { setNumber: 2, weight: 80, reps: 9 },
    ]]]);

    expect(mapActiveWorkoutRows(rows, previous)?.exercises[0].previousPerformance).toEqual([
      { setNumber: 1, weight: 80, reps: 10 },
      { setNumber: 2, weight: 80, reps: 9 },
    ]);
  });
});
