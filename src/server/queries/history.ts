import 'server-only';

import { and, asc, desc, eq, inArray, lt, ne, or, type SQL } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { exercises, sessionExercises, workoutSessions, workoutSets } from '../../db/schema';
import type {
  CompletedWorkoutHistoryPage,
  CompletedWorkoutSession,
  ExerciseHistory,
  ExerciseHistorySession,
  PreviousPerformanceSet,
} from '../../types';
import { requireOwnedRecord } from '../auth/ownership';
import { encodeHistoryCursor, type HistoryCursor, type ParsedHistoryPageInput } from '../validation/history';
import { mapExercise, type ExerciseLibraryRow, visibleExercisesWhere } from './exercises';

export interface CompletedSessionRow {
  id: string;
  userId: string;
  sourceSplitDayId: string | null;
  splitDayName: string;
  status: 'in_progress' | 'completed';
  startedAt: Date;
  completedAt: Date;
  notes: string | null;
}

export interface CompletedSessionChildRow {
  workoutSessionId: string;
  sessionExerciseId: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseSortOrder: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  exerciseNotes: string | null;
  setId: string;
  setNumber: number;
  weight: string | null;
  reps: number | null;
  isCompleted: boolean;
}

export interface ExerciseHistoryRow {
  workoutSessionId: string;
  sessionExerciseId: string;
  splitDayName: string;
  startedAt: Date;
  completedAt: Date;
  exerciseName: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  exerciseNotes: string | null;
  setId: string;
  setNumber: number;
  weight: string | null;
  reps: number | null;
  isCompleted: boolean;
}

export interface PreviousPerformanceRow {
  userId: string;
  status: 'in_progress' | 'completed';
  exerciseId: string | null;
  workoutSessionId: string;
  sessionExerciseId: string;
  completedAt: Date;
  setId: string;
  setNumber: number;
  weight: string | null;
  reps: number | null;
  isCompleted: boolean;
}

export type SelectedPreviousPerformanceRow = PreviousPerformanceRow & {
  exerciseId: string;
  reps: number;
};

export interface HistoryReadAdapter {
  listCompletedSessions(userId: string, cursor: HistoryCursor | undefined, limit: number): Promise<CompletedSessionRow[]>;
  listCompletedSessionChildren(userId: string, sessionIds: readonly string[]): Promise<CompletedSessionChildRow[]>;
  findCompletedSession(userId: string, sessionId: string): Promise<CompletedSessionRow | null>;
  findVisibleExercise(userId: string, exerciseId: string): Promise<ExerciseLibraryRow | null>;
  listExerciseHistory(userId: string, exerciseId: string): Promise<ExerciseHistoryRow[]>;
  listPreviousPerformance(
    userId: string,
    activeSessionId: string,
    activeStartedAt: Date,
    exerciseIds: readonly string[],
  ): Promise<PreviousPerformanceRow[]>;
}

export function completedSessionsWhere(userId: string, cursor?: HistoryCursor): SQL {
  return and(
    eq(workoutSessions.userId, userId),
    eq(workoutSessions.status, 'completed'),
    cursor
      ? or(
          lt(workoutSessions.completedAt, cursor.completedAt),
          and(eq(workoutSessions.completedAt, cursor.completedAt), lt(workoutSessions.id, cursor.id)),
        )
      : undefined,
  )!;
}

export function previousPerformanceWhere(
  userId: string,
  activeSessionId: string,
  activeStartedAt: Date,
  exerciseIds: readonly string[],
): SQL {
  return and(
    eq(workoutSessions.userId, userId),
    eq(workoutSessions.status, 'completed'),
    ne(workoutSessions.id, activeSessionId),
    lt(workoutSessions.completedAt, activeStartedAt),
    eq(workoutSets.isCompleted, true),
    inArray(sessionExercises.exerciseId, [...exerciseIds]),
  )!;
}

export function completedSessionChildrenWhere(
  userId: string,
  sessionIds: readonly string[],
): SQL {
  return and(
    eq(workoutSessions.userId, userId),
    eq(workoutSessions.status, 'completed'),
    inArray(workoutSessions.id, [...sessionIds]),
    eq(workoutSets.isCompleted, true),
  )!;
}

export function exerciseHistoryWhere(userId: string, exerciseId: string): SQL {
  return and(
    eq(workoutSessions.userId, userId),
    eq(workoutSessions.status, 'completed'),
    eq(sessionExercises.exerciseId, exerciseId),
    eq(workoutSets.isCompleted, true),
  )!;
}

function sessionDurationMinutes(startedAt: Date, completedAt: Date): number {
  return Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 60_000));
}

