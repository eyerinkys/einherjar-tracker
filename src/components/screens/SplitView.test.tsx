// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Exercise, SplitDay } from '@/types';

const { actions, refresh } = vi.hoisted(() => ({
  actions: {
    addSplitExercise: vi.fn(),
    createSplitDay: vi.fn(),
    deleteSplitDay: vi.fn(),
    removeSplitExercise: vi.fn(),
    renameSplitDay: vi.fn(),
    reorderSplitDays: vi.fn(),
    reorderSplitExercises: vi.fn(),
    updateSplitExercise: vi.fn(),
  },
  refresh: vi.fn(),
}));

vi.mock('@/actions/split', () => actions);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { SplitView } from './SplitView';

const pushDayId = '00000000-0000-4000-8000-000000000001';
const pullDayId = '00000000-0000-4000-8000-000000000002';
const benchId = '00000000-0000-4000-8000-000000000010';
const rowId = '00000000-0000-4000-8000-000000000011';
const pressId = '00000000-0000-4000-8000-000000000012';
const benchSplitExerciseId = '00000000-0000-4000-8000-000000000020';
const rowSplitExerciseId = '00000000-0000-4000-8000-000000000021';
const pressSplitExerciseId = '00000000-0000-4000-8000-000000000022';

const exercises: Exercise[] = [
  {
    id: benchId,
    name: 'Bench Press',
    muscleGroup: 'Chest',
    equipment: 'Barbell',
    category: 'compound',
    isCustom: false,
  },
  {
    id: rowId,
    name: 'Cable Row',
    muscleGroup: 'Back',
    equipment: 'Cable',
    category: 'compound',
    isCustom: false,
  },
  {
    id: pressId,
    name: 'Standing Press',
    muscleGroup: 'Shoulders',
    equipment: 'Barbell',
    category: 'compound',
    isCustom: false,
  },
];

const initialSplit: SplitDay[] = [
  {
    id: pushDayId,
    name: 'Push',
    order: 1,
    exercises: [
      {
        id: benchSplitExerciseId,
        exerciseId: benchId,
        exerciseName: 'Bench Press',
        muscleGroup: 'Chest',
        targetSets: 3,
        targetRepMin: 8,
        targetRepMax: 10,
        order: 1,
        notes: 'Pause at the bottom',
      },
      {
        id: rowSplitExerciseId,
        exerciseId: rowId,
        exerciseName: 'Cable Row',
        muscleGroup: 'Back',
        targetSets: 4,
        targetRepMin: 10,
        targetRepMax: 12,
        order: 2,
      },
    ],
  },
];

const twoDaySplit: SplitDay[] = [
  initialSplit[0],
  { id: pullDayId, name: 'Pull', order: 2, exercises: [] },
];

