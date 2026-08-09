import 'server-only';
import { getAnalyticsOverviewData } from './analytics';
import { calculateConsistencyMetrics, getHeatmapData } from './consistency';
import type { HomeDashboardDTO } from '../../types/home';
import { getDb } from '../../db/client';
import { trainingSchedules, workoutSessions } from '../../db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getDatePartsInTimezone } from './consistency';

export async function getHomeDashboardData(userId: string, ianaTimezone: string): Promise<HomeDashboardDTO> {
  const [consistencyMetrics, heatmap, analytics] = await Promise.all([
    calculateConsistencyMetrics(userId, ianaTimezone),
    getHeatmapData(userId, ianaTimezone, 84), // 12 weeks
    getAnalyticsOverviewData(userId),
  ]);

  // recentActivity
  const db = getDb();
  const recentSession = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.userId, userId),
      sql`${workoutSessions.completedAt} IS NOT NULL`
    ),
    orderBy: [desc(workoutSessions.completedAt)],
  });

  let recentActivity: HomeDashboardDTO['recentActivity'] = null;
  if (recentSession && recentSession.completedAt) {
    const { dateIso } = getDatePartsInTimezone(recentSession.completedAt, ianaTimezone);
    
    // Find PRs from this date in analytics (we can just filter analytics.achievedPRs)
    // Analytics overview returns achievedPRs in format 'YYYY-MM-DD' which matches dateIso?
    // Wait, achievedPRs formats by UTC date string. We can just match loosely.
    const sessionPrs = analytics.achievedPRs.filter(pr => pr.achievedDate === dateIso);
    
    recentActivity = {
      workoutName: recentSession.splitDayName,
      dateIso,
      prs: sessionPrs.map(pr => `${pr.exerciseName}: ${pr.recordType.replace('_', ' ')}`)
    };
  }

  // nextWorkout calculation
  let nextWorkout: HomeDashboardDTO['nextWorkout'] = null;
  const today = new Date();
  const { weekday } = getDatePartsInTimezone(today, ianaTimezone);
  
  if (consistencyMetrics.hasSchedule) {
    // get schedule
    const activeSchedule = await db.query.trainingSchedules.findFirst({
      where: eq(trainingSchedules.userId, userId),
      orderBy: [desc(trainingSchedules.effectiveFrom)],
    });
    
    if (activeSchedule) {
      const scheduledDaysMap = activeSchedule.scheduledDays as Record<string, string | null>;
      const isScheduledToday = Object.keys(scheduledDaysMap).includes(String(weekday));
      
      // We don't have full info on "nextWorkout" exercise count here without joining splits
      // For now, we return basic info
      let splitDayName = 'Scheduled Workout';
      if (isScheduledToday && scheduledDaysMap[String(weekday)]) {
        // Look up split day
        const splitDayId = scheduledDaysMap[String(weekday)];
        const splitDay = await db.query.splitDays.findFirst({
          where: eq(sql`id`, splitDayId)
        });
        if (splitDay) splitDayName = splitDay.name;
      }
      
      // If we are not scheduled today, what's next?
      // A full implementation would scan forward in `scheduledDaysMap`.
      // For MVP, if it's scheduled today we say what it is, else just say "Rest Day".
      
      nextWorkout = {
        splitDayName: isScheduledToday ? splitDayName : 'Rest Day',
        exerciseCount: 0, // Placeholder
        isScheduledToday,
      };
    }
  }

  // AiInsight: Grab one piece of guidance from stalled or ready
  let aiInsight: string | undefined;
  if (analytics.stalledList.length > 0) {
    aiInsight = `Stalled: ${analytics.stalledList[0].exerciseName} - ${analytics.stalledList[0].guidance}`;
  } else if (analytics.readyList.length > 0) {
    aiInsight = `Ready: ${analytics.readyList[0].exerciseName} - ${analytics.readyList[0].guidance}`;
  }

  return {
    metrics: consistencyMetrics,
    heatmap,
    nextWorkout,
    recentActivity,
    progressionSnapshot: {
      readyCount: analytics.summary.readyCount,
      stalledCount: analytics.summary.stalledCount,
    },
    aiInsight,
  };
}
