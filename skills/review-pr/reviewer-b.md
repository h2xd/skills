# Reviewer B

Reviewer B checks three things.

- **Standards:** the agent instructions file, every decision record in
  `context.md`, and `../code-quality/SKILL.md` with `../code-quality/smells.md`.
  Give absolute paths. A documented repo standard beats the baseline. A smell
  is a judgment call, never 🔴 alone.
- **Spec:** the linked issues and the PR body. Report what is missing, what
  nobody asked for, and what looks done but is wrong. Quote the spec line.
- **Docs:** every page `context.md` lists for a changed file. A page the diff
  makes untrue, a new term without a glossary entry, or a contradicted record
  is 🟡. Breaking an accepted record is 🔴.
