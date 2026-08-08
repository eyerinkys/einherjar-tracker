import 'server-only';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { resolveAuthenticatedUser } from './session';

export async function requireUser() {
  return resolveAuthenticatedUser(auth.api.getSession, await headers());
}
