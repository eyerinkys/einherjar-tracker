import { z } from 'zod';

const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => /^postgres(?:ql)?:\/\//.test(value));

const originSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === ''
    );
  })
  .transform((value) => new URL(value).origin);

const allowedEmailsSchema = z
  .string()
  .transform((value) => value.split(',').map((email) => email.trim().toLowerCase()))
  .pipe(z.array(z.email()).length(2))
  .refine((emails) => new Set(emails).size === 2);

const trustedOriginsSchema = z
  .string()
  .transform((value) => value.split(',').map((origin) => origin.trim()))
  .pipe(z.array(originSchema).min(1))
  .transform((origins) => [...new Set(origins)]);

const databaseEnvSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  DIRECT_DATABASE_URL: databaseUrlSchema,
});

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: originSchema,
  BETTER_AUTH_ALLOWED_EMAILS: allowedEmailsSchema,
  BETTER_AUTH_TRUSTED_ORIGINS: trustedOriginsSchema,
});

const serverEnvSchema = databaseEnvSchema.extend(authEnvSchema.shape);

const aiEnvSchema = z.object({
  GROQ_API_KEY: z.string().trim().min(1).optional(),
  GROQ_MODEL: z.string().trim().min(1).optional(),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type AiEnv = z.infer<typeof aiEnvSchema>;

function parseEnvironment<T>(
  schema: z.ZodType<T>,
  values: Record<string, string | undefined>
): T {
  const result = schema.safeParse(values);

  if (!result.success) {
    const invalidVariables = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid server environment: ${invalidVariables.join(', ')}`);
  }

  return result.data;
}

export function parseDatabaseEnv(values: Record<string, string | undefined>): DatabaseEnv {
  return parseEnvironment(databaseEnvSchema, values);
}

export function parseServerEnv(values: Record<string, string | undefined>): ServerEnv {
  return parseEnvironment(serverEnvSchema, values);
}

export function getDatabaseEnv(): DatabaseEnv {
  return parseDatabaseEnv(process.env);
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

export function parseAiEnv(values: Record<string, string | undefined>): AiEnv {
  return parseEnvironment(aiEnvSchema, values);
}

export function getAiEnv(): AiEnv {
  return parseAiEnv(process.env);
}
