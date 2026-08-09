import 'server-only';

import { desc, eq, lte } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { trainingSchedules, workoutSessions } from '../../db/schema';

export interface ScheduleRow {
  scheduledDays: Record<string, string | null>; // "0"-"6" -> splitDayId
  effectiveFrom: Date;
}

export interface SessionRow {
  id: string;
  splitDayName: string;
  completedAt: Date;
}

export interface ConsistencyReadAdapter {
  getSchedules(userId: string): Promise<ScheduleRow[]>;
  getCompletedSessions(userId: string): Promise<SessionRow[]>;
}

export const defaultConsistencyAdapter: ConsistencyReadAdapter = {
  async getSchedules(userId: string) {
    const db = getDb();
    const rows = await db
      .select({
        scheduledDays: trainingSchedules.scheduledDays,
        effectiveFrom: trainingSchedules.effectiveFrom,
      })
      .from(trainingSchedules)
      .where(eq(trainingSchedules.userId, userId))
      .orderBy(desc(trainingSchedules.effectiveFrom));
      
    return rows.map((r) => ({
      scheduledDays: (r.scheduledDays || {}) as Record<string, string | null>,
      effectiveFrom: r.effectiveFrom,
    }));
  },

  async getCompletedSessions(userId: string) {
    const db = getDb();
    const rows = await db
      .select({
        id: workoutSessions.id,
        splitDayName: workoutSessions.splitDayName,
        completedAt: workoutSessions.completedAt,
      })
      .from(workoutSessions)
      .where(
        eq(workoutSessions.userId, userId)
      )
      .orderBy(desc(workoutSessions.completedAt));
      
    // filter strictly completed sessions since they must have completedAt
    return rows.filter((r): r is SessionRow => r.completedAt !== null);
  },
};

export function getDatePartsInTimezone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value;
  
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = days[weekdayStr as keyof typeof days] ?? 0;

  return {
    dateIso: `${year}-${month}-${day}`,
    weekday,
  };
}

export function generateCalendarDates(startDate: Date, daysCount: number): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  // zero out the time to avoid daylight saving issues during iteration
  current.setUTCHours(12, 0, 0, 0); 
  
  for (let i = 0; i < daysCount; i++) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() - 1);
  }
  return dates;
}

// Ensure the jsonb scheduled_days is correctly typed
function parseScheduledDays(raw: any): Record<string, string | null> {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, string | null>;
  }
  return {};
}

export interface ConsistencyMetrics {
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number; // percentage 0-100
  rollingAdherence: number; // percentage 0-100
  hasSchedule: boolean;
}

