# Commit judgment

The two tables that `h2xd:git-commit` checks a message against.

## What the message must carry

Each token is present, or knowingly not applicable to this change.

| Token | What | Where |
|---|---|---|
| `reason` | Why this shape beat the obvious one. The diff shows what changed. Only the message shows why. | Footer |
| `rejected` | The option the conversation weighed and dropped. A session that reopens the question reads that it was closed. | Footer |
| `cause` | For a `fix`: what was wrong and where, written as what is different now, such as "The parser no longer reads a blank line as the end of input." Not applicable to other types. | Body |
| `measurement` | The number the decision rests on, and what produced it. It counts only when a different result would change the decision, such as an eval score, a bundle size, or an exit code that separates two readings of a rule. A check that passed is not one. `lint-docs passed on 14 files` teaches nothing. Vet the number with `h2xd:prove-measure` first. | Body |
| `blast-radius` | The record this change touches, such as the decision record it adds or amends, or the convention it replaces. | Footer |

## Choosing between two types

The scope names below are examples. Use the scope in this repo's closed set
that covers the same paths.

| Both fit | Take |
|---|---|
| A user sees new behavior, and code moved | `feat` |
| Something broken works again, and behavior was added | `fix` |
| An agent skill, a hook or a config file changed | `chore` with the tooling scope, such as `chore(tooling)`. `docs` means `docs/`, not any markdown file. |
| A script, a hook or CI changed, and docs changed | The type that most of the diff is |
| A test was added or changed on its own | The type of the code it covers, else `chore` |
