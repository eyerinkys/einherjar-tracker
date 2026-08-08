import type { BetterAuthOptions } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';

export interface AuthEnvironment {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_ALLOWED_EMAILS: string[];
  BETTER_AUTH_TRUSTED_ORIGINS: string[];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createAuthOptions(
  environment: AuthEnvironment,
  runtimeEnvironment: string | undefined = process.env.NODE_ENV
): BetterAuthOptions {
  const allowedEmails = new Set(environment.BETTER_AUTH_ALLOWED_EMAILS.map(normalizeEmail));

  return {
    appName: 'Einherjar Tracker',
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: environment.BETTER_AUTH_TRUSTED_ORIGINS,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    advanced: {
      useSecureCookies: runtimeEnvironment === 'production',
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path !== '/sign-up/email' || typeof context.body?.email !== 'string') {
          return;
        }

        const email = normalizeEmail(context.body.email);

        if (!allowedEmails.has(email)) {
          throw new APIError('BAD_REQUEST', {
            message: 'Registration is not available for this email.',
          });
        }

        return {
          context: {
            ...context,
            body: {
              ...context.body,
              email,
            },
          },
        };
      }),
    },
  };
}
