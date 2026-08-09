import type {
  DerivedPersonalRecords,
  DerivedWorkoutFacts,
  Estimated1RMRecordAchievement,
  HighestLoadRecordAchievement,
  PersonalRecordAchievement,
  RepsAtLoadRecordAchievement,
  SessionVolumeRecordAchievement,
  WorkoutFact,
} from '../../types/progression';

function compareText(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

function compareFacts(left: WorkoutFact, right: WorkoutFact): number {
  return compareText(left.completedAt, right.completedAt)
    || compareText(left.sessionId, right.sessionId)
    || compareText(left.sessionExerciseId, right.sessionExerciseId);
}

function compareLoads(left: number | null, right: number | null): number {
  if (left === right) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return left - right;
}

function recordIdentity(fact: WorkoutFact) {
  return {
    exerciseId: fact.exerciseId,
    exerciseName: fact.exerciseName,
    sessionId: fact.sessionId,
    sessionExerciseId: fact.sessionExerciseId,
    achievedAt: fact.completedAt,
  };
}

export function derivePersonalRecords(input: DerivedWorkoutFacts): DerivedPersonalRecords {
  const achievements: PersonalRecordAchievement[] = [];
  const repsAtLoad = new Map<number | null, RepsAtLoadRecordAchievement>();
  let highestLoad: HighestLoadRecordAchievement | null = null;
  let estimated1RM: Estimated1RMRecordAchievement | null = null;
  let sessionVolume: SessionVolumeRecordAchievement | null = null;

  for (const fact of [...input.facts].sort(compareFacts)) {
    const identity = recordIdentity(fact);
    const maximumLoad = fact.metrics.maximumLoadKg;
    if (maximumLoad !== null && (highestLoad === null || maximumLoad > highestLoad.loadKg)) {
      const achievement: HighestLoadRecordAchievement = {
        type: 'HIGHEST_LOAD',
        ...identity,
        loadKg: maximumLoad,
        previousBestKg: highestLoad?.loadKg ?? null,
      };
      achievements.push(achievement);
      highestLoad = achievement;
    }

    for (const { loadKg, reps } of [...fact.metrics.maximumRepsByLoad]
      .sort((left, right) => compareLoads(left.loadKg, right.loadKg))) {
      const previous = repsAtLoad.get(loadKg) ?? null;
      if (previous === null || reps > previous.reps) {
        const achievement: RepsAtLoadRecordAchievement = {
          type: 'REPS_AT_LOAD',
          ...identity,
          loadKg,
          reps,
          previousBestReps: previous?.reps ?? null,
        };
        achievements.push(achievement);
        repsAtLoad.set(loadKg, achievement);
      }
    }

    const bestEstimated1RM = fact.metrics.bestEstimated1RMKg;
    if (
      bestEstimated1RM !== null
      && (estimated1RM === null || bestEstimated1RM > estimated1RM.estimated1RMKg)
    ) {
      const achievement: Estimated1RMRecordAchievement = {
        type: 'ESTIMATED_1RM',
        ...identity,
        estimated1RMKg: bestEstimated1RM,
        previousBestEstimated1RMKg: estimated1RM?.estimated1RMKg ?? null,
      };
      achievements.push(achievement);
      estimated1RM = achievement;
    }

    const fullSessionVolume = fact.metrics.fullSessionVolumeKg;
    if (fullSessionVolume > 0 && (sessionVolume === null || fullSessionVolume > sessionVolume.volumeKg)) {
      const achievement: SessionVolumeRecordAchievement = {
        type: 'SESSION_VOLUME',
        ...identity,
        volumeKg: fullSessionVolume,
        previousBestVolumeKg: sessionVolume?.volumeKg ?? null,
      };
      achievements.push(achievement);
      sessionVolume = achievement;
    }
  }

  return {
    achievements,
    current: {
      highestLoad,
      repsAtLoad: [...repsAtLoad.values()].sort((left, right) => compareLoads(left.loadKg, right.loadKg)),
      estimated1RM,
      sessionVolume,
    },
  };
}
