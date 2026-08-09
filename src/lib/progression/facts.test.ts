import { describe, expect, it } from 'vitest';

import type { ExerciseHistory, ExerciseHistorySession } from '../../types';
import { deriveWorkoutFacts, estimateEpley1RM } from './facts';

const exercise = {
  id: 'exercise-1',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  equipment: 'Barbell',
  category: 'compound' as const,
};

function session(
  id: string,
  completedAt: string,
  sets: ExerciseHistorySession['sets'],
  overrides: Partial<ExerciseHistorySession> = {},
): ExerciseHistorySession {
  return {
    sessionId: id,
    sessionExerciseId: `${id}-exercise`,
    splitDayName: 'Push',
    startedAt: completedAt,
    completedAt,
    durationMinutes: 45,
    exerciseName: 'Bench Press snapshot',
    targetSets: 3,
    targetRepMin: 6,
    targetRepMax: 8,
    sets,
    ...overrides,
  };
}

function history(sessions: ExerciseHistorySession[]): ExerciseHistory {
  return { exercise, sessions };
}

describe('Epley estimated 1RM', () => {
  it.each([
    [null, 8],
    [0, 8],
    [-1, 8],
    [50, 0],
    [50, -1],
    [50, 1.5],
    [Number.NaN, 8],
    [50, Number.POSITIVE_INFINITY],
  ])('returns no estimate for invalid load/reps (%s, %s)', (weight, reps) => {
    expect(estimateEpley1RM(weight, reps)).toBeNull();
  });

  it('treats one rep as the observed load and rounds fractional estimates to one decimal', () => {
    expect(estimateEpley1RM(82.5, 1)).toBe(82.5);
    expect(estimateEpley1RM(82.5, 8)).toBe(104.5);
    expect(estimateEpley1RM(50, 10)).toBe(66.7);
  });
});