function SplitHarness({ split = initialSplit }: { split?: SplitDay[] }) {
  const [splitDays, setSplitDays] = useState(split);
  return (
    <SplitView
      availableExercises={exercises}
      splitDays={splitDays}
      onUpdateSplitDays={setSplitDays}
    />
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('SplitView persistence behavior', () => {
  it('clears day-bound interaction state when refreshed DTOs remove the selected day', async () => {
    const user = userEvent.setup();
    const view = render(
      <SplitView
        availableExercises={exercises}
        splitDays={twoDaySplit}
        onUpdateSplitDays={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete Push' }));
    view.rerender(
      <SplitView
        availableExercises={exercises}
        splitDays={[twoDaySplit[1]]}
        onUpdateSplitDays={vi.fn()}
      />,
    );

    expect(screen.queryByText('Delete Pull?')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Pull' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Rename Day' }));
    view.rerender(
      <SplitView
        availableExercises={exercises}
        splitDays={[
          {
            id: '00000000-0000-4000-8000-000000000003',
            name: 'Legs',
            order: 1,
            exercises: [],
          },
        ]}
        onUpdateSplitDays={vi.fn()}
      />,
    );
    expect(screen.queryByRole('textbox', { name: 'Rename day name' })).toBeNull();
  });

  it('reconciles unedited exercise drafts when refreshed DTOs change targets', () => {
    const view = render(
      <SplitView
        availableExercises={exercises}
        splitDays={initialSplit}
        onUpdateSplitDays={vi.fn()}
      />,
    );

    view.rerender(
      <SplitView
        availableExercises={exercises}
        splitDays={[
          {
            ...initialSplit[0],
            exercises: [{ ...initialSplit[0].exercises[0], targetSets: 6 }],
          },
        ]}
        onUpdateSplitDays={vi.fn()}
      />,
    );

    expect(
      (screen.getByRole('spinbutton', { name: 'Bench Press target sets' }) as HTMLInputElement).value,
    ).toBe('6');
  });

  it('creates a split day and reconciles to the authoritative response', async () => {
    const authoritative = [
      initialSplit[0],
      { id: pullDayId, name: 'Pull', order: 2, exercises: [] },
    ];
    actions.createSplitDay.mockResolvedValue({ ok: true, data: authoritative });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Create day' }));
    await user.type(screen.getByRole('textbox', { name: 'Day name' }), '  Pull  ');
    await user.click(screen.getByRole('button', { name: 'Save day' }));

    expect(await screen.findByRole('tab', { name: /Pull/ })).toBeTruthy();
    expect(actions.createSplitDay).toHaveBeenCalledWith({ name: 'Pull' });
  });

  it('keeps create input unchanged on failure and retries the operation', async () => {
    const authoritative = [
      initialSplit[0],
      { id: pullDayId, name: 'Pull', order: 2, exercises: [] },
    ];
    actions.createSplitDay
      .mockResolvedValueOnce({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Unable to update the split. Please try again.',
      })
      .mockResolvedValueOnce({ ok: true, data: authoritative });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Create day' }));
    const nameInput = screen.getByRole('textbox', { name: 'Day name' });
    await user.type(nameInput, 'Pull');
    await user.click(screen.getByRole('button', { name: 'Save day' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Unable to update the split. Please try again.',
    );
    expect((nameInput as HTMLInputElement).value).toBe('Pull');
    expect(screen.queryByRole('tab', { name: /ᚦ Pull/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('tab', { name: /ᚦ Pull/ })).toBeTruthy();
  });

  it('disables a pending create submission and prevents duplicates', async () => {
    const pendingResult = deferred<{ ok: true; data: SplitDay[] }>();
    actions.createSplitDay.mockReturnValue(pendingResult.promise);
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Create day' }));
    const nameInput = screen.getByRole('textbox', { name: 'Day name' }) as HTMLInputElement;
    await user.type(nameInput, 'Pull');
    const saveButton = screen.getByRole('button', { name: 'Save day' }) as HTMLButtonElement;
    await user.click(saveButton);

    expect(saveButton.disabled).toBe(true);
    expect(nameInput.disabled).toBe(true);
    expect((screen.getByRole('tab', { name: /Push/ }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(saveButton);
    expect(actions.createSplitDay).toHaveBeenCalledTimes(1);

    pendingResult.resolve({
      ok: true,
      data: [initialSplit[0], { id: pullDayId, name: 'Pull', order: 2, exercises: [] }],
    });
    expect(await screen.findByRole('tab', { name: /ᚦ Pull/ })).toBeTruthy();
  });

  it('announces client validation without submitting an invalid day name', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Create day' }));
    await user.type(screen.getByRole('textbox', { name: 'Day name' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Save day' }));

    const input = screen.getByRole('textbox', { name: 'Day name' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Split day name is required.');
    expect(actions.createSplitDay).not.toHaveBeenCalled();
  });

  it('selects the authoritative first day after creating from an empty split', async () => {
    actions.createSplitDay.mockResolvedValue({ ok: true, data: [initialSplit[0]] });
    const user = userEvent.setup();
    render(<SplitHarness split={[]} />);

    await user.click(screen.getByRole('button', { name: 'Create day' }));
    await user.type(screen.getByRole('textbox', { name: 'Day name' }), 'Push');
    await user.click(screen.getByRole('button', { name: 'Save day' }));

    const pushTab = await screen.findByRole('tab', { name: /Push/ });
    expect(pushTab.getAttribute('aria-selected')).toBe('true');
    expect(pushTab.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(pushTab);
  });

  it('renames the selected day from the authoritative response', async () => {
    actions.renameSplitDay.mockResolvedValue({
      ok: true,
      data: [{ ...initialSplit[0], name: 'Upper Push' }],
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Rename Day' }));
    const input = screen.getByRole('textbox', { name: 'Rename day name' });
    await user.clear(input);
    await user.type(input, 'Upper Push');
    await user.click(screen.getByRole('button', { name: 'Save rename' }));

    expect(await screen.findByRole('heading', { name: 'Upper Push' })).toBeTruthy();
    expect(actions.renameSplitDay).toHaveBeenCalledWith({
      splitDayId: pushDayId,
      name: 'Upper Push',
    });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Day' }));
  });

  it('preserves the persisted name and rename draft when renaming fails', async () => {
    actions.renameSplitDay.mockResolvedValue({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Rename failed. Try again.',
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Rename Day' }));
    const input = screen.getByRole('textbox', { name: 'Rename day name' }) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'Upper Push');
    await user.click(screen.getByRole('button', { name: 'Save rename' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Rename failed. Try again.');
    expect(input.value).toBe('Upper Push');
    expect(screen.getByRole('tab', { name: /ᚦ Push/ })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Upper Push' })).toBeNull();
  });

  it('keeps every day-bound action disabled while a rename is pending', async () => {
    const emptyPush = { ...initialSplit[0], exercises: [] };
    const pendingResult = deferred<{
      ok: false;
      code: 'INTERNAL_ERROR';
      message: string;
    }>();
    actions.renameSplitDay.mockReturnValue(pendingResult.promise);
    const user = userEvent.setup();
    render(<SplitHarness split={[emptyPush]} />);

    await user.click(screen.getByRole('button', { name: 'Rename Day' }));
    const input = screen.getByRole('textbox', { name: 'Rename day name' });
    await user.clear(input);
    await user.type(input, 'Upper Push');
    await user.click(screen.getByRole('button', { name: 'Save rename' }));

    const dayTab = screen.getByRole('tab', { name: /Push/ }) as HTMLButtonElement;
    const emptyStateAdd = screen.getByRole('button', {
      name: 'Add First Exercise',
    }) as HTMLButtonElement;
    expect(dayTab.disabled).toBe(true);
    expect(emptyStateAdd.disabled).toBe(true);
    await user.click(emptyStateAdd);
    expect(screen.queryByRole('dialog', { name: 'ADD EXERCISE TO SPLIT' })).toBeNull();

    pendingResult.resolve({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Rename failed. Try again.',
    });
    expect((await screen.findByRole('alert')).textContent).toContain('Rename failed. Try again.');
    expect((input as HTMLInputElement).value).toBe('Upper Push');
    expect(emptyStateAdd.disabled).toBe(false);
  });

  it('announces an invalid rename without submitting it', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Rename Day' }));
    const input = screen.getByRole('textbox', { name: 'Rename day name' });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save rename' }));

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Split day name is required.');
    expect(actions.renameSplitDay).not.toHaveBeenCalled();
  });

  it('returns focus to Rename Day when inline rename is cancelled', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Rename Day' }));
    await user.click(screen.getByRole('button', { name: 'Cancel rename' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Day' }));
  });

  it('confirms before deleting a day and reconciles the authoritative empty state', async () => {
    actions.deleteSplitDay.mockResolvedValue({ ok: true, data: [] });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Delete Push' }));
    expect(screen.getByText('Delete Push?')).toBeTruthy();
    expect(actions.deleteSplitDay).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel deletion' }));
    expect(screen.queryByText('Delete Push?')).toBeNull();
    expect(actions.deleteSplitDay).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete Push' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete day' }));

    expect(await screen.findByRole('heading', { name: 'No Workout Split Configured' })).toBeTruthy();
    const createButton = screen.getByRole('button', { name: 'Create day' });
    expect(document.activeElement).toBe(createButton);
    expect(actions.deleteSplitDay).toHaveBeenCalledWith({ splitDayId: pushDayId });
  });

  it('keeps the day and confirmation available when deletion fails', async () => {
    actions.deleteSplitDay.mockResolvedValue({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Delete failed. Try again.',
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Delete Push' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete day' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Delete failed. Try again.');
    expect(screen.getByRole('heading', { name: 'Push' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm delete day' })).toBeTruthy();
  });

  it('returns focus to the day delete button when deletion is cancelled', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Delete Push' }));
    await user.click(screen.getByRole('button', { name: 'Cancel deletion' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete Push' }));
  });

  it('cancels a pending day confirmation when another day is selected', async () => {
    const user = userEvent.setup();
    render(<SplitHarness split={twoDaySplit} />);

    await user.click(screen.getByRole('button', { name: 'Delete Push' }));
    expect(screen.getByText('Delete Push?')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /Pull/ }));

    expect(screen.queryByText('Delete Push?')).toBeNull();
    expect(screen.queryByText('Delete Pull?')).toBeNull();
    expect(actions.deleteSplitDay).not.toHaveBeenCalled();
  });

  it('cancels a pending day confirmation when keyboard navigation selects another day', async () => {
    const user = userEvent.setup();
    render(<SplitHarness split={twoDaySplit} />);

    await user.click(screen.getByRole('button', { name: 'Delete Push' }));
    const pushTab = screen.getByRole('tab', { name: /Push/ });
    pushTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.queryByText('Delete Push?')).toBeNull();
    expect(screen.queryByText('Delete Pull?')).toBeNull();
    expect(actions.deleteSplitDay).not.toHaveBeenCalled();
  });

  it('moves a day and renders the authoritative order', async () => {
    const authoritative = [
      { ...twoDaySplit[1], order: 1 },
      { ...twoDaySplit[0], order: 2 },
    ];
    actions.reorderSplitDays.mockResolvedValue({ ok: true, data: authoritative });
    const user = userEvent.setup();
    render(<SplitHarness split={twoDaySplit} />);

    await user.click(screen.getByRole('button', { name: 'Move Push down' }));

    const tabs = within(screen.getByRole('tablist', { name: 'Workout days' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('Pull'),
      expect.stringContaining('Push'),
    ]);
    expect(actions.reorderSplitDays).toHaveBeenCalledWith({
      splitDayIds: [pullDayId, pushDayId],
    });
  });

  it('keeps the prior day order when reordering fails', async () => {
    actions.reorderSplitDays.mockResolvedValue({
      ok: false,
      code: 'STALE_ORDER',
      message: 'Split order changed. Refresh and try again.',
    });
    const user = userEvent.setup();
    render(<SplitHarness split={twoDaySplit} />);

    await user.click(screen.getByRole('button', { name: 'Move Push down' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Split order changed. Refresh and try again.',
    );
    const tabs = within(screen.getByRole('tablist', { name: 'Workout days' })).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('Push'),
      expect.stringContaining('Pull'),
    ]);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Refresh split' }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('announces completion when refreshed props reconcile a stale conflict', async () => {
    actions.reorderSplitDays.mockResolvedValue({
      ok: false,
      code: 'STALE_ORDER',
      message: 'Split order changed. Refresh and try again.',
    });
    const user = userEvent.setup();
    const onUpdateSplitDays = vi.fn();
    const view = render(
      <SplitView
        availableExercises={exercises}
        splitDays={twoDaySplit}
        onUpdateSplitDays={onUpdateSplitDays}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Move Push down' }));
    await user.click(screen.getByRole('button', { name: 'Refresh split' }));
    expect(screen.getByRole('status').textContent).toContain('Refreshing split…');

    view.rerender(
      <SplitView
        availableExercises={exercises}
        splitDays={twoDaySplit.map((day) => ({ ...day }))}
        onUpdateSplitDays={onUpdateSplitDays}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('Split refreshed.');
    expect(screen.getByRole('status').textContent).not.toContain('Refreshing split…');
  });

  it('adds an exercise and renders the authoritative exercise row', async () => {
    const addedExercise = {
      id: pressSplitExerciseId,
      exerciseId: pressId,
      exerciseName: 'Standing Press',
      muscleGroup: 'Shoulders',
      targetSets: 3,
      targetRepMin: 8,
      targetRepMax: 10,
      order: 3,
    };
    actions.addSplitExercise.mockResolvedValue({
      ok: true,
      data: [{ ...initialSplit[0], exercises: [...initialSplit[0].exercises, addedExercise] }],
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Add Exercise' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select Exercise' }), pressId);
    await user.click(screen.getByRole('button', { name: 'Add to Day' }));

    expect(await screen.findByRole('heading', { name: 'Standing Press' })).toBeTruthy();
    expect(actions.addSplitExercise).toHaveBeenCalledWith({
      splitDayId: pushDayId,
      exerciseId: pressId,
      targetSets: 3,
      targetRepMin: 8,
      targetRepMax: 10,
    });
  });

  it('keeps the add form open and the split unchanged when adding fails', async () => {
    const addedExercise = {
      id: pressSplitExerciseId,
      exerciseId: pressId,
      exerciseName: 'Standing Press',
      muscleGroup: 'Shoulders',
      targetSets: 3,
      targetRepMin: 8,
      targetRepMax: 10,
      order: 3,
    };
    actions.addSplitExercise
      .mockResolvedValueOnce({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Add failed. Try again.',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [{ ...initialSplit[0], exercises: [...initialSplit[0].exercises, addedExercise] }],
      });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Add Exercise' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select Exercise' }), pressId);
    await user.click(screen.getByRole('button', { name: 'Add to Day' }));

    const dialog = screen.getByRole('dialog', { name: 'ADD EXERCISE TO SPLIT' });
    expect(within(dialog).getByRole('alert').textContent).toContain('Add failed. Try again.');
    expect(screen.queryByRole('heading', { name: 'Standing Press' })).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Standing Press' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'ADD EXERCISE TO SPLIT' })).toBeNull();
  });

  it('keeps keyboard focus inside the add dialog while submission is pending', async () => {
    const pendingResult = deferred<{
      ok: false;
      code: 'INTERNAL_ERROR';
      message: string;
    }>();
    actions.addSplitExercise.mockReturnValue(pendingResult.promise);
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Add Exercise' }));
    await user.click(screen.getByRole('button', { name: 'Add to Day' }));
    const dialog = screen.getByRole('dialog', { name: 'ADD EXERCISE TO SPLIT' });

    expect(document.activeElement).toBe(dialog);
    await user.tab();
    expect(document.activeElement).toBe(dialog);

    pendingResult.resolve({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Add failed. Try again.',
    });
    expect((await within(dialog).findByRole('alert')).textContent).toContain(
      'Add failed. Try again.',
    );
  });

  it('validates an added exercise rep range before submitting', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Add Exercise' }));
    const minInput = screen.getByRole('spinbutton', { name: 'Min Reps' });
    const maxInput = screen.getByRole('spinbutton', { name: 'Max Reps' });
    await user.clear(minInput);
    await user.type(minInput, '12');
    await user.clear(maxInput);
    await user.type(maxInput, '8');
    await user.click(screen.getByRole('button', { name: 'Add to Day' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'Minimum reps cannot exceed maximum reps.',
    );
    expect(minInput.getAttribute('aria-invalid')).toBe('true');
    expect(actions.addSplitExercise).not.toHaveBeenCalled();
  });

  it('confirms before removing an exercise and reconciles the authoritative list', async () => {
    actions.removeSplitExercise.mockResolvedValue({
      ok: true,
      data: [
        {
          ...initialSplit[0],
          exercises: [{ ...initialSplit[0].exercises[1], order: 1 }],
        },
      ],
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Remove Bench Press' }));
    expect(screen.getByText('Remove Bench Press?')).toBeTruthy();
    expect(actions.removeSplitExercise).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm remove Bench Press' }));

    expect(await screen.findByRole('heading', { name: 'Cable Row' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Bench Press' })).toBeNull();
    expect(actions.removeSplitExercise).toHaveBeenCalledWith({
      splitExerciseId: benchSplitExerciseId,
    });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add Exercise' }));
  });

  it('restores focus to the surviving add control when the empty-state trigger is removed', async () => {
    const emptyPush = { ...initialSplit[0], exercises: [] };
    const addedExercise = {
      id: pressSplitExerciseId,
      exerciseId: pressId,
      exerciseName: 'Standing Press',
      muscleGroup: 'Shoulders',
      targetSets: 3,
      targetRepMin: 8,
      targetRepMax: 10,
      order: 1,
    };
    actions.addSplitExercise.mockResolvedValue({
      ok: true,
      data: [{ ...emptyPush, exercises: [addedExercise] }],
    });
    const user = userEvent.setup();
    render(<SplitHarness split={[emptyPush]} />);

    await user.click(screen.getByRole('button', { name: 'Add First Exercise' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Select Exercise' }), pressId);
    await user.click(screen.getByRole('button', { name: 'Add to Day' }));

    expect(await screen.findByRole('heading', { name: 'Standing Press' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add Exercise' }));
  });

  it('keeps the exercise and its confirmation when removal fails', async () => {
    actions.removeSplitExercise.mockResolvedValue({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Remove failed. Try again.',
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Remove Bench Press' }));
    await user.click(screen.getByRole('button', { name: 'Confirm remove Bench Press' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Remove failed. Try again.');
    expect(screen.getByRole('heading', { name: 'Bench Press' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm remove Bench Press' })).toBeTruthy();
  });

  it('returns focus to the exercise remove button when removal is cancelled', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Remove Bench Press' }));
    await user.click(screen.getByRole('button', { name: 'Cancel removal' }));

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Remove Bench Press' }),
    );
  });

  it('moves an exercise and renders the authoritative order', async () => {
    const authoritativeExercises = [
      { ...initialSplit[0].exercises[1], order: 1 },
      { ...initialSplit[0].exercises[0], order: 2 },
    ];
    actions.reorderSplitExercises.mockResolvedValue({
      ok: true,
      data: [{ ...initialSplit[0], exercises: authoritativeExercises }],
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Move Cable Row up' }));

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Cable Row',
      'Bench Press',
    ]);
    expect(actions.reorderSplitExercises).toHaveBeenCalledWith({
      splitDayId: pushDayId,
      splitExerciseIds: [rowSplitExerciseId, benchSplitExerciseId],
    });
  });

  it('keeps the prior exercise order when reordering fails', async () => {
    actions.reorderSplitExercises.mockResolvedValue({
      ok: false,
      code: 'STALE_ORDER',
      message: 'Exercise order changed. Refresh and try again.',
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Move Cable Row up' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Exercise order changed. Refresh and try again.',
    );
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Bench Press',
      'Cable Row',
    ]);
  });

  it('reconciles unchanged exercise drafts from an authoritative mutation result', async () => {
    const authoritativeExercises = [
      { ...initialSplit[0].exercises[1], targetSets: 6, order: 1 },
      { ...initialSplit[0].exercises[0], order: 2 },
    ];
    actions.reorderSplitExercises.mockResolvedValue({
      ok: true,
      data: [{ ...initialSplit[0], exercises: authoritativeExercises }],
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Move Cable Row up' }));

    expect(
      (screen.getByRole('spinbutton', { name: 'Cable Row target sets' }) as HTMLInputElement).value,
    ).toBe('6');
  });

  it('saves exercise targets and notes, then adopts the authoritative values', async () => {
    const authoritativeBench = {
      ...initialSplit[0].exercises[0],
      targetSets: 5,
      targetRepMin: 6,
      targetRepMax: 9,
      notes: 'Controlled pause',
    };
    actions.updateSplitExercise.mockResolvedValue({
      ok: true,
      data: [
        {
          ...initialSplit[0],
          exercises: [authoritativeBench, initialSplit[0].exercises[1]],
        },
      ],
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    const sets = screen.getByRole('spinbutton', { name: 'Bench Press target sets' });
    const min = screen.getByRole('spinbutton', { name: 'Bench Press minimum reps' });
    const max = screen.getByRole('spinbutton', { name: 'Bench Press maximum reps' });
    const notes = screen.getByRole('textbox', { name: 'Bench Press notes' });
    await user.clear(sets);
    await user.type(sets, '4');
    await user.clear(min);
    await user.type(min, '6');
    await user.clear(max);
    await user.type(max, '9');
    await user.clear(notes);
    await user.type(notes, 'Controlled pause');
    await user.click(screen.getByRole('button', { name: 'Save Bench Press targets' }));

    expect((sets as HTMLInputElement).value).toBe('5');
    expect((notes as HTMLTextAreaElement).value).toBe('Controlled pause');
    expect(actions.updateSplitExercise).toHaveBeenCalledWith({
      splitExerciseId: benchSplitExerciseId,
      targetSets: 4,
      targetRepMin: 6,
      targetRepMax: 9,
      notes: 'Controlled pause',
    });
  });

  it('preserves an exercise draft when saving targets fails', async () => {
    actions.updateSplitExercise.mockResolvedValue({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Targets could not be saved. Try again.',
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    const sets = screen.getByRole('spinbutton', { name: 'Bench Press target sets' });
    const notes = screen.getByRole('textbox', { name: 'Bench Press notes' });
    await user.clear(sets);
    await user.type(sets, '4');
    await user.clear(notes);
    await user.type(notes, 'Keep this draft');
    await user.click(screen.getByRole('button', { name: 'Save Bench Press targets' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Targets could not be saved. Try again.',
    );
    expect((sets as HTMLInputElement).value).toBe('4');
    expect((notes as HTMLTextAreaElement).value).toBe('Keep this draft');
  });

  it('validates an edited exercise rep range before saving', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    const minInput = screen.getByRole('spinbutton', { name: 'Bench Press minimum reps' });
    const maxInput = screen.getByRole('spinbutton', { name: 'Bench Press maximum reps' });
    await user.clear(minInput);
    await user.type(minInput, '12');
    await user.clear(maxInput);
    await user.type(maxInput, '8');
    await user.click(screen.getByRole('button', { name: 'Save Bench Press targets' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'Minimum reps cannot exceed maximum reps.',
    );
    expect(minInput.getAttribute('aria-invalid')).toBe('true');
    expect(actions.updateSplitExercise).not.toHaveBeenCalled();
  });

  it('moves selection and focus through the day tabs with arrow keys', async () => {
    const user = userEvent.setup();
    render(<SplitHarness split={twoDaySplit} />);

    const pushTab = screen.getByRole('tab', { name: /Push/ });
    const pullTab = screen.getByRole('tab', { name: /Pull/ });
    pushTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(pullTab.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(pullTab);
    expect(screen.getByRole('heading', { name: 'Pull' })).toBeTruthy();
  });

  it('moves focus into the add dialog and restores it when Escape closes the dialog', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    const addButton = screen.getByRole('button', { name: 'Add Exercise' });
    await user.click(addButton);

    const select = screen.getByRole('combobox', { name: 'Select Exercise' });
    expect(document.activeElement).toBe(select);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'ADD EXERCISE TO SPLIT' })).toBeNull();
    expect(document.activeElement).toBe(addButton);
  });

  it('keeps Tab focus within the add exercise dialog', async () => {
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Add Exercise' }));
    const dialog = screen.getByRole('dialog', { name: 'ADD EXERCISE TO SPLIT' });
    const closeButton = within(dialog).getByRole('button', { name: 'Close add exercise' });
    const addButton = within(dialog).getByRole('button', { name: 'Add to Day' });
    closeButton.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(addButton);

    await user.tab();
    expect(document.activeElement).toBe(closeButton);
  });

  it('announces a successful authoritative update', async () => {
    actions.renameSplitDay.mockResolvedValue({
      ok: true,
      data: [{ ...initialSplit[0], name: 'Upper Push' }],
    });
    const user = userEvent.setup();
    render(<SplitHarness />);

    await user.click(screen.getByRole('button', { name: 'Rename Day' }));
    const input = screen.getByRole('textbox', { name: 'Rename day name' });
    await user.clear(input);
    await user.type(input, 'Upper Push');
    await user.click(screen.getByRole('button', { name: 'Save rename' }));

    expect((await screen.findByRole('status')).textContent).toContain('Split updated.');
  });
});
