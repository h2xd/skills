# Drift check

The plugin root is two folders above `SKILL.md`. Run:

```sh
node <plugin root>/templates/scripts/drift.ts <plugin root> .
```

- Exit 1: a script of `templates/scripts` is missing in the repo. Stop and put
  its report in the stop message.
- Exit 0: go on. Show each `changed:` file and a version gap as a 🟡 line.
  A repo may keep a local edit on purpose, and a plugin release that changes
  no template leaves a version gap.

Done when the exit code is 0, or the stop message holds the report.
