# Triage

How `review-fix` sorts each review item. Read each item and the code it points
at, then put it in one bucket.

| Bucket | When |
|---|---|
| **fix** | The comment is right, or right enough to name the change |
| **decline** | The comment is wrong, already handled, or conflicts with the agent instructions file, a decision record or another item. Cite the reason |
| **ask** | The choice is the user's. It changes product behavior, public API or scope, or two readings are equally defensible |

Find the decision records for a file with
`node scripts/find-docs.ts --links-to <path>`.

## Rules

- An item's `Choice` line holds the option the engineer picked, or A when
  nobody replied. A **fix** with a `Choice` letter uses that option, and its
  plan row names the letter.
- `Choice: none` means a reply without a letter. Triage it as usual.
- A label guides the triage and does not decide it. A `(blocking)` item still
  gets declined when it is wrong. A `nitpick` that takes one line still gets
  fixed.
- For an outdated thread, decline with "already addressed in <sha>" when the
  current code already answers it.
- A **mutation item** quotes a surviving mutant,
  `` `<original>` → `<mutant>` ``. Its fix is the missing test. Decline it only
  when the mutant is equivalent, and say why no input makes the two versions
  differ.
- A thread that asks for a test of a named behavior is a **mutation item**
  too. Its plan row names the mutant, such as the line to remove.
