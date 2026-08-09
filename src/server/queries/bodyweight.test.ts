import { describe, it, expect, vi } from 'vitest';
import {
  calculateBodyweightSummary,
  mapBodyweightRows,
  bodyweightLogsForUserWhere,
} from './bodyweight';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { bodyweightLogs } from '@/db/schema';

vi.mock('server-only', () => ({}));

describe('bodyweight query helpers', () => {
  it('returns empty summary when logs array is empty', () => {
    const summary = calculateBodyweightSummary([]);
    expect(summary).toEqual({
      currentWeight: null,
      startWeight: null,
      startDate: null,
      netChange: null,
      trend: null,
      logs: [],
    });
  });

  it('calculates single-log summary without trend', () => {
    const logs = [{ id: '1', date: '2026-08-01', weightKg: 80.0 }];
    const summary = calculateBodyweightSummary(logs);
    expect(summary).toEqual({
      currentWeight: 80.0,
      startWeight: 80.0,
      startDate: '2026-08-01',
      netChange: 0,
      trend: null,
      logs,
    });
  });

  it('calculates netChange and trend for multi-log history', () => {
    const logs = [
      { id: '1', date: '2026-08-01', weightKg: 85.0 },
      { id: '2', date: '2026-08-03', weightKg: 84.2 },
      { id: '3', date: '2026-08-05', weightKg: 83.5 },
      { id: '4', date: '2026-08-07', weightKg: 83.0 },
      { id: '5', date: '2026-08-09', weightKg: 82.3 },
    ];
    const summary = calculateBodyweightSummary(logs);
    expect(summary.currentWeight).toBe(82.3);
    expect(summary.startWeight).toBe(85.0);
    expect(summary.netChange).toBe(-2.7);
    // trend calculated from recent 4 logs (index 1 to 4: 84.2 -> 82.3)
    expect(summary.trend).toBe(-1.9);
  });

  it('maps database rows with string weights to DTOs', () => {
    const rows = [
      { id: 'bw-1', date: '2026-08-09', weightKg: '82.5', notes: 'Morning' },
      { id: 'bw-2', date: '2026-08-10', weightKg: '82.1', notes: null },
    ];
    expect(mapBodyweightRows(rows)).toEqual([
      { id: 'bw-1', date: '2026-08-09', weightKg: 82.5, notes: 'Morning' },
      { id: 'bw-2', date: '2026-08-10', weightKg: 82.1, notes: undefined },
    ]);
  });

  it('binds bodyweight query predicate strictly to trusted user', () => {
    const query = new PgDialect().sqlToQuery(
      sql`select ${bodyweightLogs.id} from ${bodyweightLogs} where ${bodyweightLogsForUserWhere('user-123')}`
    );
    expect(query.sql).toContain('"bodyweight_logs"."user_id" = $1');
    expect(query.params).toEqual(['user-123']);
  });
});
