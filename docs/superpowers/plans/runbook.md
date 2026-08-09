# EINHERJAR Production Runbook

This document outlines the deployment and operational procedures for EINHERJAR in a production environment (Vercel, Neon, Backblaze B2).

## 1. Environment Separation
Ensure that Preview and Production environments are strictly separated.
- **Neon**: Use a dedicated `main` branch for production, and separate branches for preview/testing.
- **Backblaze B2**: Use separate buckets if possible, or isolated prefixes for preview vs production uploads.
- **Vercel**: Configure environment variables differently for Production and Preview contexts.
- **Better Auth**: Set `BETTER_AUTH_URL` to the exact production domain in production, and use Vercel system environment variables for previews.

## 2. Deployment Process (Zero-Downtime)

1. **Pre-Deployment Check**:
   Run tests locally or in CI before merging:
   `pnpm test`
   `pnpm typecheck`
   `pnpm lint`
   `pnpm exec playwright test`

2. **Database Migrations**:
   Never run migrations automatically on Vercel build if they can be destructive.
   Run migrations manually from a secure CI runner or local machine pointing to the production database:
   `pnpm db:push` (or `pnpm db:migrate` if using strict migration files)

3. **Application Deployment**:
   Once schema is updated (in a forward-compatible way), deploy the Vercel application. Vercel will build using `pnpm build`.

## 3. Security and Integrations

- **Better Auth**: 
  - Ensure `BETTER_AUTH_SECRET` is strong (min 32 bytes).
  - Production cookies require HTTPS.
  
- **Backblaze B2 CORS**:
  - The B2 bucket must have a CORS policy allowing `GET` and `PUT` from your exact Vercel production origin. No wildcards.

- **Groq AI**:
  - Ensure the Groq API key is valid. If it hits limits or fails, the application should gracefully fall back or notify the user honestly (as implemented in `ai/service.ts`).

## 4. Rollback Strategies

- **Application Code**:
  If a bad deployment happens, use Vercel's instant rollback feature to revert to the previous working deployment.

- **Database Schema**:
  If a bad schema migration occurs, **do not** attempt to roll back using `db:push` or down-migrations if data has already been written. Instead, write a forward-fix migration to correct the schema while preserving data, and deploy it.

## 5. Failure State Runbook

- **Groq Unavailable / Timeout**: The UI should show a "Guidance unavailable" state. No action needed unless it persists, check Groq status page.
- **Neon Database Down**: The application will fail to boot or throw 500 errors. Verify Neon connection strings and check Neon status.
- **B2 Image Upload Failure**: Presigned URLs have a short expiry. Ensure server clocks are synced. If B2 goes down, users will see standard image load failures; verify B2 status.
