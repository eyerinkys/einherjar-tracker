import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { createDatabaseClient } from './client';
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
      const indexes = await db.execute<{ indexname: string }>(sql`
        select indexname
        from pg_indexes
        where schemaname = 'public'
      `);

      assertSchemaIntegrity({
        tableNames: tables.rows.map((row) => row.table_name),
        indexNames: indexes.rows.map((row) => row.indexname),
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
  const message = error instanceof Error ? error.message : 'Unknown database check failure';
  console.error(`Database check failed: ${message}`);
  process.exitCode = 1;
});
