import type { Exercise } from './exercise';

export interface CompletedHistorySet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number;
}

export interface CompletedHistoryExercise {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  notes?: string;
  sets: CompletedHistorySet[];
}

export interface CompletedWorkoutSession {
  id: string;
  sourceSplitDayId: string | null;
  splitDayName: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  notes?: string;
  exercises: CompletedHistoryExercise[];
}

export interface CompletedWorkoutHistoryPage {
  sessions: CompletedWorkoutSession[];
  nextCursor: string | null;
}

export interface ExerciseHistorySession {
  sessionId: string;
  sessionExerciseId: string;
  splitDayName: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  exerciseName: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  notes?: string;
  sets: CompletedHistorySet[];
}

export interface ExerciseHistory {
  exercise: Exercise;
  sessions: ExerciseHistorySession[];
}
