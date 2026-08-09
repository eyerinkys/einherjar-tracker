import { describe, expect, it, vi } from 'vitest';
import { calculateConsistencyMetrics, ConsistencyReadAdapter, getDatePartsInTimezone, ScheduleRow, SessionRow } from './consistency';

vi.mock('server-only', () => ({}));

describe('consistency algorithms', () => {
  it('correctly maps dates in specific timezones', () => {
    // 2026-08-09T23:00:00Z is Aug 10th in Asia/Kolkata (UTC+5:30)
    const date = new Date('2026-08-09T23:00:00Z');
    const parts = getDatePartsInTimezone(date, 'Asia/Kolkata');
    expect(parts.dateIso).toBe('2026-08-10');
    expect(parts.weekday).toBe(1); // Monday
  });

  it('calculates streaks correctly handling rest days and missed scheduled days', async () => {
    const today = new Date('2026-08-10T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(today);
    
    // 2026-08-10 is Monday (1)
    // 2026-08-09 is Sunday (0)
    // 2026-08-08 is Saturday (6)
    // 2026-08-07 is Friday (5)
    // 2026-08-06 is Thursday (4)

    // Schedule: Mon(1), Wed(3), Fri(5)
    const schedule: ScheduleRow = {
      effectiveFrom: new Date('2025-01-01T00:00:00Z'),
      scheduledDays: { '1': null, '3': null, '5': null }
    };
    
    // Sessions:
    // Completed Friday 2026-08-07
    // Completed Sunday 2026-08-09 (Rest day)
    // Missed Wed 2026-08-05
    
    const sessions: SessionRow[] = [
      { id: '1', splitDayName: 'Push', completedAt: new Date('2026-08-07T12:00:00Z') }, // Friday - scheduled
      { id: '2', splitDayName: 'Pull', completedAt: new Date('2026-08-09T12:00:00Z') }  // Sunday - rest day
    ];

    const mockAdapter: ConsistencyReadAdapter = {
      getSchedules: async () => [schedule],
      getCompletedSessions: async () => sessions,
    };

    const metrics = await calculateConsistencyMetrics('user_1', 'UTC', mockAdapter);
    
    expect(metrics.hasSchedule).toBe(true);
    // Streak:
    // Today (Mon): missed but grace period (0 effect on streak breakage, just doesn't add to it)
    // Sun: rest day, completed -> streak = 1 (completed rest day does not increment)
    // Sat: rest day, missed -> no effect
    // Fri: scheduled, completed -> streak = 1
    // Thu: rest day, missed -> no effect
    // Wed: scheduled, missed -> streak broken
    expect(metrics.currentStreak).toBe(1);
    
    // Adherence: 7 days (Mon, Sun, Sat, Fri, Thu, Wed, Tue)
    // Scheduled days: Mon, Fri, Wed (3)
    // Completed scheduled: Fri (1) => 33%
    expect(metrics.weeklyAdherence).toBe(33);

    vi.useRealTimers();
  });
});
