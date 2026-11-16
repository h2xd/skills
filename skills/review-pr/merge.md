# What merge does

`node scripts/review.ts merge` checks each findings file first. When one
fails, retry that reviewer as [`reviewers.md`](reviewers.md) says. When it
fails again, delete its file, merge without it, and name the missing lens in
the summary.

It then does the following:

- Joins duplicates and keeps every `found-by` model.
- Moves a line outside the diff to "Outside the diff".
- Writes the Conventional Comments and sorts worst first.
- Keeps a finding on lines that a thread holds, open or resolved, and links
  the thread. A thread never drops a finding.
- Sets the event to `REQUEST_CHANGES` with a 🔴, otherwise `APPROVE`. On your
  own PR it sets `COMMENT`.
