import { getDb } from '@/db/client';
import { bodyweightLogs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { BodyweightEntry, BodyweightSummaryDTO } from '@/types';

export function bodyweightLogsForUserWhere(userId: string) {
  return eq(bodyweightLogs.userId, userId);
}

export function mapBodyweightRows(
  rows: { id: string; date: string; weightKg: string | number; notes?: string | null }[]
): BodyweightEntry[] {
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    weightKg: Number(r.weightKg),
    notes: r.notes ?? undefined,
  }));
}

export function calculateBodyweightSummary(logs: BodyweightEntry[]): BodyweightSummaryDTO {
  if (logs.length === 0) {
    return {
      currentWeight: null,
      startWeight: null,
      startDate: null,
      netChange: null,
      trend: null,
      logs: [],
    };
  }

  const start = logs[0];
  const current = logs[logs.length - 1];
  const startWeight = start.weightKg;
  const currentWeight = current.weightKg;
  const netChange = Math.round((currentWeight - startWeight) * 10) / 10;

  let trend: number | null = null;
  if (logs.length >= 2) {
    const recent = logs.slice(-4);
    const earliest = recent[0].weightKg;
    const latest = recent[recent.length - 1].weightKg;
    trend = Math.round((latest - earliest) * 10) / 10;
  }

  return {
    currentWeight,
    startWeight,
    startDate: start.date,
    netChange,
    trend,
    logs,
  };
}

export async function getBodyweightLogs(userId: string): Promise<BodyweightEntry[]> {
  const rows = await getDb()
    .select({
      id: bodyweightLogs.id,
      date: bodyweightLogs.date,
      weightKg: bodyweightLogs.weightKg,
      notes: bodyweightLogs.notes,
    })
    .from(bodyweightLogs)
    .where(bodyweightLogsForUserWhere(userId))
    .orderBy(asc(bodyweightLogs.date), asc(bodyweightLogs.createdAt));

  return mapBodyweightRows(rows);
}

export async function getBodyweightSummary(userId: string): Promise<BodyweightSummaryDTO> {
  const logs = await getBodyweightLogs(userId);
  return calculateBodyweightSummary(logs);
}
