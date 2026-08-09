import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '../server/auth/require-user';
import { AuthenticationError } from '../server/auth/session';
import { getAnalyticsOverviewData } from '../server/queries/analytics';
import { getAnalyticsOverview } from './analytics';

vi.mock('server-only', () => ({}));
vi.mock('../server/auth/require-user', () => ({ requireUser: vi.fn() }));
vi.mock('../server/queries/analytics', () => ({
  getAnalyticsOverviewData: vi.fn(),
}));

const mockOverview = {
  summary: {
    progressingCount: 1,
    readyCount: 0,
    stalledCount: 0,
    recentPRsCount: 0,
    insufficientCount: 0,
  },
  readyList: [],
  stalledList: [],
  progressingList: [],
  achievedPRs: [],
};

describe('getAnalyticsOverview action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns UNAUTHENTICATED error when unauthenticated', async () => {
    vi.mocked(requireUser).mockRejectedValue(new AuthenticationError());
    const res = await getAnalyticsOverview();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('UNAUTHENTICATED');
    }
  });

  it('returns analytics data for authenticated user', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'trusted-user', name: 'Trusted', email: 'trusted@example.test' });
    vi.mocked(getAnalyticsOverviewData).mockResolvedValue(mockOverview);

    const res = await getAnalyticsOverview();
    expect(res).toEqual({ ok: true, data: mockOverview });
    expect(getAnalyticsOverviewData).toHaveBeenCalledWith('trusted-user');
  });

  it('returns safe internal error when query throws unexpected error', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'trusted-user', name: 'Trusted', email: 'trusted@example.test' });
    vi.mocked(getAnalyticsOverviewData).mockRejectedValue(new Error('DB failure'));

    const res = await getAnalyticsOverview();
    expect(res).toEqual({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to load analytics. Please try again.',
    });
  });
});
