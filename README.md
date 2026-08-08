# Einherjar Tracker

Private, mobile-first workout tracking for two users. The existing interface is
being incrementally connected to a Neon PostgreSQL backend without redesigning
the approved UI.

## Local setup

Use Node.js 24 LTS and pnpm 11.20.0. `.node-version` selects the verified local
release, while `package.json` and `pnpm-workspace.yaml` reject other Node majors
because untested current releases can break the Next.js build.

```bash
pnpm install --frozen-lockfile
```

Create a root `.env.local` file and set the following values. It is ignored by Git.

- `DATABASE_URL` is the Neon pooled URL for the Next.js application.
- `DIRECT_DATABASE_URL` is the direct Neon URL used only by migrations and
  database checks.
- `BETTER_AUTH_SECRET` is a random secret of at least 32 characters.
- `BETTER_AUTH_URL` is the canonical application origin, without a path.
- `BETTER_AUTH_ALLOWED_EMAILS` is the comma-separated list of exactly two
  approved email addresses. Values are trimmed and normalized to lowercase.
- `BETTER_AUTH_TRUSTED_ORIGINS` is a comma-separated list of exact localhost,
  preview, and production origins that may submit authenticated requests.

Use a development branch for destructive experiments and automated tests. The
production application uses the production branch; branch protection is not
available on the current Neon Free plan, so avoid destructive production
operations. Never commit any connection URL or use production credentials in
test configuration.

## Database migrations

Schema definitions live in `src/db/schema/`; generated migrations and Drizzle
metadata live in `drizzle/`. Commit both together with the corresponding schema
change.

```bash
# After changing a schema, generate and inspect the SQL before applying it.
pnpm db:generate

# Apply reviewed pending migrations using DIRECT_DATABASE_URL.
pnpm db:migrate

# Verify connectivity and transaction support using the development/test branch.
pnpm db:check
```

Do not use `drizzle-kit push` against shared or production databases. Migrations
are applied with `drizzle-kit migrate`; applying them again is safe because
Drizzle records completed migrations.

The cross-user authorization integration suite is opt-in and must target a
disposable Neon branch that already contains the current migrations:

```bash
RUN_AUTH_DATABASE_TESTS=1 \
AUTH_TEST_DATABASE_URL=postgresql://DISPOSABLE-BRANCH-ONLY \
pnpm exec vitest run src/server/auth/ownership.integration.test.ts
```

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm db:check
```
