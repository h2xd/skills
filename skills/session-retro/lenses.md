# Retro lenses

What `h2xd:session-retro` scans for, which lessons it keeps, where prose goes,
and how it proves a check.

## Lenses

Scan the session once per lens. Each hit is an incident with its evidence.

| Lens | Look for |
|---|---|
| Corrections | The user said no, redid the work, reverted a change, or repeated an instruction |
| Repeated steps | The same manual command, lookup or edit done twice or more |
| Self-sufficiency | The user pasted context the agent could fetch: an issue, fetched with the View operation in `docs/agents/issue-tracker.md`, a page, found with `node scripts/find-docs.ts`, a log, a PR |
| Navigation | A long search for a file or fact, or a hidden link between two files |
| Checks | A mistake a lint, type or test would have caught. A check that exists but is not wired into pre-commit or CI. A repo with no pre-commit hook and no CI job is itself an incident |
| Skills | A skill that was used and had a gap. A skill that should have triggered and did not, or triggered late |
| Verification | A result reported as done without running it, reading its real output, or inspecting the diff |
| Second order | A local fix that missed callers or sibling consumers, or a guard that hid a design problem |
| Tool cost | A tool call that returned far more than the agent needed, or a slow loop a script would replace |
| Information access | A fact the agent could not reach: dev server logs, a third-party service, CI output |
| No-ops | An instruction in a skill or the instructions file that no agent's behavior depends on |

## Keep or drop

Keep a lesson only when it passes all of these:

- **Recurs or was corrected.** It happened twice, here or in `git log`, or the
  user corrected it explicitly.
- **Durable.** It stays true after paths, SHAs, versions and code shapes
  change.
- **Specific.** A future agent can tell when it applies. "Write good code"
  fails. "Skill X is 175 tokens long" fails too.
- **Changes a decision.** A future agent does something different because of
  the fix, not just reads more text.

| Drop, because it drifts | Keep, because it lasts |
|---|---|
| "The lint at SHA `bd91aa7` counts chars/4" | "Closed regex lists for trigger detection break. Validate against a schema" |
| "We renamed `gpt-4` to `gpt-4o` in one call site" | "Model ids live in one constant. A second literal fails the lint" |
| "The review bot flagged backtracking on May 2" | "User-supplied regexes run with a timeout" |

## Where words go

Level 5 is for judgment calls no check can make. Pick the home by who the
lesson applies to.

| The lesson applies to | Home |
|---|---|
| Every repo using an h2xd skill, about how that skill works | That skill's `SKILL.md`. Inside the h2xd repo, edit `skills/<name>/SKILL.md`. Elsewhere, file an issue or hand the user a diff |
| An h2xd skill that exists but did not trigger | Its `description`, so it names the trigger that was missed |
| This repo, every session | The agent instructions file, `CLAUDE.md` or `AGENTS.md`. Keep it to the rule plus a pointer |
| This repo, one kind of task | A `docs/agents/*.md` page, or the page `h2xd:docs-wiki` says owns the topic |
| Review only, a standard the diff shows | The instructions file or a decision record, where the review-pr standards reviewer reads it |

The implementing agent has the most context to hold. The reviewer reads only
the diff. A judgment call a reviewer can catch belongs with the review, not in
every session's instructions.

When the rule needs judgment and stays in prose, make it prominent and add one
example of the failure it prevents. When a structural fix exists, delete the
prose rule. The instruction was the symptom.

## Prove a check

A check proves itself by failing on the real mistake.

1. Reintroduce the past mistake in the working tree. Re-apply the bad line,
   or check out the file from the commit that had it.
2. Run the check. It fails, and its message names the fix.
3. Restore the fixed code. Run the check again. It passes.
4. Run the check the way pre-commit and CI run it. A check that only runs by
   hand is not wired.

When the pattern already occurs many times, the check fails only on new
occurrences. Compare against a baseline file or the base branch. An exception
sits on the offending line, with a reason the user approved.
