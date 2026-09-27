# 0008. OpenAPI generated from Zod, rendered by Scalar

- Status: Accepted
- Date: 2026-09-27

## Context

The `/api` page documented endpoints with ~200 lines of hand-written strings that could drift from the code.

## Decision

`@elysiajs/openapi` generates `/openapi/json` from the routes' Zod request/response schemas (`z.toJSONSchema`); only the public `/transactions*` API is included. The web `/api` page renders it with `@scalar/api-reference-react`, loaded client-only, with Scalar's cloud features and CDN fonts disabled so it works under the CSP.

## Consequences

Docs can't drift from validation. Public routes need `response` schemas and pt-BR `detail`. Scalar's CSS (~260 KB) ships only with `/api`.
