// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';


vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/actions/history', () => ({ getCompletedWorkoutHistory: vi.fn(), getExerciseWorkoutHistory: vi.fn() }));
vi.mock('@/actions/split', () => ({
  addSplitExercise: vi.fn(), createSplitDay: vi.fn(), deleteSplitDay: vi.fn(),
  removeSplitExercise: vi.fn(), renameSplitDay: vi.fn(), reorderSplitDays: vi.fn(),
  reorderSplitExercises: vi.fn(), updateSplitExercise: vi.fn(),
}));
vi.mock('@/actions/workouts', () => ({
  completeWorkout: vi.fn(), discardWorkout: vi.fn(), saveWorkoutDraft: vi.fn(), startWorkout: vi.fn(),
}));
vi.mock('@/actions/analytics', () => ({ getAnalyticsOverview: vi.fn() }));
vi.mock('@/actions/bodyweight', () => ({
  getBodyweightSummaryAction: vi.fn(),
  logBodyweight: vi.fn(),
  deleteBodyweightEntry: vi.fn(),
}));

import { ApplicationShell } from './ApplicationShell';

afterEach(cleanup);

it('renders server history without consulting the legacy workout fixture service', async () => {
  render(
    <ApplicationShell
      exercises={[]}
      initialSplitDays={[]}
      initialActiveWorkout={null}
      initialHistoryPage={{
        sessions: [{
          id: '00000000-0000-4000-8000-000000000001',
          sourceSplitDayId: null,
          splitDayName: 'Server History',
          startedAt: '2026-08-08T19:30:00.000Z',
          completedAt: '2026-08-08T20:30:00.000Z',
          durationMinutes: 60,
          exercises: [],
        }],
        nextCursor: null,
      }}
      initialExerciseHistory={null}
      initialHomeDashboardData={{
        metrics: { currentStreak: 0, longestStreak: 0, weeklyAdherence: 0, rollingAdherence: 0, hasSchedule: false },
        heatmap: [],
        nextWorkout: null,
        recentActivity: null,
        progressionSnapshot: { readyCount: 0, stalledCount: 0 }
      }}
      user={{ id: 'trusted-user', name: 'Trusted User', email: 'trusted@example.test' }}
    />,
  );

  await userEvent.click(screen.getAllByRole('button', { name: 'History' })[0]);

  expect(screen.getByText('Server History')).toBeTruthy();
});
