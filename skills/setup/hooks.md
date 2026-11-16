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
     Report it as a 🟡 line with the text of the `50-local` file.
   - `50-local exists, ask the user`: show both the file and the repo hook.
     Ask the user with options, such as append, replace or skip.
   - `do not parse alone`: show the extra lines of the repo hook. The user
     merges them by hand into a file in the `.d` folder.
   Done when every line is handled and the user has seen each `50-local`.

Never change another file in a `.d` folder. They hold the repo's own checks.
