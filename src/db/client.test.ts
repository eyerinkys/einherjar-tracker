import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from './client';

describe('createDatabaseClient', () => {
  it('creates a transaction-capable client without reading ambient environment', () => {
    const db = createDatabaseClient('postgresql://user:password@example.com:5432/tracker?sslmode=require');

    expect(db.transaction).toBeTypeOf('function');
  });
});