function compareTextAscending(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

export function mapCompletedSession(
  session: CompletedSessionRow,
  childRows: readonly CompletedSessionChildRow[],
): CompletedWorkoutSession {
  const exercisesById = new Map<string, {
    sortOrder: number;
    dto: CompletedWorkoutSession['exercises'][number];
  }>();

  for (const row of childRows) {
    if (row.workoutSessionId !== session.id || !row.isCompleted || row.reps === null) continue;
    let exerciseEntry = exercisesById.get(row.sessionExerciseId);
    if (!exerciseEntry) {
      exerciseEntry = {
        sortOrder: row.exerciseSortOrder,
        dto: {
          id: row.sessionExerciseId,
          exerciseId: row.exerciseId,
          exerciseName: row.exerciseName,
          targetSets: row.targetSets,
          targetRepMin: row.targetRepMin,
          targetRepMax: row.targetRepMax,
          ...(row.exerciseNotes === null ? {} : { notes: row.exerciseNotes }),
          sets: [],
        },
      };
      exercisesById.set(row.sessionExerciseId, exerciseEntry);
    }
    exerciseEntry.dto.sets.push({
      id: row.setId,
      setNumber: row.setNumber,
      weight: row.weight === null ? null : Number(row.weight),
      reps: row.reps,
    });
  }

  const orderedExercises = [...exercisesById.values()]
    .sort((left, right) => left.sortOrder - right.sortOrder || compareTextAscending(left.dto.id, right.dto.id))
    .map(({ dto }) => ({
      ...dto,
      sets: [...dto.sets].sort(
        (left, right) => left.setNumber - right.setNumber || compareTextAscending(left.id, right.id),
      ),
    }));

  return {
    id: session.id,
    sourceSplitDayId: session.sourceSplitDayId,
    splitDayName: session.splitDayName,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt.toISOString(),
    durationMinutes: sessionDurationMinutes(session.startedAt, session.completedAt),
    ...(session.notes === null ? {} : { notes: session.notes }),
    exercises: orderedExercises,
  };
}

function compareSessionsDescending(left: CompletedSessionRow, right: CompletedSessionRow): number {
  return right.completedAt.getTime() - left.completedAt.getTime() || compareTextAscending(right.id, left.id);
}

export async function getCompletedSessionHistory(
  userId: string,
  input: ParsedHistoryPageInput,
  adapter: HistoryReadAdapter = createDrizzleHistoryReadAdapter(),
): Promise<CompletedWorkoutHistoryPage> {
  const fetched = await adapter.listCompletedSessions(userId, input.cursor, input.pageSize + 1);
  const ordered = [...fetched].sort(compareSessionsDescending);
  const hasAnotherPage = ordered.length > input.pageSize;
  const pageRows = ordered.slice(0, input.pageSize);
  const childRows = pageRows.length === 0
    ? []
    : await adapter.listCompletedSessionChildren(userId, pageRows.map(({ id }) => id));
  const last = pageRows.at(-1);

  return {
    sessions: pageRows.map((session) => mapCompletedSession(session, childRows)),
    nextCursor: hasAnotherPage && last
      ? encodeHistoryCursor({ completedAt: last.completedAt.toISOString(), id: last.id })
      : null,
  };
}

export async function getCompletedSession(
  userId: string,
  sessionId: string,
  adapter: HistoryReadAdapter = createDrizzleHistoryReadAdapter(),
): Promise<CompletedWorkoutSession> {
  const session = requireOwnedRecord(await adapter.findCompletedSession(userId, sessionId));
  const children = await adapter.listCompletedSessionChildren(userId, [session.id]);
  return mapCompletedSession(session, children);
}

function mapExerciseHistoryRows(rows: readonly ExerciseHistoryRow[]): ExerciseHistorySession[] {
  const byExercise = new Map<string, ExerciseHistorySession>();
  for (const row of rows) {
    if (!row.isCompleted || row.reps === null) continue;
    let entry = byExercise.get(row.sessionExerciseId);
    if (!entry) {
      entry = {
        sessionId: row.workoutSessionId,
        sessionExerciseId: row.sessionExerciseId,
        splitDayName: row.splitDayName,
        startedAt: row.startedAt.toISOString(),
        completedAt: row.completedAt.toISOString(),
        durationMinutes: sessionDurationMinutes(row.startedAt, row.completedAt),
        exerciseName: row.exerciseName,
        targetSets: row.targetSets,
        targetRepMin: row.targetRepMin,
        targetRepMax: row.targetRepMax,
        ...(row.exerciseNotes === null ? {} : { notes: row.exerciseNotes }),
        sets: [],
      };
      byExercise.set(row.sessionExerciseId, entry);
    }
    entry.sets.push({
      id: row.setId,
      setNumber: row.setNumber,
      weight: row.weight === null ? null : Number(row.weight),
      reps: row.reps,
    });
  }

  return [...byExercise.values()]
    .map((entry) => ({
      ...entry,
      sets: [...entry.sets].sort(
        (left, right) => left.setNumber - right.setNumber || compareTextAscending(left.id, right.id),
      ),
    }))
    .sort((left, right) =>
      left.completedAt.localeCompare(right.completedAt)
      || compareTextAscending(left.sessionId, right.sessionId)
      || compareTextAscending(left.sessionExerciseId, right.sessionExerciseId));
}

export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  adapter: HistoryReadAdapter = createDrizzleHistoryReadAdapter(),
): Promise<ExerciseHistory> {
  const exercise = requireOwnedRecord(await adapter.findVisibleExercise(userId, exerciseId));
  const rows = await adapter.listExerciseHistory(userId, exerciseId);
  return { exercise: mapExercise(exercise), sessions: mapExerciseHistoryRows(rows) };
}

