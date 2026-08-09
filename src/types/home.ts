import type { HeatmapDayDTO } from '../server/queries/consistency';

export interface HomeDashboardDTO {
  metrics: {
    currentStreak: number;
    longestStreak: number;
    weeklyAdherence: number;
    rollingAdherence: number;
    hasSchedule: boolean;
  };
  heatmap: HeatmapDayDTO[];
  nextWorkout: {
    splitDayName: string;
    exerciseCount: number;
    isScheduledToday: boolean;
  } | null;
  recentActivity: {
    workoutName: string;
    dateIso: string;
    prs: string[];
  } | null;
  progressionSnapshot: {
    readyCount: number;
    stalledCount: number;
  };
  aiInsight?: string;
}
