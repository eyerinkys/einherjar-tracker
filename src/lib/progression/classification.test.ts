import { describe, expect, it } from 'vitest';

import type { ExerciseHistory, ExerciseHistorySession } from '../../types';
import { deriveWorkoutFacts } from './facts';
import { classifyProgression } from './classification';

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
}

function session(
  id: string,
  completedAt: string,
  reps: number[],
  options: SessionOptions = {},
): ExerciseHistorySession {
  const weights = options.weights ?? reps.map(() => 50);

  return {
    sessionId: id,
    sessionExerciseId: `${id}-exercise`,
    splitDayName: 'Push',
    startedAt: completedAt,
    completedAt,
    durationMinutes: 45,
    exerciseName: 'Bench Press snapshot',
    targetSets: options.targetSets ?? 3,
    targetRepMin: options.targetRepMin ?? 8,
    targetRepMax: options.targetRepMax ?? 10,
    sets: reps.map((setReps, index) => ({
      id: `${id}-set-${index + 1}`,
      setNumber: index + 1,
      weight: weights[index],
      reps: setReps,
    })),
  };
}

function facts(sessions: ExerciseHistorySession[]) {
  const history: ExerciseHistory = { exercise, sessions };
  return deriveWorkoutFacts(history);
}

describe('deterministic progression classification', () => {
  it.each([
    {
      status: 'INSUFFICIENT_DATA',
      sessions: [session('only', '2026-08-01T10:00:00.000Z', [8, 8, 8])],
    },
    {
      status: 'READY_TO_INCREASE_LOAD',
      sessions: [
        session('prior', '2026-08-01T10:00:00.000Z', [9, 9, 9]),
        session('latest', '2026-08-08T10:00:00.000Z', [10, 10, 10]),
      ],
    },
    {
      status: 'ADAPTING_TO_NEW_LOAD',
      sessions: [
        session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
        session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8], {
          weights: [55, 55, 55],
        }),
      ],
    },
    {
      status: 'REGRESSING',
      sessions: [
        session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
        session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8]),
      ],
    },
    {
      status: 'PROGRESSING',
      sessions: [
        session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
        session('latest', '2026-08-08T10:00:00.000Z', [9, 8, 8]),
      ],
    },
    {
      status: 'STALLED',
      sessions: [
        session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
        session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8]),
      ],
    },
  ] as const)('returns $status from objective session facts', ({ sessions, status }) => {
    expect(classifyProgression(facts([...sessions])).status).toBe(status);
  });

  it('returns current metrics, changes, rule evidence, and a deterministic explanation', () => {
    const input = facts([
      session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
      session('latest', '2026-08-08T10:00:00.000Z', [9, 8, 8]),
    ]);

    const result = classifyProgression(input);

    expect(result).toMatchObject({
      status: 'PROGRESSING',
      evidence: {
        sessionCount: 2,
        previousSessionId: 'prior',
        previousSessionExerciseId: 'prior-exercise',
        latestSessionId: 'latest',
        latestSessionExerciseId: 'latest-exercise',
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 10,
        completedPlannedSetCount: 3,
        previousWorkingLoadKg: 50,
        latestWorkingLoadKg: 50,
        previousMetrics: {
          plannedSetCount: 3,
          totalPlannedReps: 24,
          plannedVolumeKg: 1_200,
          bestEstimated1RMKg: 63.3,
        },
        latestMetrics: {
          plannedSetCount: 3,
          totalPlannedReps: 25,
          plannedVolumeKg: 1_250,
          bestEstimated1RMKg: 65,
        },
        changes: {
          workingLoadKg: 0,
          totalPlannedReps: 1,
          plannedVolumeKg: 50,
          bestEstimated1RMKg: 1.7,
        },
        plannedSetRequirementMet: true,
        allPlannedSetsAtWorkingLoad: true,
        allPlannedSetsMeetTargetMinimum: true,
        allPlannedSetsMeetTargetMaximum: false,
        workingLoadIncreased: false,
        comparableWorkingLoad: true,
        regressionReasons: [],
        improvements: [
          'PLANNED_REPS_AT_COMPARABLE_LOAD',
          'PLANNED_VOLUME',
          'ESTIMATED_1RM',
        ],
      },
    });
    expect(result.explanation).toBe(
      'Objective progress: planned reps +1, planned volume +50 kg, estimated 1RM +1.7 kg.',
    );
    expect(classifyProgression(input)).toEqual(result);
  });

  it('requires two distinct completed workout sessions even when one exercise occurs twice', () => {
    const firstOccurrence = session('workout', '2026-08-01T10:00:00.000Z', [8, 8, 8]);
    firstOccurrence.sessionExerciseId = 'workout-exercise-a';
    const secondOccurrence = session('workout', '2026-08-01T10:00:00.000Z', [10, 10, 10], {
      weights: [55, 55, 55],
    });
    secondOccurrence.sessionExerciseId = 'workout-exercise-b';

    const result = classifyProgression(facts([secondOccurrence, firstOccurrence]));

    expect(result).toMatchObject({
      status: 'INSUFFICIENT_DATA',
      evidence: {
        sessionCount: 1,
        latestSessionId: 'workout',
        latestSessionExerciseId: 'workout-exercise-b',
        latestWorkingLoadKg: 55,
      },
    });
  });

  it('returns accurate latest-session predicates for insufficient and empty histories', () => {
    const single = classifyProgression(facts([
      session('only', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
    ]));
    const empty = classifyProgression(facts([]));

    expect(single).toMatchObject({
      status: 'INSUFFICIENT_DATA',
      evidence: {
        sessionCount: 1,
        plannedSetRequirementMet: true,
        allPlannedSetsAtWorkingLoad: true,
        allPlannedSetsMeetTargetMinimum: true,
        allPlannedSetsMeetTargetMaximum: true,
      },
    });
    expect(empty).toMatchObject({
      status: 'INSUFFICIENT_DATA',
      evidence: {
        sessionCount: 0,
        latestSessionId: null,
        latestMetrics: null,
      },
    });
  });

  it('applies readiness before other improvements and ignores extra sets when checking the planned target', () => {
    const result = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [9, 9, 9], {
        weights: [45, 45, 45],
      }),
      session('latest', '2026-08-08T10:00:00.000Z', [10, 10, 10, 1], {
        weights: [50, 50, 50, 20],
      }),
    ]));

    expect(result.status).toBe('READY_TO_INCREASE_LOAD');
    expect(result.evidence.completedPlannedSetCount).toBe(3);
    expect(result.evidence.allPlannedSetsAtWorkingLoad).toBe(true);
    expect(result.explanation).toBe('All 3 planned sets reached the 10-rep target at 50 kg.');
  });

  it('does not treat mixed or missing planned sets as ready to increase', () => {
    const mixed = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
      session('latest', '2026-08-08T10:00:00.000Z', [10, 10, 10], {
        weights: [50, 50, 45],
      }),
    ]));
    const missing = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
      session('latest', '2026-08-08T10:00:00.000Z', [10, 10]),
    ]));

    expect(mixed.status).not.toBe('READY_TO_INCREASE_LOAD');
    expect(mixed.status).toBe('STALLED');
    expect(mixed.evidence.allPlannedSetsAtWorkingLoad).toBe(false);
    expect(missing.status).not.toBe('READY_TO_INCREASE_LOAD');
    expect(missing.status).toBe('STALLED');
    expect(missing.evidence.plannedSetRequirementMet).toBe(false);
  });

  it('classifies a below-minimum new load as regression unless estimated 1RM improves', () => {
    const regressing = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
      session('latest', '2026-08-08T10:00:00.000Z', [5, 5, 5], {
        weights: [55, 55, 55],
      }),
    ]));
    const progressing = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
      session('latest', '2026-08-08T10:00:00.000Z', [7, 7, 7], {
        weights: [60, 60, 60],
      }),
    ]));

    expect(regressing.status).toBe('REGRESSING');
    expect(regressing.evidence.regressionReasons).toEqual([
      'NEW_LOAD_BELOW_MINIMUM_WITHOUT_ESTIMATED_1RM_IMPROVEMENT',
    ]);
    expect(progressing.status).toBe('PROGRESSING');
    expect(progressing.evidence.regressionReasons).toEqual([]);
    expect(progressing.evidence.improvements).toContain('ESTIMATED_1RM');
  });

  it('treats unchanged estimated 1RM as no improvement at a below-minimum new load', () => {
    const result = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
      session('latest', '2026-08-08T10:00:00.000Z', [7, 7, 7], {
        weights: [54.05, 54.05, 54.05],
      }),
    ]));

    expect(result.evidence.changes?.bestEstimated1RMKg).toBe(0);
    expect(result.status).toBe('REGRESSING');
    expect(result.evidence.regressionReasons).toEqual([
      'NEW_LOAD_BELOW_MINIMUM_WITHOUT_ESTIMATED_1RM_IMPROVEMENT',
    ]);
  });

  it('detects regression after a lower load only when reps and estimated 1RM both decline', () => {
    const result = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10], {
        weights: [60, 60, 60],
      }),
      session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8]),
    ]));

    expect(result.status).toBe('REGRESSING');
    expect(result.evidence.regressionReasons).toEqual([
      'SAME_OR_LOWER_LOAD_REPS_AND_ESTIMATED_1RM_DECLINED',
    ]);
  });

  it('pins incomplete new-load adaptation and bodyweight rep progression', () => {
    const incompleteAdaptation = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [10, 10, 10]),
      session('latest', '2026-08-08T10:00:00.000Z', [8, 8], {
        weights: [55, 55],
      }),
    ]));
    const bodyweightProgress = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8], {
        weights: [null, null, null],
      }),
      session('latest', '2026-08-08T10:00:00.000Z', [9, 8, 8], {
        weights: [null, null, null],
      }),
    ]));

    expect(incompleteAdaptation).toMatchObject({
      status: 'ADAPTING_TO_NEW_LOAD',
      evidence: {
        plannedSetRequirementMet: false,
        allPlannedSetsMeetTargetMinimum: true,
      },
    });
    expect(bodyweightProgress).toMatchObject({
      status: 'PROGRESSING',
      evidence: {
        comparableWorkingLoad: true,
        improvements: ['PLANNED_REPS_AT_COMPARABLE_LOAD'],
      },
    });
  });

  it('does not describe weighted-to-bodyweight sessions as load-comparable', () => {
    const result = classifyProgression(facts([
      session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8]),
      session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8], {
        weights: [null, null, null],
      }),
    ]));

    expect(result).toMatchObject({
      status: 'STALLED',
      evidence: { comparableWorkingLoad: false },
      explanation: 'No qualifying objective improvement or regression was recorded across the latest two completed sessions.',
    });
  });

  it('uses the latest historical targets and remains deterministic for reordered input facts', () => {
    const input = facts([
      session('latest', '2026-08-08T10:00:00.000Z', [8, 8, 8], {
        targetRepMin: 6,
        targetRepMax: 8,
      }),
      session('prior', '2026-08-01T10:00:00.000Z', [8, 8, 8], {
        targetRepMin: 8,
        targetRepMax: 10,
      }),
    ]);
    const reordered = { ...input, facts: [...input.facts].reverse() };

    expect(classifyProgression(reordered)).toEqual(classifyProgression(input));
    expect(classifyProgression(input)).toMatchObject({
      status: 'READY_TO_INCREASE_LOAD',
      evidence: { targetRepMin: 6, targetRepMax: 8 },
    });
  });
});
