import type { AiRecommendation } from '@/lib/ai/schemas';

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
export type PrimaryGoal = 'strength' | 'hypertrophy' | 'general_fitness';
export type PreferredProgressionMethod =
  | 'double_progression'
  | 'linear_progression'
  | 'rep_progression';

export interface TrainingProfileDTO {
  trainingExperience: TrainingExperience | null;
  primaryGoal: PrimaryGoal | null;
  preferredProgressionMethod: PreferredProgressionMethod | null;
  availableWeightIncrementsKg: number[];
  generalTrainingNotes: string | null;
}

export type AiUnavailableReason =
  | 'not_configured'
  | 'timeout'
  | 'rate_limited'
  | 'network_error'
  | 'provider_error'
  | 'invalid_json'
  | 'invalid_response';

export type ExerciseAiGuidance =
  | {
      availability: 'available';
      exerciseId: string;
      latestSessionExerciseId: string;
      source: 'cache' | 'groq';
      recommendation: AiRecommendation;
    }
  | {
      availability: 'insufficient_data';
      exerciseId: string;
      completedSessionCount: number;
      requiredSessionCount: 2;
    }
  | {
      availability: 'unavailable';
      exerciseId: string;
      reason: AiUnavailableReason;
      retryable: boolean;
      retryAfterSeconds: number | null;
    };
