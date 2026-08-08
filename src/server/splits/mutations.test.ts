import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { splitExercises } from '../../db/schema';
import { AuthorizationError } from '../auth/ownership';
import { SplitMutationError } from './errors';
import {
  exactIdListMatches,
  ownedSplitExerciseWhere,
  requireExactOwnedIdList,
} from './mutations';

vi.mock('server-only', () => ({}));

const firstId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const thirdId = '00000000-0000-4000-8000-000000000003';

describe('split mutation invariants', () => {
  it('accepts a reordered list containing exactly the current IDs', () => {
    expect(exactIdListMatches([firstId, secondId, thirdId], [thirdId, firstId, secondId])).toBe(
      true,
    );
  });

  it.each([
    [[firstId, secondId], [firstId]],
    [[firstId], [firstId, secondId]],
    [[firstId, secondId], [firstId, firstId]],
    [[firstId, secondId], [firstId, thirdId]],
  ])('rejects missing, added, duplicated, or foreign reorder IDs', (currentIds, submittedIds) => {
    expect(exactIdListMatches(currentIds, submittedIds)).toBe(false);
  });

  it('scopes a child predicate through its split-day owner', () => {
    const predicate = ownedSplitExerciseWhere('trusted-user', firstId);
    const query = new PgDialect().sqlToQuery(
      sql`delete from ${splitExercises} where ${predicate}`,
    );

    expect(query.sql).toContain('"split_exercises"."id" = $1');
    expect(query.sql).toContain('"split_days"."id" = "split_exercises"."split_day_id"');
    expect(query.sql).toContain('"split_days"."user_id" = $2');
    expect(query.params).toEqual([firstId, 'trusted-user']);
  });

  it('returns NOT_FOUND when a submitted reorder ID is not currently owned', () => {
    expect(() => requireExactOwnedIdList([firstId, secondId], [firstId, thirdId])).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }) as AuthorizationError,
    );
  });

  it('returns STALE_ORDER when submitted IDs are owned but do not form the exact current list', () => {
    expect(() => requireExactOwnedIdList([firstId, secondId], [secondId])).toThrow(
      expect.objectContaining({ code: 'STALE_ORDER' }) as SplitMutationError,
    );
  });

  it('accepts a complete reordered list of currently owned IDs', () => {
    expect(() => requireExactOwnedIdList([firstId, secondId], [secondId, firstId])).not.toThrow();
  });
});
