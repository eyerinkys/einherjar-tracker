import { z } from 'zod';
import { MAX_TARGET_REPS } from '@/server/validation/split';
import {
  MAX_WORKOUT_REPS,
  MAX_WORKOUT_WEIGHT_KG,
} from '@/server/validation/workout';

const predictedWeightSchema = z
  .number()
  .finite()
  .min(0)
  .max(MAX_WORKOUT_WEIGHT_KG)
  .nullable();

export const aiRecommendationSchema = z
  .object({
    nextRecommendedWeightKg: predictedWeightSchema,
    targetRepRange: z
      .object({
        min: z.number().int().min(1).max(MAX_TARGET_REPS),
        max: z.number().int().min(1).max(MAX_TARGET_REPS),
      })
      .strict(),
    probableNextPR: z
      .object({
        weightKg: predictedWeightSchema,
        reps: z.number().int().min(1).max(MAX_WORKOUT_REPS),
      })
      .strict(),
    reasoning: z.string().trim().min(1).max(280),
    confidence: z.enum(['low', 'medium', 'high']),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.targetRepRange.min > value.targetRepRange.max) {
      context.addIssue({
        code: 'custom',
        path: ['targetRepRange', 'min'],
        message: 'Minimum reps cannot exceed maximum reps.',
      });
    }
  });

export type AiRecommendation = z.infer<typeof aiRecommendationSchema>;

export const GROQ_AI_RECOMMENDATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    nextRecommendedWeightKg: {
      anyOf: [
        { type: 'number', minimum: 0, maximum: MAX_WORKOUT_WEIGHT_KG },
        { type: 'null' },
      ],
    },
    targetRepRange: {
      type: 'object',
      properties: {
        min: { type: 'integer', minimum: 1, maximum: MAX_TARGET_REPS },
        max: { type: 'integer', minimum: 1, maximum: MAX_TARGET_REPS },
      },
      required: ['min', 'max'],
      additionalProperties: false,
    },
    probableNextPR: {
      type: 'object',
      properties: {
        weightKg: {
          anyOf: [
            { type: 'number', minimum: 0, maximum: MAX_WORKOUT_WEIGHT_KG },
            { type: 'null' },
          ],
        },
        reps: { type: 'integer', minimum: 1, maximum: MAX_WORKOUT_REPS },
      },
      required: ['weightKg', 'reps'],
      additionalProperties: false,
    },
    reasoning: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: [
    'nextRecommendedWeightKg',
    'targetRepRange',
    'probableNextPR',
    'reasoning',
    'confidence',
  ],
  additionalProperties: false,
} as const;

export function validateSemanticRecommendation(
  recommendation: AiRecommendation,
  context: {
    isBodyweight: boolean;
    highestLoadKg: number | null;
    repsAtLoad: Array<{ loadKg: number | null; reps: number }>;
  }
): boolean {
  if (context.isBodyweight) {
    if (
      recommendation.nextRecommendedWeightKg !== null ||
      recommendation.probableNextPR.weightKg !== null
    ) {
      return false;
    }
    const currentReps =
      context.repsAtLoad.find((r) => r.loadKg === null)?.reps ?? 0;
    return recommendation.probableNextPR.reps > currentReps;
  }

  // Weighted exercise
  if (
    recommendation.nextRecommendedWeightKg === null ||
    recommendation.probableNextPR.weightKg === null
  ) {
    return false;
  }

  const predWeight = recommendation.probableNextPR.weightKg;
  const predReps = recommendation.probableNextPR.reps;

  // A predicted weighted PR must exceed highest load OR exceed reps at that exact load
  if (context.highestLoadKg !== null && predWeight > context.highestLoadKg) {
    return true;
  }

  const currentRepsAtPredWeight =
    context.repsAtLoad.find((r) => r.loadKg === predWeight)?.reps ?? 0;
  return predReps > currentRepsAtPredWeight;
}
