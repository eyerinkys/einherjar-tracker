// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CompletedWorkoutHistoryPage, Exercise, ExerciseHistory, SplitDay } from '@/types';

const { addSplitExercise, createSplitDay, getSession, getExercises, getSplitDays, getActiveWorkout, getCompletedSessionHistory, getExerciseHistory, startWorkout } = vi.hoisted(() => ({
  addSplitExercise: vi.fn(),
  createSplitDay: vi.fn(),
  getSession: vi.fn(),
  getExercises: vi.fn(),
  getSplitDays: vi.fn(),
  getActiveWorkout: vi.fn(),
  getCompletedSessionHistory: vi.fn(),
  getExerciseHistory: vi.fn(),
  startWorkout: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession } } }));
vi.mock('@/server/queries/exercises', () => ({ getExercises }));
vi.mock('@/server/queries/splits', () => ({ getSplitDays }));
vi.mock('@/server/queries/workouts', () => ({ getActiveWorkout }));
vi.mock('@/server/queries/history', () => ({ getCompletedSessionHistory, getExerciseHistory }));
vi.mock('@/actions/history', () => ({
  getCompletedWorkoutHistory: vi.fn(),
  getExerciseWorkoutHistory: vi.fn(),
}));
vi.mock('@/actions/workouts', () => ({
  completeWorkout: vi.fn(), discardWorkout: vi.fn(), saveWorkoutDraft: vi.fn(), startWorkout,
}));
vi.mock('@/actions/split', () => ({
  addSplitExercise,
  createSplitDay,
  deleteSplitDay: vi.fn(),
  removeSplitExercise: vi.fn(),
  renameSplitDay: vi.fn(),
  reorderSplitDays: vi.fn(),
  reorderSplitExercises: vi.fn(),
  updateSplitExercise: vi.fn(),
}));

import Home from './page';

const persistentExercises: Exercise[] = [
  {
    id: '00000000-0000-4000-8000-000000000010',
    name: 'Standing Press',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell',
    category: 'compound',
    isCustom: false,
  },
];

const persistentSplit: SplitDay[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Persistent Push',
    order: 1,
    exercises: [],
  },
];

const initialHistoryPage: CompletedWorkoutHistoryPage = {
  sessions: [{
    id: '00000000-0000-4000-8000-000000000040',
    sourceSplitDayId: persistentSplit[0].id,
    splitDayName: 'Persistent History',
    startedAt: '2026-08-08T19:30:00.000Z',
    completedAt: '2026-08-08T20:30:00.000Z',
    durationMinutes: 60,
    exercises: [],
  }],
  nextCursor: null,
};

const initialExerciseHistory: ExerciseHistory = {
  exercise: persistentExercises[0],
  sessions: [{
    sessionId: initialHistoryPage.sessions[0].id,
    sessionExerciseId: '00000000-0000-4000-8000-000000000041',
    splitDayName: 'Persistent History',
    startedAt: '2026-08-08T19:30:00.000Z',
    completedAt: '2026-08-08T20:30:00.000Z',
    durationMinutes: 60,
    exerciseName: 'Standing Press Snapshot',
    targetSets: 1,
    targetRepMin: 8,
    targetRepMax: 10,
    sets: [{ id: '00000000-0000-4000-8000-000000000042', setNumber: 1, weight: 40, reps: 8 }],
  }],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  getActiveWorkout.mockResolvedValue(null);
  getCompletedSessionHistory.mockResolvedValue({ sessions: [], nextCursor: null });
  getExerciseHistory.mockImplementation(async (_userId: string, exerciseId: string) => ({
    exercise: persistentExercises.find(({ id }) => id === exerciseId) ?? persistentExercises[0],
    sessions: [],
  }));
});

