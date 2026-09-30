# Architecture decision records

Short records of decisions that shape the codebase — read the relevant one
before changing what it covers, and add a new record (next number) instead
of editing an accepted one when a decision changes.

| #                                                          | Decision                                               | Status   |
| ---------------------------------------------------------- | ------------------------------------------------------ | -------- |
| [0001](./0001-dual-prisma-schemas.md)                      | Two Prisma schemas (SQLite and Postgres)               | Accepted |
| [0002](./0002-bot-calls-backend-in-process.md)             | The Telegram bot calls backend services in-process     | Accepted |
| [0003](./0003-telegram-linking-requires-authentication.md) | Telegram chats link only through authenticated flows   | Accepted |
| [0004](./0004-app-error-and-single-error-mapper.md)        | AppError hierarchy with one global error mapper        | Accepted |
| [0005](./0005-mobile-dark-only-token-design-system.md)     | Mobile: dark-only UI on NativeWind tokens              | Accepted |
| [0006](./0006-markdown-prettier-and-markdownlint.md)       | Prettier + markdownlint for Markdown                   | Accepted |
| [0007](./0007-mobile-e2e-playwright-web-plus-maestro.md)   | Mobile E2E: Playwright on the Expo web build + Maestro | Accepted |
| [0008](./0008-openapi-from-zod-rendered-by-scalar.md)      | OpenAPI generated from Zod, rendered by Scalar         | Accepted |
| [0009](./0009-desktop-electron-wraps-web-dashboard.md)     | Desktop app: Electron shell around the web dashboard   | Accepted |

Template: copy any record; sections are Context, Decision, Consequences.
