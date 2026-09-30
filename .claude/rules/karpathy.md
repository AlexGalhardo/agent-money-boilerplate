# Karpathy guidelines (mandatory for coding work)

Every programming task in this repository — writing, reviewing, refactoring or
debugging code, scripts or CI — follows these guidelines, distilled from
[Andrej Karpathy's observations on LLM coding pitfalls](https://x.com/karpathy/status/2015883857489522876)
(packaged as the `karpathy-guidelines` skill in
[andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)).
They pair with the `ponytail` skill (`.claude/skills/ponytail/`): ponytail picks
the laziest solution that works, these rules keep it correct.

1. **Think before coding.** State assumptions explicitly. When a request has
   more than one reading, present the options instead of picking one silently.
   Point out the simpler alternative. When something is unclear, stop, name what
   is confusing and ask.
2. **Simplicity first.** The minimum code that solves the problem. No features
   nobody asked for, no single-use abstractions, no speculative "flexibility",
   no error handling for impossible scenarios. If 200 lines fit in 50, rewrite.
3. **Surgical changes.** Touch only what the task needs; do not "improve"
   neighbouring code, comments or formatting; match the existing style. Remove
   only the orphans your own change created — pre-existing dead code is
   mentioned, not deleted. The test: every changed line traces back to the
   request.
4. **Goal-driven execution.** Turn the task into a verifiable criterion (bug →
   a test that reproduces it and then passes; refactor → tests green before and
   after). For multi-step work, state the plan as `step → verification` and only
   call it done after running the verification.

For trivial tasks, use judgment: these guidelines trade speed for caution.
