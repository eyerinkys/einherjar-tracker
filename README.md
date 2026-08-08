# Einherjar Tracker

Private, mobile-first workout tracking for two users. The existing interface is
being incrementally connected to a Neon PostgreSQL backend without redesigning
the approved UI.

## Local setup

Use Node.js 24 LTS and pnpm 11.20.0. The repository pins the exact local Node
version in `.node-version` and rejects newer major versions through
`package.json` because untested current releases can break the Next.js build.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set the two values in the root `.env.local` file. It is ignored by Git.

- `DATABASE_URL` is the Neon pooled URL for the Next.js application.
- `DIRECT_DATABASE_URL` is the direct Neon URL used only by migrations and
  database checks.

Use a development branch for destructive experiments and automated tests. The
production application uses the protected production branch; never commit any
connection URL or use production credentials in test configuration.

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

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm db:check
```
