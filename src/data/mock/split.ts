import { SplitDay } from '@/types';

export const INITIAL_SPLIT_DAYS: SplitDay[] = [
  {
    id: 'day-1',
    name: 'Day A — Heavy Compounds',
    order: 1,
    exercises: [
      { id: 'se-1', exerciseId: 'ex-8', exerciseName: 'Bench Press', muscleGroup: 'Chest', targetSets: 3, targetRepMin: 5, targetRepMax: 5, order: 1, notes: 'Focus on arch and paused rep at bottom' },
      { id: 'se-2', exerciseId: 'ex-9', exerciseName: 'Leg Press', muscleGroup: 'Quads', targetSets: 3, targetRepMin: 8, targetRepMax: 10, order: 2 },
      { id: 'se-3', exerciseId: 'ex-3', exerciseName: 'Seated Cable Row', muscleGroup: 'Back', targetSets: 3, targetRepMin: 8, targetRepMax: 10, order: 3 },
    ],
  },
  {
    id: 'day-2',
    name: 'Day B — Pull + Arms',
    order: 2,
    exercises: [
      { id: 'se-4', exerciseId: 'ex-1', exerciseName: 'Romanian Deadlift', muscleGroup: 'Hamstrings', targetSets: 3, targetRepMin: 6, targetRepMax: 8, order: 1 },
      { id: 'se-5', exerciseId: 'ex-2', exerciseName: 'Lat Pulldown', muscleGroup: 'Lats', targetSets: 3, targetRepMin: 8, targetRepMax: 10, order: 2 },
      { id: 'se-6', exerciseId: 'ex-4', exerciseName: 'Dumbbell Lateral Raise', muscleGroup: 'Delts', targetSets: 4, targetRepMin: 12, targetRepMax: 15, order: 3 },
      { id: 'se-7', exerciseId: 'ex-5', exerciseName: 'Dumbbell Curl', muscleGroup: 'Biceps', targetSets: 3, targetRepMin: 10, targetRepMax: 12, order: 4 },
      { id: 'se-8', exerciseId: 'ex-6', exerciseName: 'Hammer Curl', muscleGroup: 'Forearms/Biceps', targetSets: 3, targetRepMin: 10, targetRepMax: 12, order: 5 },
      { id: 'se-9', exerciseId: 'ex-7', exerciseName: 'Skull Crushers', muscleGroup: 'Triceps', targetSets: 3, targetRepMin: 10, targetRepMax: 12, order: 6 },
    ],
  },
  {
    id: 'day-3',
    name: 'Day C — Legs + Shoulders',
    order: 3,
    exercises: [
      { id: 'se-10', exerciseId: 'ex-9', exerciseName: 'Leg Press', muscleGroup: 'Quads', targetSets: 4, targetRepMin: 10, targetRepMax: 12, order: 1 },
      { id: 'se-11', exerciseId: 'ex-1', exerciseName: 'Romanian Deadlift', muscleGroup: 'Hamstrings', targetSets: 3, targetRepMin: 8, targetRepMax: 10, order: 2 },
      { id: 'se-12', exerciseId: 'ex-4', exerciseName: 'Dumbbell Lateral Raise', muscleGroup: 'Delts', targetSets: 4, targetRepMin: 12, targetRepMax: 15, order: 3 },
    ],
  },
];
