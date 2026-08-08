import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from './db/client';
import * as schema from './db/schema';
import { createAuthOptions } from './lib/auth-options';
import { getServerEnv } from './lib/env';

// Better Auth's schema CLI loads this entrypoint outside Next.js. Keep the
// runtime-only `server-only` marker and Next cookies plugin in src/lib/auth.ts.
const environment = getServerEnv();

export const auth = betterAuth({
  ...createAuthOptions(environment),
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema,
  }),
});
