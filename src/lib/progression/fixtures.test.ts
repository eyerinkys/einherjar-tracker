import { describe, expect, it } from 'vitest';

import type { ExerciseHistory, ExerciseHistorySession } from '../../types';
import { classifyProgression } from './classification';
import { deriveWorkoutFacts } from './facts';
import { derivePersonalRecords } from './records';

const exercise = {
  id: 'exercise-1',
  name: 'Bench Press',
  muscleGroup: 'Chest',
  equipment: 'Barbell',
  category: 'compound' as const,
};

interface SessionOptions {
  weights?: Array<number | null>;
  targetSets?: number;
  targetRepMin?: number;
  targetRepMax?: number;
  extraSets?: Array<{ weight: number | null; reps: number }>;
  sessionExerciseId?: string;
}

function session(
  id: string,
  completedAt: string,
  reps: number[],
  options: SessionOptions = {},
): ExerciseHistorySession {
  const weights = options.weights ?? reps.map(() => 50);
  const plannedSets = reps.map((setReps, index) => ({
    id: `${id}-set-${index + 1}`,
    setNumber: index + 1,
    weight: weights[index],
    reps: setReps,
  }));
  const extraSets = (options.extraSets ?? []).map((set, index) => ({
    id: `${id}-extra-${index + 1}`,
    setNumber: reps.length + index + 1,
    ...set,
  }));

  return {
    sessionId: id,
    sessionExerciseId: options.sessionExerciseId ?? `${id}-exercise`,
    splitDayName: 'Push',
    startedAt: completedAt,
    completedAt,
    durationMinutes: 45,
    exerciseName: 'Bench Press snapshot',
    targetSets: options.targetSets ?? 3,
    targetRepMin: options.targetRepMin ?? 8,
    targetRepMax: options.targetRepMax ?? 10,
    sets: [...plannedSets, ...extraSets],
  };
}

function history(sessions: ExerciseHistorySession[]): ExerciseHistory {
  return { exercise, sessions };
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length < 2) return [[...values]];

  return values.flatMap((value, index) => permutations([
    ...values.slice(0, index),
    ...values.slice(index + 1),
  ]).map((rest) => [value, ...rest]));
}

describe('progression status precedence fixtures', () => {
  it.each([
    {
      name: 'readiness wins when a higher load also improves every objective metric',
      prior: session('prior', '2026-08-01T10:00:00.000Z', [9, 9, 9], {
        weights: [45, 45, 45],
      }),
      latest: session('latest', '2026-08-08T10:00:00.000Z', [10, 10, 10], {
        weights: [50, 50, 50],
      }),
      status: 'READY_TO_INCREASE_LOAD',
      regressionReasons: [],
      improvements: ['WORKING_LOAD', 'PLANNED_VOLUME', 'ESTIMATED_1RM'],
    },
    {
      name: 'readiness wins over regression evidence after the current rep target decreases',
      prior: session('prior', '2026-08-01T10:00:00.000Z', [12, 12, 12]),
      latest: session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8], {
        targetRepMin: 6,
        targetRepMax: 8,
      }),
      status: 'READY_TO_INCREASE_LOAD',
      regressionReasons: ['SAME_OR_LOWER_LOAD_REPS_AND_ESTIMATED_1RM_DECLINED'],
      improvements: [],
    },
    {
      name: 'adaptation wins when a new load meets the exact minimum and improves e1RM',
      prior: session('prior', '2026-08-01T10:00:00.000Z', [9, 9, 9]),
      latest: session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8], {
        weights: [55, 55, 55],
      }),
      status: 'ADAPTING_TO_NEW_LOAD',
      regressionReasons: [],
      improvements: ['WORKING_LOAD', 'ESTIMATED_1RM'],
    },
    {
      name: 'regression wins when a new load improves volume but misses the minimum without e1RM gain',
      prior: session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
      latest: session('latest', '2026-08-08T10:00:00.000Z', [7, 7, 7], {
        weights: [54, 54, 54],
      }),
      status: 'REGRESSING',
      regressionReasons: ['NEW_LOAD_BELOW_MINIMUM_WITHOUT_ESTIMATED_1RM_IMPROVEMENT'],
      improvements: ['WORKING_LOAD'],
    },
    {
      name: 'progress remains when reps decline but the best set and e1RM improve at the same load',
      prior: session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8], {
        targetRepMin: 6,
      }),
      latest: session('latest', '2026-08-08T10:00:00.000Z', [9, 7, 7], {
        targetRepMin: 6,
      }),
      status: 'PROGRESSING',
      regressionReasons: [],
      improvements: ['ESTIMATED_1RM'],
    },
    {
      name: 'stall remains when more reps at a lower load produce no qualifying improvement',
      prior: session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8], {
        weights: [60, 60, 60],
        targetRepMin: 6,
      }),
      latest: session('latest', '2026-08-08T10:00:00.000Z', [9, 9, 9], {
        weights: [50, 50, 50],
        targetRepMin: 6,
      }),
      status: 'STALLED',
      regressionReasons: [],
      improvements: [],
    },
  ] as const)('$name', ({ prior, latest, status, regressionReasons, improvements }) => {
    const result = classifyProgression(deriveWorkoutFacts(history([latest, prior])));

    expect(result.status).toBe(status);
    expect(result.evidence.regressionReasons).toEqual(regressionReasons);
    expect(result.evidence.improvements).toEqual(improvements);
  });
});

