// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnalyticsOverviewDTO } from '@/types';

const { getAnalyticsOverview } = vi.hoisted(() => ({
  getAnalyticsOverview: vi.fn(),
}));

vi.mock('@/actions/analytics', () => ({ getAnalyticsOverview }));

import { AnalyticsView } from './AnalyticsView';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => { resolve = promiseResolve; });
  return { promise, resolve };
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('AnalyticsView UI Integration', () => {
  it('shows loading indicator on mount while request is in flight', () => {
    const def = deferred<{ ok: true; data: AnalyticsOverviewDTO }>();
    getAnalyticsOverview.mockReturnValue(def.promise);

    render(<AnalyticsView />);

    expect(screen.getByText(/Loading analytics/i)).toBeTruthy();
  });

  it('renders EmptyState when user has no progression or PR data', async () => {
    getAnalyticsOverview.mockResolvedValue({
      ok: true,
      data: {
        summary: {
          progressingCount: 0,
          readyCount: 0,
          stalledCount: 0,
          recentPRsCount: 0,
          insufficientCount: 0,
        },
        readyList: [],
        stalledList: [],
        progressingList: [],
        achievedPRs: [],
      },
    });

    render(<AnalyticsView />);

    expect(await screen.findByText('No Progressive Overload Analytics')).toBeTruthy();
  });

  it('renders metrics summary grid and populated sections', async () => {
    getAnalyticsOverview.mockResolvedValue({
      ok: true,
      data: {
        summary: {
          progressingCount: 1,
          readyCount: 1,
          stalledCount: 1,
          recentPRsCount: 1,
          insufficientCount: 0,
        },
        readyList: [
          {
            exerciseId: 'ex-5',
            exerciseName: 'Dumbbell Curl',
            status: 'READY_TO_INCREASE_LOAD',
            guidance: 'Increase to 7.5 kg next session.',
            comparisonText: 'Reached top target reps.',
            nextWeight: 7.5,
            targetRepMin: 8,
            targetRepMax: 10,
          },
        ],
        stalledList: [
          {
            exerciseId: 'ex-1',
            exerciseName: 'Romanian Deadlift',
            status: 'STALLED',
            guidance: 'Maintain load and focus on form.',
            comparisonText: 'Flat reps across sessions.',
            nextWeight: 90,
            targetRepMin: 6,
            targetRepMax: 8,
          },
        ],
        progressingList: [
          {
            exerciseId: 'ex-2',
            exerciseName: 'Lat Pulldown',
            status: 'PROGRESSING',
            guidance: 'Consolidate 50 kg load.',
            comparisonText: '+1 rep improvement.',
            nextWeight: 50,
            targetRepMin: 8,
            targetRepMax: 10,
          },
        ],
        achievedPRs: [
          {
            exerciseId: 'ex-8',
            exerciseName: 'Bench Press',
            recordType: 'HIGHEST_LOAD',
            weight: 80,
            reps: 5,
            estimated1RM: 93.3,
            achievedDate: '2026-08-04',
            isNewRecord: true,
          },
        ],
      },
    });

    render(<AnalyticsView />);

    expect(await screen.findByText('Dumbbell Curl')).toBeTruthy();
    expect(screen.getByText('Romanian Deadlift')).toBeTruthy();
    expect(screen.getByText('Lat Pulldown')).toBeTruthy();
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('renders error state and handles retry click', async () => {
    getAnalyticsOverview
      .mockResolvedValueOnce({ ok: false, code: 'INTERNAL_ERROR', message: 'Unable to load analytics.' })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          summary: { progressingCount: 0, readyCount: 0, stalledCount: 0, recentPRsCount: 0, insufficientCount: 0 },
          readyList: [], stalledList: [], progressingList: [], achievedPRs: [],
        },
      });

    render(<AnalyticsView />);

    expect(await screen.findByText(/Unable to load analytics/i)).toBeTruthy();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryBtn);

    expect(await screen.findByText('No Progressive Overload Analytics')).toBeTruthy();
  });
});
