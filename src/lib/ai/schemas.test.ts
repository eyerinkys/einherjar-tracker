import { describe, expect, it } from 'vitest';
import {
  aiRecommendationSchema,
  GROQ_AI_RECOMMENDATION_JSON_SCHEMA,
  validateSemanticRecommendation,
} from './schemas';

describe('aiRecommendationSchema', () => {
  const validRecommendation = {
    nextRecommendedWeightKg: 85,
    targetRepRange: { min: 5, max: 8 },
    probableNextPR: { weightKg: 87.5, reps: 5 },
    reasoning: 'Consistent progress on bench press at 82.5kg.',
    confidence: 'high' as const,
  };

  it('parses valid weighted recommendation', () => {
    const result = aiRecommendationSchema.safeParse(validRecommendation);
    expect(result.success).toBe(true);
  });

  it('parses valid bodyweight recommendation', () => {
    const bwRecommendation = {
      ...validRecommendation,
      nextRecommendedWeightKg: null,
      probableNextPR: { weightKg: null, reps: 15 },
    };
    const result = aiRecommendationSchema.safeParse(bwRecommendation);
    expect(result.success).toBe(true);
  });

  it('rejects extra properties', () => {
    const result = aiRecommendationSchema.safeParse({
      ...validRecommendation,
      extraField: 'should fail',
    });
    expect(result.success).toBe(false);
  });

  it('rejects targetRepRange where min > max', () => {
    const result = aiRecommendationSchema.safeParse({
      ...validRecommendation,
      targetRepRange: { min: 10, max: 5 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects reasoning longer than 280 characters', () => {
    const longReasoning = 'a'.repeat(281);
    const result = aiRecommendationSchema.safeParse({
      ...validRecommendation,
      reasoning: longReasoning,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid confidence value', () => {
    const result = aiRecommendationSchema.safeParse({
      ...validRecommendation,
      confidence: 'certain',
    });
    expect(result.success).toBe(false);
  });
});

describe('GROQ_AI_RECOMMENDATION_JSON_SCHEMA', () => {
  it('has strict mode flags and required properties', () => {
    expect(GROQ_AI_RECOMMENDATION_JSON_SCHEMA.type).toBe('object');
    expect(GROQ_AI_RECOMMENDATION_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(GROQ_AI_RECOMMENDATION_JSON_SCHEMA.required).toEqual([
      'nextRecommendedWeightKg',
      'targetRepRange',
      'probableNextPR',
      'reasoning',
      'confidence',
    ]);
  });
});

describe('validateSemanticRecommendation', () => {
  it('validates weighted PR exceeding highest load', () => {
    const rec = {
      nextRecommendedWeightKg: 85,
      targetRepRange: { min: 5, max: 8 },
      probableNextPR: { weightKg: 90, reps: 5 },
      reasoning: 'Ready for 90kg.',
      confidence: 'high' as const,
    };
    const context = {
      isBodyweight: false,
      highestLoadKg: 85,
      repsAtLoad: [{ loadKg: 85, reps: 5 }],
    };
    expect(validateSemanticRecommendation(rec, context)).toBe(true);
  });

  it('validates weighted PR exceeding reps at same load', () => {
    const rec = {
      nextRecommendedWeightKg: 85,
      targetRepRange: { min: 5, max: 8 },
      probableNextPR: { weightKg: 85, reps: 6 },
      reasoning: 'Aim for 6 reps at 85kg.',
      confidence: 'medium' as const,
    };
    const context = {
      isBodyweight: false,
      highestLoadKg: 85,
      repsAtLoad: [{ loadKg: 85, reps: 5 }],
    };
    expect(validateSemanticRecommendation(rec, context)).toBe(true);
  });

  it('rejects weighted PR that does not improve load or reps', () => {
    const rec = {
      nextRecommendedWeightKg: 85,
      targetRepRange: { min: 5, max: 8 },
      probableNextPR: { weightKg: 85, reps: 5 },
      reasoning: 'Repeat 5 reps.',
      confidence: 'medium' as const,
    };
    const context = {
      isBodyweight: false,
      highestLoadKg: 85,
      repsAtLoad: [{ loadKg: 85, reps: 5 }],
    };
    expect(validateSemanticRecommendation(rec, context)).toBe(false);
  });

  it('validates bodyweight PR exceeding max reps', () => {
    const rec = {
      nextRecommendedWeightKg: null,
      targetRepRange: { min: 10, max: 15 },
      probableNextPR: { weightKg: null, reps: 20 },
      reasoning: 'Aim for 20 pull-ups.',
      confidence: 'high' as const,
    };
    const context = {
      isBodyweight: true,
      highestLoadKg: null,
      repsAtLoad: [{ loadKg: null, reps: 18 }],
    };
    expect(validateSemanticRecommendation(rec, context)).toBe(true);
  });

  it('rejects bodyweight PR with numeric weight', () => {
    const rec = {
      nextRecommendedWeightKg: 10,
      targetRepRange: { min: 10, max: 15 },
      probableNextPR: { weightKg: 10, reps: 20 },
      reasoning: 'Should fail for bodyweight exercise context.',
      confidence: 'high' as const,
    };
    const context = {
      isBodyweight: true,
      highestLoadKg: null,
      repsAtLoad: [{ loadKg: null, reps: 18 }],
    };
    expect(validateSemanticRecommendation(rec, context)).toBe(false);
  });
});
