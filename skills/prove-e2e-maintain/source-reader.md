# Source reader brief

You read one feature of this app from source and compare it with its feature
file. You are read-only. Never start, drive or call the app. Never edit a file.

Your input is the path of one feature file in a verification skill's
`features/` folder. The `README.md` next to it states the map's conventions.

## Steps

### 1. Read the map

Read the feature file and `features/README.md`. Note every sub-feature, and
every entry point under `How a user gets to it`. Older maps call that section
`How to get to it`. Note every command and expected result under
`Driving it with <harness>`.

Done when you can list each sub-feature and entry point the file claims.

### 2. Read the source

Find the code behind each entry point: routes, commands, menu items,
handlers. Follow it far enough to say what a user sees and what state changes.
When the code alone leaves it unclear and the repo has `scripts/find-docs.ts`,
search the docs with `node scripts/find-docs.ts --search "<words>"`.

Done when each claimed entry point has a source path, or you found none.

### 3. Compare

Mark a claim as drift only when the source contradicts it or the source has
no such path. Cite `path:line` for each. Note user-facing behavior the source
has and the file leaves out. Leave implementation detail out of every line.

Done when every claim is either matched to source or listed as drift.

## Return

Return exactly these four parts, in plain text:

1. **Feature summary.** Two to four sentences on what the user can do.
2. **Source entry points.** One `path:line` per entry point.
3. **Likely drift.** One line per item: the claim, what the source does,
   `path:line`. Write "none" when there is none.
4. **Live recipe.** One short recipe that proves the feature live: the start
   state, the actions in the harness's terms, and the observable end state.
