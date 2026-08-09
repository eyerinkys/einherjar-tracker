export interface WorkoutSet {
  id?: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  isCompleted?: boolean;
}

export interface PreviousPerformanceSet {
  weight: number | null;
  reps: number;
}

export interface SessionExerciseLog {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  notes?: string;
  previousPerformance: PreviousPerformanceSet[];
  sets: WorkoutSet[];
}

export interface ActiveWorkoutSet extends WorkoutSet {
  id: string;
  isCompleted: boolean;
}

export interface ActiveWorkoutExercise extends Omit<SessionExerciseLog, 'id' | 'sets'> {
  id: string;
  sets: ActiveWorkoutSet[];
}

export interface ActiveWorkout {
  id: string;
  sourceSplitDayId: string | null;
  splitDayName: string;
  startedAt: string;
  version: number;
  notes: string;
  exercises: ActiveWorkoutExercise[];
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
