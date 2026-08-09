import crypto from 'node:crypto';
import { getDb } from '@/db/client';
import { eq, and, desc } from 'drizzle-orm';
import { workoutSessions, sessionExercises, workoutSets } from '@/db/schema/core';
import { trainingProfiles } from '@/db/schema/ai';
import type { TrainingProfileDTO } from '@/types/ai';

export function hashContext(profile: unknown, history: { date: string }[]): string {
  const hash = crypto.createHash('sha256');
  
  const stableHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  hash.update(JSON.stringify({ profile, history: stableHistory }));
  return hash.digest('hex');
}

export async function fetchUserTrainingProfile(userId: string): Promise<TrainingProfileDTO | null> {
  const db = getDb();
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
  const db = getDb();
  const historySets = await db
    .select({
      sessionId: workoutSessions.id,
      sessionDate: workoutSessions.startedAt,
      reps: workoutSets.reps,
      weightKg: workoutSets.weight,
    })
    .from(workoutSets)
    .innerJoin(sessionExercises, eq(workoutSets.sessionExerciseId, sessionExercises.id))
    .innerJoin(workoutSessions, eq(sessionExercises.workoutSessionId, workoutSessions.id))
    .where(
      and(
        eq(sessionExercises.exerciseId, exerciseId),
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, 'completed'),
        eq(workoutSets.isCompleted, true)
      )
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(50);

  const sessionsMap = new Map<string, { date: string; sets: { reps: number; weightKg: number | null }[] }>();
  
  for (const set of historySets) {
    if (!sessionsMap.has(set.sessionId)) {
      sessionsMap.set(set.sessionId, {
        date: set.sessionDate.toISOString(),
        sets: []
      });
    }
    
    const session = sessionsMap.get(set.sessionId);
    if (session) {
      session.sets.push({
        reps: set.reps ?? 0,
        weightKg: set.weightKg !== null ? Number(set.weightKg) : null,
      });
    }
  }

  const history = Array.from(sessionsMap.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
