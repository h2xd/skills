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
- A ⚪ item is optional, and so is an inline comment that starts with ⚪.
  Fix it when the fix is cheap, and the fixer decides what cheap means.
  Otherwise decline with "optional, left as is".
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
- The plan row of a mutation item names the code file, not the test file. A
  split review groups items by that file, so one fixer holds the item and
  the other fixes to that code.
- A mutation item that comes back `not applied` is an **ask** item. Give the
  surviving mutant and the test the fixer wrote.
- The plan table has a `Group` column when groups are used, such as
  `| T4 | fix | src/a.ts:12 | the change | catchup |`. Set a group when one
  topic spans more than one file. Rows with the same group go to one fixer.
  Give the group to every row that touches a file of the topic, so no other
  fixer edits that file. A row with no group joins the rows that name its
  file. A table with no `Group` header gives no group, whatever its cells.
  Write a pipe inside a cell as `\|`.