export async function calculateConsistencyMetrics(
  userId: string,
  ianaTimezone: string,
  adapter: ConsistencyReadAdapter = defaultConsistencyAdapter
): Promise<ConsistencyMetrics> {
  const [schedules, sessions] = await Promise.all([
    adapter.getSchedules(userId),
    adapter.getCompletedSessions(userId),
  ]);

  if (schedules.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      weeklyAdherence: 0,
      rollingAdherence: 0,
      hasSchedule: false,
    };
  }

  // Create a map of dateIso -> array of sessions
  const sessionsByDate = new Map<string, SessionRow[]>();
  for (const session of sessions) {
    const { dateIso } = getDatePartsInTimezone(session.completedAt, ianaTimezone);
    if (!sessionsByDate.has(dateIso)) {
      sessionsByDate.set(dateIso, []);
    }
    sessionsByDate.get(dateIso)!.push(session);
  }

  const today = new Date();
  const { dateIso: todayIso } = getDatePartsInTimezone(today, ianaTimezone);
  
  // We look back 365 days for streaks
  const datesToEvaluate = generateCalendarDates(today, 365);
  
  let currentStreak = 0;
  let longestStreak = 0;
  let isCurrentStreakBroken = false;
  
  let scheduledDaysLast7 = 0;
  let completedScheduledLast7 = 0;
  
  let scheduledDaysLast28 = 0;
  let completedScheduledLast28 = 0;

  for (let i = 0; i < datesToEvaluate.length; i++) {
    const evalDate = datesToEvaluate[i];
    const { dateIso, weekday } = getDatePartsInTimezone(evalDate, ianaTimezone);
    
    // Find active schedule for this date
    // Schedules are ordered descending by effectiveFrom
    const activeScheduleRow = schedules.find((s) => s.effectiveFrom <= evalDate) || schedules[schedules.length - 1];
    const scheduledDaysMap = parseScheduledDays(activeScheduleRow.scheduledDays);
    const isScheduledDay = Object.keys(scheduledDaysMap).includes(String(weekday));
    
    const completedWorkouts = sessionsByDate.get(dateIso) || [];
    const completedCount = completedWorkouts.length;
    
    // Streak Logic
    if (completedCount > 0) {
      if (!isCurrentStreakBroken && isScheduledDay) currentStreak++;
    } else {
      if (isScheduledDay) {
        // exception: today is scheduled and missed, but today isn't over yet
        if (dateIso === todayIso) {
          // do nothing, grace period
        } else {
          isCurrentStreakBroken = true;
        }
      }
    }
    
    // Adherence last 7 days
    if (i < 7 && isScheduledDay) {
      scheduledDaysLast7++;
      if (completedCount > 0) completedScheduledLast7++;
    }
    
    // Adherence last 28 days
    if (i < 28 && isScheduledDay) {
      scheduledDaysLast28++;
      if (completedCount > 0) completedScheduledLast28++;
    }
  }

  // Calculate longest streak by iterating all sessions/schedules (simple pass)
  let tempStreak = 0;
  for (let i = datesToEvaluate.length - 1; i >= 0; i--) {
    const evalDate = datesToEvaluate[i];
    const { dateIso, weekday } = getDatePartsInTimezone(evalDate, ianaTimezone);
    const activeScheduleRow = schedules.find((s) => s.effectiveFrom <= evalDate) || schedules[schedules.length - 1];
    const scheduledDaysMap = parseScheduledDays(activeScheduleRow.scheduledDays);
    const isScheduledDay = Object.keys(scheduledDaysMap).includes(String(weekday));
    const completedCount = (sessionsByDate.get(dateIso) || []).length;
    
    if (completedCount > 0) {
      if (isScheduledDay) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      }
    } else if (isScheduledDay) {
      if (dateIso !== todayIso) {
        tempStreak = 0;
      }
    }
  }

  const weeklyAdherence = scheduledDaysLast7 > 0 ? Math.round((completedScheduledLast7 / scheduledDaysLast7) * 100) : 0;
  const rollingAdherence = scheduledDaysLast28 > 0 ? Math.round((completedScheduledLast28 / scheduledDaysLast28) * 100) : 0;

  return {
    currentStreak,
    longestStreak,
    weeklyAdherence,
    rollingAdherence,
    hasSchedule: true,
  };
}

export interface HeatmapDayDTO {
  dateIso: string;
  state: 'rest' | 'completed' | 'missed' | 'future';
  sessionSummary?: {
    workoutName: string;
  };
}

export async function getHeatmapData(
  userId: string,
  ianaTimezone: string,
  daysLimit: number = 84, // 12 weeks
  adapter: ConsistencyReadAdapter = defaultConsistencyAdapter
): Promise<HeatmapDayDTO[]> {
  const [schedules, sessions] = await Promise.all([
    adapter.getSchedules(userId),
    adapter.getCompletedSessions(userId),
  ]);

  if (schedules.length === 0) {
    return [];
  }

  const sessionsByDate = new Map<string, SessionRow[]>();
  for (const session of sessions) {
    const { dateIso } = getDatePartsInTimezone(session.completedAt, ianaTimezone);
    if (!sessionsByDate.has(dateIso)) {
      sessionsByDate.set(dateIso, []);
    }
    sessionsByDate.get(dateIso)!.push(session);
  }

  const today = new Date();
  const { dateIso: todayIso } = getDatePartsInTimezone(today, ianaTimezone);
  const dates = generateCalendarDates(today, daysLimit);
  
  const heatmap: HeatmapDayDTO[] = [];
  
  for (let i = dates.length - 1; i >= 0; i--) {
    const evalDate = dates[i];
    const { dateIso, weekday } = getDatePartsInTimezone(evalDate, ianaTimezone);
    
    // Check if future relative to "todayIso"
    if (dateIso > todayIso) {
      heatmap.push({ dateIso, state: 'future' });
      continue;
    }
    
    const activeScheduleRow = schedules.find((s) => s.effectiveFrom <= evalDate) || schedules[schedules.length - 1];
    const scheduledDaysMap = parseScheduledDays(activeScheduleRow.scheduledDays);
    const isScheduledDay = Object.keys(scheduledDaysMap).includes(String(weekday));
    
    const completedWorkouts = sessionsByDate.get(dateIso) || [];
    const isCompleted = completedWorkouts.length > 0;
    
    let state: HeatmapDayDTO['state'] = 'rest';
    if (isCompleted) {
      state = 'completed';
    } else if (isScheduledDay) {
      state = (dateIso === todayIso) ? 'rest' : 'missed'; // Grace period for today
    }
    
    heatmap.push({
      dateIso,
      state,
      sessionSummary: isCompleted ? { workoutName: completedWorkouts[0].splitDayName } : undefined
    });
  }
  
  return heatmap;
}

