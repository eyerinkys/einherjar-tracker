import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireUser } from '@/server/auth/require-user';
import { AuthenticationError } from '@/server/auth/session';
import { getBodyweightSummary } from '@/server/queries/bodyweight';
import { logBodyweight, deleteBodyweightEntry, getBodyweightSummaryAction } from './bodyweight';

vi.mock('server-only', () => ({}));
vi.mock('@/server/auth/require-user', () => ({ requireUser: vi.fn() }));
vi.mock('@/server/queries/bodyweight', () => ({
  getBodyweightSummary: vi.fn(),
}));
vi.mock('@/db/client', () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('bodyweight Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns UNAUTHENTICATED error when unauthenticated', async () => {
    vi.mocked(requireUser).mockRejectedValue(new AuthenticationError());

    const res1 = await logBodyweight({ date: '2026-08-09', weightKg: 80 });
    expect(res1.ok).toBe(false);
    if (!res1.ok) {
      expect(res1.code).toBe('UNAUTHENTICATED');
    }

    const res2 = await deleteBodyweightEntry({ id: '123e4567-e89b-12d3-a456-426614174000' });
    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.code).toBe('UNAUTHENTICATED');
    }

    const res3 = await getBodyweightSummaryAction();
    expect(res3.ok).toBe(false);
    if (!res3.ok) {
      expect(res3.code).toBe('UNAUTHENTICATED');
    }
  });

  it('returns VALIDATION_ERROR for invalid payload input', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: 'trusted-user',
      name: 'Trusted',
      email: 'trusted@example.com',
    });

    const res1 = await logBodyweight({ date: '2026-8-9', weightKg: 10 });
    expect(res1.ok).toBe(false);
    if (!res1.ok) {
      expect(res1.code).toBe('VALIDATION_ERROR');
    }

    const res2 = await deleteBodyweightEntry({ id: 'not-a-uuid' });
    expect(res2.ok).toBe(false);
    if (!res2.ok) {
      expect(res2.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns bodyweight summary for authenticated user', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: 'trusted-user',
      name: 'Trusted',
      email: 'trusted@example.com',
    });
    const mockSummary = {
      currentWeight: 80,
      startWeight: 85,
      startDate: '2026-08-01',
      netChange: -5,
      trend: -1,
      logs: [],
    };
    vi.mocked(getBodyweightSummary).mockResolvedValue(mockSummary);

    const res = await getBodyweightSummaryAction();
    expect(res).toEqual({ ok: true, data: mockSummary });
    expect(getBodyweightSummary).toHaveBeenCalledWith('trusted-user');
  });
});
