import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { and, asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../db/schema';
import { exercises, splitDays, splitExercises, user } from '../../db/schema';
import { AuthorizationError } from '../auth/ownership';
import { getSplitDays } from '../queries/splits';
import { SplitMutationError } from './errors';
import {
  addSplitExerciseForUser,
  createSplitDayForUser,
  deleteSplitDayForUser,
  removeSplitExerciseForUser,
  renameSplitDayForUser,
  reorderSplitDaysForUser,
  reorderSplitExercisesForUser,
  updateSplitExerciseForUser,
} from './mutations';

vi.mock('server-only', () => ({}));

const connectionString = process.env.SPLIT_TEST_DATABASE_URL;
const integrationEnabled = process.env.RUN_SPLIT_DATABASE_TESTS === '1';

describe.runIf(Boolean(connectionString && integrationEnabled))(
  'split mutations against PostgreSQL',
  () => {
    neonConfig.webSocketConstructor = ws;

    const pool = new Pool({ connectionString });
    const database = drizzle({ client: pool, schema });
    const suffix = randomUUID();
    const firstUserId = `phase3b-first-${suffix}`;
    const secondUserId = `phase3b-second-${suffix}`;
    const builtInExerciseId = randomUUID();
    const firstCustomExerciseId = randomUUID();
    const secondCustomExerciseId = randomUUID();

    beforeAll(async () => {
      await database.insert(user).values([
        {
          id: firstUserId,
          name: 'Phase 3B First',
          email: `${firstUserId}@example.test`,
          emailVerified: false,
        },
        {
          id: secondUserId,
          name: 'Phase 3B Second',
          email: `${secondUserId}@example.test`,
          emailVerified: false,
        },
      ]);
      await database.insert(exercises).values([
        {
          id: builtInExerciseId,
          name: 'Phase 3B Built-in',
          muscleGroup: 'Chest',
          equipment: 'Barbell',
          category: 'compound',
          createdByUserId: null,
          isCustom: false,
        },
        {
          id: firstCustomExerciseId,
          name: 'Phase 3B First Custom',
          muscleGroup: 'Back',
          equipment: 'Cable',
          category: 'isolation',
          createdByUserId: firstUserId,
          isCustom: true,
        },
        {
          id: secondCustomExerciseId,
          name: 'Phase 3B Second Custom',
          muscleGroup: 'Legs',
          equipment: 'Machine',
          category: 'compound',
          createdByUserId: secondUserId,
          isCustom: true,
        },
      ]);
    });

    beforeEach(async () => {
      await database.delete(splitDays).where(
        eq(splitDays.userId, firstUserId),
      );
      await database.delete(splitDays).where(
        eq(splitDays.userId, secondUserId),
      );
    });

    afterAll(async () => {
      await database.delete(splitDays).where(eq(splitDays.userId, firstUserId));
      await database.delete(splitDays).where(eq(splitDays.userId, secondUserId));
      await database
        .delete(exercises)
        .where(
          and(
            eq(exercises.name, 'Phase 3B Built-in'),
            eq(exercises.id, builtInExerciseId),
          ),
        );
      await database.delete(user).where(eq(user.id, firstUserId));
      await database.delete(user).where(eq(user.id, secondUserId));
      await pool.end();
    });

    it('executes every mutation and keeps day and exercise orders gapless', async () => {
      let result = await createSplitDayForUser(firstUserId, { name: 'Pull' }, database);
      result = await createSplitDayForUser(firstUserId, { name: 'Push' }, database);
      expect(result.map(({ name, order }) => ({ name, order }))).toEqual([
        { name: 'Pull', order: 0 },
        { name: 'Push', order: 1 },
      ]);

      const pullId = result[0].id;
      const pushId = result[1].id;
      result = await renameSplitDayForUser(
        firstUserId,
        { splitDayId: pullId, name: 'Pull Day' },
        database,
      );
      expect(result[0].name).toBe('Pull Day');

      result = await addSplitExerciseForUser(
        firstUserId,
        {
          splitDayId: pullId,
          exerciseId: builtInExerciseId,
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 12,
        },
        database,
      );
      result = await addSplitExerciseForUser(
        firstUserId,
        {
          splitDayId: pullId,
          exerciseId: firstCustomExerciseId,
          targetSets: 4,
          targetRepMin: 10,
          targetRepMax: 15,
          notes: 'Controlled',
        },
        database,
      );
      const firstSplitExerciseId = result[0].exercises[0].id;
      const secondSplitExerciseId = result[0].exercises[1].id;
      expect(result[0].exercises.map((entry) => entry.order)).toEqual([0, 1]);

      result = await updateSplitExerciseForUser(
        firstUserId,
        {
          splitExerciseId: firstSplitExerciseId,
          targetSets: 5,
          targetRepMin: 6,
          targetRepMax: 10,
          notes: 'Pause',
        },
        database,
      );
      expect(result[0].exercises[0]).toMatchObject({
        targetSets: 5,
        targetRepMin: 6,
        targetRepMax: 10,
        notes: 'Pause',
      });

      result = await reorderSplitExercisesForUser(
        firstUserId,
        { splitDayId: pullId, splitExerciseIds: [secondSplitExerciseId, firstSplitExerciseId] },
        database,
      );
      expect(result[0].exercises.map((entry) => [entry.id, entry.order])).toEqual([
        [secondSplitExerciseId, 0],
        [firstSplitExerciseId, 1],
      ]);

      result = await removeSplitExerciseForUser(
        firstUserId,
        { splitExerciseId: secondSplitExerciseId },
        database,
      );
      expect(result[0].exercises.map((entry) => entry.order)).toEqual([0]);

      result = await reorderSplitDaysForUser(
        firstUserId,
        { splitDayIds: [pushId, pullId] },
        database,
      );
      expect(result.map((entry) => [entry.id, entry.order])).toEqual([
        [pushId, 0],
        [pullId, 1],
      ]);

      result = await deleteSplitDayForUser(firstUserId, { splitDayId: pushId }, database);
      expect(result.map((entry) => [entry.id, entry.order])).toEqual([[pullId, 0]]);

      const storedDayOrders = await database
        .select({ sortOrder: splitDays.sortOrder })
        .from(splitDays)
        .where(eq(splitDays.userId, firstUserId))
        .orderBy(asc(splitDays.sortOrder));
      const storedExerciseOrders = await database
        .select({ sortOrder: splitExercises.sortOrder })
        .from(splitExercises)
        .where(eq(splitExercises.splitDayId, pullId))
        .orderBy(asc(splitExercises.sortOrder));
      expect(storedDayOrders).toEqual([{ sortOrder: 0 }]);
      expect(storedExerciseOrders).toEqual([{ sortOrder: 0 }]);
    });

    it('enforces exercise visibility and cross-user read, update, and delete denial', async () => {
      const ownSplit = await createSplitDayForUser(firstUserId, { name: 'Push' }, database);
      const splitDayId = ownSplit[0].id;
      const withExercise = await addSplitExerciseForUser(
        firstUserId,
        {
          splitDayId,
          exerciseId: builtInExerciseId,
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 12,
        },
        database,
      );
      const splitExerciseId = withExercise[0].exercises[0].id;

      await expect(
        addSplitExerciseForUser(
          firstUserId,
          {
            splitDayId,
            exerciseId: secondCustomExerciseId,
            targetSets: 3,
            targetRepMin: 8,
            targetRepMax: 12,
          },
          database,
        ),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' } satisfies Partial<AuthorizationError>);
      await expect(
        updateSplitExerciseForUser(
          secondUserId,
          { splitExerciseId, targetSets: 1, targetRepMin: 1, targetRepMax: 1 },
          database,
        ),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' } satisfies Partial<AuthorizationError>);
      await expect(
        deleteSplitDayForUser(secondUserId, { splitDayId }, database),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' } satisfies Partial<AuthorizationError>);
      expect(await getSplitDays(secondUserId, database)).toEqual([]);
      expect(await getSplitDays(firstUserId, database)).toHaveLength(1);
    });

    it('enforces the persistent 50-day and 50-exercise limits', async () => {
      await database.insert(splitDays).values(
        Array.from({ length: 50 }, (_, sortOrder) => ({
          id: randomUUID(),
          userId: firstUserId,
          name: `Day ${sortOrder + 1}`,
          sortOrder,
        })),
      );

      await expect(
        createSplitDayForUser(firstUserId, { name: 'Day 51' }, database),
      ).rejects.toMatchObject({ code: 'LIMIT_REACHED' } satisfies Partial<SplitMutationError>);

      await database.delete(splitDays).where(eq(splitDays.userId, firstUserId));
      const split = await createSplitDayForUser(firstUserId, { name: 'Pull' }, database);
      const splitDayId = split[0].id;
      await database.insert(splitExercises).values(
        Array.from({ length: 50 }, (_, sortOrder) => ({
          id: randomUUID(),
          splitDayId,
          exerciseId: builtInExerciseId,
          sortOrder,
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 12,
        })),
      );

      await expect(
        addSplitExerciseForUser(
          firstUserId,
          {
            splitDayId,
            exerciseId: builtInExerciseId,
            targetSets: 3,
            targetRepMin: 8,
            targetRepMax: 12,
          },
          database,
        ),
      ).rejects.toMatchObject({ code: 'LIMIT_REACHED' } satisfies Partial<SplitMutationError>);
    });

    it('rejects stale reorder lists after acquiring the owning parent lock', async () => {
      const split = await createSplitDayForUser(firstUserId, { name: 'Pull' }, database);
      const splitDayId = split[0].id;
      let result = await addSplitExerciseForUser(
        firstUserId,
        {
          splitDayId,
          exerciseId: builtInExerciseId,
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 12,
        },
        database,
      );
      result = await addSplitExerciseForUser(
        firstUserId,
        {
          splitDayId,
          exerciseId: firstCustomExerciseId,
          targetSets: 3,
          targetRepMin: 8,
          targetRepMax: 12,
        },
        database,
      );
      const submittedIds = result[0].exercises.map(({ id }) => id).reverse();
      await expect(
        reorderSplitExercisesForUser(
          firstUserId,
          { splitDayId, splitExerciseIds: submittedIds.slice(0, 1) },
          database,
        ),
      ).rejects.toMatchObject({ code: 'STALE_ORDER' } satisfies Partial<SplitMutationError>);
      let pendingReorder!: Promise<unknown>;
      let reorderSettled = false;

      await database.transaction(async (tx) => {
        await tx
          .select({ id: splitDays.id })
          .from(splitDays)
          .where(and(eq(splitDays.id, splitDayId), eq(splitDays.userId, firstUserId)))
          .for('update');

        pendingReorder = reorderSplitExercisesForUser(
          firstUserId,
          { splitDayId, splitExerciseIds: submittedIds },
          database,
        ).finally(() => {
          reorderSettled = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 75));
        expect(reorderSettled).toBe(false);

        await tx
          .delete(splitExercises)
          .where(eq(splitExercises.id, submittedIds[0]));
      });

      await expect(pendingReorder).rejects.toMatchObject({
        code: 'NOT_FOUND',
      } satisfies Partial<AuthorizationError>);
    });
  },
);