describe('protected application hydration', () => {
  it('starts independent exercise, split, active-workout, and completed-history reads in parallel before loading first-exercise history', async () => {
    const exerciseRequest = deferred<Exercise[]>();
    const splitRequest = deferred<SplitDay[]>();
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockReturnValue(exerciseRequest.promise);
    getSplitDays.mockReturnValue(splitRequest.promise);

    const homeRequest = Home();
    await vi.waitFor(() => {
      expect(getExercises).toHaveBeenCalledWith('trusted-user');
      expect(getSplitDays).toHaveBeenCalledWith('trusted-user');
      expect(getActiveWorkout).toHaveBeenCalledWith('trusted-user');
      expect(getCompletedSessionHistory).toHaveBeenCalledWith('trusted-user', { pageSize: 20 });
    });
    expect(getExerciseHistory).not.toHaveBeenCalled();

    exerciseRequest.resolve(persistentExercises);
    await vi.waitFor(() => expect(getExerciseHistory).toHaveBeenCalledWith('trusted-user', persistentExercises[0].id));
    splitRequest.resolve(persistentSplit);
    await homeRequest;
  });

  it('skips first-exercise history without inventing an exercise when the library is empty', async () => {
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue([]);
    getSplitDays.mockResolvedValue([]);

    render(await Home());

    expect(getExerciseHistory).not.toHaveBeenCalled();
  });

  it('renders the authenticated user split and exercise DTOs from the server queries', async () => {
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue(persistentExercises);
    getSplitDays.mockResolvedValue(persistentSplit);

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Split' })[0]);

    expect(screen.getByRole('tab', { name: /Persistent Push/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add exercise/i })).toBeTruthy();
    expect(getExercises).toHaveBeenCalledWith('trusted-user');
    expect(getSplitDays).toHaveBeenCalledWith('trusted-user');
    expect(getActiveWorkout).toHaveBeenCalledWith('trusted-user');
    expect(getCompletedSessionHistory).toHaveBeenCalledWith('trusted-user', { pageSize: 20 });
    expect(getExerciseHistory).toHaveBeenCalledWith('trusted-user', persistentExercises[0].id);
  });

  it('renders the server-provided completed history page', async () => {
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue(persistentExercises);
    getSplitDays.mockResolvedValue(persistentSplit);
    getCompletedSessionHistory.mockResolvedValue(initialHistoryPage);

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'History' })[0]);

    expect(screen.getByText('Persistent History')).toBeTruthy();
  });

  it('uses the persistent exercise DTOs on the Progress screen', async () => {
    const persistedBenchPress: Exercise = {
      id: '00000000-0000-4000-8000-000000000008',
      name: 'Bench Press',
      muscleGroup: 'Chest / Triceps',
      equipment: 'Barbell',
      category: 'compound',
      isCustom: false,
    };
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue([persistedBenchPress]);
    getSplitDays.mockResolvedValue(persistentSplit);
    getExerciseHistory.mockResolvedValue({ exercise: persistedBenchPress, sessions: [] });

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Progress' })[0]);

    expect(screen.getByRole('option', { name: 'Bench Press' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Standing Press' })).toBeNull();
    expect(screen.getByText(/Stay at 80 kg next session/)).toBeTruthy();
  });

  it('hydrates factual history for the first Progress exercise', async () => {
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue(persistentExercises);
    getSplitDays.mockResolvedValue(persistentSplit);
    getExerciseHistory.mockResolvedValue(initialExerciseHistory);

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Progress' })[0]);

    expect(screen.getByText('Standing Press Snapshot')).toBeTruthy();
    expect(screen.getByText('40kg × 8')).toBeTruthy();
  });

  it('shares the current authoritative split state with the Train screen', async () => {
    const addedExercise = {
      id: '00000000-0000-4000-8000-000000000020',
      exerciseId: persistentExercises[0].id,
      exerciseName: 'Standing Press',
      muscleGroup: 'Shoulders',
      targetSets: 3,
      targetRepMin: 8,
      targetRepMax: 10,
      order: 1,
    };
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue(persistentExercises);
    getSplitDays.mockResolvedValue(persistentSplit);
    addSplitExercise.mockResolvedValue({
      ok: true,
      data: [{ ...persistentSplit[0], exercises: [addedExercise] }],
    });
    startWorkout.mockResolvedValue({
      ok: true,
      data: {
        id: '00000000-0000-4000-8000-000000000030',
        sourceSplitDayId: persistentSplit[0].id,
        splitDayName: persistentSplit[0].name,
        startedAt: '2026-08-09T03:00:00.000Z',
        version: 1,
        notes: '',
        exercises: [{
          id: '00000000-0000-4000-8000-000000000031',
          exerciseId: addedExercise.exerciseId,
          exerciseName: addedExercise.exerciseName,
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 10,
          previousPerformance: [],
          sets: [{ id: '00000000-0000-4000-8000-000000000032', setNumber: 1, weight: null, reps: 8, isCompleted: false }],
        }],
      },
    });

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Split' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Add Exercise' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add to Day' }));
    expect(await screen.findByRole('heading', { name: 'Standing Press' })).toBeTruthy();

    await userEvent.click(screen.getAllByRole('button', { name: 'Train' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Start workout' }));
    expect(await screen.findByRole('heading', { name: 'Standing Press' })).toBeTruthy();
  });

  it('reconciles refreshed server DTO props into the current client split state', async () => {
    const refreshedSplit = [
      persistentSplit[0],
      {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Persistent Pull',
        order: 2,
        exercises: [],
      },
    ];
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue(persistentExercises);
    getSplitDays.mockResolvedValue(persistentSplit);

    const view = render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Split' })[0]);
    expect(screen.queryByRole('tab', { name: /Persistent Pull/ })).toBeNull();

    getSplitDays.mockResolvedValue(refreshedSplit);
    view.rerender(await Home());
    expect(await screen.findByRole('tab', { name: /Persistent Pull/ })).toBeTruthy();
  });

  it('reconciles refreshed completed and exercise history props in the application shell', async () => {
    const refreshedHistory = {
      sessions: [{ ...initialHistoryPage.sessions[0], id: '00000000-0000-4000-8000-000000000050', splitDayName: 'Newly Completed Session' }],
      nextCursor: null,
    };
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue(persistentExercises);
    getSplitDays.mockResolvedValue(persistentSplit);
    getCompletedSessionHistory.mockResolvedValue(initialHistoryPage);
    getExerciseHistory.mockResolvedValue(initialExerciseHistory);

    const view = render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'History' })[0]);
    expect(screen.getByText('Persistent History')).toBeTruthy();

    getCompletedSessionHistory.mockResolvedValue(refreshedHistory);
    view.rerender(await Home());

    expect(await screen.findByText('Newly Completed Session')).toBeTruthy();
    expect(screen.queryByText('Persistent History')).toBeNull();
  });

  it('keeps the Split screen mounted while a mutation is pending', async () => {
    const pendingResult = deferred<{
      ok: false;
      code: 'INTERNAL_ERROR';
      message: string;
    }>();
    getSession.mockResolvedValue({
      user: { id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' },
    });
    getExercises.mockResolvedValue(persistentExercises);
    getSplitDays.mockResolvedValue(persistentSplit);
    createSplitDay.mockReturnValue(pendingResult.promise);

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Split' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Create day' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Day name' }), 'Pull');
    await userEvent.click(screen.getByRole('button', { name: 'Save day' }));

    const trainButtons = screen.getAllByRole('button', { name: 'Train' }) as HTMLButtonElement[];
    expect(trainButtons.every((button) => button.disabled)).toBe(true);
    await userEvent.click(trainButtons[0]);
    expect(screen.getByRole('textbox', { name: 'Day name' })).toBeTruthy();

    pendingResult.resolve({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Create failed. Try again.',
    });
    expect((await screen.findByRole('alert')).textContent).toContain('Create failed. Try again.');
    expect(trainButtons.every((button) => !button.disabled)).toBe(true);
  });
});