export async function getPreviousPerformanceRowsByExercise(
  userId: string,
  activeSessionId: string,
  activeStartedAt: Date,
  exerciseIds: readonly string[],
  adapter: HistoryReadAdapter = createDrizzleHistoryReadAdapter(),
): Promise<Map<string, SelectedPreviousPerformanceRow[]>> {
  if (exerciseIds.length === 0) return new Map();
  const requested = new Set(exerciseIds);
  const rows = await adapter.listPreviousPerformance(
    userId, activeSessionId, activeStartedAt, exerciseIds,
  );
  const eligible = rows
    .filter((row): row is SelectedPreviousPerformanceRow =>
      row.userId === userId
      && row.status === 'completed'
      && row.workoutSessionId !== activeSessionId
      && row.completedAt.getTime() < activeStartedAt.getTime()
      && row.isCompleted
      && row.exerciseId !== null
      && requested.has(row.exerciseId)
      && row.reps !== null,
    )
    .sort((left, right) =>
      right.completedAt.getTime() - left.completedAt.getTime()
      || compareTextAscending(right.workoutSessionId, left.workoutSessionId)
      || compareTextAscending(right.sessionExerciseId, left.sessionExerciseId)
      || left.setNumber - right.setNumber
      || compareTextAscending(left.setId, right.setId));

  const chosenExercise = new Map<string, string>();
  const result = new Map<string, SelectedPreviousPerformanceRow[]>();
  for (const row of eligible) {
    const exerciseId = row.exerciseId;
    const selected = chosenExercise.get(exerciseId);
    if (selected !== undefined && selected !== row.sessionExerciseId) continue;
    chosenExercise.set(exerciseId, row.sessionExerciseId);
    const sets = result.get(exerciseId) ?? [];
    sets.push(row);
    result.set(exerciseId, sets);
  }
  return result;
}

export async function getPreviousPerformanceByExercise(
  userId: string,
  activeSessionId: string,
  activeStartedAt: Date,
  exerciseIds: readonly string[],
  adapter: HistoryReadAdapter = createDrizzleHistoryReadAdapter(),
): Promise<Map<string, PreviousPerformanceSet[]>> {
  const selected = await getPreviousPerformanceRowsByExercise(
    userId, activeSessionId, activeStartedAt, exerciseIds, adapter,
  );
  return new Map([...selected].map(([exerciseId, rows]) => [
    exerciseId,
    rows.map((row) => ({
      weight: row.weight === null ? null : Number(row.weight),
      reps: row.reps,
    })),
  ]));
}

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type QueryExecutor = Database | Transaction;

