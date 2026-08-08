import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../db/schema';
import { splitDays, user } from '../../db/schema';
import { ownedWhere } from './ownership';

const connectionString = process.env.AUTH_TEST_DATABASE_URL;
const integrationEnabled = process.env.RUN_AUTH_DATABASE_TESTS === '1';

describe.runIf(Boolean(connectionString && integrationEnabled))(
  'ownership-safe queries against PostgreSQL',
  () => {
    neonConfig.webSocketConstructor = ws;

    const pool = new Pool({ connectionString });
    const database = drizzle({ client: pool, schema });
    const suffix = randomUUID();
    const firstUserId = `phase2-first-${suffix}`;
    const secondUserId = `phase2-second-${suffix}`;
    const splitDayId = randomUUID();

    beforeAll(async () => {
      await database.insert(user).values([
        {
          id: firstUserId,
          name: 'Phase 2 First',
          email: `${firstUserId}@example.test`,
          emailVerified: false,
        },
        {
          id: secondUserId,
          name: 'Phase 2 Second',
          email: `${secondUserId}@example.test`,
          emailVerified: false,
        },
      ]);
      await database.insert(splitDays).values({
        id: splitDayId,
        userId: firstUserId,
        name: 'Push',
        sortOrder: 0,
      });
    });

    afterAll(async () => {
      await database.delete(splitDays).where(eq(splitDays.id, splitDayId));
      await database
        .delete(user)
        .where(and(eq(user.id, firstUserId), eq(user.email, `${firstUserId}@example.test`)));
      await database
        .delete(user)
        .where(and(eq(user.id, secondUserId), eq(user.email, `${secondUserId}@example.test`)));
      await pool.end();
    });

    it('does not reveal another user record', async () => {
      const ownRows = await database
        .select({ id: splitDays.id })
        .from(splitDays)
        .where(ownedWhere(splitDays.userId, firstUserId, eq(splitDays.id, splitDayId)));
      const otherRows = await database
        .select({ id: splitDays.id })
        .from(splitDays)
        .where(ownedWhere(splitDays.userId, secondUserId, eq(splitDays.id, splitDayId)));

      expect(ownRows).toEqual([{ id: splitDayId }]);
      expect(otherRows).toEqual([]);
    });

    it('does not update another user record', async () => {
      const otherUpdate = await database
        .update(splitDays)
        .set({ name: 'Compromised' })
        .where(ownedWhere(splitDays.userId, secondUserId, eq(splitDays.id, splitDayId)))
        .returning({ id: splitDays.id });
      const ownUpdate = await database
        .update(splitDays)
        .set({ name: 'Push Day' })
        .where(ownedWhere(splitDays.userId, firstUserId, eq(splitDays.id, splitDayId)))
        .returning({ name: splitDays.name });

      expect(otherUpdate).toEqual([]);
      expect(ownUpdate).toEqual([{ name: 'Push Day' }]);
    });

    it('does not delete another user record', async () => {
      const otherDelete = await database
        .delete(splitDays)
        .where(ownedWhere(splitDays.userId, secondUserId, eq(splitDays.id, splitDayId)))
        .returning({ id: splitDays.id });
      const remainingRows = await database
        .select({ id: splitDays.id })
        .from(splitDays)
        .where(eq(splitDays.id, splitDayId));

      expect(otherDelete).toEqual([]);
      expect(remainingRows).toEqual([{ id: splitDayId }]);
    });
  }
);
