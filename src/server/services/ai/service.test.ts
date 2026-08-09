import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAiGuidanceForExercise } from './service';
import * as context from './context';
import * as groq from '@/lib/ai/groq';

// Mock DB, context, and groq
vi.mock('@/db/client', () => ({
  getDb: () => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ name: 'Squat', equipment: 'barbell' }])
        })
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue({})
      })
    })
  })
}));

vi.mock('./context');
vi.mock('@/lib/ai/groq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/groq')>();
  return {
    ...actual,
    fetchGroqRecommendation: vi.fn()
  };
});

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns insufficient_data if history has fewer than 2 sessions', async () => {
    vi.spyOn(context, 'buildExerciseContext').mockResolvedValue({
      profile: null,
      history: [{ date: '2026-08-01', sets: [] }],
      contextHash: 'hash123'
    });

    const result = await getAiGuidanceForExercise('user1', 'ex1', 'key1');
    expect(result.availability).toBe('insufficient_data');
  });

  it('handles API failure by returning unavailable and caching failure', async () => {
    vi.spyOn(context, 'buildExerciseContext').mockResolvedValue({
      profile: null,
      history: [
        { date: '2026-08-01', sets: [{ weightKg: 100, reps: 5 }] },
        { date: '2026-07-28', sets: [{ weightKg: 95, reps: 5 }] }
      ],
      contextHash: 'hash123'
    });

    const error = new groq.GroqClientError('Rate limit', 429);
    vi.spyOn(groq, 'fetchGroqRecommendation').mockRejectedValue(error);

    const result = await getAiGuidanceForExercise('user1', 'ex1', 'key1');
    expect(result.availability).toBe('unavailable');
    if (result.availability === 'unavailable') {
      expect(result.reason).toBe('rate_limited');
      expect(result.retryable).toBe(true);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
