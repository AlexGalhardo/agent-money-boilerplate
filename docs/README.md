# Documentation

The knowledge base for humans and agents working on this repository. Start
with the project's `CLAUDE.md` / `AGENTS.md`, then open what the task needs.

| Document                                       | What's in it                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`architecture.md`](./architecture.md)         | Stack, workspaces, backend layering, how each client reaches the API, monorepo quirks |
| [`code-conventions.md`](./code-conventions.md) | Language policy, style, backend/client rules, tests, the four sync points             |
| [`tooling.md`](./tooling.md)                   | Biome, Prettier, markdownlint, commitlint, Husky hooks, lockfile rules, test runners  |
| [`commands.md`](./commands.md)                 | Every dev / verify / database / mobile / deploy command                               |
| [`workflows.md`](./workflows.md)               | Shipping, releasing, API routes, security changes, sync points, mobile visual review  |
| [`security.md`](./security.md)                 | Threat model, OWASP audit (2026-09-27), deferrals, incident log                       |
| [`design-system.md`](./design-system.md)       | Mobile design system — tokens, components, patterns, testing hooks                    |
| [`decisions/`](./decisions)                    | Architecture decision records                                                         |
| [`deploy/`](./deploy)                          | Local setup, VPS, Railway, Vercel + Fly.io, Android builds, CI/CD                     |

Project-specific agent skills (`.claude/skills/agent-money-*`) turn the
recurring workflows above into checklists; vendored skills and their
sources are listed in `.claude/skills/SOURCES.md`.
