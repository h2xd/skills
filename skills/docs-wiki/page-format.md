# Page format

Every page follows this format, so a script can find it and a reader can trust
it. `node scripts/lint-docs.ts` checks what a script can check.

## Frontmatter

| Key | Required | Meaning |
|---|---|---|
| `type` | yes | A value from the directory table in `docs/agents/knowledge-base.md`. A new kind of page adds a row there in the same change. |
| `title` | yes | What the index shows. |
| `description` | yes | One sentence for someone choosing what to open. `index.md` copies it word for word. When it contains `: `, quote it. Otherwise YAML reads a different value than the index shows. |
| `tags` | no | Lowercase, hyphenated. Reuse existing tags. `node scripts/find-docs.ts --tag <t>` shows the pages that use one. |
| `status` | no | `draft`, `stable` or `deprecated`. Omit it for stable. Decision records use MADR values instead, see `h2xd:docs-adr`. |
| `generated` | yes | `{ by, at }`. For you, `by` is `<cli>/<model id>`, such as `claude-code/claude-opus-5-5`. For a person, it is `human:<login>`. Update `at` on every change to what the page says. |
| `verified` | no | `{ by, at }`. Only a human who confirms the page against its sources adds it. Never add it on your own behalf. |
| `stale_after` | no | Only for a page about something that expires, such as a vendor's pricing, a law in transition or a research answer. `node scripts/lint-docs.ts` prints a note once the date is past. |
| `retrieved` | no | On a `Reference` page, the date you copied its content from `resource`. |
| `sources` | no | A list of `{ id, resource, title }`. `id` is the footnote label. `resource` is a URL or a bundle path, such as `/references/x.md`. |

## Claims

Attribute a claim to a source with a footnote whose label is a `sources[].id`:
`Retries stop after the third attempt.[^issue-42]`. A claim with no source and
no code link is a guess. Mark it as a guess, or leave it out.

## Links

- Between pages, use bundle-root paths, such as
  `/decisions/0001-use-postgres.md`.
- To code or config outside the bundle, use relative paths, such as
  `[session-store.ts](../../src/auth/session-store.ts)`.
  `node scripts/find-docs.ts --links-to` finds pages through these links. Link
  the file. A name in backticks alone is invisible to it.
- When a page should exist but does not yet, link it anyway.
  `node scripts/lint-docs.ts` prints a note, not an error. The note is the
  to-do.
- Link the first use of a glossary term to its heading, such as
  `[Order](/glossary/project.md#order)`. Do this once per page, or once per
  `##` section in a long page. Later uses are plain text.

## Shape

- Prefer headings, tables and short lists to prose. They are easier to scan
  and to update in place.
- Keep one topic per page. A page that needs two `description` sentences is
  two pages.
- Draw a diagram only when the structure is hard to hold in prose. Use a
  mermaid block with at most about fifteen nodes and labeled arrows. The prose
  must still make sense without it.
- Write to the rules in [`../add-soul/SKILL.md`](../add-soul/SKILL.md). Read
  the file by path. The skill is user-invoked only.
