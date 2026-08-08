import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { parseServerEnv } from './src/lib/env';

config({ path: '.env.local', quiet: true });

const { DIRECT_DATABASE_URL } = parseServerEnv(process.env);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: DIRECT_DATABASE_URL,
  },
});
