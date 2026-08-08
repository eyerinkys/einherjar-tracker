import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from '@/db/client';
import * as schema from '@/db/schema';
import { createAuthOptions } from './auth-options';
import { getServerEnv } from './env';

const environment = getServerEnv();

export const auth = betterAuth({
  ...createAuthOptions(environment),
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema,
  }),
  plugins: [nextCookies()],
});
