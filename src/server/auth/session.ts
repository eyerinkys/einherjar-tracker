export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

interface SessionResult {
  user: AuthenticatedUser;
}

type GetSession = (context: { headers: Headers }) => Promise<SessionResult | null>;

export class AuthenticationError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;

  constructor() {
    super('Authentication required.');
    this.name = 'AuthenticationError';
  }
}

export async function resolveAuthenticatedUser(
  getSession: GetSession,
  requestHeaders: Headers
): Promise<AuthenticatedUser> {
  const session = await getSession({ headers: requestHeaders });

  if (!session) {
    throw new AuthenticationError();
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
