---
name: agent-money-ship
description: >
  Ship a change in the Agent Money monorepo: commit on dev, changelog, push,
  wait for CI, merge dev into main, and cut a release. Use for "commit",
  "push", "merge to main", "ship", "release", "tag a version".
---

# Ship a change (Agent Money)

Procedure in `docs/workflows.md` ("Shipping a change", "Releasing"). The
short version:

1. Work on `dev` only (`.agents/skills/git-branch-workflow`).
2. Verify with `agent-money-verify`.
3. Add user-facing changes under `## [Unreleased]` in `CHANGELOG.md`.
4. Commit in atomic Conventional Commits. Stage paths explicitly — never
   `git add -A` (untracked files here have held real API keys; never commit
   `*.csv`, `*.env`, `scripts/test.ts`).
5. Run the `.agents/skills/open-source-guidelines-pre-push` checklist, then
   `git push`.
6. `gh run watch <id> --exit-status` for `ci.yml` on `dev`. Red →
   `gh run view <id> --log-failed | tail -n 120`, fix forward.
7. Merge only when the user asked for it: `git checkout main && git merge --no-ff dev -m "merge: <summary> (dev -> main)" && git push origin main`.
   This deploys production on Railway and queues an EAS build — confirm
   first. Never force-push `main`.

## Release

Move `[Unreleased]` to `## [x.y.z] - YYYY-MM-DD` with compare links, bump
`version` in the root and every workspace `package.json`, commit
`chore(release): vX.Y.Z`, merge, then `git tag vX.Y.Z && git push origin vX.Y.Z`
(`release.yml` publishes the GitHub Release). A tag is public — confirm with
the user. To test the release builds without publishing:
`gh workflow run release.yml --ref dev`.
