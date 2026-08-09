import type { ProgressionStatus } from './progression';

export interface AnalyticsItemDTO {
  exerciseId: string;
  exerciseName: string;
  status: ProgressionStatus;
  guidance: string;
  comparisonText: string;
  nextWeight: number | null;
  targetRepMin: number;
  targetRepMax: number;
}

export interface AnalyticsPRDTO {
  exerciseId: string;
  exerciseName: string;
  recordType: 'HIGHEST_LOAD' | 'REPS_AT_LOAD' | 'ESTIMATED_1RM' | 'SESSION_VOLUME';
  weight: number | null;
  reps: number;
  estimated1RM: number | null;
  achievedDate: string;
  isNewRecord?: boolean;
}

export interface AnalyticsSummaryDTO {
  progressingCount: number;
  readyCount: number;
  stalledCount: number;
  recentPRsCount: number;
  insufficientCount: number;
}

export interface AnalyticsOverviewDTO {
  summary: AnalyticsSummaryDTO;
  readyList: AnalyticsItemDTO[];
  stalledList: AnalyticsItemDTO[];
  progressingList: AnalyticsItemDTO[];
  achievedPRs: AnalyticsPRDTO[];
}
