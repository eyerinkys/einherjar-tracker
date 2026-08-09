import type { ExerciseHistory } from '../../types';
import type {
  DerivedWorkoutFacts,
  RepsAtLoad,
  WorkoutFact,
  WorkoutFactMetrics,
  WorkoutFactSet,
  WorkoutMetricChanges,
} from '../../types/progression';

function roundToOneDecimal(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function normalizeCalculatedNumber(value: number): number {
  return value === 0 ? 0 : Number.parseFloat(value.toPrecision(15));
}

export function estimateEpley1RM(weightKg: number | null, reps: number): number | null {
  if (
    weightKg === null
    || !Number.isFinite(weightKg)
    || weightKg <= 0
    || !Number.isFinite(reps)
    || !Number.isInteger(reps)
    || reps <= 0
  ) {
    return null;
  }

  return reps === 1 ? weightKg : roundToOneDecimal(weightKg * (1 + reps / 30));
}

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareSets(left: WorkoutFactSet, right: WorkoutFactSet): number {
  return left.setNumber - right.setNumber || compareText(left.id, right.id);
}

function compareLoads(left: number | null, right: number | null): number {
  if (left === right) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return left - right;
}

function workingLoad(sets: readonly WorkoutFactSet[]): number | null {
  if (sets.length === 0) return null;

  const frequencies = new Map<number | null, number>();
  for (const set of sets) {
    frequencies.set(set.weightKg, (frequencies.get(set.weightKg) ?? 0) + 1);
  }

  let selected: number | null = null;
  let selectedCount = -1;
  for (const [load, count] of frequencies) {
    if (count > selectedCount || (count === selectedCount && compareLoads(load, selected) > 0)) {
      selected = load;
      selectedCount = count;
    }
  }
  return selected;
}

function maximumRepsByLoad(sets: readonly WorkoutFactSet[]): RepsAtLoad[] {
  const maximums = new Map<number | null, number>();
  for (const set of sets) {
    maximums.set(set.weightKg, Math.max(maximums.get(set.weightKg) ?? 0, set.reps));
  }
  return [...maximums]
    .sort(([left], [right]) => compareLoads(left, right))
    .map(([loadKg, reps]) => ({ loadKg, reps }));
}

function totalVolume(sets: readonly WorkoutFactSet[]): number {
  return normalizeCalculatedNumber(
    sets.reduce((total, set) => total + (set.weightKg ?? 0) * set.reps, 0),
  );
}

function metrics(plannedSets: readonly WorkoutFactSet[], completedSets: readonly WorkoutFactSet[]): WorkoutFactMetrics {
  const weightedLoads = completedSets
    .map(({ weightKg }) => weightKg)
    .filter((weightKg): weightKg is number => weightKg !== null);
  const estimates = completedSets
    .map(({ weightKg, reps }) => estimateEpley1RM(weightKg, reps))
    .filter((estimate): estimate is number => estimate !== null);

  return {
    plannedSetCount: plannedSets.length,
    totalPlannedReps: plannedSets.reduce((total, set) => total + set.reps, 0),
    plannedVolumeKg: totalVolume(plannedSets),
    fullSessionVolumeKg: totalVolume(completedSets),
    workingLoadKg: workingLoad(plannedSets),
    maximumLoadKg: weightedLoads.length === 0 ? null : Math.max(...weightedLoads),
    maximumRepsByLoad: maximumRepsByLoad(completedSets),
    bestEstimated1RMKg: estimates.length === 0 ? null : Math.max(...estimates),
  };
}

function nullableChange(current: number | null, prior: number | null): number | null {
  return current === null || prior === null ? null : normalizeCalculatedNumber(current - prior);
}

function estimatedChange(current: number | null, prior: number | null): number | null {
  return current === null || prior === null ? null : roundToOneDecimal(current - prior);
}

function metricChanges(current: WorkoutFactMetrics, prior: WorkoutFactMetrics): WorkoutMetricChanges {
  return {
    workingLoadKg: nullableChange(current.workingLoadKg, prior.workingLoadKg),
    totalPlannedReps: current.totalPlannedReps - prior.totalPlannedReps,
    plannedVolumeKg: normalizeCalculatedNumber(current.plannedVolumeKg - prior.plannedVolumeKg),
    fullSessionVolumeKg: normalizeCalculatedNumber(current.fullSessionVolumeKg - prior.fullSessionVolumeKg),
    bestEstimated1RMKg: estimatedChange(current.bestEstimated1RMKg, prior.bestEstimated1RMKg),
  };
}

export function deriveWorkoutFacts(history: ExerciseHistory): DerivedWorkoutFacts {
  const orderedSessions = [...history.sessions].sort((left, right) =>
    compareText(left.completedAt, right.completedAt)
    || compareText(left.sessionId, right.sessionId)
    || compareText(left.sessionExerciseId, right.sessionExerciseId));

  const facts: WorkoutFact[] = orderedSessions.map((session) => {
    const completedSets = session.sets
      .map((set): WorkoutFactSet => ({
        id: set.id,
        setNumber: set.setNumber,
        weightKg: set.weight,
        reps: set.reps,
      }))
      .sort(compareSets);
    const plannedSets = completedSets.slice(0, session.targetSets);

    return {
      exerciseId: history.exercise.id,
      sessionId: session.sessionId,
      sessionExerciseId: session.sessionExerciseId,
      completedAt: session.completedAt,
      exerciseName: session.exerciseName,
      targetSets: session.targetSets,
      targetRepMin: session.targetRepMin,
      targetRepMax: session.targetRepMax,
      plannedSets,
      completedSets,
      metrics: metrics(plannedSets, completedSets),
      deltaFromPrevious: null,
    };
  });

  for (let index = 1; index < facts.length; index += 1) {
    facts[index].deltaFromPrevious = metricChanges(facts[index].metrics, facts[index - 1].metrics);
  }

  const recentFacts = facts.slice(-4);
  return {
    facts,
    recentDirection: recentFacts.length < 2
      ? null
      : metricChanges(recentFacts.at(-1)!.metrics, recentFacts[0].metrics),
  };
}
