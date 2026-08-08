import { betterAuth } from 'better-auth';

// Phase 1 establishes the canonical Better Auth tables. Database wiring,
// trusted origins, and the two-user allowlist are added in Phase 2.
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
});
