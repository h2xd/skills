# Changelog

## 0.1.0

The first public release.

- 45 skills in nine groups: setup, docs, plan, ask, code, prove, git, review
  and session. 23 the model can start, 22 only you can start.
- 2 agents: `comment-reaper` and `skill-polisher`.
- Install for Claude Code as a plugin, or for Codex with
  `scripts/install-codex.sh`.
- `setup` wires a repo up: an Open Knowledge Format docs bundle with two
  glossaries, issue-first decision records, commit and PR lints, git hooks, CI,
  mutation testing and an ASD-STE100 writing tone.
- The scripts run on Node 22.18 or later with no npm packages. The mutation
  runner and the installers need only `sh` and `git`.
