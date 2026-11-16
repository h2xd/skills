# Copy the hooks

Setup copies `templates/githooks/*`, executable, to `.githooks/`. A repo may
have put its own checks into a hook before the `.d` folders existed. A plain
copy would delete them without a message. `hooks-earlier/` holds the
hooks that shipped up to 0.16, so their own lines do not count as the repo's.

## Steps

1. For each template hook, find the repo's `.githooks/<hook>`. When it does
   not exist, copy the template and go to the next hook.
   Done when each template hook is copied or has a repo copy to diff.
2. When the repo hook equals the template or the file of the same name in
   `hooks-earlier/` next to this page, it is unedited. Copy the template and
   go to the next hook.
   Done when each unedited hook is copied.
3. Diff the repo's hook against the template and against the file of the
   same name in `hooks-earlier/`. Keep each line that neither has.
   Done when the extra lines are listed, or none are left.
4. When extra lines exist, write them to `.githooks/<hook>.d/50-local`. Start
   the file with `#!/bin/sh`. Make it executable. When the file exists, ask.
   Done when `sh -n` accepts the file and the user has seen its text.
5. Copy the template over the hook, executable.
   Done when the hook equals the template and every extra line is in its
   `.d` folder.

Never change another file in a `.d` folder. They hold the repo's own checks.
Report each `50-local` file as a 🟡 line, because the user must read it.
