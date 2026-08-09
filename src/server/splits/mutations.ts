import 'server-only';

import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb } from '../../db/client';
import { exercises, splitDays, splitExercises, user } from '../../db/schema';
import type { SplitDay } from '../../types';
import { AuthorizationError, requireOwnedRecord, ownedWhere } from '../auth/ownership';
import { visibleExercisesWhere } from '../queries/exercises';
import { getSplitDays } from '../queries/splits';
import type {
  AddSplitExerciseInput,
  CreateSplitDayInput,
  DeleteSplitDayInput,
  RemoveSplitExerciseInput,
  RenameSplitDayInput,
  ReorderSplitDaysInput,
  ReorderSplitExercisesInput,
  UpdateSplitExerciseInput,
} from '../validation/split';
import { MAX_SPLIT_DAYS, MAX_SPLIT_EXERCISES } from '../validation/split';
import { SplitMutationError } from './errors';

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export function exactIdListMatches(currentIds: readonly string[], submittedIds: readonly string[]) {
  if (currentIds.length !== submittedIds.length) {
    return false;
  }

  const currentIdSet = new Set(currentIds);
  return (
    currentIdSet.size === currentIds.length &&
    new Set(submittedIds).size === submittedIds.length &&
    submittedIds.every((id) => currentIdSet.has(id))
  );
}

export function requireExactOwnedIdList(
  currentIds: readonly string[],
  submittedIds: readonly string[],
) {
  const currentIdSet = new Set(currentIds);
  if (submittedIds.some((id) => !currentIdSet.has(id))) {
    throw new AuthorizationError();
  }

  if (!exactIdListMatches(currentIds, submittedIds)) {
    throw new SplitMutationError(
      'STALE_ORDER',
      'Split order changed. Refresh and try again.',
    );
  }
}

export function ownedSplitExerciseWhere(userId: string, splitExerciseId: string) {
  return and(
    eq(splitExercises.id, splitExerciseId),
    sql`exists (select 1 from ${splitDays} where ${splitDays.id} = ${splitExercises.splitDayId} and ${splitDays.userId} = ${userId})`,
  )!;
}

async function lockUserParent(tx: Transaction, userId: string) {
  const rows = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .for('update');

  return requireOwnedRecord(rows[0]);
}

async function lockOwnedSplitDay(tx: Transaction, userId: string, splitDayId: string) {
  const rows = await tx
    .select({ id: splitDays.id })
    .from(splitDays)
    .where(ownedWhere(splitDays.userId, userId, eq(splitDays.id, splitDayId)))
    .for('update');

  return requireOwnedRecord(rows[0]);
}

async function orderedSplitDayIds(tx: Transaction, userId: string) {
  return tx
    .select({ id: splitDays.id })
    .from(splitDays)
    .where(eq(splitDays.userId, userId))
    .orderBy(asc(splitDays.sortOrder), asc(splitDays.id));
}

async function orderedSplitExerciseIds(tx: Transaction, splitDayId: string) {
  return tx
    .select({ id: splitExercises.id })
    .from(splitExercises)
    .where(eq(splitExercises.splitDayId, splitDayId))
    .orderBy(asc(splitExercises.sortOrder), asc(splitExercises.id));
}

async function writeSplitDayOrder(
  tx: Transaction,
  userId: string,
  orderedIds: readonly string[],
) {
  for (const [sortOrder, id] of orderedIds.entries()) {
    const updated = await tx
      .update(splitDays)
      .set({ sortOrder, updatedAt: new Date() })
      .where(ownedWhere(splitDays.userId, userId, eq(splitDays.id, id)))
      .returning({ id: splitDays.id });
    requireOwnedRecord(updated[0]);
  }
}

async function writeSplitExerciseOrder(
  tx: Transaction,
  userId: string,
  splitDayId: string,
  orderedIds: readonly string[],
) {
  for (const [sortOrder, id] of orderedIds.entries()) {
    const updated = await tx
      .update(splitExercises)
      .set({ sortOrder, updatedAt: new Date() })
      .where(
        and(
          eq(splitExercises.splitDayId, splitDayId),
          ownedSplitExerciseWhere(userId, id),
        ),
      )
      .returning({ id: splitExercises.id });
    requireOwnedRecord(updated[0]);
  }
}

function normalizedNotes(notes: string | undefined) {
  return notes === undefined || notes.length === 0 ? null : notes;
}

async function authoritativeSplit(database: Database, userId: string) {
  return getSplitDays(userId, database);
}

export async function createSplitDayForUser(
  userId: string,
  input: CreateSplitDayInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  await database.transaction(async (tx) => {
    await lockUserParent(tx, userId);
    const currentRows = await orderedSplitDayIds(tx, userId);
    if (currentRows.length >= MAX_SPLIT_DAYS) {
      throw new SplitMutationError('LIMIT_REACHED', 'Split day limit reached.');
    }

    await writeSplitDayOrder(
      tx,
      userId,
      currentRows.map(({ id }) => id),
    );
    await tx.insert(splitDays).values({
      userId,
      name: input.name,
      sortOrder: currentRows.length,
    });
  });

  return authoritativeSplit(database, userId);
}

