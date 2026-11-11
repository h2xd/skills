# Reviewers

Step 3 of [`SKILL.md`](SKILL.md) starts the picked reviewers from this table.

| Reviewer | Model | Lens | Findings file |
|---|---|---|---|
| A, correctness | Strongest, such as Opus | The CLI's own code review of the PR at the effort in `pick.md`, for example the `code-review` skill, with no `--comment` and no `--fix`. Without one, look for bugs, broken contracts, data loss and security holes. | `review-a.json` |
| B, standards | Strongest, such as Opus | The diff `git diff origin/<base>...HEAD` against the standards, spec and docs below. | `review-b.json` |
| C, comments | Cheapest, such as Haiku | The `h2xd:comment-reaper` agent, **report only**, on the same diff. A comment it would reap is a 🟡 with an empty `suggestion`, which deletes it. A `MUST KILL` is a 🟡 that names the reshape, or a 🔴 when it removes a suppression that protects correctness. A comment it keeps is no finding. | `review-c.json` |
| D, tests | Fast, such as Sonnet | `h2xd:prove-tests`, **report only**, on the same diff, with the linked issues as acceptance criteria. | `review-d.json` |
| E, blast radius | Strongest, such as Opus | `h2xd:prove-blast-radius`, **report only**, on the same diff. It finds what breaks outside the diff and proves it with output. Its `file` may sit outside the diff. | `review-e.json` |
