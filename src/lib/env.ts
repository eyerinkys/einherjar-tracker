import { z } from 'zod';

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => /^postgres(?:ql)?:\/\//.test(value));

const serverEnvSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  DIRECT_DATABASE_URL: databaseUrlSchema,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(values: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(values);

  if (!result.success) {
    const invalidVariables = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid server environment: ${invalidVariables.join(', ')}`);
  }

  return result.data;
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}
