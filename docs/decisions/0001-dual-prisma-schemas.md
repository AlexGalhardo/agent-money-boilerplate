# 0001. Two Prisma schemas (SQLite and Postgres)

- Status: Accepted
- Date: 2026-09-10

## Context

Local development should need no external services, while production needs a shared database for three Railway services. Prisma doesn't allow a dynamic datasource provider.

## Decision

Keep `schema.sqlite.prisma` and `schema.postgresql.prisma` with identical models, separate migration folders, and select one with `DATABASE_PROVIDER` in `prisma7.config.ts`. SQLite goes through libSQL because better-sqlite3 doesn't load under Bun.

## Consequences

Every model change is made twice (a diff between the files should only show the provider). The generated client must match the active provider. Postgres is required wherever the bot and API run in separate containers.
