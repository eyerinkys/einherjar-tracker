# Repository Rules

1. Update `SESSION_NOTES.md` after every major task.
2. Do not create or use disposable database branches for implementation or
   verification. Use the hosted database credentials from the ignored root
   `.env` when database access is required. `.env` is authoritative;
   `.env.local` may be deleted only if it actually interferes with that
   workflow and the deletion is recorded.

## Workflow preference (advisory, not a strict rule)

- Before starting a later implementation phase, prefer committing the current
  intended repository changes as a baseline, then work directly in the main
  checkout and commit the completed phase.
- This is a suggestion rather than a mandatory rule. If isolation is materially
  safer and a worktree is strongly recommended, explain why and ask before
  moving the work into a worktree.
