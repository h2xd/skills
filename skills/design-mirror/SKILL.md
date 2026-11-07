---
name: design-mirror
description: "Export the design pages as snapshots, diff them against the last push, and write the hand-off the user's sync skill pushes from. The repo stays the only author. Use when the user asks to sync, mirror or publish the design system to Claude Design."
disable-model-invocation: true
---

# Design mirror

A designer on a train opens Claude Design and sees last week's buttons. The
repo has newer ones, and nobody knows which is true. This skill keeps the
mirror at most one export behind the repo. The repo is the only side that
changes.

The words, such as snapshot, bundle, mirror, sync skill and marker file, are
in `../design-setup/words.md`. In the mirror, the Reference page shows the
agent view's `llms.md` and the design log. Edits made in Claude Design never
come back. The next push overwrites them.

The design sync tool, such as DesignSync, runs only under the sync skill.
The user starts that skill, such as `/design-sync`. So this skill exports,
checks and diffs. Then it writes a hand-off file for the sync skill.

## Steps

### 1. Read the config

Read `docs/agents/design-system.md`. When the config page is missing, run
`h2xd:design-setup` first. When the CLI has no sync skill, stop and tell the
user.

The "Mirror state" row names the mirror state folder. When the row says
`none`, ask the user for a folder. Write it to the config page first. This
skill owns what the folder holds.

- `config.json` holds the project id and the `marker` key.
- `NOTES.md` holds a dated line for each earlier push.
- `remote-files.txt` holds the mirror paths after the last push, when one
  happened.

On a first run, create the folder with a `config.json` that holds `{}`.
When `config.json` lacks `marker` and `NOTES.md` names a marker file, such
as `_ds_needs_recompile`, ask the user whether that marker still applies.
Write the answer as the `marker` key before step 3. Otherwise a missing
`marker` key means the marker is `none`.

When the export command is `none`, write one with the user from
[export.md](export.md).

Done when you have the export command, the bundle folder, and the marker or
`none`. You also have the project id, or the decision to create one.

### 2. Export and check

Run the export command. Read the expected count from the script's own list
of snapshots, or from its output. Do not count pages by hand.

When the bundle has no `reference/` snapshot, find the cause.

- When the page list lacks the Reference page, run `h2xd:design-setup`.
- Otherwise extend the export script from [export.md](export.md), so it
  writes the `reference/` folder.

When the user declines, report `🟡 reference`.

Take screenshots of three snapshot files with the repo's browser driver.
Read the images. Name what you saw. A snapshot without its fonts or tokens
stops the run.

Done when the command exits 0 and the file count equals the expected count.
Every file starts with a `<!-- @dsCard` line. Three screenshots show fonts
and tokens.

### 3. Diff the mirror

Compare the bundle with `remote-files.txt`.

- **Write.** Every bundle file.
- **Delete.** Every mirror path under the bundle's top folders that the
  bundle no longer has.
- **Keep.** Every mirror path outside those folders.

On a first run without `remote-files.txt`, mark the delete list unknown.
[push.md](push.md) says what the sync skill does then.

Done when the write list is written down, and the delete list is written
down or marked unknown.

### 4. Hand off

Write `<mirror state>/handoff.md`. It holds the bundle folder, the project
id or "none", the write list, the delete list and the marker. It copies the
call order and the rules from [push.md](push.md). It ends with a
`## Write back` section for the project id and name, and the final mirror
paths. The user or the sync skill fills that section after the push.

Show the user the counts and the delete list. After a yes, tell the user to
run the sync skill, such as `/design-sync`. The user pastes the path of
`handoff.md` and one line, such as "Follow this file, and fill its Write
back section." When the user reports a refusal from the server, show its
message as written and stop.

Done when the user reports the push done and the `## Write back` section is
filled.

### 5. Record

Read the `## Write back` section of `handoff.md`. Merge the project id and
name into `config.json`. Keep every other key. Write the final mirror paths
to `remote-files.txt`. Add a dated line to `NOTES.md` with the commit, the
counts, the deletes, and any snapshot that rendered wrong.

Delete `handoff.md`. Then ask the user, and commit the mirror state folder
with `h2xd:git-commit`.

Done when the files are updated, and the commit exists or the user declined
it.

## Report

```
🔴 <step>: <what failed, and the next action>
🟡 snapshot <path>: <what rendered wrong>
🟡 reference: <why the bundle has no reference snapshots>
🟢 recorded: <n> files written, <n> deleted, in <project name>, at <commit>
```

## Do

- Treat the bundle as build output. Keep it out of git.
- Hand off only after the user's yes on the delete list.
- Put only paths under the bundle's top folders on the delete list.

## Don't

- Don't edit a snapshot or a mirror file by hand. Change the repo and export
  again.
- Don't write a second renderer for the export. Capture the real pages.
- Don't pull a change from Claude Design into the repo. Make it in the repo.
- Don't push from this skill. Write the hand-off for the sync skill.
