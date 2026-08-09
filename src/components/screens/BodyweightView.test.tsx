// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BodyweightView } from './BodyweightView';
import { logBodyweight, deleteBodyweightEntry, getBodyweightSummaryAction } from '@/actions/bodyweight';
import type { BodyweightSummaryDTO } from '@/types';

vi.mock('@/actions/bodyweight', () => ({
  logBodyweight: vi.fn(),
  deleteBodyweightEntry: vi.fn(),
  getBodyweightSummaryAction: vi.fn(),
}));

describe('BodyweightView component', () => {
  const emptySummary: BodyweightSummaryDTO = {
    currentWeight: null,
    startWeight: null,
    startDate: null,
    netChange: null,
    trend: null,
    logs: [],
  };

  const populatedSummary: BodyweightSummaryDTO = {
    currentWeight: 82.5,
    startWeight: 85.0,
    startDate: '2026-08-01',
    netChange: -2.5,
    trend: -1.0,
    logs: [
      { id: '123e4567-e89b-12d3-a456-426614174001', date: '2026-08-01', weightKg: 85.0 },
      { id: '123e4567-e89b-12d3-a456-426614174002', date: '2026-08-09', weightKg: 82.5 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders empty state when initialSummary has no logs', () => {
    render(<BodyweightView initialSummary={emptySummary} />);
    expect(screen.getByText('No Bodyweight Entries Logged')).toBeDefined();
  });

  it('renders stats summary cards and logs when populated', () => {
    render(<BodyweightView initialSummary={populatedSummary} />);
    expect(screen.getByText('82.5')).toBeDefined();
    expect(screen.getByText('85')).toBeDefined();
    expect(screen.getByText('-2.5')).toBeDefined();
    expect(screen.getAllByText('2026-08-01').length).toBeGreaterThan(0);
    expect(screen.getByText('2026-08-09')).toBeDefined();
  });

  it('calls logBodyweight action when submitting new weight', async () => {
    vi.mocked(logBodyweight).mockResolvedValue({
      ok: true,
      data: { id: '123e4567-e89b-12d3-a456-426614174003', date: '2026-08-09', weightKg: 80.5 },
    });
    vi.mocked(getBodyweightSummaryAction).mockResolvedValue({
      ok: true,
      data: {
        ...populatedSummary,
        currentWeight: 80.5,
        netChange: -4.5,
        logs: [
          ...populatedSummary.logs,
          { id: '123e4567-e89b-12d3-a456-426614174003', date: '2026-08-09', weightKg: 80.5 },
        ],
      },
    });

    render(<BodyweightView initialSummary={emptySummary} />);

    fireEvent.click(screen.getByText('Log Weight Now'));

    const input = screen.getByLabelText(/Bodyweight \(kg\)/i);
    fireEvent.change(input, { target: { value: '80.5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(logBodyweight).toHaveBeenCalledWith(
        expect.objectContaining({
          weightKg: 80.5,
        })
      );
    });
  });

  it('calls deleteBodyweightEntry action when deleting an entry', async () => {
    const entryId = '123e4567-e89b-12d3-a456-426614174002';
    vi.mocked(deleteBodyweightEntry).mockResolvedValue({
      ok: true,
      data: { id: entryId },
    });
    vi.mocked(getBodyweightSummaryAction).mockResolvedValue({
      ok: true,
      data: {
        ...populatedSummary,
        logs: [populatedSummary.logs[0]],
      },
    });

    render(<BodyweightView initialSummary={populatedSummary} />);

    const deleteBtn = screen.getByTestId(`delete-bw-${entryId}`);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteBodyweightEntry).toHaveBeenCalledWith({ id: entryId });
    });
  });
});
