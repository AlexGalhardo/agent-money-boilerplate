# 0006. Prettier + markdownlint for Markdown

- Status: Accepted
- Date: 2026-09-27

## Context

Biome doesn't format Markdown, and the docs are now the agents' main knowledge base.

## Decision

Prettier formats `*.md` (2-space indentation, `proseWrap: preserve`); markdownlint-cli2 enforces structure. Rules that conflict with Prettier are disabled. Both run in `bun run lint`, the pre-commit hook and CI.

## Consequences

Two more dev dependencies; vendored skill folders are excluded so upstream files stay untouched.
