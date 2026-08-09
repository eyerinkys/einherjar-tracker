import { CompletedSession } from '@/types';

export const MOCK_HISTORY_SESSIONS: CompletedSession[] = [
  {
    id: 'sess-4',
    date: '2026-08-06',
    splitDayId: 'day-2',
    splitDayName: 'Day B — Pull + Arms',
    durationMinutes: 52,
    notes: 'Solid energy today. Lat pulldown reps felt smooth and controlled.',
    exercises: [
      {
        exerciseId: 'ex-2',
        exerciseName: 'Lat Pulldown',
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 10,
        previousPerformance: [
          { setNumber: 1, weight: 50, reps: 10 },
          { setNumber: 2, weight: 50, reps: 9 },
          { setNumber: 3, weight: 50, reps: 9 },
        ],
        sets: [
          { setNumber: 1, weight: 50, reps: 10, isCompleted: true },
          { setNumber: 2, weight: 50, reps: 10, isCompleted: true },
          { setNumber: 3, weight: 50, reps: 9, isCompleted: true },
        ],
      },
      {
        exerciseId: 'ex-5',
        exerciseName: 'Dumbbell Curl',
        targetSets: 3,
        targetRepMin: 10,
        targetRepMax: 12,
        previousPerformance: [
          { setNumber: 1, weight: 5, reps: 12 },
          { setNumber: 2, weight: 5, reps: 12 },
          { setNumber: 3, weight: 5, reps: 11 },
        ],
        sets: [
          { setNumber: 1, weight: 5, reps: 12, isCompleted: true },
          { setNumber: 2, weight: 5, reps: 12, isCompleted: true },
          { setNumber: 3, weight: 5, reps: 12, isCompleted: true },
        ],
      },
      {
        exerciseId: 'ex-6',
        exerciseName: 'Hammer Curl',
        targetSets: 3,
        targetRepMin: 10,
        targetRepMax: 12,
        previousPerformance: [
          { setNumber: 1, weight: 7.5, reps: 10 },
          { setNumber: 2, weight: 7.5, reps: 9 },
          { setNumber: 3, weight: 7.5, reps: 8 },
        ],
        sets: [
          { setNumber: 1, weight: 7.5, reps: 10, isCompleted: true },
          { setNumber: 2, weight: 7.5, reps: 10, isCompleted: true },
          { setNumber: 3, weight: 7.5, reps: 9, isCompleted: true },
        ],
      },
      {
        exerciseId: 'ex-4',
        exerciseName: 'Dumbbell Lateral Raise',
        targetSets: 4,
        targetRepMin: 12,
        targetRepMax: 15,
        previousPerformance: [
          { setNumber: 1, weight: 12.5, reps: 14 },
          { setNumber: 2, weight: 12.5, reps: 13 },
          { setNumber: 3, weight: 12.5, reps: 12 },
          { setNumber: 4, weight: 12.5, reps: 12 },
        ],
        sets: [
          { setNumber: 1, weight: 12.5, reps: 12, isCompleted: true },
          { setNumber: 2, weight: 12.5, reps: 10, isCompleted: true },
          { setNumber: 3, weight: 12.5, reps: 9, isCompleted: true },
          { setNumber: 4, weight: 12.5, reps: 8, isCompleted: true },
        ],
      },
    ],
  },
  {
    id: 'sess-3',
    date: '2026-08-04',
    splitDayId: 'day-1',
    splitDayName: 'Day A — Heavy Compounds',
    durationMinutes: 48,
    exercises: [
      {
        exerciseId: 'ex-8',
        exerciseName: 'Bench Press',
        targetSets: 3,
        targetRepMin: 5,
        targetRepMax: 5,
        previousPerformance: [
          { setNumber: 1, weight: 80, reps: 5 },
          { setNumber: 2, weight: 80, reps: 5 },
          { setNumber: 3, weight: 80, reps: 4 },
        ],
        sets: [
          { setNumber: 1, weight: 80, reps: 5, isCompleted: true },
          { setNumber: 2, weight: 80, reps: 5, isCompleted: true },
          { setNumber: 3, weight: 80, reps: 5, isCompleted: true },
        ],
      },
      {
        exerciseId: 'ex-3',
        exerciseName: 'Seated Cable Row',
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 10,
        previousPerformance: [
          { setNumber: 1, weight: 45, reps: 10 },
          { setNumber: 2, weight: 45, reps: 10 },
          { setNumber: 3, weight: 45, reps: 9 },
        ],
        sets: [
          { setNumber: 1, weight: 45, reps: 10, isCompleted: true },
          { setNumber: 2, weight: 45, reps: 10, isCompleted: true },
          { setNumber: 3, weight: 45, reps: 10, isCompleted: true },
        ],
      },
      {
        exerciseId: 'ex-9',
        exerciseName: 'Leg Press',
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 10,
        previousPerformance: [
          { setNumber: 1, weight: 160, reps: 10 },
          { setNumber: 2, weight: 160, reps: 10 },
          { setNumber: 3, weight: 160, reps: 8 },
        ],
        sets: [
          { setNumber: 1, weight: 160, reps: 10, isCompleted: true },
          { setNumber: 2, weight: 160, reps: 10, isCompleted: true },
          { setNumber: 3, weight: 160, reps: 10, isCompleted: true },
        ],
      },
    ],
  },
  {
    id: 'sess-2',
    date: '2026-08-01',
    splitDayId: 'day-2',
    splitDayName: 'Day B — Pull + Arms',
    durationMinutes: 55,
    exercises: [
      {
        exerciseId: 'ex-5',
        exerciseName: 'Dumbbell Curl',
        targetSets: 3,
        targetRepMin: 10,
        targetRepMax: 12,
        previousPerformance: [
          { setNumber: 1, weight: 5, reps: 12 },
          { setNumber: 2, weight: 5, reps: 11 },
          { setNumber: 3, weight: 5, reps: 10 },
        ],
        sets: [
          { setNumber: 1, weight: 5, reps: 12, isCompleted: true },
          { setNumber: 2, weight: 5, reps: 12, isCompleted: true },
          { setNumber: 3, weight: 5, reps: 11, isCompleted: true },
        ],
      },
      {
        exerciseId: 'ex-1',
        exerciseName: 'Romanian Deadlift',
        targetSets: 3,
        targetRepMin: 6,
        targetRepMax: 8,
        previousPerformance: [
          { setNumber: 1, weight: 90, reps: 6 },
          { setNumber: 2, weight: 90, reps: 6 },
          { setNumber: 3, weight: 90, reps: 6 },
        ],
        sets: [
          { setNumber: 1, weight: 90, reps: 6, isCompleted: true },
          { setNumber: 2, weight: 90, reps: 6, isCompleted: true },
          { setNumber: 3, weight: 90, reps: 6, isCompleted: true },
        ],
      },
    ],
  },
  {
    id: 'sess-1',
    date: '2026-07-28',
    splitDayId: 'day-2',
    splitDayName: 'Day B — Pull + Arms',
    durationMinutes: 50,
    exercises: [
      {
        exerciseId: 'ex-5',
        exerciseName: 'Dumbbell Curl',
        targetSets: 3,
        targetRepMin: 10,
        targetRepMax: 12,
        previousPerformance: [],
        sets: [
          { setNumber: 1, weight: 5, reps: 12, isCompleted: true },
          { setNumber: 2, weight: 5, reps: 11, isCompleted: true },
          { setNumber: 3, weight: 5, reps: 10, isCompleted: true },
        ],
      },
    ],
  },
];