describe('normalized workout facts', () => {
  it('sorts completed history and sets, separates planned work from extra-set volume, and derives metrics', () => {
    const older = session('session-1', '2026-08-01T10:00:00.000Z', [
      { id: 'set-4', setNumber: 4, weight: 60, reps: 6 },
      { id: 'set-2', setNumber: 2, weight: 50, reps: 8 },
      { id: 'set-1', setNumber: 1, weight: 50, reps: 10 },
      { id: 'set-3', setNumber: 3, weight: 60, reps: 7 },
    ]);
    const newer = session('session-2', '2026-08-08T10:00:00.000Z', [
      { id: 'new-3', setNumber: 3, weight: 60, reps: 8 },
      { id: 'new-1', setNumber: 1, weight: 60, reps: 8 },
      { id: 'new-2', setNumber: 2, weight: 60, reps: 8 },
    ]);

    const result = deriveWorkoutFacts(history([newer, older]));

    expect(result.facts.map(({ sessionId }) => sessionId)).toEqual(['session-1', 'session-2']);
    expect(result.facts[0].completedSets.map(({ id }) => id)).toEqual(['set-1', 'set-2', 'set-3', 'set-4']);
    expect(result.facts[0].plannedSets.map(({ id }) => id)).toEqual(['set-1', 'set-2', 'set-3']);
    expect(result.facts[0].metrics).toEqual({
      plannedSetCount: 3,
      totalPlannedReps: 25,
      plannedVolumeKg: 1_320,
      fullSessionVolumeKg: 1_680,
      workingLoadKg: 50,
      maximumLoadKg: 60,
      maximumRepsByLoad: [
        { loadKg: 50, reps: 10 },
        { loadKg: 60, reps: 7 },
      ],
      bestEstimated1RMKg: 74,
    });
    expect(result.facts[0].deltaFromPrevious).toBeNull();
    expect(result.facts[1].deltaFromPrevious).toEqual({
      workingLoadKg: 10,
      totalPlannedReps: -1,
      plannedVolumeKg: 120,
      fullSessionVolumeKg: -240,
      bestEstimated1RMKg: 2,
    });
    expect(result.recentDirection).toEqual(result.facts[1].deltaFromPrevious);
  });

  it('breaks equally frequent planned-load ties toward the higher load', () => {
    const result = deriveWorkoutFacts(history([
      session('tie', '2026-08-01T10:00:00.000Z', [
        { id: 'set-2', setNumber: 2, weight: 52.5, reps: 8 },
        { id: 'set-1', setNumber: 1, weight: 50, reps: 8 },
        { id: 'set-3', setNumber: 3, weight: 45, reps: 20 },
      ], { targetSets: 2 }),
    ]));

    expect(result.facts[0].metrics.workingLoadKg).toBe(52.5);
    expect(result.facts[0].metrics.fullSessionVolumeKg).toBe(1_720);
  });

  it('keeps bodyweight reps comparable while leaving load-derived metrics unavailable', () => {
    const result = deriveWorkoutFacts(history([
      session('bodyweight', '2026-08-01T10:00:00.000Z', [
        { id: 'set-1', setNumber: 1, weight: null, reps: 12 },
        { id: 'set-2', setNumber: 2, weight: null, reps: 10 },
      ], { targetSets: 2, targetRepMin: 8, targetRepMax: 12 }),
    ]));

    expect(result.facts[0].metrics).toEqual({
      plannedSetCount: 2,
      totalPlannedReps: 22,
      plannedVolumeKg: 0,
      fullSessionVolumeKg: 0,
      workingLoadKg: null,
      maximumLoadKg: null,
      maximumRepsByLoad: [{ loadKg: null, reps: 12 }],
      bestEstimated1RMKg: null,
    });
  });

  it('uses the earliest and latest of the most recent four facts for direction', () => {
    const sessions = [40, 50, 60, 70, 80].map((weight, index) => session(
      `session-${index + 1}`,
      `2026-08-0${index + 1}T10:00:00.000Z`,
      [{ id: `set-${index + 1}`, setNumber: 1, weight, reps: 1 }],
      { targetSets: 1, targetRepMin: 1, targetRepMax: 1 },
    ));

    const result = deriveWorkoutFacts(history(sessions));

    expect(result.recentDirection).toEqual({
      workingLoadKg: 30,
      totalPlannedReps: 0,
      plannedVolumeKg: 30,
      fullSessionVolumeKg: 30,
      bestEstimated1RMKg: 30,
    });
  });

  it('preserves fractional load changes and normalizes decimal volume arithmetic', () => {
    const result = deriveWorkoutFacts(history([
      session('session-1', '2026-08-01T10:00:00.000Z', [
        { id: 'set-1', setNumber: 1, weight: 1.05, reps: 3 },
      ], { targetSets: 1 }),
      session('session-2', '2026-08-02T10:00:00.000Z', [
        { id: 'set-2', setNumber: 1, weight: 1, reps: 3 },
        { id: 'extra', setNumber: 2, weight: 0.1, reps: 3 },
      ], { targetSets: 1 }),
    ]));

    expect(result.facts[0].metrics.plannedVolumeKg).toBe(3.15);
    expect(result.facts[1].metrics.fullSessionVolumeKg).toBe(3.3);
    expect(result.facts[1].deltaFromPrevious).toEqual({
      workingLoadKg: -0.05,
      totalPlannedReps: 0,
      plannedVolumeKg: -0.15,
      fullSessionVolumeKg: 0.15,
      bestEstimated1RMKg: -0.1,
    });
  });

  it('is deterministic when input sessions and sets arrive in a different order', () => {
    const sessions = [
      session('session-b', '2026-08-02T10:00:00.000Z', [
        { id: 'b-2', setNumber: 2, weight: 60, reps: 7 },
        { id: 'b-1', setNumber: 1, weight: 60, reps: 8 },
      ], { targetSets: 2 }),
      session('session-a', '2026-08-01T10:00:00.000Z', [
        { id: 'a-2', setNumber: 2, weight: 50, reps: 8 },
        { id: 'a-1', setNumber: 1, weight: 50, reps: 9 },
      ], { targetSets: 2 }),
    ];
    const reordered = sessions
      .map((entry) => ({ ...entry, sets: [...entry.sets].reverse() }))
      .reverse();

    expect(deriveWorkoutFacts(history(reordered))).toEqual(deriveWorkoutFacts(history(sessions)));
  });
});
