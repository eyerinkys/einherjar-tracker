import type {
  DerivedProgressionAnalysis,
  DerivedWorkoutFacts,
  ProgressionEvidence,
  ProgressionImprovement,
  ProgressionRegressionReason,
  ProgressionStatus,
  WorkoutFact,
  WorkoutFactMetrics,
  WorkoutMetricChanges,
} from '../../types/progression';

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareFacts(left: WorkoutFact, right: WorkoutFact): number {
  return compareText(left.completedAt, right.completedAt)
    || compareText(left.sessionId, right.sessionId)
    || compareText(left.sessionExerciseId, right.sessionExerciseId);
}

function normalizeCalculatedNumber(value: number): number {
  return value === 0 ? 0 : Number.parseFloat(value.toPrecision(15));
}

function roundedEstimatedChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous + Number.EPSILON) * 10) / 10;
}

function metricChanges(current: WorkoutFactMetrics, previous: WorkoutFactMetrics): WorkoutMetricChanges {
  return {
    workingLoadKg: current.workingLoadKg === null || previous.workingLoadKg === null
      ? null
      : normalizeCalculatedNumber(current.workingLoadKg - previous.workingLoadKg),
    totalPlannedReps: current.totalPlannedReps - previous.totalPlannedReps,
    plannedVolumeKg: normalizeCalculatedNumber(current.plannedVolumeKg - previous.plannedVolumeKg),
    fullSessionVolumeKg: normalizeCalculatedNumber(
      current.fullSessionVolumeKg - previous.fullSessionVolumeKg,
    ),
    bestEstimated1RMKg: roundedEstimatedChange(
      current.bestEstimated1RMKg,
      previous.bestEstimated1RMKg,
    ),
  };
}

function copyMetrics(metrics: WorkoutFactMetrics): WorkoutFactMetrics {
  return {
    ...metrics,
    maximumRepsByLoad: metrics.maximumRepsByLoad.map((entry) => ({ ...entry })),
  };
}

function distinctSessionFacts(facts: readonly WorkoutFact[]): WorkoutFact[] {
  const selectedBySession = new Map<string, WorkoutFact>();
  for (const fact of [...facts].sort(compareFacts)) {
    // The stable later occurrence represents an exercise repeated within one workout.
    selectedBySession.set(fact.sessionId, fact);
  }
  return [...selectedBySession.values()].sort(compareFacts);
}

function plannedSetPredicates(fact: WorkoutFact | null) {
  if (fact === null || fact.plannedSets.length === 0) {
    return {
      plannedSetRequirementMet: false,
      allPlannedSetsAtWorkingLoad: false,
      allPlannedSetsMeetTargetMinimum: false,
      allPlannedSetsMeetTargetMaximum: false,
    };
  }

  return {
    plannedSetRequirementMet: fact.metrics.plannedSetCount >= fact.targetSets,
    allPlannedSetsAtWorkingLoad: fact.plannedSets.every(
      ({ weightKg }) => weightKg === fact.metrics.workingLoadKg,
    ),
    allPlannedSetsMeetTargetMinimum: fact.plannedSets.every(
      ({ reps }) => reps >= fact.targetRepMin,
    ),
    allPlannedSetsMeetTargetMaximum: fact.plannedSets.every(
      ({ reps }) => reps >= fact.targetRepMax,
    ),
  };
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}

function loadLabel(loadKg: number | null): string {
  return loadKg === null ? 'bodyweight' : `${loadKg} kg`;
}

function explanationFor(
  status: ProgressionStatus,
  evidence: ProgressionEvidence,
): string {
  const changes = evidence.changes;

  switch (status) {
    case 'INSUFFICIENT_DATA':
      return `At least two completed sessions are required; found ${evidence.sessionCount}.`;
    case 'READY_TO_INCREASE_LOAD':
      return `All ${evidence.targetSets} planned sets reached the ${evidence.targetRepMax}-rep target at ${loadLabel(evidence.latestWorkingLoadKg)}.`;
    case 'ADAPTING_TO_NEW_LOAD':
      return `Working load increased from ${loadLabel(evidence.previousWorkingLoadKg)} to ${loadLabel(evidence.latestWorkingLoadKg)}, and every planned set met the ${evidence.targetRepMin}-rep minimum.`;
    case 'REGRESSING':
      if (evidence.regressionReasons.includes(
        'NEW_LOAD_BELOW_MINIMUM_WITHOUT_ESTIMATED_1RM_IMPROVEMENT',
      )) {
        return `Working load increased to ${loadLabel(evidence.latestWorkingLoadKg)}, but a planned set fell below ${evidence.targetRepMin} reps without an estimated 1RM improvement.`;
      }
      return `At ${loadLabel(evidence.latestWorkingLoadKg)}, planned reps fell by ${Math.abs(changes?.totalPlannedReps ?? 0)} and estimated 1RM fell by ${Math.abs(changes?.bestEstimated1RMKg ?? 0)} kg.`;
    case 'PROGRESSING': {
      const details = evidence.improvements.map((improvement) => {
        switch (improvement) {
          case 'WORKING_LOAD':
            return `working load ${signed(changes?.workingLoadKg ?? 0)} kg`;
          case 'PLANNED_REPS_AT_COMPARABLE_LOAD':
            return `planned reps ${signed(changes?.totalPlannedReps ?? 0)}`;
          case 'PLANNED_VOLUME':
            return `planned volume ${signed(changes?.plannedVolumeKg ?? 0)} kg`;
          case 'ESTIMATED_1RM':
            return `estimated 1RM ${signed(changes?.bestEstimated1RMKg ?? 0)} kg`;
        }
      });
      return `Objective progress: ${details.join(', ')}.`;
    }
    case 'STALLED':
      return evidence.comparableWorkingLoad
        ? 'No objective improvement was recorded across the latest two comparable sessions.'
        : 'No qualifying objective improvement or regression was recorded across the latest two completed sessions.';
  }
}

