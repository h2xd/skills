# Instructions block

What `setup` writes into the agent instructions file, `CLAUDE.md` or
`AGENTS.md`. Fill every `<...>`. Replace an existing block with the same
heading in place. Read the values from the answers in `agents.config.json`.

```markdown
## Agent skills

- **Issue tracker**: <one line>. See `docs/agents/issue-tracker.md`.
- **Knowledge base**: an OKF bundle in `<docs.root>/`, maintained with
  `/h2xd:docs-wiki`. See `docs/agents/knowledge-base.md`.
  `node scripts/lint-docs.ts` runs on every commit.
- **Glossaries**: `<docs.root>/glossary/project.md` holds domain words.
  `<docs.root>/glossary/technical.md` holds code words. Name a thing by its
  entry's heading. `/h2xd:docs-glossary` adds and renames terms.
- **Decisions**: `<docs.root>/<docs.decisions>/`, MADR. Every record starts as
  an `adr` issue. `/h2xd:docs-adr` checks for overlap first.

## Commits

`type(scope): summary`, at most <subjectMax> characters. Both sets are closed.
Widening one takes a decision record.

- **Type**: <types, each with a few words on when>.
- **Scope**, optional: <scopes, each with the paths it covers>.

The body is one paragraph on what is different now and why. The footer
carries what the conversation produced: `Refs:` or `Closes:` for the issue,
the record touched, the option rejected. End with
`Co-Authored-By: <model> <noreply@anthropic.com>`. `/h2xd:git-commit` writes the
message. `.githooks/commit-msg` rejects a malformed one.

## Pull requests

Every PR body opens with `<closingKeyword> #<n>` on its own line, one line per
issue.
Merging is what closes an issue. `h2xd:git-pr-body` writes the body.
`node scripts/lint-pr-body.ts` checks it in CI.
```