describe('planned-set and regression boundaries', () => {
  it.each([
    {
      name: 'all planned sets exactly at the maximum are ready',
      reps: [10, 10, 10],
      weights: [50, 50, 50],
      expected: 'READY_TO_INCREASE_LOAD',
    },
    {
      name: 'one planned set below the maximum is not ready',
      reps: [10, 10, 9],
      weights: [50, 50, 50],
      expected: 'PROGRESSING',
    },
    {
      name: 'mixed planned loads are not ready despite reaching the rep maximum',
      reps: [10, 10, 10],
      weights: [50, 50, 45],
      expected: 'PROGRESSING',
    },
    {
      name: 'a missing planned set is not ready despite every recorded set reaching the maximum',
      reps: [10, 10],
      weights: [50, 50],
      expected: 'PROGRESSING',
    },
  ] as const)('$name', ({ reps, weights, expected }) => {
    const result = classifyProgression(deriveWorkoutFacts(history([
      session('prior', '2026-08-01T10:00:00.000Z', [9, 9, 9]),
      session('latest', '2026-08-08T10:00:00.000Z', [...reps], {
        weights: [...weights],
      }),
    ])));

    expect(result.status).toBe(expected);
  });

  it.each([
    {
      name: 'both planned reps and estimated 1RM decline',
      priorReps: [8, 8, 8],
      reps: [7, 7, 7],
      expected: 'REGRESSING',
      reasonCount: 1,
    },
    {
      name: 'only planned reps decline while estimated 1RM improves',
      priorReps: [8, 8, 8],
      reps: [9, 6, 6],
      expected: 'PROGRESSING',
      reasonCount: 0,
    },
    {
      name: 'only estimated 1RM declines while total planned reps stay equal',
      priorReps: [10, 7, 7],
      reps: [8, 8, 8],
      expected: 'STALLED',
      reasonCount: 0,
    },
  ] as const)('requires the conjunctive same-load regression rule when $name', ({
    priorReps,
    reps,
    expected,
    reasonCount,
  }) => {
    const result = classifyProgression(deriveWorkoutFacts(history([
      session('prior', '2026-08-01T10:00:00.000Z', [...priorReps], {
        targetRepMin: 6,
      }),
      session('latest', '2026-08-08T10:00:00.000Z', [...reps], {
        targetRepMin: 6,
      }),
    ])));

    expect(result.status).toBe(expected);
    expect(result.evidence.regressionReasons).toHaveLength(reasonCount);
  });
});

