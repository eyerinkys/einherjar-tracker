import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { eq, sql } from 'drizzle-orm';
import { splitDays } from '../../db/schema';
import { AuthorizationError, ownedWhere, requireOwnedRecord } from './ownership';

describe('ownership-safe query conventions', () => {
  it('binds both authenticated owner and record id into a private query predicate', () => {
    const predicate = ownedWhere(
      splitDays.userId,
      'trusted-user-id',
      eq(splitDays.id, 'requested-split-id')
    );
    const query = new PgDialect().sqlToQuery(
      sql`select ${splitDays.id} from ${splitDays} where ${predicate}`
    );

    expect(query.sql).toContain('"split_days"."user_id" = $1');
    expect(query.sql).toContain('"split_days"."id" = $2');
    expect(query.params).toEqual(['trusted-user-id', 'requested-split-id']);
  });

  it('returns NOT_FOUND for both absent and other-user records', () => {
    for (const record of [undefined, null]) {
      expect(() => requireOwnedRecord(record)).toThrow(
        expect.objectContaining({ code: 'NOT_FOUND' }) as AuthorizationError
      );
    }
  });

  it('returns an owned record without changing it', () => {
    const record = { id: 'owned-record', name: 'Push' };

    expect(requireOwnedRecord(record)).toBe(record);
  });
});
