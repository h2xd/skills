---
name: docs-proofread
description: "Proofread the docs wiki with several agents, unattended, such as overnight. Checks the tone, adds missing links to pages, glossary terms and decision records, replaces words the glossaries list under Avoid, suggests new glossary terms, and finds pages that name or describe one thing in different ways. Commits the safe fixes on a branch and reports the rest. Use for the given pages, a list of pages, or the whole bundle."
argument-hint: "[<page>... | --list <file>] [--pr]"
disable-model-invocation: true
---

# Proofread

Forty pages, written by ten sessions over a year. One says "client", one says
"customer". One links decision record 7, three others describe the same choice
and link nothing. Each page passes the lint, but the wiki no longer reads as
one piece. This skill reads every page against the others and repairs the
seams.

It runs with no person present, such as from a nightly job, and asks nothing.
A decision goes into the report as a suggestion.

You are the orchestrator. Proofreaders read the pages, and you merge and apply
what they find. Every hand-off goes through a file in `$WORK`, a folder outside
the repo, such as the session scratchpad.

The bundle root is `docs.root` in `agents.config.json`, or `docs/` when that
key is not set. A path below that starts with `docs/` means the bundle root.

## Steps

### 1. Pick the pages and the branch

- Paths in the arguments: those pages.
- `--list <file>`: the pages in that file, one path per line.
- No pages given: every `.md` page in the bundle.

Leave out `docs/references/`, `index.md` and `log.md`. Write the list to
`$WORK/pages.txt`.

When the working tree is dirty, stop and print `🔴 working tree is dirty`
with the output of `git status --short`. Otherwise create the branch
`docs/proofread-<YYYY-MM-DD>` from the default branch.

Done when `pages.txt` exists and the branch is checked out, or the stop is printed.

### 2. Collect the shared context

Write `$WORK/context.md` with:

- every glossary term, its anchor and its **Avoid** words, from the paths in
  `docs.glossaries`,
- every page in `docs/index.md`, with its path and description,
- the accepted decisions, from `node scripts/find-docs.ts --type Decision --status accepted`,
  or "none" when it exits 1,
- the language rules from `docs/agents/knowledge-base.md`,
- the paths of the repo's output style in `.claude/output-styles/`, when one
  exists, and of `../add-soul/SKILL.md`, both absolute.

Run `node scripts/lint-docs.ts`. Save its exit code and its error lines as the
baseline. Its `note:` lines are not errors.

Done when `context.md` has every item above and the baseline is saved.

### 3. Proofread in parallel

Split `pages.txt` into batches of about ten pages that share a directory. Start
one proofreader per batch through the CLI's subagent tool, such as Agent, on a
fast model, such as Sonnet. Give each the path of
[`proofreader-brief.md`](proofreader-brief.md), `context.md`, its batch and
its output file, `$WORK/batch-<n>.md`.

Done when every batch has its output file.

### 4. Read across the pages

Start one more agent on the strongest model, such as Opus. Give it
`context.md`, every `batch-<n>.md`, and lens E of the brief. It reads the
pages the batches named and looks for what no single batch can see:

- one thing named in different ways on different pages,
- two pages that describe the same thing and disagree,
- two pages that cover the same topic and could be one.

It writes `$WORK/across.md` in the same finding shape. Every finding is
`suggest`.

Done when `across.md` exists.

### 5. Apply the safe fixes

Apply each finding marked `fix`. Skip a fix when its `old` text does not
appear exactly once on the page. Leave every `suggest` finding for the report.

A fix changes words or links, never a claim, a `title` or a `description`.
An accepted or superseded decision record keeps its wording, except to rename
a term to its glossary heading. Make every other fix there a `suggest`.
Name each renamed term under `## More Information`, per `h2xd:docs-glossary`.

Run `node scripts/lint-docs.ts`. For each new error over the baseline, undo the
fixes on the page it names, and report them as `suggest`. Repeat until none is new.

Add one `**Update**` entry to `docs/log.md`, under today's `## YYYY-MM-DD`
heading. It links the page with the most fixes, gives the page count, and is
under 300 characters. Commit the change the `h2xd:git-commit` way, with the
type and scope that fit best. When none fits, leave the change uncommitted on
the branch and say so in the report.

Done when the lint has no error over the baseline and the commit exists, or no
fix was left to apply.

### 6. Report

Write `$WORK/report.md`. One line per finding, worst first:

```
🔴 <page>: <two pages or a page and a decision disagree, with both links>
🟡 <page>: <a suggestion: a glossary term, a merge, a rewrite that changes a claim>
🟢 <page>: <fixes applied, counted by kind, or "no finding">
```

Close with the branch, the commit, and the number of pages read. With `--pr`,
push the branch and open a draft PR. Its body is the report, shaped by
`../setup-tone/github-text.md`. When the push fails, print the report and add
a 🔴 line with the error. Without `--pr`, print the report.

Done when every page in `pages.txt` has a line, and the report was printed or
the draft PR exists.

## Run it at night

Start it from a scheduler, such as cron, in headless mode. The run needs
permission to edit files, run `node` and `git`, and push.

```sh
claude -p "/h2xd:docs-proofread --pr"
```

## Do

- Read every page in full. A description is not the page.
- Link a glossary term at its first use on a page, by its heading anchor.
- Replace an **Avoid** word with its glossary heading, outside quotes and code.
- Give every suggestion the exact new text, so one read accepts it.
- Keep the fixes in one commit, so one revert undoes the run.

## Don't

- Don't ask questions. Put the decision in the report as a suggestion.
- Don't change a claim. A claim change is a suggestion.
- Don't touch `docs/references/`. Raw sources stay verbatim.
- Don't add a glossary entry. Suggest it, and `h2xd:docs-glossary` writes it.
- Don't merge or delete pages. Suggest the merge with both paths.
- Don't push to the default branch. Push only the proofread branch.
