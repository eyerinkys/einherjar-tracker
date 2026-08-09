// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Exercise, ExerciseHistory } from '@/types';

const { getExerciseWorkoutHistory } = vi.hoisted(() => ({
  getExerciseWorkoutHistory: vi.fn(),
}));

vi.mock('@/actions/history', () => ({ getExerciseWorkoutHistory }));
vi.mock('@/services/dataService', () => ({
  getExerciseProgression: vi.fn(() => []),
  getAIInsightForExercise: vi.fn(() => undefined),
  getAchievedPRs: vi.fn(() => []),
}));

import { ExerciseDetailView } from './ExerciseDetailView';

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const exercises: Exercise[] = [
  { id: id('1'), name: 'Ring Row', muscleGroup: 'Back', equipment: 'Rings', category: 'compound', isCustom: true },
  { id: id('2'), name: 'Push-up', muscleGroup: 'Chest', equipment: 'Bodyweight', category: 'compound', isCustom: true },
  { id: id('3'), name: 'Split Squat', muscleGroup: 'Legs', equipment: 'Dumbbell', category: 'compound', isCustom: true },
];

function history(exercise: Exercise, suffix: string, weight: number | null = 40): ExerciseHistory {
  return {
    exercise,
    sessions: [{
      sessionId: id(`${suffix}1`),
      sessionExerciseId: id(`${suffix}2`),
      splitDayName: `${exercise.name} Day Snapshot`,
      startedAt: '2026-08-08T19:30:00.000Z',
      completedAt: '2026-08-08T20:30:00.000Z',
      durationMinutes: 60,
      exerciseName: `${exercise.name} Snapshot`,
      targetSets: 1,
      targetRepMin: 8,
      targetRepMax: 12,
      notes: 'Historical setup note',
      sets: [{ id: id(`${suffix}3`), setNumber: 1, weight, reps: 12 }],
    }],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve; });
  return { promise, resolve };
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('factual per-exercise history', () => {
  it('hydrates the first visible exercise with factual chronological session details', () => {
    render(<ExerciseDetailView exercises={exercises} initialExerciseHistory={history(exercises[0], '1', null)} />);

    expect((screen.getByRole('combobox', { name: /Exercise detailed progression analysis/i }) as HTMLSelectElement).value).toBe(exercises[0].id);
    expect(screen.getByText(/9 Aug 2026/)).toBeTruthy();
    expect(screen.getByText('Ring Row Day Snapshot')).toBeTruthy();
    expect(screen.getByText('Ring Row Snapshot')).toBeTruthy();
    expect(screen.getByText('Target: 1×8–12')).toBeTruthy();
    expect(screen.getAllByText('Bodyweight × 12').length).toBeGreaterThan(0);
    expect(screen.getByText('Historical setup note')).toBeTruthy();
  });


  it('loads the newly selected exercise through the authenticated action', async () => {
    getExerciseWorkoutHistory.mockResolvedValue({ ok: true, data: history(exercises[1], '2') });
    render(<ExerciseDetailView exercises={exercises} initialExerciseHistory={history(exercises[0], '1')} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), exercises[1].id);

    expect(await screen.findByText('Push-up Day Snapshot')).toBeTruthy();
    expect(getExerciseWorkoutHistory).toHaveBeenCalledWith({ exerciseId: exercises[1].id });
    expect(screen.queryByText('Ring Row Day Snapshot')).toBeNull();
  });

  it('reconciles a selected non-initial exercise to refreshed first-exercise history without indefinite loading', async () => {
    const refreshedFirstHistory = history(exercises[0], '4');
    refreshedFirstHistory.sessions[0].splitDayName = 'Refreshed Ring Row Day';
    getExerciseWorkoutHistory.mockResolvedValue({ ok: true, data: history(exercises[1], '2') });
    const view = render(
      <ExerciseDetailView exercises={exercises} initialExerciseHistory={history(exercises[0], '1')} />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox'), exercises[1].id);
    expect(await screen.findByText('Push-up Day Snapshot')).toBeTruthy();

    view.rerender(
      <ExerciseDetailView exercises={exercises} initialExerciseHistory={refreshedFirstHistory} />,
    );

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe(exercises[0].id);
    expect(screen.getByText('Refreshed Ring Row Day')).toBeTruthy();
    expect(screen.queryByText(/Loading completed history/)).toBeNull();
    expect(screen.queryByText('Push-up Day Snapshot')).toBeNull();
  });

  it('renders an honest selected-exercise empty state', async () => {
    getExerciseWorkoutHistory.mockResolvedValue({ ok: true, data: { exercise: exercises[1], sessions: [] } });
    render(<ExerciseDetailView exercises={exercises} initialExerciseHistory={history(exercises[0], '1')} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), exercises[1].id);

    expect(await screen.findByRole('heading', { name: 'No Completed History for Push-up' })).toBeTruthy();
    expect(screen.queryByText('Ring Row Day Snapshot')).toBeNull();
  });

  it.each([
    ['action failure', () => Promise.resolve({ ok: false as const, code: 'NOT_FOUND' as const, message: 'foreign owner id' })],
    ['transport failure', () => Promise.reject(new Error('database socket'))],
  ])('shows a safe scoped retry and preserves the selector after %s', async (_label, fail) => {
    getExerciseWorkoutHistory
      .mockImplementationOnce(fail)
      .mockResolvedValueOnce({ ok: true, data: history(exercises[1], '2') });
    render(<ExerciseDetailView exercises={exercises} initialExerciseHistory={history(exercises[0], '1')} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), exercises[1].id);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Unable to load history for Push-up. Try again.');
    expect(alert.textContent).not.toMatch(/foreign|owner|database|socket/i);
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe(exercises[1].id);

    await userEvent.click(screen.getByRole('button', { name: 'Retry Push-up history' }));

    expect(await screen.findByText('Push-up Day Snapshot')).toBeTruthy();
    expect(getExerciseWorkoutHistory).toHaveBeenNthCalledWith(1, { exerciseId: exercises[1].id });
    expect(getExerciseWorkoutHistory).toHaveBeenNthCalledWith(2, { exerciseId: exercises[1].id });
  });

  it('does not show old content under a new label or allow an older response to overwrite a newer selection', async () => {
    const pushRequest = deferred<Awaited<ReturnType<typeof getExerciseWorkoutHistory>>>();
    const squatRequest = deferred<Awaited<ReturnType<typeof getExerciseWorkoutHistory>>>();
    getExerciseWorkoutHistory
      .mockReturnValueOnce(pushRequest.promise)
      .mockReturnValueOnce(squatRequest.promise);
    render(<ExerciseDetailView exercises={exercises} initialExerciseHistory={history(exercises[0], '1')} />);
    const selector = screen.getByRole('combobox');

    await userEvent.selectOptions(selector, exercises[1].id);
    expect(screen.queryByText('Ring Row Day Snapshot')).toBeNull();
    expect(screen.getByText('Loading completed history for Push-up…')).toBeTruthy();

    await userEvent.selectOptions(selector, exercises[2].id);
    squatRequest.resolve({ ok: true, data: history(exercises[2], '3') });
    expect(await screen.findByText('Split Squat Day Snapshot')).toBeTruthy();

    pushRequest.resolve({ ok: true, data: history(exercises[1], '2') });
    await vi.waitFor(() => expect(screen.queryByText('Push-up Day Snapshot')).toBeNull());
    expect(screen.getByText('Split Squat Day Snapshot')).toBeTruthy();
    expect((selector as HTMLSelectElement).value).toBe(exercises[2].id);
  });

  it('renders real Phase 6 progression status, achieved PR facts, and deterministic explanation for multi-session history', () => {
    const multiSessionHistory: ExerciseHistory = {
      exercise: exercises[0],
      sessions: [
        {
          sessionId: id('s1'),
          sessionExerciseId: id('se1'),
          splitDayName: 'Ring Row Day 1',
          startedAt: '2026-08-01T10:00:00.000Z',
          completedAt: '2026-08-01T11:00:00.000Z',
          durationMinutes: 60,
          exerciseName: 'Ring Row',
          targetSets: 2,
          targetRepMin: 8,
          targetRepMax: 10,
          notes: null,
          sets: [
            { id: id('set1'), setNumber: 1, weight: 80, reps: 8 },
            { id: id('set2'), setNumber: 2, weight: 80, reps: 8 },
          ],
        },
        {
          sessionId: id('s2'),
          sessionExerciseId: id('se2'),
          splitDayName: 'Ring Row Day 2',
          startedAt: '2026-08-05T10:00:00.000Z',
          completedAt: '2026-08-05T11:00:00.000Z',
          durationMinutes: 60,
          exerciseName: 'Ring Row',
          targetSets: 2,
          targetRepMin: 8,
          targetRepMax: 10,
          notes: null,
          sets: [
            { id: id('set3'), setNumber: 1, weight: 80, reps: 10 },
            { id: id('set4'), setNumber: 2, weight: 80, reps: 10 },
          ],
        },
      ],
    };

    render(<ExerciseDetailView exercises={exercises} initialExerciseHistory={multiSessionHistory} />);

    // 1. Status badge should be READY FOR LOAD + (from READY_TO_INCREASE_LOAD status)
    expect(screen.getByText('READY FOR LOAD +')).toBeTruthy();

    // 2. Achieved PR Fact card should display 80 kg and estimated 1RM 106.7 kg (80 * (1 + 10/30) = 106.666...)
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByText('106.7 kg')).toBeTruthy();

    // 3. Calculated progression panel should render Phase 6 explanation text
    expect(screen.getByText('All 2 planned sets reached the 10-rep target at 80 kg.')).toBeTruthy();

    // 4. Prediction panel should show honest UNAVAILABLE / PENDING state
    expect(screen.getByText('UNAVAILABLE')).toBeTruthy();
    expect(screen.getByText(/AI guidance unavailable/)).toBeTruthy();
  });


  it('renders INSUFFICIENT DATA status and explanation for single-session history', () => {
    render(<ExerciseDetailView exercises={exercises} initialExerciseHistory={history(exercises[0], '1', 50)} />);

    expect(screen.getByText('INSUFFICIENT DATA')).toBeTruthy();
    expect(screen.getByText('At least two completed sessions are required; found 1.')).toBeTruthy();
  });
});

