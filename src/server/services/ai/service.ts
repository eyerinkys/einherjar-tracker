import { getDb } from '@/db/client';
import { eq, and } from 'drizzle-orm';
import { aiGuidanceCache } from '@/db/schema/ai';
import { buildExerciseContext } from './context';
import { buildUserPrompt, SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { fetchGroqRecommendation, GroqClientError } from '@/lib/ai/groq';
import { validateSemanticRecommendation } from '@/lib/ai/schemas';
import { exercises } from '@/db/schema/core';
import type { ExerciseAiGuidance } from '@/types/ai';
import type { AiRecommendation } from '@/lib/ai/schemas';

// Timeout for Groq API in ms
const GROQ_TIMEOUT = 10000;
const RETRY_AFTER_SECONDS = 60 * 60; // 1 hour for hard failures
const RATE_LIMIT_RETRY_SECONDS = 60 * 5; // 5 mins for rate limits

function calculateRetryTime(error: any): Date {
  const now = new Date();
  if ((error.name === 'GroqClientError' || error instanceof GroqClientError) && error.status === 429) {
    return new Date(now.getTime() + RATE_LIMIT_RETRY_SECONDS * 1000);
  }
  return new Date(now.getTime() + RETRY_AFTER_SECONDS * 1000);
}

function determineFailureCode(error: any): string {
  if (error.name === 'AbortError') return 'timeout';
  if (error.name === 'GroqClientError' || error instanceof GroqClientError) {
    if (error.status === 429) return 'rate_limited';
    if (error.status && error.status >= 500) return 'provider_error';
    if (error.message && error.message.includes('parse')) return 'invalid_json';
    return 'invalid_response';
  }
  return 'network_error';
}

export async function getAiGuidanceForExercise(
  userId: string,
  exerciseId: string,
  apiKey: string
): Promise<ExerciseAiGuidance> {
  // 1. Build Context
  const context = await buildExerciseContext(userId, exerciseId);
  
  if (context.history.length < 2) {
    return {
      availability: 'insufficient_data',
      exerciseId,
      completedSessionCount: context.history.length,
      requiredSessionCount: 2
    };
  }

  const db = getDb();
  // 2. Fetch exercise details to know if bodyweight
  const exerciseRes = await db.select().from(exercises).where(eq(exercises.id, exerciseId)).limit(1);
  if (exerciseRes.length === 0) {
    throw new Error('Exercise not found');
  }
  const exerciseName = exerciseRes[0].name;
  const isBodyweight = exerciseRes[0].equipment === 'bodyweight';

  // 3. Check Cache
  const cached = await db
    .select()
    .from(aiGuidanceCache)
    .where(
      and(
        eq(aiGuidanceCache.userId, userId),
        eq(aiGuidanceCache.exerciseId, exerciseId)
      )
    )
    .limit(1);

  const now = new Date();

  if (cached.length > 0) {
    const entry = cached[0];
    
    // Check if the context hash is still identical
    if (entry.contextHash === context.contextHash) {
      if (entry.responseJson) {
        return {
          availability: 'available',
          exerciseId,
          latestSessionExerciseId: context.history[0].date, // Simplified for now
          source: 'cache',
          recommendation: entry.responseJson as AiRecommendation
        };
      }
      
      // It's a cached failure. Check if retryable.
      if (entry.retryAfter && new Date(entry.retryAfter) > now) {
        return {
          availability: 'unavailable',
          exerciseId,
          reason: (entry.failureCode as any) || 'provider_error',
          retryable: true,
          retryAfterSeconds: Math.ceil((new Date(entry.retryAfter).getTime() - now.getTime()) / 1000)
        };
      }
    }
  }

  // 4. Fetch from Groq
  if (!apiKey) {
    return {
      availability: 'unavailable',
      exerciseId,
      reason: 'not_configured',
      retryable: false,
      retryAfterSeconds: null
    };
  }

  const prompt = buildUserPrompt(exerciseName, isBodyweight, context.profile, context.history);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), GROQ_TIMEOUT);

  try {
    const recommendation = await fetchGroqRecommendation(SYSTEM_PROMPT, prompt, apiKey, 'openai/gpt-oss-20b', abortController.signal);
    
    // Validate Semantics
    // Transform history for semantic validation
    const highestLoad = isBodyweight ? null : Math.max(...context.history.flatMap(h => h.sets.map((s: any) => s.weightKg)));
    const repsAtLoad = context.history.flatMap(h => h.sets.map((s: any) => ({ loadKg: s.weightKg, reps: s.reps })));
    
    const isValid = validateSemanticRecommendation(recommendation, {
      isBodyweight,
      highestLoadKg: highestLoad === -Infinity ? null : highestLoad,
      repsAtLoad
    });

    if (!isValid) {
      throw new GroqClientError('Semantic validation failed for AI recommendation');
    }

    // Save success to cache
    await db.insert(aiGuidanceCache).values({
      userId,
      exerciseId,
      contextHash: context.contextHash,
      responseJson: recommendation,
      model: 'openai/gpt-oss-20b',
      lastAttemptAt: new Date(),
    }).onConflictDoUpdate({
      target: [aiGuidanceCache.userId, aiGuidanceCache.exerciseId],
      set: {
        contextHash: context.contextHash,
        responseJson: recommendation,
        model: 'openai/gpt-oss-20b',
        failureCode: null,
        lastAttemptAt: new Date(),
        retryAfter: null,
      }
    });

    return {
      availability: 'available',
      exerciseId,
      latestSessionExerciseId: context.history[0].date,
      source: 'groq',
      recommendation
    };

  } catch (error: any) {
    const failureCode = determineFailureCode(error);
    const retryAfterDate = calculateRetryTime(error);

    // Save failure to cache
    await db.insert(aiGuidanceCache).values({
      userId,
      exerciseId,
      contextHash: context.contextHash,
      model: 'openai/gpt-oss-20b',
      failureCode,
      lastAttemptAt: new Date(),
      retryAfter: retryAfterDate,
    }).onConflictDoUpdate({
      target: [aiGuidanceCache.userId, aiGuidanceCache.exerciseId],
      set: {
        contextHash: context.contextHash,
        responseJson: null,
        model: 'openai/gpt-oss-20b',
        failureCode,
        lastAttemptAt: new Date(),
        retryAfter: retryAfterDate,
      }
    });

    return {
      availability: 'unavailable',
      exerciseId,
      reason: failureCode as any,
      retryable: true,
      retryAfterSeconds: Math.ceil((retryAfterDate.getTime() - now.getTime()) / 1000)
    };
  } finally {
    clearTimeout(timeout);
  }
}
