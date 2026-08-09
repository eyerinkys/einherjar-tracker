// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CompletedWorkoutHistoryPage, CompletedWorkoutSession } from '@/types';

const { getCompletedWorkoutHistory } = vi.hoisted(() => ({
  getCompletedWorkoutHistory: vi.fn(),
}));

vi.mock('@/actions/history', () => ({ getCompletedWorkoutHistory }));

import { HistoryView } from './HistoryView';

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

function session(overrides: Partial<CompletedWorkoutSession> = {}): CompletedWorkoutSession {
  return {
    id: id('1'),
    sourceSplitDayId: id('2'),
    splitDayName: 'Heavy Push Snapshot',
    startedAt: '2026-08-08T19:30:00.000Z',
    completedAt: '2026-08-08T20:30:00.000Z',
    durationMinutes: 60,
    notes: 'Paused every rep and kept the final lockout controlled.',
    exercises: [{
      id: id('3'),
      exerciseId: id('4'),
      exerciseName: 'Bench Press Snapshot',
      targetSets: 2,
      targetRepMin: 8,
      targetRepMax: 10,
      notes: 'Two-count pause',
      sets: [
        { id: id('5'), setNumber: 1, weight: 82.5, reps: 8 },
        { id: id('6'), setNumber: 2, weight: null, reps: 12 },
      ],
    }],
    ...overrides,
  };
}

function page(
  sessions: CompletedWorkoutSession[] = [],
  nextCursor: string | null = null,
): CompletedWorkoutHistoryPage {
  return { sessions, nextCursor };
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('factual workout history', () => {
  it('renders the existing empty ledger state from an empty server page', () => {
    render(<HistoryView initialHistoryPage={page()} />);

    expect(screen.getByRole('heading', { name: 'No Workout History Yet' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Load more/i })).toBeNull();
  });

  it('renders local dates, snapshot facts, bodyweight sets, duration, and weighted volume', () => {
    render(<HistoryView initialHistoryPage={page([session()])} />);

    expect(screen.getByText('9 Aug 2026')).toBeTruthy();
    expect(screen.getByText('Heavy Push Snapshot')).toBeTruthy();
    expect(screen.getByText('60 mins')).toBeTruthy();
    expect(screen.getByText('Total Volume:')).toBeTruthy();
    expect(screen.getByText('660 kg')).toBeTruthy();
    expect(screen.getByText('Bench Press Snapshot')).toBeTruthy();
    expect(screen.getByText('Target: 2×8–10')).toBeTruthy();
    expect(screen.getByText('82.5kg × 8')).toBeTruthy();
    expect(screen.getByText('Bodyweight × 12')).toBeTruthy();
    expect(screen.queryByText(/nullkg|0kg/)).toBeNull();
    expect(screen.getByText(/Paused every rep/)).toBeTruthy();
    expect(screen.getByText(/Two-count pause/)).toBeTruthy();
  });

  it('loads one authoritative page at a time and appends each database session once', async () => {
    const first = session();
    const second = session({ id: id('10'), splitDayName: 'Pull Snapshot' });
    let resolvePage!: (value: Awaited<ReturnType<typeof getCompletedWorkoutHistory>>) => void;
    getCompletedWorkoutHistory.mockReturnValueOnce(new Promise((resolve) => { resolvePage = resolve; }));
    render(<HistoryView initialHistoryPage={page([first], 'cursor-one')} />);

    const loadMore = screen.getByRole('button', { name: 'Load more history' });
    await userEvent.click(loadMore);
    await userEvent.click(loadMore);

    expect(getCompletedWorkoutHistory).toHaveBeenCalledTimes(1);
    expect(getCompletedWorkoutHistory).toHaveBeenCalledWith({ cursor: 'cursor-one', pageSize: 20 });
    expect((loadMore as HTMLButtonElement).disabled).toBe(true);
    expect(loadMore.textContent).toContain('Loading');

    resolvePage({ ok: true, data: page([second, first], 'cursor-two') });

    expect(await screen.findByText('Pull Snapshot')).toBeTruthy();
    expect(screen.getAllByText('Heavy Push Snapshot')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Load more history' }));
    expect(getCompletedWorkoutHistory).toHaveBeenLastCalledWith({ cursor: 'cursor-two', pageSize: 20 });
  });

  it.each([
    ['action failure', () => Promise.resolve({ ok: false as const, code: 'INTERNAL_ERROR' as const, message: 'database owner leaked' })],
    ['transport failure', () => Promise.reject(new Error('socket exposed'))],
  ])('retains the page and retries the same cursor after %s', async (_label, fail) => {
    const next = session({ id: id('20'), splitDayName: 'Recovered Pull' });
    getCompletedWorkoutHistory
      .mockImplementationOnce(fail)
      .mockResolvedValueOnce({ ok: true, data: page([next], null) });
    render(<HistoryView initialHistoryPage={page([session()], 'retry-cursor')} />);

    await userEvent.click(screen.getByRole('button', { name: 'Load more history' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Unable to load more history. Try again.');
    expect(alert.textContent).not.toMatch(/database|owner|socket/i);
    expect(screen.getByText('Heavy Push Snapshot')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Retry loading history' }));

    expect(await screen.findByText('Recovered Pull')).toBeTruthy();
    expect(getCompletedWorkoutHistory).toHaveBeenNthCalledWith(1, { cursor: 'retry-cursor', pageSize: 20 });
    expect(getCompletedWorkoutHistory).toHaveBeenNthCalledWith(2, { cursor: 'retry-cursor', pageSize: 20 });
    expect(screen.getAllByText('Heavy Push Snapshot')).toHaveLength(1);
  });

  it('reconciles a refreshed authoritative first page', () => {
    const view = render(<HistoryView initialHistoryPage={page([session()])} />);

    view.rerender(<HistoryView initialHistoryPage={page([session({ id: id('30'), splitDayName: 'Refreshed Session' })])} />);

    expect(screen.getByText('Refreshed Session')).toBeTruthy();
    expect(screen.queryByText('Heavy Push Snapshot')).toBeNull();
  });
});
