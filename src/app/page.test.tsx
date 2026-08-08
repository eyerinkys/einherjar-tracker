// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Exercise, SplitDay } from '@/types';

const { addSplitExercise, createSplitDay, getSession, getExercises, getSplitDays } = vi.hoisted(() => ({
  addSplitExercise: vi.fn(),
  createSplitDay: vi.fn(),
  getSession: vi.fn(),
  getExercises: vi.fn(),
  getSplitDays: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession } } }));
vi.mock('@/server/queries/exercises', () => ({ getExercises }));
vi.mock('@/server/queries/splits', () => ({ getSplitDays }));
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

describe('protected application hydration', () => {
  it('starts independent exercise and split queries in parallel', async () => {
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
    });

    exerciseRequest.resolve(persistentExercises);
    splitRequest.resolve(persistentSplit);
    await homeRequest;
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

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Progress' })[0]);

    expect(screen.getByRole('option', { name: 'Bench Press' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Standing Press' })).toBeNull();
    expect(screen.getByText(/Stay at 80 kg next session/)).toBeTruthy();
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

    render(await Home());
    await userEvent.click(screen.getAllByRole('button', { name: 'Split' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Add Exercise' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add to Day' }));
    expect(await screen.findByRole('heading', { name: 'Standing Press' })).toBeTruthy();

    await userEvent.click(screen.getAllByRole('button', { name: 'Train' })[0]);
    expect(screen.getByRole('heading', { name: 'Standing Press' })).toBeTruthy();
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
