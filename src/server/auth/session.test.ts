import { describe, expect, it } from 'vitest';
import { getTestInstance } from 'better-auth/test';
import { createAuthOptions } from '../../lib/auth-options';
import { AuthenticationError, resolveAuthenticatedUser } from './session';

const authEnvironment = {
  BETTER_AUTH_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_ALLOWED_EMAILS: ['first@example.com', 'second@example.com'],
  BETTER_AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
};

describe('resolveAuthenticatedUser', () => {
  it('derives each user identity from that user session headers', async () => {
    const { auth, client, signInWithUser } = await getTestInstance(
      createAuthOptions(authEnvironment, 'test'),
      { disableTestUser: true }
    );

    await client.signUp.email({
      name: 'First User',
      email: 'first@example.com',
      password: 'a-secure-test-password',
    });
    await client.signUp.email({
      name: 'Second User',
      email: 'second@example.com',
      password: 'a-secure-test-password',
    });
    const first = await signInWithUser('first@example.com', 'a-secure-test-password');
    const second = await signInWithUser('second@example.com', 'a-secure-test-password');

    const firstUser = await resolveAuthenticatedUser(auth.api.getSession, first.headers);
    const secondUser = await resolveAuthenticatedUser(auth.api.getSession, second.headers);

    expect(firstUser.email).toBe('first@example.com');
    expect(secondUser.email).toBe('second@example.com');
    expect(firstUser.id).not.toBe(secondUser.id);
  });

  it('rejects a forged session cookie as UNAUTHENTICATED', async () => {
    const { auth } = await getTestInstance(createAuthOptions(authEnvironment, 'test'), {
      disableTestUser: true,
    });
    const forgedHeaders = new Headers({
      cookie: 'better-auth.session_token=forged-and-not-authoritative',
    });

    await expect(resolveAuthenticatedUser(auth.api.getSession, forgedHeaders)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    } satisfies Partial<AuthenticationError>);
  });
});