export function createDrizzleHistoryReadAdapter(database: QueryExecutor = getDb()): HistoryReadAdapter {
  return {
    async listCompletedSessions(userId, cursor, limit) {
      const rows = await database.select({
        id: workoutSessions.id,
        userId: workoutSessions.userId,
        sourceSplitDayId: workoutSessions.sourceSplitDayId,
        splitDayName: workoutSessions.splitDayName,
        status: workoutSessions.status,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
        notes: workoutSessions.notes,
      }).from(workoutSessions)
        .where(completedSessionsWhere(userId, cursor))
        .orderBy(desc(workoutSessions.completedAt), desc(workoutSessions.id))
        .limit(limit);
      return rows.filter((row): row is CompletedSessionRow => row.completedAt !== null);
    },

    async listCompletedSessionChildren(userId, sessionIds) {
      if (sessionIds.length === 0) return [];
      return database.select({
        workoutSessionId: workoutSessions.id,
        sessionExerciseId: sessionExercises.id,
        exerciseId: sessionExercises.exerciseId,
        exerciseName: sessionExercises.exerciseName,
        exerciseSortOrder: sessionExercises.sortOrder,
        targetSets: sessionExercises.targetSets,
        targetRepMin: sessionExercises.targetRepMin,
        targetRepMax: sessionExercises.targetRepMax,
        exerciseNotes: sessionExercises.notes,
        setId: workoutSets.id,
        setNumber: workoutSets.setNumber,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        isCompleted: workoutSets.isCompleted,
      }).from(workoutSessions)
        .innerJoin(sessionExercises, eq(sessionExercises.workoutSessionId, workoutSessions.id))
        .innerJoin(workoutSets, eq(workoutSets.sessionExerciseId, sessionExercises.id))
        .where(completedSessionChildrenWhere(userId, sessionIds))
        .orderBy(
          asc(sessionExercises.sortOrder), asc(sessionExercises.id),
          asc(workoutSets.setNumber), asc(workoutSets.id),
        );
    },

    async findCompletedSession(userId, sessionId) {
      const rows = await database.select({
        id: workoutSessions.id,
        userId: workoutSessions.userId,
        sourceSplitDayId: workoutSessions.sourceSplitDayId,
        splitDayName: workoutSessions.splitDayName,
        status: workoutSessions.status,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
        notes: workoutSessions.notes,
      }).from(workoutSessions).where(and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.status, 'completed'),
      )).limit(1);
      const row = rows[0];
      return row?.completedAt ? row as CompletedSessionRow : null;
    },

    async findVisibleExercise(userId, exerciseId) {
      const rows = await database.select({
        id: exercises.id,
        name: exercises.name,
        muscleGroup: exercises.muscleGroup,
        equipment: exercises.equipment,
        category: exercises.category,
        createdByUserId: exercises.createdByUserId,
        isCustom: exercises.isCustom,
      }).from(exercises).where(and(eq(exercises.id, exerciseId), visibleExercisesWhere(userId))).limit(1);
      return rows[0] ?? null;
    },

    async listExerciseHistory(userId, exerciseId) {
      const rows = await database.select({
        workoutSessionId: workoutSessions.id,
        sessionExerciseId: sessionExercises.id,
        splitDayName: workoutSessions.splitDayName,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
        exerciseName: sessionExercises.exerciseName,
        targetSets: sessionExercises.targetSets,
        targetRepMin: sessionExercises.targetRepMin,
        targetRepMax: sessionExercises.targetRepMax,
        exerciseNotes: sessionExercises.notes,
        setId: workoutSets.id,
        setNumber: workoutSets.setNumber,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        isCompleted: workoutSets.isCompleted,
      }).from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.workoutSessionId))
        .innerJoin(workoutSets, eq(workoutSets.sessionExerciseId, sessionExercises.id))
        .where(exerciseHistoryWhere(userId, exerciseId))
        .orderBy(
          asc(workoutSessions.completedAt), asc(workoutSessions.id),
          asc(sessionExercises.id), asc(workoutSets.setNumber), asc(workoutSets.id),
        );
      return rows.filter((row): row is ExerciseHistoryRow => row.completedAt !== null);
    },

    async listPreviousPerformance(userId, activeSessionId, activeStartedAt, exerciseIds) {
      if (exerciseIds.length === 0) return [];
      const rows = await database.select({
        userId: workoutSessions.userId,
        status: workoutSessions.status,
        exerciseId: sessionExercises.exerciseId,
        workoutSessionId: workoutSessions.id,
        sessionExerciseId: sessionExercises.id,
        completedAt: workoutSessions.completedAt,
        setId: workoutSets.id,
        setNumber: workoutSets.setNumber,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
        isCompleted: workoutSets.isCompleted,
      }).from(sessionExercises)
        .innerJoin(workoutSessions, eq(workoutSessions.id, sessionExercises.workoutSessionId))
        .innerJoin(workoutSets, eq(workoutSets.sessionExerciseId, sessionExercises.id))
        .where(previousPerformanceWhere(
          userId, activeSessionId, activeStartedAt, exerciseIds,
        ))
        .orderBy(
          desc(workoutSessions.completedAt), desc(workoutSessions.id),
          desc(sessionExercises.id), asc(workoutSets.setNumber), asc(workoutSets.id),
        );
      return rows.filter((row): row is PreviousPerformanceRow => row.completedAt !== null);
    },
  };
}
