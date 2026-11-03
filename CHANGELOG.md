# Changelog

## 0.4.0

- `to-page` turns a checklist or a round of hard decisions into one HTML
  page that works offline. The agent writes a small JSON form file, and a
  script renders the page. The answers come back as JSON, and later rounds
  build on them.
- `to-questionnaire` now renders a questionnaire page with the `to-page`
  tool, for a customer or another person outside the team. It groups
  questions by theme and accepts open answers. The page replaces the
  Markdown template.

## 0.3.0

- `docs-quiz` lets a fresh agent answer real questions from the wiki alone,
  then grades each answer against the code, the issues and the records.

## 0.2.0

- `docs-fact-check` checks an idea against the wiki, claim by claim.
- `docs-proofread` proofreads the wiki with several agents, such as
  overnight. It fixes words and links on a branch and suggests the rest.

## 0.1.0

The first public release.

- 45 skills in nine groups: setup, docs, plan, ask, code, prove, git, review
  and session. 23 the model can start, 22 only you can start.
- 2 agents: `comment-reaper` and `skill-polisher`.
- Install for Claude Code as a plugin.
- `setup` wires a repo up: an Open Knowledge Format docs bundle with two
  glossaries, issue-first decision records, commit and PR lints, git hooks, CI,
  mutation testing and an ASD-STE100 writing tone.
- The scripts run on Node 22.18 or later with no npm packages. The mutation
  runner and the git hooks need only `sh` and `git`.