export async function renameSplitDayForUser(
  userId: string,
  input: RenameSplitDayInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  const updated = await database
    .update(splitDays)
    .set({ name: input.name, updatedAt: new Date() })
    .where(ownedWhere(splitDays.userId, userId, eq(splitDays.id, input.splitDayId)))
    .returning({ id: splitDays.id });
  requireOwnedRecord(updated[0]);

  return authoritativeSplit(database, userId);
}

export async function deleteSplitDayForUser(
  userId: string,
  input: DeleteSplitDayInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  await database.transaction(async (tx) => {
    await lockUserParent(tx, userId);
    const deleted = await tx
      .delete(splitDays)
      .where(ownedWhere(splitDays.userId, userId, eq(splitDays.id, input.splitDayId)))
      .returning({ id: splitDays.id });
    requireOwnedRecord(deleted[0]);

    const remainingRows = await orderedSplitDayIds(tx, userId);
    await writeSplitDayOrder(
      tx,
      userId,
      remainingRows.map(({ id }) => id),
    );
  });

  return authoritativeSplit(database, userId);
}

export async function reorderSplitDaysForUser(
  userId: string,
  input: ReorderSplitDaysInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  await database.transaction(async (tx) => {
    await lockUserParent(tx, userId);
    const currentRows = await orderedSplitDayIds(tx, userId);
    requireExactOwnedIdList(
      currentRows.map(({ id }) => id),
      input.splitDayIds,
    );

    await writeSplitDayOrder(tx, userId, input.splitDayIds);
  });

  return authoritativeSplit(database, userId);
}

export async function addSplitExerciseForUser(
  userId: string,
  input: AddSplitExerciseInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  await database.transaction(async (tx) => {
    await lockOwnedSplitDay(tx, userId, input.splitDayId);
    const currentRows = await orderedSplitExerciseIds(tx, input.splitDayId);
    if (currentRows.length >= MAX_SPLIT_EXERCISES) {
      throw new SplitMutationError('LIMIT_REACHED', 'Exercise limit reached for this split day.');
    }

    const visibleExercise = await tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.id, input.exerciseId), visibleExercisesWhere(userId)))
      .limit(1);
    requireOwnedRecord(visibleExercise[0]);

    await writeSplitExerciseOrder(
      tx,
      userId,
      input.splitDayId,
      currentRows.map(({ id }) => id),
    );
    await tx.insert(splitExercises).values({
      splitDayId: input.splitDayId,
      exerciseId: input.exerciseId,
      sortOrder: currentRows.length,
      targetSets: input.targetSets,
      targetRepMin: input.targetRepMin,
      targetRepMax: input.targetRepMax,
      notes: normalizedNotes(input.notes),
    });
  });

  return authoritativeSplit(database, userId);
}

export async function removeSplitExerciseForUser(
  userId: string,
  input: RemoveSplitExerciseInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  await database.transaction(async (tx) => {
    const ownedRows = await tx
      .select({ splitDayId: splitExercises.splitDayId })
      .from(splitExercises)
      .innerJoin(splitDays, eq(splitDays.id, splitExercises.splitDayId))
      .where(
        and(
          eq(splitExercises.id, input.splitExerciseId),
          eq(splitDays.userId, userId),
        ),
      )
      .limit(1);
    const owned = requireOwnedRecord(ownedRows[0]);
    await lockOwnedSplitDay(tx, userId, owned.splitDayId);

    const deleted = await tx
      .delete(splitExercises)
      .where(
        and(
          eq(splitExercises.splitDayId, owned.splitDayId),
          ownedSplitExerciseWhere(userId, input.splitExerciseId),
        ),
      )
      .returning({ id: splitExercises.id });
    requireOwnedRecord(deleted[0]);

    const remainingRows = await orderedSplitExerciseIds(tx, owned.splitDayId);
    await writeSplitExerciseOrder(
      tx,
      userId,
      owned.splitDayId,
      remainingRows.map(({ id }) => id),
    );
  });

  return authoritativeSplit(database, userId);
}

export async function reorderSplitExercisesForUser(
  userId: string,
  input: ReorderSplitExercisesInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  await database.transaction(async (tx) => {
    await lockOwnedSplitDay(tx, userId, input.splitDayId);
    const currentRows = await orderedSplitExerciseIds(tx, input.splitDayId);
    requireExactOwnedIdList(
      currentRows.map(({ id }) => id),
      input.splitExerciseIds,
    );

    await writeSplitExerciseOrder(tx, userId, input.splitDayId, input.splitExerciseIds);
  });

  return authoritativeSplit(database, userId);
}

export async function updateSplitExerciseForUser(
  userId: string,
  input: UpdateSplitExerciseInput,
  database: Database = getDb(),
): Promise<SplitDay[]> {
  const updated = await database
    .update(splitExercises)
    .set({
      targetSets: input.targetSets,
      targetRepMin: input.targetRepMin,
      targetRepMax: input.targetRepMax,
      notes: normalizedNotes(input.notes),
      updatedAt: new Date(),
    })
    .where(ownedSplitExerciseWhere(userId, input.splitExerciseId))
    .returning({ id: splitExercises.id });
  requireOwnedRecord(updated[0]);

  return authoritativeSplit(database, userId);
}
