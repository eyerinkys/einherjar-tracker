import { describe, it, expect, vi } from 'vitest';
import { getAnalyticsOverviewData } from './analytics';
import type { DerivedWorkoutFacts } from '../../types/progression';

vi.mock('server-only', () => ({}));

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

describe('getAnalyticsOverviewData', () => {
  it('returns empty summary when user has no logged workouts', async () => {
    const mockAdapter = {
      getCompletedSessionFacts: vi.fn().mockResolvedValue([]),
      getExerciseTargets: vi.fn().mockResolvedValue([]),
      getCachedAiGuidance: vi.fn().mockResolvedValue(new Map()),
    };

    const result = await getAnalyticsOverviewData('user-no-data', mockAdapter);
    expect(result.summary).toEqual({
      progressingCount: 0,
      readyCount: 0,
      stalledCount: 0,
      recentPRsCount: 0,
      insufficientCount: 0,
    });
    expect(result.readyList).toHaveLength(0);
    expect(result.stalledList).toHaveLength(0);
    expect(result.progressingList).toHaveLength(0);
    expect(result.achievedPRs).toHaveLength(0);
  });

  it('classifies single baseline session as INSUFFICIENT_DATA and increments insufficientCount', async () => {
    const mockFacts: DerivedWorkoutFacts = {
      facts: [
        {
          exerciseId: id('1'),
          sessionId: id('100'),
          sessionExerciseId: id('200'),
          completedAt: '2026-08-01T10:00:00.000Z',
          exerciseName: 'Bench Press',
          targetSets: 3,
          targetRepMin: 5,
          targetRepMax: 5,
          plannedSets: [
            { id: id('s1'), setNumber: 1, weightKg: 80, reps: 5 },
            { id: id('s2'), setNumber: 2, weightKg: 80, reps: 5 },
            { id: id('s3'), setNumber: 3, weightKg: 80, reps: 5 },
          ],
          completedSets: [
            { id: id('s1'), setNumber: 1, weightKg: 80, reps: 5 },
            { id: id('s2'), setNumber: 2, weightKg: 80, reps: 5 },
            { id: id('s3'), setNumber: 3, weightKg: 80, reps: 5 },
          ],
          metrics: {
            plannedSetCount: 3,
            totalPlannedReps: 15,
            plannedVolumeKg: 1200,
            fullSessionVolumeKg: 1200,
            workingLoadKg: 80,
            maximumLoadKg: 80,
            maximumRepsByLoad: [{ loadKg: 80, reps: 5 }],
            bestEstimated1RMKg: 93.3,
          },
          deltaFromPrevious: null,
        },
      ],
      recentDirection: null,
    };

    const mockAdapter = {
      getCompletedSessionFacts: vi.fn().mockResolvedValue([{ exerciseId: id('1'), facts: mockFacts }]),
      getExerciseTargets: vi.fn().mockResolvedValue([{ exerciseId: id('1'), targetRepMin: 5, targetRepMax: 5 }]),
      getCachedAiGuidance: vi.fn().mockResolvedValue(new Map()),
    };

    const result = await getAnalyticsOverviewData('user-1-session', mockAdapter);
    expect(result.summary.insufficientCount).toBe(1);
    expect(result.summary.readyCount).toBe(0);
    expect(result.summary.progressingCount).toBe(0);
    expect(result.summary.stalledCount).toBe(0);
    expect(result.readyList).toHaveLength(0);
  });

  it('enriches guidance text with cached AI guidance when available without altering status', async () => {
    const mockFacts: DerivedWorkoutFacts = {
      facts: [
        {
          exerciseId: id('1'),
          sessionId: id('100'),
          sessionExerciseId: id('200'),
          completedAt: '2026-07-20T10:00:00.000Z',
          exerciseName: 'Dumbbell Curl',
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 10,
          plannedSets: [
            { id: id('s1'), setNumber: 1, weightKg: 5, reps: 10 },
            { id: id('s2'), setNumber: 2, weightKg: 5, reps: 10 },
            { id: id('s3'), setNumber: 3, weightKg: 5, reps: 10 },
          ],
          completedSets: [
            { id: id('s1'), setNumber: 1, weightKg: 5, reps: 10 },
            { id: id('s2'), setNumber: 2, weightKg: 5, reps: 10 },
            { id: id('s3'), setNumber: 3, weightKg: 5, reps: 10 },
          ],
          metrics: {
            plannedSetCount: 3,
            totalPlannedReps: 30,
            plannedVolumeKg: 150,
            fullSessionVolumeKg: 150,
            workingLoadKg: 5,
            maximumLoadKg: 5,
            maximumRepsByLoad: [{ loadKg: 5, reps: 10 }],
            bestEstimated1RMKg: 6.6,
          },
          deltaFromPrevious: null,
        },
        {
          exerciseId: id('1'),
          sessionId: id('101'),
          sessionExerciseId: id('201'),
          completedAt: '2026-07-28T10:00:00.000Z',
          exerciseName: 'Dumbbell Curl',
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 10,
          plannedSets: [
            { id: id('s4'), setNumber: 1, weightKg: 5, reps: 10 },
            { id: id('s5'), setNumber: 2, weightKg: 5, reps: 10 },
            { id: id('s6'), setNumber: 3, weightKg: 5, reps: 10 },
          ],
          completedSets: [
            { id: id('s4'), setNumber: 1, weightKg: 5, reps: 10 },
            { id: id('s5'), setNumber: 2, weightKg: 5, reps: 10 },
            { id: id('s6'), setNumber: 3, weightKg: 5, reps: 10 },
          ],
          metrics: {
            plannedSetCount: 3,
            totalPlannedReps: 30,
            plannedVolumeKg: 150,
            fullSessionVolumeKg: 150,
            workingLoadKg: 5,
            maximumLoadKg: 5,
            maximumRepsByLoad: [{ loadKg: 5, reps: 10 }],
            bestEstimated1RMKg: 6.6,
          },
          deltaFromPrevious: {
            workingLoadKg: 0,
            totalPlannedReps: 0,
            plannedVolumeKg: 0,
            fullSessionVolumeKg: 0,
            bestEstimated1RMKg: 0,
          },
        },
      ],
      recentDirection: null,
    };

    const aiCacheMap = new Map();
    aiCacheMap.set(id('1'), {
      guidance: 'Increase to 7.5 kg next session and aim for 8-10 reps.',
    });

    const mockAdapter = {
      getCompletedSessionFacts: vi.fn().mockResolvedValue([{ exerciseId: id('1'), facts: mockFacts }]),
      getExerciseTargets: vi.fn().mockResolvedValue([{ exerciseId: id('1'), targetRepMin: 8, targetRepMax: 10 }]),
      getCachedAiGuidance: vi.fn().mockResolvedValue(aiCacheMap),
    };

    const result = await getAnalyticsOverviewData('user-with-ai', mockAdapter);
    expect(result.summary.readyCount).toBe(1);
    expect(result.readyList).toHaveLength(1);
    expect(result.readyList[0].status).toBe('READY_TO_INCREASE_LOAD');
    expect(result.readyList[0].guidance).toBe('Increase to 7.5 kg next session and aim for 8-10 reps.');
  });
});
