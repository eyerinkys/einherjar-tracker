import { describe, expect, it } from 'vitest';

import type { ExerciseHistory, ExerciseHistorySession } from '../../types';
import { deriveWorkoutFacts } from './facts';
import { derivePersonalRecords } from './records';

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
  weight: number | null,
  reps: number,
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
    targetRepMax: 10,
    sets: [1, 2, 3].map((setNumber) => ({
      id: `${id}-set-${setNumber}`,
      setNumber,
      weight,
      reps,
    })),
  };
}

function facts(sessions: ExerciseHistorySession[]) {
  const history: ExerciseHistory = { exercise, sessions };
  return deriveWorkoutFacts(history);
}

describe('personal record derivation', () => {
  it('derives the four record types chronologically without future leakage', () => {
    const first = session('session-1', '2026-08-01T10:00:00.000Z', 50, 8);
    const second = session('session-2', '2026-08-08T10:00:00.000Z', 50, 10);
    const future = session('session-3', '2026-08-15T10:00:00.000Z', 60, 6);

    const prefix = derivePersonalRecords(facts([second, first]));
    const result = derivePersonalRecords(facts([future, second, first]));

    expect(result.achievements.filter(({ sessionId }) => sessionId !== 'session-3')).toEqual(
      prefix.achievements,
    );
    expect(result.achievements.map(({ type, sessionId }) => [type, sessionId])).toEqual([
      ['HIGHEST_LOAD', 'session-1'],
      ['REPS_AT_LOAD', 'session-1'],
      ['ESTIMATED_1RM', 'session-1'],
      ['SESSION_VOLUME', 'session-1'],
      ['REPS_AT_LOAD', 'session-2'],
      ['ESTIMATED_1RM', 'session-2'],
      ['SESSION_VOLUME', 'session-2'],
      ['HIGHEST_LOAD', 'session-3'],
      ['REPS_AT_LOAD', 'session-3'],
      ['ESTIMATED_1RM', 'session-3'],
    ]);
    expect(result.current.highestLoad).toMatchObject({
      sessionId: 'session-3',
      loadKg: 60,
      previousBestKg: 50,
    });
    expect(result.current.repsAtLoad).toEqual([
      expect.objectContaining({ loadKg: 50, reps: 10, previousBestReps: 8 }),
      expect.objectContaining({ loadKg: 60, reps: 6, previousBestReps: null }),
    ]);
    expect(result.current.estimated1RM).toMatchObject({
      sessionId: 'session-3',
      estimated1RMKg: 72,
      previousBestEstimated1RMKg: 66.7,
    });
    expect(result.current.sessionVolume).toMatchObject({
      sessionId: 'session-2',
      volumeKg: 1_500,
      previousBestVolumeKg: 1_200,
    });
  });

  it('lets extra completed sets establish only a full-session volume record when other maxima are unchanged', () => {
    const first = session('session-1', '2026-08-01T10:00:00.000Z', 50, 8);
    const second = session('session-2', '2026-08-08T10:00:00.000Z', 50, 8);
    second.sets.push({ id: 'session-2-extra', setNumber: 4, weight: 50, reps: 1 });

    const input = facts([second, first]);
    const result = derivePersonalRecords(input);

    expect(input.facts[1].metrics.plannedVolumeKg).toBe(input.facts[0].metrics.plannedVolumeKg);
    expect(result.achievements.filter(({ sessionId }) => sessionId === 'session-2')).toEqual([
      expect.objectContaining({
        type: 'SESSION_VOLUME',
        volumeKg: 1_250,
        previousBestVolumeKg: 1_200,
      }),
    ]);
  });

  it('tracks bodyweight reps at the null load without fabricating load, estimate, or volume records', () => {
    const result = derivePersonalRecords(facts([
      session('session-2', '2026-08-08T10:00:00.000Z', null, 10),
      session('session-1', '2026-08-01T10:00:00.000Z', null, 8),
    ]));

    expect(result.achievements).toEqual([
      expect.objectContaining({
        type: 'REPS_AT_LOAD',
        sessionId: 'session-1',
        loadKg: null,
        reps: 8,
        previousBestReps: null,
      }),
      expect.objectContaining({
        type: 'REPS_AT_LOAD',
        sessionId: 'session-2',
        loadKg: null,
        reps: 10,
        previousBestReps: 8,
      }),
    ]);
    expect(result.current.highestLoad).toBeNull();
    expect(result.current.estimated1RM).toBeNull();
    expect(result.current.sessionVolume).toBeNull();
  });

  it('recalculates corrected history without mutating earlier output and stays deterministic for reordered facts', () => {
    const first = session('session-1', '2026-08-01T10:00:00.000Z', 50, 8);
    const unchanged = session('session-2', '2026-08-08T10:00:00.000Z', 50, 8);
    const originalFacts = facts([unchanged, first]);
    const original = derivePersonalRecords(originalFacts);
    const corrected = session('session-2', '2026-08-08T10:00:00.000Z', 50, 9);
    const correctedFacts = facts([corrected, first]);

    const recalculated = derivePersonalRecords(correctedFacts);
    const reordered = derivePersonalRecords({
      ...correctedFacts,
      facts: [...correctedFacts.facts].reverse(),
    });

    expect(original.achievements).toHaveLength(4);
    expect(recalculated.achievements.filter(({ sessionId }) => sessionId === 'session-2'))
      .toEqual([
        expect.objectContaining({ type: 'REPS_AT_LOAD', reps: 9, previousBestReps: 8 }),
        expect.objectContaining({
          type: 'ESTIMATED_1RM',
          estimated1RMKg: 65,
          previousBestEstimated1RMKg: 63.3,
        }),
        expect.objectContaining({
          type: 'SESSION_VOLUME',
          volumeKg: 1_350,
          previousBestVolumeKg: 1_200,
        }),
      ]);
    expect(reordered).toEqual(recalculated);
    expect(original.achievements).toHaveLength(4);
  });
});
