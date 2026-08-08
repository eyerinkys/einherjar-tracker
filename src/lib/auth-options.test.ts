import { describe, expect, it } from 'vitest';
import { getTestInstance } from 'better-auth/test';
import { createAuthOptions } from './auth-options';

const authEnvironment = {
  BETTER_AUTH_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_ALLOWED_EMAILS: ['first@example.com', 'second@example.com'],
  BETTER_AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
};

describe('Better Auth configuration', () => {
  it('normalizes and registers an allowlisted email through the real sign-up endpoint', async () => {
    const { client } = await getTestInstance(createAuthOptions(authEnvironment, 'test'), {
      disableTestUser: true,
    });

    const result = await client.signUp.email({
      name: 'First User',
      email: ' First@Example.com ',
      password: 'a-secure-test-password',
    });

    expect(result.error).toBeNull();
    expect(result.data?.user.email).toBe('first@example.com');
  });

  it('rejects a non-allowlisted registration before creating an account', async () => {
    const { client, db } = await getTestInstance(createAuthOptions(authEnvironment, 'test'), {
      disableTestUser: true,
    });

    const result = await client.signUp.email({
      name: 'Unknown User',
      email: 'unknown@example.com',
      password: 'a-secure-test-password',
    });
    const users = await db.findMany({ model: 'user' });

    expect(result.data).toBeNull();
    expect(result.error?.status).toBe(400);
    expect(users).toHaveLength(0);
  });

  it('supports sign-in, authoritative session retrieval, and sign-out', async () => {
    const { auth, client, signInWithUser } = await getTestInstance(
      createAuthOptions(authEnvironment, 'test'),
      { disableTestUser: true }
    );

    await client.signUp.email({
      name: 'First User',
      email: 'first@example.com',
      password: 'a-secure-test-password',
    });
    const { headers } = await signInWithUser('first@example.com', 'a-secure-test-password');

    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe('first@example.com');

    await auth.api.signOut({ headers });
    await expect(auth.api.getSession({ headers })).resolves.toBeNull();
  });

  it('marks production session cookies Secure', async () => {
    const productionEnvironment = {
      ...authEnvironment,
      BETTER_AUTH_URL: 'https://tracker.example.com',
      BETTER_AUTH_TRUSTED_ORIGINS: ['https://tracker.example.com'],
    };
    const { customFetchImpl } = await getTestInstance(
      createAuthOptions(productionEnvironment, 'production'),
      { disableTestUser: true }
    );

    const response = await customFetchImpl('https://tracker.example.com/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://tracker.example.com',
      },
      body: JSON.stringify({
        name: 'First User',
        email: 'first@example.com',
        password: 'a-secure-test-password',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toMatch(/;\s*Secure(?:;|$)/i);
  });
});
