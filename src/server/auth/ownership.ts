import { and, eq, type Column, type GetColumnData, type SQL } from 'drizzle-orm';

export class AuthorizationError extends Error {
  readonly code = 'NOT_FOUND' as const;

  constructor() {
    super('Resource not found.');
    this.name = 'AuthorizationError';
  }
}

export function ownedWhere<TColumn extends Column>(
  ownerColumn: TColumn,
  authenticatedUserId: GetColumnData<TColumn, 'raw'>,
  recordPredicate: SQL
): SQL {
  return and(eq(ownerColumn, authenticatedUserId), recordPredicate)!;
}

export function requireOwnedRecord<T>(record: T | null | undefined): T {
  if (record == null) {
    throw new AuthorizationError();
  }

  return record;
}
