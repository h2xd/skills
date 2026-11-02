---
name: why
description: Find out why code, a feature or a value is the way it is. Searches decision records and tracker issues first, then git history with log -L, blame, pickaxe and PR bodies, then any connected chat, docs, monitoring, error or analytics source. Returns a cited answer that keeps what is recorded apart from what is inferred, and offers to file it as a wiki page or a decision record. Use when someone asks why X works this way, why Y was picked, where a threshold or constant came from, what caused a regression, or what a defensive check guards against.
disable-model-invocation: true
---

# Why

Code shows what it does, never why. A `retries = 3` can come from an outage,
a copied line, or a customer call nobody wrote down. This skill searches the
places where a reason gets written, in a fixed order. It answers with what was
recorded, what is inferred, and what nobody wrote.

Read [`epistemics.md`](epistemics.md) before you answer. Every claim gets one
confidence tier from it, and the tier sets the wording.

When `../teach/SKILL.md` or another skill started you with a question file and
an output file, read the question there and write the answer to the output
file. Skip step 6. That skill makes the offers.

## Steps

### 1. Pin the target and the question

The target is a file range, a symbol, a feature, a constant or a named
decision. The question is a rationale, a trade-off, a regression, a threshold
or a history sweep. When the target is vague, guess from open files or recent
edits. State the guess in one line and go on. A guess in the question, such as
"I assume it's for performance?", is one hypothesis to test.

Done when you can name the files with line ranges, the key symbols and the
question in one sentence.

### 2. Search what was recorded

Decision records and tracker issues come first. Their authors wrote the reason
down on purpose.

```sh
node scripts/find-docs.ts --type Decision --links-to <path>
node scripts/find-docs.ts --type Decision --search "<words>"
node scripts/find-docs.ts --links-to <path>
node scripts/find-docs.ts --search "<words>"
```

Use two or three sets of words: the feature, the symbol, the problem. Read
every hit in full, superseded records too, since they hold earlier reasoning.
When `scripts/find-docs.ts` is missing, the repo was never set up. See
`../setup/SKILL.md`. Grep `docs/` instead and say so in the answer.

Then search the tracker with the **Search** operation from
`docs/agents/issue-tracker.md`. Cover open and closed issues, with the same
words. Run **List by label** with `adr` for decisions in flight. Read each
relevant issue with the **View** operation, comments included.

Done when every hit is read and every query is noted for the answer.

### 3. Dig through git history

Build the code anchor, the commits that shaped the target and their PRs.

```sh
git log -L <start>,<end>:<file>
git log -L :<symbol>:<file>
git blame -L <start>,<end> <file>
git log --follow --oneline -- <file>
git log -S '<exact value or string>' --oneline
git show <hash>
```

- Trace back past the last commit. It is often a reformat or a move.
- For a constant, run `git log -S` on its value to find the commit that added
  it.
- Take PR numbers from merge subjects such as `(#1234)`, and ticket ids from
  bodies. Read each substantive PR with its review comments, for example
  `gh pr view <n> --comments`. View the tickets as in step 2.
- Read comments, `TODO` and `FIXME` notes, edge-case tests and `CHANGELOG`
  entries near the code.
- A revert, a re-apply or a "fix for incident" commit marks a regression.

Done when you have the commits, the PR and ticket numbers, and what each says.

### 4. Search the other connected sources

Skip this step only when steps 2 and 3 give a written reason for the whole
question, the Direct tier. Say so in the answer.

List the MCP servers and CLIs connected in this session. Map each to one
category in [`sources.md`](sources.md), such as chat, observability or an
external tracker.

- **One source.** Search it yourself with its playbook from `sources.md`.
- **Two or more.** Start one subagent per source, all in one message, through
  the CLI's subagent tool, such as Agent. Run them on a fast model, such as
  Sonnet.

Each subagent gets the path to [`investigator.md`](investigator.md), a
scratchpad file with the code anchor and question, its source, and an output
file path. It also learns whether the target looks defensive.

Defensive code includes null checks, retries, timeouts, rate limits, feature
flags and out-of-memory handlers. For it, add the incident queries from
`sources.md` to every search.

Done when every category has findings, empty queries or a skip reason.

### 5. Answer

Write the answer in the shape of [`answer.md`](answer.md). Spot-check any
citation you did not read yourself, and run its checks. When the user plans
to change this code, end with its Preserve, Change, Avoid and Risk list.

Done when every claim has a tier and a citation, and the gaps name the empty
queries.

### 6. Offer to file it

Offer this only when the answer took real digging and someone will ask again.
Ask once with clickable options, through the CLI's question tool, such as
AskUserQuestion. Put the best fit first.

- **A decision record** with `h2xd:docs-adr`. Offer it when the answer
  documents a decision nobody recorded and meets that skill's three tests.
  Mark the record `proposed` unless a decider confirms it in this conversation.
- **A wiki page** with `h2xd:docs-wiki`. Offer it for history, a regression or
  a threshold. List every PR, issue, commit and record you cited under
  `sources`.

Done when the user chose one, or declined, or the answer was too thin to offer.

## Do

- Quote the author's words with the exact location: record path, issue
  number, PR number, commit hash, or `file:line`.
- Record every query. An empty search is a finding.
- Show both sides when two sources disagree.
- Name the person who would know when the record runs out.

## Don't

- Don't cite code as evidence for its own intent. Cite what an author wrote, or
  mark the claim Inferred.
- Don't stop at the newest commit. Follow `git log -L` back to the change that
  added the line.
- Don't fill a gap with a plausible story. Put it under "What we don't know"
  with the searches you ran.
- Don't let an investigator chase a lead into another source. It lists the
  lead and you assign it.
- Don't write an `accepted` record from inference alone. File it as
  `proposed`, or as a wiki page.
