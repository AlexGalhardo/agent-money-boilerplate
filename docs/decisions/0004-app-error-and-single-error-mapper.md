# 0004. AppError hierarchy with one global error mapper

- Status: Accepted
- Date: 2026-09-27

## Context

Every route wrapped its handler in try/catch to map domain errors to status codes, duplicating logic and making it easy to leak internals.

## Decision

Expected failures extend `AppError(message, status)` (`backend/src/lib/errors.ts`). A single global `onError` in `app.ts` answers `{ success: false, message }`; validation errors get a generic message plus summaries; everything else is logged and answered with a generic 500.

## Consequences

Routes stay declarative; services own error semantics; the error body shape is one contract for all clients. Throwing a plain `Error` for an expected case is now a bug (it becomes a 500).
