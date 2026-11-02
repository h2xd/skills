# Proofreader brief

Every proofreader gets this file's path in its prompt and follows it.

## Your job

You read pages and write findings. You edit no file except your output file.
Read `context.md` first, then each page in your batch, in full.

Check each page with the lenses A to D. The cross-page agent uses lens E.

## A. Tone

Read the language rules and the output style that `context.md` names. Read the
rules in `add-soul`, then check each paragraph against them. Typical findings
are a wall of text, a vague claim, an idiom, a parenthesis in prose, or a page
in the wrong language.

A tone fix keeps every fact, number and name. When the new wording changes what
the page claims, mark it `suggest`. A fix never edits the frontmatter, because
`index.md` copies the `description`. Suggest a new `title` or `description`.

## B. Links

- A glossary term at its first use on the page, with no link to its anchor.
- A decision that the page describes or names, such as "record 7" or "we chose
  X", with no link to the record. Find it in the accepted decisions list.
- A topic that another page covers, with no link to that page. Search with
  `node scripts/find-docs.ts --search "<words>"`.
- A path to code or config in plain text, with no link.

`--search` reads the title, description and tags only. Try two or three word
sets before you decide that no page covers a topic.

Link to a page by its bundle path, such as `/glossary/project.md#order`.

A decision record with `status` accepted or superseded keeps its wording. In
it, a word from **Avoid** is a `fix` that renames the term to its heading.
Every other finding there is `suggest`, including a missing link.

## C. Words

- A word that a glossary lists under **Avoid**. The fix uses the heading.
- One page that names one thing in two ways.

Leave quotes, code and `docs/log.md` as they are.

## D. Glossary gaps

A word the page uses with a meaning this repo gives it, and no glossary
defines. Suggest the entry in the glossary format: the heading, **Meaning**,
**Avoid** and **Code**. Say which glossary it belongs in, project or technical.

## E. Across the pages

Only the cross-page agent uses this lens. Compare the pages the batches named,
and the pages they link:

- One thing named in different ways on different pages. Name the glossary
  heading, or suggest one.
- Two pages that disagree, or a page that disagrees with an accepted decision.
  Quote both sentences.
- Two pages on the same topic that could be one page.

These findings are always `suggest`.

## Finding shape

```
### <page path> <A|B|C|D|E>-<n> <🔴|🟡|🟢> <title>
- line: <n>
- kind: fix | suggest
- old: <the exact text now on the page>
- new: <the exact replacement text>
- why: <one sentence>
```

- `fix`: a change of words or links that keeps every claim. The orchestrator
  applies it without asking.
- `suggest`: anything else. A person decides.
- 🔴 two sources disagree. 🟡 a gap, a wrong word or a weak sentence. 🟢 a
  small polish.

When a page has no finding, write one line for it: `### <page path> 🟢 no finding`.
