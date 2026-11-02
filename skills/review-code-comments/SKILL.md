---
name: review-code-comments
description: "Spawn the comment-reaper agent on a diff or files, delete useless comments, fix the code that needed them, and offer to encode claimed constraints as checks. Use before review, before a commit that adds comments, or when a diff is full of narration."
---

# Review code comments

A comment that restates the code, narrates a change or apologizes for a
workaround is noise. The next reader skips it, and it turns into a lie the
first time the code moves without it.

The Reaper deletes these comments. You decide what survives, and you fix the
code the comments were covering for. Trust the Reaper's taste and check its
facts.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base
branch, default `main`, including the working tree and untracked files.

## Steps

1. **Spawn.** Start the `comment-reaper` agent through the CLI's subagent
   tool, such as Agent with `subagent_type: h2xd:comment-reaper` in Claude
   Code. Pass the scope.
   Do not restate its rules. In a CLI without subagents, read
   `../../agents/comment-reaper.md`, do its pass yourself, then audit it.
2. **Audit its report and diff.**
   - Reject application-code edits, scope escapes, and deletions of comments
     its own keep list protects. Revert those.
   - A `MUST KILL` flag on a surprise in our own code stays actionable. Do not
     restore that comment.
   - A keep survives only with proof it is about something we cannot change. A
     refuted or still ambiguous keep gets deleted.
   - Audit lint and type suppressions in scope it missed. A suppression of a
     rule that protects correctness or safety is a `MUST KILL`.
   - On a thin `IMPORTANT` or `do not remove` call either way, read the symbol's
     callers and the line's history yourself before accepting it.
   - When the report is wrong, revert, rerun once with the failure named.
     A second wrong report: report it open and stop.
3. **Fix the flags.** Trivial ones directly: delete a dead path, drop a
   parameter, use the real API, rename so the name says what the comment said.
   One that needs a new shape gets a sketch first, per `h2xd:code-quality`,
   then the smallest root-cause change in scope. Never bolt on a guard to
   silence a symptom. A root cause outside the scope is reported open with a
   sketch, not fixed.
4. **Encode constraints.** A comment saying `do not remove`, `do not change
   this wording` or `talk to X first` claims a rule. Offer the cheapest check
   that enforces it in scope: a type, a runtime assertion, a test, a lint rule.
   Wait for approval. Approved: encode, then delete the comment. Declined:
   delete the comment and report the constraint as unenforced.
5. **Verify.** Run the repo's lint, typecheck and tests on the touched files.
6. **Report** one line per item, worst first:

   ```
   🔴 <path:line>: <constraint left unenforced, or a root cause left open>
   🟡 <path:line>: <comment restored, or a fix only sketched>
   🟢 <n> comments deleted, <n> fixes made, <n> checks encoded
   ```

Done when every comment in scope is deleted, kept with proof, or reported.

## Do

- Defer to the Reaper on taste. Check its facts.
- Rename or restructure until the code says what the comment said.
- Offer a check for every `do not remove` before deleting it.

## Don't

- Don't keep a comment because it might help. Keep it only with proof it is about something we cannot change.
- Don't let the Reaper change application code. Revert those edits.
- Don't silence a symptom with a guard. Fix the root cause or report it open.
- Don't restore a comment on a `MUST KILL` surprise in our own code. Reshape the code.
