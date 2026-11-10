---
name: release
description: "Tag a merged version of the h2xd plugin and create its draft GitHub release, with notes in the release layout: a tldr, a description, a table of changes with PR and issue, and a jester's joke. Rewrites the notes of an existing release. Use right after a PR that bumps the plugin version merges to main, when a version tag has no release, or when the user asks to write or redo release notes."
---

# Release

A version that reaches users without a tag and a release has no record of what
changed. This skill runs after every merge to `main`. It tags the merge commit
and leaves a draft release for the user to publish. The release notes are the
changelog. The repo keeps no `CHANGELOG.md`.

This skill is internal. It lives in `.claude/skills/release/`, not in
`skills/`, so the plugin does not ship it.

## Steps

### 1. Find the version and its commit

```sh
git fetch --tags origin
git show origin/main:.claude-plugin/plugin.json
git tag --sort=-v:refname
```

- The version is the `version` value on `origin/main`.
- The commit is the merge commit of the PR that set it.
- The previous tag is the highest tag below the version.

When the version already has a tag on another commit, stop and report it.
Do not move a pushed tag.
Done when you can name the version, its commit and the previous tag.

### 2. Tag the commit

```sh
git tag -a v<version> <commit> -m "h2xd <version>, <what is new>"
git push origin v<version>
```

`<what is new>` is at most eight words, such as `a failed git add stops the
commit`. Skip this step when the tag exists on the right commit.
Done when `git ls-remote --tags origin v<version>` prints the tag.

### 3. Collect the changes

```sh
git log --format='%h %s' v<previous>..v<version>
gh pr list --state merged --search <commit> --json number,title,closingIssuesReferences
```

Find the PR for each commit, and the issues each PR closes. Read a commit
body when its subject does not say what a user sees. Leave out `chore: ship`
commits and changes that only touch this repo's own tooling.
Done when every change a user sees has a skill or area, a PR and an issue,
or a `-` where none exists.

### 4. Write the notes

Write the notes to a file in your scratchpad, in the layout of
[`notes.md`](notes.md). Write the prose in the tone of
`.claude/output-styles/asd-ste100.md`. The joke is the one exception.
Done when the file follows every rule at the end of `notes.md`.

### 5. Create or edit the draft release

When no release exists for the tag:

```sh
gh release create v<version> --draft --verify-tag --title "<version> · <summary>" --notes-file <file> --latest=<true|false>
```

When it exists, run `gh release edit v<version>` with the same `--title` and
`--notes-file`. Pass `--latest=true` only for the highest version. Never pass
`--draft=false`. The user publishes.
Done when `gh release view v<version> --json isDraft,name` shows the draft and
its title.

### 6. Report

Give one line per release:

```
🟢 v<version>: draft at <url>, <n> changes
🟡 v<version>: <what is missing, such as a change without a PR>
🔴 v<version>: <what blocks it, and the next action>
```

Done when every release has its line.

## Do

- Tag the merge commit of the PR, never a commit inside the PR branch.
- Link PRs and issues as `#<n>`, so GitHub renders them as links.
- Keep one row per change a user sees, and merge commits that make one change.
- Redo every draft when the layout in `notes.md` changes.

## Don't

- Don't publish a release. Leave it a draft, and tell the user the command
  `gh release edit v<version> --draft=false`.
- Don't move or delete a pushed tag. Report it, and give the user the commands.
- Don't copy commit subjects into the table. Say what a user sees now.
- Don't write a `CHANGELOG.md`. The release is the changelog.