describe('cross-layer progression fixtures', () => {
  it('lets an extra set create only a volume PR without changing planned readiness evidence', () => {
    const input = history([
      session('prior', '2026-08-01T10:00:00.000Z', [9, 9, 9]),
      session('latest', '2026-08-08T10:00:00.000Z', [9, 9, 9], {
        extraSets: [{ weight: 50, reps: 4 }],
      }),
    ]);

    const facts = deriveWorkoutFacts(input);
    const records = derivePersonalRecords(facts);
    const analysis = classifyProgression(facts);

    expect(facts.facts[1].metrics).toMatchObject({
      plannedSetCount: 3,
      plannedVolumeKg: 1_350,
      fullSessionVolumeKg: 1_550,
    });
    expect(records.achievements.filter(({ sessionId }) => sessionId === 'latest')).toEqual([
      expect.objectContaining({
        type: 'SESSION_VOLUME',
        volumeKg: 1_550,
        previousBestVolumeKg: 1_350,
      }),
    ]);
    expect(analysis).toMatchObject({
      status: 'STALLED',
      evidence: {
        completedPlannedSetCount: 3,
        allPlannedSetsMeetTargetMaximum: false,
        improvements: [],
      },
    });
  });

  it('does not emit equal-value PR achievements and orders same-time improvements by stable identity', () => {
    const result = derivePersonalRecords(deriveWorkoutFacts(history([
      session('session-b', '2026-08-01T10:00:00.000Z', [9, 9, 9]),
      session('session-equal', '2026-08-02T10:00:00.000Z', [9, 9, 9]),
      session('session-a', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
    ])));

    expect(result.achievements.filter(({ sessionId }) => sessionId === 'session-equal')).toEqual([]);
    expect(result.current.repsAtLoad).toEqual([
      expect.objectContaining({
        sessionId: 'session-b',
        loadKg: 50,
        reps: 9,
        previousBestReps: 8,
      }),
    ]);
    expect(result.current.sessionVolume).toMatchObject({
      sessionId: 'session-b',
      volumeKg: 1_350,
      previousBestVolumeKg: 1_200,
    });
  });

  it('recalculates facts, records, and status after corrected history without retaining stale output', () => {
    const originalHistory = history([
      session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
      session('latest', '2026-08-08T10:00:00.000Z', [10, 10, 10]),
    ]);
    const originalFacts = deriveWorkoutFacts(originalHistory);
    const originalRecords = derivePersonalRecords(originalFacts);
    const originalAnalysis = classifyProgression(originalFacts);
    const correctedHistory = history([
      originalHistory.sessions[0],
      session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8]),
    ]);

    const correctedFacts = deriveWorkoutFacts(correctedHistory);
    const correctedRecords = derivePersonalRecords(correctedFacts);
    const correctedAnalysis = classifyProgression(correctedFacts);

    expect(originalAnalysis.status).toBe('READY_TO_INCREASE_LOAD');
    expect(correctedAnalysis.status).toBe('STALLED');
    expect(originalRecords.current.repsAtLoad[0]).toMatchObject({ reps: 10 });
    expect(correctedRecords.current.repsAtLoad[0]).toMatchObject({ reps: 8 });
    expect(originalFacts.facts[1].metrics.totalPlannedReps).toBe(30);
    expect(correctedFacts.facts[1].metrics.totalPlannedReps).toBe(24);
  });

  it('produces identical outputs for every session order and leaves nested input arrays unchanged', () => {
    const sessions = [
      session('session-c', '2026-08-03T10:00:00.000Z', [10, 9, 8], {
        weights: [55, 55, 55],
      }),
      session('session-a', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
      session('session-b', '2026-08-02T10:00:00.000Z', [9, 8, 8], {
        extraSets: [{ weight: 40, reps: 12 }],
      }),
    ];
    sessions.forEach((entry) => entry.sets.reverse());
    const originalInput = structuredClone(history(sessions));
    const expectedFacts = deriveWorkoutFacts(originalInput);
    const expectedRecords = derivePersonalRecords(expectedFacts);
    const expectedAnalysis = classifyProgression(expectedFacts);

    for (const orderedSessions of permutations(sessions)) {
      const input = history(orderedSessions);
      const before = structuredClone(input);
      const facts = deriveWorkoutFacts(input);
      const beforeDownstreamDerivations = structuredClone(facts);
      const records = derivePersonalRecords(facts);

      expect(facts).toEqual(beforeDownstreamDerivations);
      const analysis = classifyProgression(facts);

      expect(facts).toEqual(expectedFacts);
      expect(records).toEqual(expectedRecords);
      expect(analysis).toEqual(expectedAnalysis);
      expect(facts).toEqual(beforeDownstreamDerivations);
      expect(input).toEqual(before);
    }
  });
});
