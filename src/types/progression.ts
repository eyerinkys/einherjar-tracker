export type ProgressionStatus =
  | 'PROGRESSING'
  | 'READY_TO_INCREASE_LOAD'
  | 'ADAPTING_TO_NEW_LOAD'
  | 'STALLED'
  | 'REGRESSING'
  | 'INSUFFICIENT_DATA';

export interface ProgressionAnalysis {
  status: ProgressionStatus;
  repChange: number;
  loadChange: number;
  volumeChange: number;
  estimated1RMChange: number;
  explanation: string;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  achievedDate: string;
  isNewRecord?: boolean;
}

// Alias for backwards compatibility if needed
export type ExercisePR = PersonalRecord;

export interface ProbablePR {
  exerciseId: string;
  weight: number;
  targetReps: number;
  estimated1RM: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface CompactProgressionInfo {
  status: ProgressionStatus;
  comparisonText: string;
  nextStep: string;
  likelyNextPR: { weight: number; reps: number };
}

export interface AIInsight {
  exerciseId: string;
  exerciseName: string;
  status: ProgressionStatus;
  nextWeight: number;
  targetRepMin: number;
  targetRepMax: number;
  comparisonText: string;
  probableNextPR: { weight: number; reps: number };
  confidence: 'high' | 'medium' | 'low';
  guidance: string;
  reasoning: string;
  lastSessionReps: string;
  previousSessionReps: string;
}

export interface ExerciseProgressionPoint {
  date: string;
  weight: number;
  maxReps: number;
  estimated1RM: number;
  totalVolume: number;
}
