# Copy the hooks

Setup copies `templates/githooks/*`, executable, to `.githooks/`. A repo may
have put its own checks into a hook before the `.d` folders existed. A plain
copy would delete them without a message.

## Steps

1. For each template hook, find the repo's `.githooks/<hook>`. When it does
   not exist, copy the template and go to the next hook.
2. Diff the repo's hook against the template. Keep each line the repo added
   and the template lacks.
   Done when the extra lines are listed, or the diff is empty.
3. When extra lines exist, write them to `.githooks/<hook>.d/50-local`. Start
   the file with `#!/bin/sh`. Make it executable. When the file exists, ask.
   Done when `sh -n` accepts the file and the user has seen its text.
4. Copy the template over the hook, executable.
   Done when the hook equals the template and every extra line is in its
   `.d` folder.

Never change another file in a `.d` folder. They hold the repo's own checks.
Report each `50-local` file as a 🟡 line, because the user must read it.
