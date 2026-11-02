---
name: docs-fact-check
description: "Check an idea, plan, claim or draft against the docs wiki: the pages, the glossaries and the accepted decision records. Each claim gets a verdict, matches, contradicts or not covered, with the page that says so. Use before building on an idea, when a plan or a page seems to disagree with the docs, or when someone asks whether something matches what the wiki says."
---

# Fact check

The plan says "orders ship from one warehouse". Decision record 12 says two
warehouses, since March. Nobody reads record 12 until the build is half done.
This skill reads the wiki first and says where the idea and the wiki disagree.

This skill only reads and reports. It changes no page and no idea. The user
decides which side is right.

The bundle root is `docs.root` in `agents.config.json`, or `docs/` when that
key is not set. Read `docs/agents/knowledge-base.md` for its directories.

## Steps

### 1. Split the idea into claims

Take the idea from the user's message, an issue, a spec or a draft page. Write
each claim it makes or assumes as one plain sentence. Include the assumptions
it does not say out loud, such as "the export runs as the signed-in user".

Name each thing by its glossary heading. When the idea uses a word that is
under **Avoid** in a glossary, note the right word.

Done when every claim is one sentence and you can show the list.

### 2. Find the pages

For each claim, find the pages that speak to it:

```sh
node scripts/find-docs.ts --search "<words>"
node scripts/find-docs.ts --type Decision --status accepted
node scripts/find-docs.ts --links-to <path>
```

`--search` matches only the title, description and tags of a page, and all
words must match. Use one or two key words. The script exits with 1 and prints
"no page matches" when nothing is found. That is a result, not a failure.

Read `docs/index.md` for pages the search missed. Read both glossaries. Read
each page you found in full, not only its description.

Done when each claim has its list of pages, or the note "no page found".

### 3. Give each claim a verdict

| Verdict | When |
|---|---|
| Contradicts | A page or an accepted decision record says the opposite |
| Matches | A page says the same, in the same scope |
| Not covered | No page speaks to the claim |
| Unclear | Two pages disagree with each other, or a page is a draft or past `stale_after` |

Quote the sentence from the page for every Contradicts and Matches.

A claim about code gets one more check. Read the code the page links, because a
page can be wrong. When the code and the page disagree, say so and do not pick
one.

Done when every claim has a verdict and a quote or a reason.

### 4. Report

One line per claim, worst first, with a link to the page:

```
🔴 <claim>: contradicts [<page>](<path>), "<quote>"
🟡 <claim>: not covered, or unclear because <reason>
🟢 <claim>: matches [<page>](<path>)
```

Then one line on what comes next, for each kind of finding:

- A contradiction with an accepted decision: change the idea, or supersede the
  record with `h2xd:docs-adr`.
- A contradiction with a page: change the idea, or fix the page with
  `h2xd:docs-wiki` when the code shows the page is wrong.
- A claim that is not covered: settle it with `h2xd:plan-grill`, then write it
  down with `h2xd:docs-wiki` or `h2xd:docs-adr`.
- A wrong word: use the glossary heading, or propose a new term with
  `h2xd:docs-glossary`.

Done when every claim from step 1 has its line, and every 🔴 and 🟡 has a next
step.

## Do

- Quote the page. A verdict without a quote is a guess.
- Treat an accepted decision record as the strongest source in the bundle.
- Read the code when a page about code decides the verdict.
- Check the assumptions the idea does not say out loud.
- Say "not covered" when no page speaks to a claim. A gap is a finding.

## Don't

- Don't edit a page, a record or the idea. Report, and name the skill that
  fixes it.
- Don't decide which side is right. Show both and let the user choose.
- Don't trust a page description alone. Read the page.
- Don't count a match from a superseded record. Follow it to its successor.
- Don't check the whole bundle here. Tell the user to run
  `/h2xd:docs-proofread` for that.
