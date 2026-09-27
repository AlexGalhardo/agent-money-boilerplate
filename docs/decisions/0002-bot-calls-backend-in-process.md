# 0002. The Telegram bot calls backend services in-process

- Status: Accepted
- Date: 2026-09-19

## Context

The bot needs the same business rules, encryption and database as the API. Going through HTTP would need a service identity for the bot and duplicate every call.

## Decision

The bot imports services, repositories and `auth` from `@agent-money-boilerplate/backend` and runs them in its own process against the same database.

## Consequences

No HTTP layer means no route validation and no better-auth HTTP rate limiting for bot flows: the bot must parse input with the backend's Zod schemas and keep its own per-chat lockouts (login, personal password). The bot process needs the API's env vars (`DATABASE_URL`, `ENCRYPTION_KEY`, …).
