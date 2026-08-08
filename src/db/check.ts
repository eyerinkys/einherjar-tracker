import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { createDatabaseClient } from './client';
import { getSafeDatabaseCheckFailureMessage } from './error-redaction';
import { getServerEnv } from '../lib/env';
import { assertSchemaIntegrity } from './schema-integrity';

config({ path: '.env.local', quiet: true });

async function checkConnection(connectionName: string, connectionString: string, verifySchema: boolean) {
  const db = createDatabaseClient(connectionString);

  try {
    const queryResult = await db.execute(sql`select 1 as value`);
    if (queryResult.rows[0]?.value !== 1) {
      throw new Error('Database query smoke test returned an unexpected value');
    }

    await db.transaction(async (tx) => {
      const transactionResult = await tx.execute(sql`select 1 as value`);
      if (transactionResult.rows[0]?.value !== 1) {
        throw new Error('Database transaction smoke test returned an unexpected value');
      }
    });

    if (verifySchema) {
      const tables = await db.execute<{ table_name: string }>(sql`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
      `);
      const indexes = await db.execute<{ name: string; definition: string }>(sql`
        select indexname as name, indexdef as definition
        from pg_indexes
        where schemaname = 'public'
      `);
      const columnTypes = await db.execute<{ table_name: string; column_name: string; data_type: string }>(sql`
        select table_name, column_name, data_type
        from information_schema.columns
        where table_schema = 'public'
      `);
      const constraints = await db.execute<{ name: string; definition: string }>(sql`
        select pg_constraint.conname as name, pg_get_constraintdef(pg_constraint.oid) as definition
        from pg_constraint
        join pg_namespace on pg_namespace.oid = pg_constraint.connamespace
        where pg_namespace.nspname = 'public'
      `);

      assertSchemaIntegrity({
        tableNames: tables.rows.map((row) => row.table_name),
        indexNames: indexes.rows.map((row) => row.name),
        indexDefinitions: indexes.rows,
        columnTypes: columnTypes.rows.map((row) => ({
          tableName: row.table_name,
          columnName: row.column_name,
          dataType: row.data_type,
        })),
        constraints: constraints.rows,
      });
    }

    console.log(`${connectionName} database connectivity and transaction checks passed.`);
  } finally {
    await db.$client.end();
  }
}

async function main() {
  const env = getServerEnv();

  await checkConnection('Pooled runtime', env.DATABASE_URL, false);
  await checkConnection('Direct migration', env.DIRECT_DATABASE_URL, true);
  console.log('Database schema integrity check passed.');
}

void main().catch((error: unknown) => {
  console.error(getSafeDatabaseCheckFailureMessage(error));
  process.exitCode = 1;
});
