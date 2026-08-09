// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActiveWorkout, SplitDay } from '@/types';

const { completeWorkout, discardWorkout, refresh, saveWorkoutDraft, startWorkout } = vi.hoisted(() => ({
  completeWorkout: vi.fn(), discardWorkout: vi.fn(), refresh: vi.fn(), saveWorkoutDraft: vi.fn(), startWorkout: vi.fn(),
}));
vi.mock('@/actions/workouts', () => ({ completeWorkout, discardWorkout, saveWorkoutDraft, startWorkout }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { TrainView } from './TrainView';

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const splitDays: SplitDay[] = [{
  id: id('1'), name: 'Push', order: 1,
  exercises: [{ id: id('2'), exerciseId: id('3'), exerciseName: 'Bench Press', muscleGroup: 'Chest', targetSets: 2, targetRepMin: 8, targetRepMax: 10, order: 1 }],
}];
const activeWorkout: ActiveWorkout = {
  id: id('4'), sourceSplitDayId: id('1'), splitDayName: 'Push', startedAt: '2026-08-09T03:00:00.000Z', version: 2, notes: '',
  exercises: [{ id: id('5'), exerciseId: id('3'), exerciseName: 'Bench Press', targetSets: 2, targetRepMin: 8, targetRepMax: 10, previousPerformance: [], sets: [
    { id: id('6'), setNumber: 1, weight: 50, reps: 8, isCompleted: false },
    { id: id('7'), setNumber: 2, weight: null, reps: 8, isCompleted: false },
  ] }],
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('persistent workout logging', () => {
  it('starts an owned split and reconciles the authoritative active workout', async () => {
    startWorkout.mockResolvedValue({ ok: true, data: activeWorkout });
    const onWorkoutChange = vi.fn();
    render(<TrainView splitDays={splitDays} activeWorkout={null} onWorkoutChange={onWorkoutChange} onPendingChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start workout' }));
    expect(startWorkout).toHaveBeenCalledWith({ splitDayId: id('1') });
    expect(onWorkoutChange).toHaveBeenCalledWith(activeWorkout);
  });

  it('falls back to the first current day if the selected split day is deleted', async () => {
    const secondDay = { ...splitDays[0], id: id('9'), name: 'Pull' };
    startWorkout.mockResolvedValue({ ok: true, data: activeWorkout });
    const view = render(<TrainView splitDays={[splitDays[0], secondDay]} activeWorkout={null} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Workout day' }), secondDay.id);
    view.rerender(<TrainView splitDays={splitDays} activeWorkout={null} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start workout' }));
    expect(startWorkout).toHaveBeenCalledWith({ splitDayId: splitDays[0].id });
  });

  it('resumes an active workout after its last source split day is deleted', () => {
    render(<TrainView splitDays={[]} activeWorkout={{ ...activeWorkout, sourceSplitDayId: null }} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Discard workout' })).toBeTruthy();
  });

  it('edits numeric values, adds and removes stable sets, and saves the complete draft version', async () => {
    saveWorkoutDraft.mockImplementation(async (input) => ({ ok: true, data: { ...activeWorkout, version: 3, notes: input.notes } }));
    render(<TrainView splitDays={splitDays} activeWorkout={activeWorkout} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);
    const weight = screen.getByRole('spinbutton', { name: 'Weight for set 1' });
    await userEvent.clear(weight);
    await userEvent.type(weight, '82.5');
    await userEvent.click(screen.getByRole('button', { name: 'Mark set 1 complete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add set to Bench Press' }));
    expect(screen.getAllByRole('button', { name: /Remove set/ })).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Remove set 2' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Workout notes' }), 'Felt strong');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(saveWorkoutDraft).toHaveBeenCalledWith(expect.objectContaining({
      workoutSessionId: id('4'), version: 2, notes: 'Felt strong',
      exercises: [expect.objectContaining({ sessionExerciseId: id('5'), sets: expect.arrayContaining([expect.objectContaining({ id: id('6'), weight: 82.5, reps: 8, isCompleted: true })]) })],
    }));
  });

  it('keeps the final set and exposes that removal is unavailable', () => {
    const oneSetWorkout = { ...activeWorkout, exercises: [{ ...activeWorkout.exercises[0], sets: [activeWorkout.exercises[0].sets[0]] }] };
    render(<TrainView splitDays={splitDays} activeWorkout={oneSetWorkout} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Remove set 1' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows weighted, bodyweight, and missing-position previous performance without shifting sets', () => {
    const workoutWithPrevious = {
      ...activeWorkout,
      exercises: [{
        ...activeWorkout.exercises[0],
        previousPerformance: [
          { setNumber: 1, weight: 80, reps: 10 },
          { setNumber: 3, weight: null, reps: 12 },
        ],
        sets: [
          activeWorkout.exercises[0].sets[0],
          activeWorkout.exercises[0].sets[1],
          { id: id('8'), setNumber: 3, weight: null, reps: 8, isCompleted: false },
        ],
      }],
    };

    render(<TrainView splitDays={splitDays} activeWorkout={workoutWithPrevious} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);

    expect(screen.getAllByText('80kg × 10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('First set').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bodyweight × 12').length).toBeGreaterThan(0);
    expect(screen.queryByText(/nullkg/)).toBeNull();
  });

  it('preserves edits and exposes recovery when a stale save conflicts', async () => {
    saveWorkoutDraft.mockResolvedValue({ ok: false, code: 'CONFLICT', message: 'Workout changed in another tab. Reload and try again.' });
    render(<TrainView splitDays={splitDays} activeWorkout={activeWorkout} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);
    const notes = screen.getByRole('textbox', { name: 'Workout notes' });
    await userEvent.type(notes, 'Keep this');
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect((notes as HTMLTextAreaElement).value).toBe('Keep this');
    expect(screen.getByRole('alert').textContent).toContain('Workout changed in another tab');
    expect(screen.getByRole('button', { name: 'Reload workout' })).toBeTruthy();
  });

  it('recovers controls and preserves the draft when a workout request is interrupted', async () => {
    saveWorkoutDraft.mockRejectedValue(new Error('Network request interrupted'));
    const onPendingChange = vi.fn();
    render(<TrainView splitDays={splitDays} activeWorkout={activeWorkout} onWorkoutChange={vi.fn()} onPendingChange={onPendingChange} />);
    const notes = screen.getByRole('textbox', { name: 'Workout notes' });
    await userEvent.type(notes, 'Keep this offline');

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect((notes as HTMLTextAreaElement).value).toBe('Keep this offline');
    expect(screen.getByRole('alert').textContent).toContain('Unable to update the workout');
    expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(false);
    expect(onPendingChange).toHaveBeenNthCalledWith(1, true);
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
  });

  it('requires confirmation to discard and clears the active workout after success', async () => {
    discardWorkout.mockResolvedValue({ ok: true, data: null });
    const onWorkoutChange = vi.fn();
    render(<TrainView splitDays={splitDays} activeWorkout={activeWorkout} onWorkoutChange={onWorkoutChange} onPendingChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Discard workout' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm discard' }));
    expect(discardWorkout).toHaveBeenCalledWith({ workoutSessionId: id('4'), version: 2 });
    expect(onWorkoutChange).toHaveBeenCalledWith(null);
  });

  it('completes the current draft and shows server-derived duration', async () => {
    completeWorkout.mockResolvedValue({ ok: true, data: { id: id('4'), completedAt: '2026-08-09T04:00:00.000Z', durationMinutes: 60 } });
    render(<TrainView splitDays={splitDays} activeWorkout={{ ...activeWorkout, exercises: [{ ...activeWorkout.exercises[0], sets: [{ ...activeWorkout.exercises[0].sets[0], isCompleted: true }] }] }} onWorkoutChange={vi.fn()} onPendingChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Finish workout' }));
    expect(await screen.findByRole('heading', { name: 'Workout session saved' })).toBeTruthy();
    expect(screen.getByText('60 minutes')).toBeTruthy();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
