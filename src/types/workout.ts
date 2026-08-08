export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted?: boolean;
}

export interface PreviousPerformanceSet {
  weight: number;
  reps: number;
}

export interface SessionExerciseLog {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  previousPerformance: PreviousPerformanceSet[];
  sets: WorkoutSet[];
}

export interface CompletedSession {
  id: string;
  date: string;
  splitDayId: string;
  splitDayName: string;
  durationMinutes: number;
  notes?: string;
  exercises: SessionExerciseLog[];
}
