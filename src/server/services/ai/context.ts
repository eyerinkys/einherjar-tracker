import crypto from 'node:crypto';
import { db } from '@/db/client';
import { eq, and, desc, isNotNull, sql } from 'drizzle-orm';
import { workoutSessions, workoutSets, exercises } from '@/db/schema/core';
import { trainingProfiles } from '@/db/schema/ai';
import type { TrainingProfileDTO } from '@/types/ai';

export function hashContext(profile: any, history: any[]): string {
  const hash = crypto.createHash('sha256');
  
  // Sort history by date descending to ensure stable array order
  // Assuming history is already mostly sorted, but we want to be safe
  const stableHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  hash.update(JSON.stringify({ profile, history: stableHistory }));
  return hash.digest('hex');
}

export async function fetchUserTrainingProfile(userId: string): Promise<TrainingProfileDTO | null> {
  const profile = await db
    .select()
    .from(trainingProfiles)
    .where(eq(trainingProfiles.userId, userId))
    .limit(1);

  if (profile.length === 0) {
    return null;
  }

  const p = profile[0];
  return {
    trainingExperience: p.trainingExperience as TrainingProfileDTO['trainingExperience'],
    primaryGoal: p.primaryGoal as TrainingProfileDTO['primaryGoal'],
    preferredProgressionMethod: p.preferredProgressionMethod as TrainingProfileDTO['preferredProgressionMethod'],
    availableWeightIncrementsKg: (p.availableWeightIncrementsKg as number[]) ?? [],
    generalTrainingNotes: p.generalTrainingNotes,
  };
}

export async function fetchExerciseHistory(userId: string, exerciseId: string) {
  // Fetch the last few sessions where the user did this exercise
  // For context, we don't need the entire history, just the recent 5-10 sessions to establish trend.
  
  const historySets = await db
    .select({
      sessionId: workoutSessions.id,
      sessionDate: workoutSessions.startedAt,
      reps: workoutSets.reps,
      weightKg: workoutSets.weightKg,
      rpe: workoutSets.rpe,
      notes: workoutSets.notes
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSets.exerciseId, exerciseId),
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, 'completed')
      )
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(50); // Get enough sets to cover recent sessions

  // Group by session
  const sessionsMap = new Map<string, any>();
  
  for (const set of historySets) {
    if (!sessionsMap.has(set.sessionId)) {
      sessionsMap.set(set.sessionId, {
        date: set.sessionDate.toISOString(),
        sets: []
      });
    }
    
    sessionsMap.get(set.sessionId).sets.push({
      reps: set.reps,
      weightKg: set.weightKg,
      rpe: set.rpe,
      notes: set.notes
    });
  }

  // Convert map to array and sort by date descending
  const history = Array.from(sessionsMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5); // Keep only the latest 5 sessions for the prompt

  return history;
}

export async function buildExerciseContext(userId: string, exerciseId: string) {
  const [profile, history] = await Promise.all([
    fetchUserTrainingProfile(userId),
    fetchExerciseHistory(userId, exerciseId)
  ]);
  
  const contextHash = hashContext(profile, history);

  return {
    profile,
    history,
    contextHash
  };
}
