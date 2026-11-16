# Copy the hooks

Setup copies `templates/githooks/*`, executable, to `.githooks/`. A repo may
have put its own checks into a hook before the `.d` folders existed. A script
keeps those lines. It compares each hook with the template and with
`templates/githooks-earlier/`, the hooks that shipped up to 0.16.

## Steps

1. Run `node <plugin root>/scripts/hooks.ts <plugin root> <repo root>`.
   Done when the script printed one line per template hook.
2. Act on each line:
   - `copied`, `unchanged`, `unedited, replaced`: nothing more to do.
   - `moved <n> lines`: the script wrote `50-local` and copied the hook.
     Report it as a 🟡 line with the lines the script printed below it. Say
     that they now run after the hook's own check, and also when node is
     missing. Show `git diff .githooks` too, so the user sees the old hook.
   - `50-local exists, ask the user`: show both the file and the repo hook.
     Ask the user with options, such as append, replace or skip. The choice
     decides the text of `50-local`.
   - `needs a hand merge`: the repo hook edited or deleted a template line,
     or put a line inside a block. Show `git diff .githooks` and the lines
     that differ. The user merges them by hand into a file in the `.d`
     folder.
   Done when every line is handled and the user has seen each `50-local`.
3. After the user chose for `ask` or merged by hand, write the chosen text
   to the `.d` folder. Copy `templates/githooks/<hook>` over
   `.githooks/<hook>`, executable. Run the script again.
   Done when the script prints `unchanged` for that hook.

Never change another file in a `.d` folder. They hold the repo's own checks.