export function classifyProgression(input: DerivedWorkoutFacts): DerivedProgressionAnalysis {
  const orderedFacts = distinctSessionFacts(input.facts);
  const latest = orderedFacts.at(-1) ?? null;
  const previous = orderedFacts.at(-2) ?? null;
  const latestPredicates = plannedSetPredicates(latest);

  if (latest === null || previous === null) {
    const evidence: ProgressionEvidence = {
      sessionCount: orderedFacts.length,
      previousSessionId: null,
      previousSessionExerciseId: null,
      latestSessionId: latest?.sessionId ?? null,
      latestSessionExerciseId: latest?.sessionExerciseId ?? null,
      targetSets: latest?.targetSets ?? null,
      targetRepMin: latest?.targetRepMin ?? null,
      targetRepMax: latest?.targetRepMax ?? null,
      completedPlannedSetCount: latest?.metrics.plannedSetCount ?? 0,
      previousWorkingLoadKg: null,
      latestWorkingLoadKg: latest?.metrics.workingLoadKg ?? null,
      previousMetrics: null,
      latestMetrics: latest === null ? null : copyMetrics(latest.metrics),
      changes: null,
      ...latestPredicates,
      workingLoadIncreased: false,
      comparableWorkingLoad: false,
      regressionReasons: [],
      improvements: [],
    };
    return {
      status: 'INSUFFICIENT_DATA',
      evidence,
      explanation: explanationFor('INSUFFICIENT_DATA', evidence),
    };
  }

  const changes = metricChanges(latest.metrics, previous.metrics);
  const latestLoad = latest.metrics.workingLoadKg;
  const previousLoad = previous.metrics.workingLoadKg;
  const {
    plannedSetRequirementMet,
    allPlannedSetsAtWorkingLoad,
    allPlannedSetsMeetTargetMinimum,
    allPlannedSetsMeetTargetMaximum,
  } = latestPredicates;
  const workingLoadIncreased = latestLoad !== null
    && previousLoad !== null
    && latestLoad > previousLoad;
  const comparableWorkingLoad = latestLoad === previousLoad;
  const sameOrLowerWorkingLoad = comparableWorkingLoad
    || (latestLoad !== null && previousLoad !== null && latestLoad < previousLoad);
  const estimated1RMImproved = changes.bestEstimated1RMKg !== null
    && changes.bestEstimated1RMKg > 0;
  const estimated1RMDeclined = changes.bestEstimated1RMKg !== null
    && changes.bestEstimated1RMKg < 0;
  const hasBelowMinimumSet = latest.plannedSets.some(({ reps }) => reps < latest.targetRepMin);
  const regressionReasons: ProgressionRegressionReason[] = [];

  if (sameOrLowerWorkingLoad && changes.totalPlannedReps < 0 && estimated1RMDeclined) {
    regressionReasons.push('SAME_OR_LOWER_LOAD_REPS_AND_ESTIMATED_1RM_DECLINED');
  }
  if (workingLoadIncreased && hasBelowMinimumSet && !estimated1RMImproved) {
    regressionReasons.push('NEW_LOAD_BELOW_MINIMUM_WITHOUT_ESTIMATED_1RM_IMPROVEMENT');
  }

  const improvements: ProgressionImprovement[] = [];
  if (workingLoadIncreased) improvements.push('WORKING_LOAD');
  if (comparableWorkingLoad && changes.totalPlannedReps > 0) {
    improvements.push('PLANNED_REPS_AT_COMPARABLE_LOAD');
  }
  if (changes.plannedVolumeKg > 0) improvements.push('PLANNED_VOLUME');
  if (estimated1RMImproved) improvements.push('ESTIMATED_1RM');

  const evidence: ProgressionEvidence = {
    sessionCount: orderedFacts.length,
    previousSessionId: previous.sessionId,
    previousSessionExerciseId: previous.sessionExerciseId,
    latestSessionId: latest.sessionId,
    latestSessionExerciseId: latest.sessionExerciseId,
    targetSets: latest.targetSets,
    targetRepMin: latest.targetRepMin,
    targetRepMax: latest.targetRepMax,
    completedPlannedSetCount: latest.metrics.plannedSetCount,
    previousWorkingLoadKg: previousLoad,
    latestWorkingLoadKg: latestLoad,
    previousMetrics: copyMetrics(previous.metrics),
    latestMetrics: copyMetrics(latest.metrics),
    changes,
    plannedSetRequirementMet,
    allPlannedSetsAtWorkingLoad,
    allPlannedSetsMeetTargetMinimum,
    allPlannedSetsMeetTargetMaximum,
    workingLoadIncreased,
    comparableWorkingLoad,
    regressionReasons,
    improvements,
  };

  let status: ProgressionStatus;
  if (
    plannedSetRequirementMet
    && allPlannedSetsAtWorkingLoad
    && allPlannedSetsMeetTargetMaximum
  ) {
    status = 'READY_TO_INCREASE_LOAD';
  } else if (workingLoadIncreased && allPlannedSetsMeetTargetMinimum) {
    status = 'ADAPTING_TO_NEW_LOAD';
  } else if (regressionReasons.length > 0) {
    status = 'REGRESSING';
  } else if (improvements.length > 0) {
    status = 'PROGRESSING';
  } else {
    status = 'STALLED';
  }

  return { status, evidence, explanation: explanationFor(status, evidence) };
}
