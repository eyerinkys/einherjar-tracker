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

export interface WorkoutFactSet {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
}

export interface RepsAtLoad {
  loadKg: number | null;
  reps: number;
}

export interface WorkoutFactMetrics {
  plannedSetCount: number;
  totalPlannedReps: number;
  plannedVolumeKg: number;
  fullSessionVolumeKg: number;
  workingLoadKg: number | null;
  maximumLoadKg: number | null;
  maximumRepsByLoad: RepsAtLoad[];
  bestEstimated1RMKg: number | null;
}

export interface WorkoutMetricChanges {
  workingLoadKg: number | null;
  totalPlannedReps: number;
  plannedVolumeKg: number;
  fullSessionVolumeKg: number;
  bestEstimated1RMKg: number | null;
}

export interface WorkoutFact {
  exerciseId: string;
  sessionId: string;
  sessionExerciseId: string;
  completedAt: string;
  exerciseName: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  plannedSets: WorkoutFactSet[];
  completedSets: WorkoutFactSet[];
  metrics: WorkoutFactMetrics;
  deltaFromPrevious: WorkoutMetricChanges | null;
}

export interface DerivedWorkoutFacts {
  facts: WorkoutFact[];
  recentDirection: WorkoutMetricChanges | null;
}

interface PersonalRecordAchievementBase {
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sessionExerciseId: string;
  achievedAt: string;
}

export interface HighestLoadRecordAchievement extends PersonalRecordAchievementBase {
  type: 'HIGHEST_LOAD';
  loadKg: number;
  previousBestKg: number | null;
}

export interface RepsAtLoadRecordAchievement extends PersonalRecordAchievementBase {
  type: 'REPS_AT_LOAD';
  loadKg: number | null;
  reps: number;
  previousBestReps: number | null;
}

export interface Estimated1RMRecordAchievement extends PersonalRecordAchievementBase {
  type: 'ESTIMATED_1RM';
  estimated1RMKg: number;
  previousBestEstimated1RMKg: number | null;
}

export interface SessionVolumeRecordAchievement extends PersonalRecordAchievementBase {
  type: 'SESSION_VOLUME';
  volumeKg: number;
  previousBestVolumeKg: number | null;
}

export type PersonalRecordAchievement =
  | HighestLoadRecordAchievement
  | RepsAtLoadRecordAchievement
  | Estimated1RMRecordAchievement
  | SessionVolumeRecordAchievement;

export interface DerivedPersonalRecords {
  achievements: PersonalRecordAchievement[];
  current: {
    highestLoad: HighestLoadRecordAchievement | null;
    repsAtLoad: RepsAtLoadRecordAchievement[];
    estimated1RM: Estimated1RMRecordAchievement | null;
    sessionVolume: SessionVolumeRecordAchievement | null;
  };
}
