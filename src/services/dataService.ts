import {
  User,
  UserTrainingProfile,
  Exercise,
  SplitDay,
  BodyweightEntry,
  ProgressPhoto,
} from '@/types';
import {
  MOCK_USER,
  MOCK_USER_PROFILE,
  MOCK_EXERCISES,
  INITIAL_SPLIT_DAYS,
  MOCK_BODYWEIGHT_LOGS,
  MOCK_PROGRESS_PHOTOS,
} from '@/data/mock';

/**
 * Data Service Abstraction Boundary
 * 
 * Provides a clean interface for UI components to retrieve and store data.
 * Currently backed by centralized in-memory mock data.
 * Can be cleanly swapped with Neon/Drizzle API adapters in the future.
 */

export function getCurrentUser(): User {
  return MOCK_USER;
}

export function getUserProfile(): UserTrainingProfile {
  return MOCK_USER_PROFILE;
}

export function getExercises(): Exercise[] {
  return MOCK_EXERCISES;
}

export function getSplitDays(): SplitDay[] {
  return INITIAL_SPLIT_DAYS;
}

export function getBodyweightLogs(): BodyweightEntry[] {
  return MOCK_BODYWEIGHT_LOGS;
}

export function getProgressPhotos(): ProgressPhoto[] {
  return MOCK_PROGRESS_PHOTOS;
}

/**
 * Deterministic helper calculation for Estimated 1RM (Epley Formula)
 * e1RM = weight * (1 + reps / 30)
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const estimated = weight * (1 + reps / 30);
  return Math.round(estimated * 10) / 10;
}
