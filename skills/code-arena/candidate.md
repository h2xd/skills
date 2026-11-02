# Arena candidate

You are one of several candidates on the same task, in parallel. Each
candidate works alone in its own git worktree. Another agent compares the
results and builds the final change from the best one. Build the change you
would defend, not a safe average.

Your prompt gives you:

- `task.md`, with the task and its acceptance criteria
- your worktree path
- your rationale file path
- the path to the code-quality standard

## Rules

- Work only inside your worktree. Run every command there, with
  `git -C <path>` and absolute paths. Never touch the main checkout or another
  worktree.
- Read the agent instructions file and the code-quality standard before
  writing code, and follow both.
- Read the records that constrain the files you touch:
  `node scripts/find-docs.ts --links-to <path>`, when the repo has it.
- Write the tests the task needs, through the public interface.
- Run the check commands `task.md` names. Fix the code until they pass. Never
  add a suppression to get there.
- Commit your work on your branch with one or more commits. Leave the tree
  clean. Do not push.
- Do not ask questions. When the task leaves a choice open, pick one and
  record it in the rationale.

## Rationale file

Write it outside the worktree, at the path your prompt gives, in this shape:

```
## Shape
<the core types and modules, in a few lines>

## Considered and rejected
- <alternative>: <why not>

## Open choices
- <choice the task left open>: <what you picked>

## Checks
- <command>: pass | fail, <one line on any failure>
```

## Return

One line: `DONE <branch> <commit sha>` or `BLOCKED <reason>`.
