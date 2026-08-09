import { describe, expect, it } from 'vitest';
import {
  completeWorkoutInputSchema,
  discardWorkoutInputSchema,
  saveWorkoutDraftInputSchema,
  startWorkoutInputSchema,
} from './workout';

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

const validDraft = {
  workoutSessionId: id('1'),
  version: 1,
  notes: 'Strong session',
  exercises: [
    {
      sessionExerciseId: id('2'),
      sets: [
        { id: id('3'), weight: 82.5, reps: 8, isCompleted: true },
        { id: id('4'), weight: null, reps: null, isCompleted: false },
      ],
    },
  ],
};

describe('workout action validation', () => {
  it('accepts the bounded lifecycle and complete-draft inputs', () => {
    expect(startWorkoutInputSchema.parse({ splitDayId: id('1') })).toEqual({ splitDayId: id('1') });
    expect(discardWorkoutInputSchema.parse({ workoutSessionId: id('1'), version: 2 })).toEqual({
      workoutSessionId: id('1'),
      version: 2,
    });
    expect(saveWorkoutDraftInputSchema.parse(validDraft)).toEqual(validDraft);
    expect(completeWorkoutInputSchema.parse(validDraft)).toEqual(validDraft);
  });

  it.each([
    { ...validDraft, version: 0 },
    { ...validDraft, notes: 'x'.repeat(1_001) },
    { ...validDraft, userId: 'forged' },
    { ...validDraft, exercises: [{ ...validDraft.exercises[0], sets: [] }] },
    { ...validDraft, exercises: [{ ...validDraft.exercises[0], sets: Array.from({ length: 31 }, (_, index) => ({ id: id(String(index + 10)), weight: 20, reps: 5, isCompleted: false })) }] },
    { ...validDraft, exercises: [{ ...validDraft.exercises[0], sets: [{ id: id('3'), weight: Number.NaN, reps: 8, isCompleted: true }] }] },
    { ...validDraft, exercises: [{ ...validDraft.exercises[0], sets: [{ id: id('3'), weight: 1_500.1, reps: 8, isCompleted: true }] }] },
    { ...validDraft, exercises: [{ ...validDraft.exercises[0], sets: [{ id: id('3'), weight: 20, reps: 1_001, isCompleted: true }] }] },
    { ...validDraft, exercises: [{ ...validDraft.exercises[0], sets: [{ id: id('3'), weight: null, reps: 8, isCompleted: true }] }] },
    { ...validDraft, exercises: [{ ...validDraft.exercises[0], sets: [{ id: id('3'), weight: 20, reps: null, isCompleted: true }] }] },
  ])('rejects malformed, forged, oversized, or incomplete completed-set data', (input) => {
    expect(saveWorkoutDraftInputSchema.safeParse(input).success).toBe(false);
  });

  it('rejects duplicate exercise and set IDs', () => {
    expect(saveWorkoutDraftInputSchema.safeParse({
      ...validDraft,
      exercises: [validDraft.exercises[0], validDraft.exercises[0]],
    }).success).toBe(false);
    expect(saveWorkoutDraftInputSchema.safeParse({
      ...validDraft,
      exercises: [{
        ...validDraft.exercises[0],
        sets: [validDraft.exercises[0].sets[0], validDraft.exercises[0].sets[0]],
      }],
    }).success).toBe(false);
  });
});
