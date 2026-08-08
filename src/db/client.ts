import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { getDatabaseEnv } from '../lib/env';
import * as schema from './schema';

// Node.js needs an explicit WebSocket implementation for Neon interactive
// transactions. Browsers provide one natively, but this module is server-only.
neonConfig.webSocketConstructor = ws;

export function createDatabaseClient(connectionString: string) {
  const pool = new Pool({ connectionString });

  return drizzle({ client: pool, schema });
}

let database: ReturnType<typeof createDatabaseClient> | undefined;

export function getDb(): ReturnType<typeof createDatabaseClient> {
  database ??= createDatabaseClient(getDatabaseEnv().DATABASE_URL);
  return database;
}
