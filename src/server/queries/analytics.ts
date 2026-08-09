import 'server-only';

import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { aiGuidanceCache } from '../../db/schema/ai';
import { getExercises } from './exercises';
import { getExerciseHistory } from './history';
import { deriveWorkoutFacts } from '../../lib/progression/facts';
import { derivePersonalRecords } from '../../lib/progression/records';
import { classifyProgression } from '../../lib/progression/classification';
import type { ExerciseHistory } from '../../types/history';
import type { DerivedWorkoutFacts, PersonalRecordAchievement } from '../../types/progression';
import type {
  AnalyticsOverviewDTO,
  AnalyticsItemDTO,
  AnalyticsPRDTO,
} from '../../types/analytics';

export interface ExerciseFactData {
  exerciseId: string;
  facts: DerivedWorkoutFacts;
}

export interface ExerciseTargetData {
  exerciseId: string;
  targetRepMin: number;
  targetRepMax: number;
}

export interface AnalyticsReadAdapter {
  getCompletedSessionFacts: (userId: string) => Promise<ExerciseFactData[]>;
  getExerciseTargets: (userId: string) => Promise<ExerciseTargetData[]>;
  getCachedAiGuidance: (userId: string) => Promise<Map<string, { guidance: string }>>;
}

const defaultAnalyticsAdapter: AnalyticsReadAdapter = {
  async getCompletedSessionFacts(userId: string): Promise<ExerciseFactData[]> {
    const visibleExercises = await getExercises(userId);
    const results: ExerciseFactData[] = [];

    for (const exercise of visibleExercises) {
      const history = await getExerciseHistory(userId, exercise.id);
      if (history && history.sessions.length > 0) {
        const facts = deriveWorkoutFacts(history);
        results.push({
          exerciseId: exercise.id,
          facts,
        });
      }
    }

    return results;
  },

  async getExerciseTargets(userId: string): Promise<ExerciseTargetData[]> {
    const visibleExercises = await getExercises(userId);
    const results: ExerciseTargetData[] = [];

    for (const exercise of visibleExercises) {
      const history = await getExerciseHistory(userId, exercise.id);
      if (history && history.sessions.length > 0) {
        const latestSession = history.sessions[history.sessions.length - 1];
        results.push({
          exerciseId: exercise.id,
          targetRepMin: latestSession.targetRepMin,
          targetRepMax: latestSession.targetRepMax,
        });
      }
    }

    return results;
  },

  async getCachedAiGuidance(userId: string): Promise<Map<string, { guidance: string }>> {
    const rows = await db
      .select({
        exerciseId: aiGuidanceCache.exerciseId,
        responseJson: aiGuidanceCache.responseJson,
      })
      .from(aiGuidanceCache)
      .where(eq(aiGuidanceCache.userId, userId));

    const map = new Map<string, { guidance: string }>();
    for (const row of rows) {
      if (row.responseJson && typeof row.responseJson === 'object' && 'guidance' in row.responseJson) {
        const json = row.responseJson as { guidance?: string };
        if (json.guidance && typeof json.guidance === 'string') {
          map.set(row.exerciseId, { guidance: json.guidance });
        }
      }
    }
    return map;
  },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function formatAchievedDate(isoDateString: string): string {
  const date = new Date(isoDateString);
  return date.toISOString().split('T')[0];
}

export async function getAnalyticsOverviewData(
  userId: string,
  adapter: AnalyticsReadAdapter = defaultAnalyticsAdapter,
): Promise<AnalyticsOverviewDTO> {
  const [exerciseFactsList, targetsList, aiCacheMap] = await Promise.all([
    adapter.getCompletedSessionFacts(userId),
    adapter.getExerciseTargets(userId),
    adapter.getCachedAiGuidance(userId),
  ]);

  const targetMap = new Map<string, { min: number; max: number }>();
  for (const t of targetsList) {
    targetMap.set(t.exerciseId, { min: t.targetRepMin, max: t.targetRepMax });
  }

  const readyList: AnalyticsItemDTO[] = [];
  const stalledList: AnalyticsItemDTO[] = [];
  const progressingList: AnalyticsItemDTO[] = [];
  const allAchievements: { achievement: PersonalRecordAchievement; exerciseName: string }[] = [];

  let progressingCount = 0;
  let readyCount = 0;
  let stalledCount = 0;
  let insufficientCount = 0;

  for (const { exerciseId, facts } of exerciseFactsList) {
    if (facts.facts.length === 0) {
      insufficientCount++;
      continue;
    }

    const target = targetMap.get(exerciseId) ?? {
      min: facts.facts[facts.facts.length - 1].targetRepMin,
      max: facts.facts[facts.facts.length - 1].targetRepMax,
    };

    const classification = classifyProgression(facts, target.min, target.max);
    const prs = derivePersonalRecords(facts);

    for (const achievement of prs.achievements) {
      allAchievements.push({
        achievement,
        exerciseName: facts.facts[facts.facts.length - 1].exerciseName,
      });
    }

    const latestFact = facts.facts[facts.facts.length - 1];
    const exerciseName = latestFact.exerciseName;
    const cachedAi = aiCacheMap.get(exerciseId);
    const guidance = cachedAi?.guidance ?? classification.explanation;

    const workingLoad = latestFact.metrics.workingLoadKg;
    const nextWeight = classification.status === 'READY_TO_INCREASE_LOAD'
      ? (workingLoad !== null ? workingLoad + 2.5 : null)
      : workingLoad;

    const item: AnalyticsItemDTO = {
      exerciseId,
      exerciseName,
      status: classification.status,
      guidance,
      comparisonText: classification.explanation,
      nextWeight,
      targetRepMin: target.min,
      targetRepMax: target.max,
    };

    switch (classification.status) {
      case 'READY_TO_INCREASE_LOAD':
        readyCount++;
        readyList.push(item);
        break;
      case 'PROGRESSING':
      case 'ADAPTING_TO_NEW_LOAD':
        progressingCount++;
        progressingList.push(item);
        break;
      case 'STALLED':
      case 'REGRESSING':
        stalledCount++;
        stalledList.push(item);
        break;
      case 'INSUFFICIENT_DATA':
        insufficientCount++;
        break;
    }
  }

  // Filter PR achievements to recent 30-day window
  const now = Date.now();
  const recentAchievements = allAchievements.filter((entry) => {
    const time = new Date(entry.achievement.achievedAt).getTime();
    return now - time <= THIRTY_DAYS_MS;
  });

  // Sort recent achievements descending by date
  recentAchievements.sort((a, b) => {
    return new Date(b.achievement.achievedAt).getTime() - new Date(a.achievement.achievedAt).getTime();
  });

  const achievedPRs: AnalyticsPRDTO[] = recentAchievements.map(({ achievement, exerciseName }) => {
    let weight: number | null = null;
    let reps = 0;
    let estimated1RM: number | null = null;

    switch (achievement.type) {
      case 'HIGHEST_LOAD':
        weight = achievement.loadKg;
        reps = 1;
        break;
      case 'REPS_AT_LOAD':
        weight = achievement.loadKg;
        reps = achievement.reps;
        break;
      case 'ESTIMATED_1RM':
        estimated1RM = achievement.estimated1RMKg;
        break;
      case 'SESSION_VOLUME':
        weight = achievement.volumeKg;
        break;
    }

    return {
      exerciseId: achievement.exerciseId,
      exerciseName,
      recordType: achievement.type,
      weight,
      reps,
      estimated1RM,
      achievedDate: formatAchievedDate(achievement.achievedAt),
      isNewRecord: true,
    };
  });

  return {
    summary: {
      progressingCount,
      readyCount,
      stalledCount,
      recentPRsCount: achievedPRs.length,
      insufficientCount,
    },
    readyList,
    stalledList,
    progressingList,
    achievedPRs,
  };
}
