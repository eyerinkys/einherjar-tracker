import { describe, it, expect } from 'vitest';
import type { AnalyticsOverviewDTO, AnalyticsItemDTO, AnalyticsPRDTO } from './analytics';

describe('Analytics DTO Contracts', () => {
  it('instantiates valid AnalyticsOverviewDTO structure', () => {
    const item: AnalyticsItemDTO = {
      exerciseId: 'ex-1',
      exerciseName: 'Bench Press',
      status: 'PROGRESSING',
      guidance: 'Keep up the current load',
      comparisonText: '+1 rep improvement',
      nextWeight: 80,
      targetRepMin: 5,
      targetRepMax: 5,
    };

    const pr: AnalyticsPRDTO = {
      exerciseId: 'ex-1',
      exerciseName: 'Bench Press',
      recordType: 'HIGHEST_LOAD',
      weight: 80,
      reps: 5,
      estimated1RM: 93.3,
      achievedDate: '2026-08-04',
      isNewRecord: true,
    };

    const overview: AnalyticsOverviewDTO = {
      summary: {
        progressingCount: 1,
        readyCount: 0,
        stalledCount: 0,
        recentPRsCount: 1,
        insufficientCount: 0,
      },
      readyList: [],
      stalledList: [],
      progressingList: [item],
      achievedPRs: [pr],
    };

    expect(overview.summary.progressingCount).toBe(1);
    expect(overview.progressingList[0].exerciseName).toBe('Bench Press');
    expect(overview.achievedPRs[0].weight).toBe(80);
  });
});
