---
name: docs-glossary
description: Keep the project and technical glossaries the single source of names. Use when a new term comes up, when two words are used for one thing, when naming a module, type or concept, when renaming a term, or when a page or the code uses a word the glossaries do not define.
---

# Glossary

The code says `Customer`, the docs say "client", and support says "account".
Every reader now translates, and some translate wrong. The glossary gives each
thing one name, and every other word for it points back to that name.

## The two glossaries

A repo has two glossaries. Both live in the docs bundle, and
`node scripts/lint-docs.ts` checks both. Their paths are in
`agents.config.json` under `docs.glossaries`, relative to the bundle root.

| Glossary | Default path | Holds | Test |
|---|---|---|---|
| Project | `docs/glossary/project.md` | The words of the domain: what users, customers and the business call things | A product owner would use the word |
| Technical | `docs/glossary/technical.md` | The words of the code base: modules, layers and patterns this repo gives a specific meaning | Only someone who reads the code would need it |

**Each term has exactly one home.** The lint fails when a heading appears in
both glossaries. When a domain word also names a module, the project glossary
defines it. The technical entry for the module links to it. For example,
`Order` the concept lives in the project glossary, and `orders/` the module
links there.

General programming words, such as timeout, retry and cache, stay out of both.
Add one only when this repo uses it with a meaning a newcomer would get wrong.

## Entry format

```markdown
### Order

- **Meaning:** A customer's request to buy one or more products, from checkout until delivery.
- **Avoid:** Purchase, transaction
- **Code:** [`src/orders/`](../../src/orders/)
```

- The `###` heading is the name. Use it in code identifiers, pages, commit
  messages and conversation.
- Pages link a term by its heading anchor, such as
  `[Order](/glossary/project.md#order)`.
- **Meaning** says what the thing is in one or two sentences. It does not say
  what the thing does or how it is built. Required.
- **Avoid** lists the other words people use for it. A search for them lands
  here, and the reader learns the right word. Optional.
- **Retired** lists a word the repo's own content check bans outright. Not
  every repo defines this field. Optional.
- **Code** points at where the term lives. Optional in the project glossary.
  Required in the technical glossary when its `requiredFields` in the config
  list it.
- **Renamed from** names the old word and links the record or issue that
  renamed it, such as
  `**Renamed from:** bonbon, in [ADR-0010](/decisions/0010-rock-rename.md)`.
  Optional. Keep it while old pages or records still use the old word.
- Group entries under `##` headings when clusters appear. A flat list is fine
  until then.

## During any task

- **Challenge a clash.** When the user or the code uses a term against its
  entry, say so at once: "The glossary defines a Subscription as X, but this
  reads like Y. Which one?"
- **Sharpen a fuzzy word.** When "Account" means both Customer and User,
  propose the precise term and ask.
- **Cross-check the code.** When the user says how a term behaves and the code
  disagrees, show both. Do not pick one.
- **Write the entry when the term settles.** Do not save entries for a batch at
  the end. A page or identifier that uses a new term gets its entry in the
  same change.

## Rename a term

A rename touches every use of the old word, so it is a change of its own.

### 1. Find every use

Search the bundle, the code and the agent instructions file for the old word
and the old heading's anchor. Put the repo's source directories in place of
`<source dirs>`:

```sh
grep -rn -i "<word>" docs/ <source dirs> CLAUDE.md AGENTS.md
```

Done when you have the list of files that use the old word.

### 2. Rename the entry

Rename the `###` heading. Add a **Renamed from** line that links the
decision or issue. Update every link to the old anchor. `node
scripts/lint-docs.ts` fails on each link you missed.

Ask whether a consuming repo's own content check must ban the old word
outright. When yes, move it to **Retired**. Otherwise, move it to **Avoid**.

Done when `node scripts/lint-docs.ts` reports no broken glossary link.

### 3. Record the decision when needed

Some renames are hard to reverse or surprise people, such as a public API, a
database column or a word customers see. Such a rename is a decision. Record
it with `h2xd:docs-adr`.

Done when the rename has a decision record, or you can say why it needs none.

### 4. Update the records and the log

Accepted decision records keep their wording, except to rename a term to its
glossary heading. When you rename a term in one, say so in its
`## More Information`. Then add an `**Update**` entry to `docs/log.md`.

Done when `node scripts/lint-docs.ts` exits 0. The old word appears only under
**Avoid** or **Retired**, in the **Renamed from** line, in older
`docs/log.md` entries, in records that keep their wording, and in verbatim
sources under `docs/references/`.

## Do

- Name code, pages and commits by the `###` heading.
- List the other words people use under **Avoid**.
- Write the entry in the same change as the first page or identifier that uses it.
- Ask when the user's word and the entry disagree.
- Link a glossary term by its heading anchor, so the lint catches a rename you missed.

## Don't

- Don't define a term in both glossaries. Give it one home and link from the other.
- Don't add general programming words. Add one only when this repo gives it a meaning a newcomer would get wrong.
- Don't describe what a thing does or how it is built under **Meaning**. Say what it is.
- Don't rename a term in passing. Make the rename its own change.
- Don't pick a side when the user and the code disagree about a term. Show both and ask.
