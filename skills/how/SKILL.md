---
name: how
description: Explain how a part of the codebase works, walk the code before a change, and answer placement questions such as "where should this live", "which module owns this" or "is this the right layer". Reads the wiki, decision records and glossaries first, then the code, and sends read-only subagents for large questions. Use when the user asks how something works, wants a walkthrough before changing code, or asks where code belongs.
disable-model-invocation: true
---

# How

An engineer who asks "how does checkout work?" wants a map, not a tour of
every line. Half of that map is often in the docs already. A decision record
says why a seam sits where it does, and the glossary names each module.

This skill reads those docs first, then the code. A senior engineer new to the
area can start work from its explanation. It builds a mental model, not
annotated source.

Every subagent here only reads. Hand-offs go through files in your scratchpad,
called `$WORK` below, so file dumps stay out of your context.

## Steps

### 1. Frame the question

Restate the question in one sentence. When the scope is unclear, state your
reading and go on. The user can redirect.

Name the kind:

- **Flow.** How does X work, or what happens when Y.
- **Walkthrough.** The code a planned change will touch, before the change.
- **Placement.** Where new code belongs, which module owns a thing, or whether
  a layer is right.

Done when the restated question and its kind are written down.

### 2. Read the docs first

Find what the bundle already says. Use the paths and words from the question:

```sh
node scripts/find-docs.ts --links-to <path>
node scripts/find-docs.ts --search "<words>"
node scripts/find-docs.ts --type Decision --status accepted --search "<words>"
```

- `find-docs.ts` exits 1 when nothing matches. That is a result, not an error.
- Read every page it prints in full.
- For a placement question, also search the decisions by each module involved:
  `--type Decision --links-to <module path>`.

Then look up each term of the question in the glossaries. Their paths are in
`agents.config.json` under `docs.glossaries`, relative to `docs.root`. A
technical entry's **Code** line names the directory that holds the term.

Write `$WORK/docs.md`: each page and decision record you read, one line each
on what it says about the question, and the glossary entries you used.

Done when `docs.md` exists and lists each source found, or names the searches
that found nothing.

### 3. Pick the path

- **Simple.** One module, a small utility, or a narrow question such as "how
  does function X work". Go to step 5 without explorers.
- **Complex.** A subsystem across several files or services, a feature that
  cuts across modules, or a full architectural overview. Go to step 4.

When in doubt, take the simple path. Most placement questions are simple.

Done when you have named the path.

### 4. Explore, complex path only

Split the question into two to four angles. Each angle is a distinct slice of
the subsystem, such as the entry point, the data model, or where outside data
enters.

Start one read-only subagent per angle, all in one message. Use the CLI's
subagent tool, such as Agent, on a fast model, such as Sonnet. Each prompt
holds:

- the path to [`explorer.md`](explorer.md), its brief,
- the question and its angle,
- the path to `$WORK/docs.md`,
- its output file, `$WORK/explorer-<n>.md`.

When subagents cannot be started, trace each angle yourself from its brief.

Done when every explorer has returned and each output file exists.

### 5. Explain

Start one read-only subagent on the strongest model, such as Opus. Its prompt
holds:

- the path to [`explainer.md`](explainer.md), its brief,
- the question and its kind,
- the path to `$WORK/docs.md`,
- the paths of the explorer files, when step 4 ran,
- its output file, `$WORK/explanation.md`.

When subagents cannot be started, follow the explainer brief yourself.

Done when `explanation.md` exists and has the sections the brief requires for
the question's kind.

### 6. Present

Give the user the explanation. Edit it lightly for clarity or for context
from this conversation. Do not rewrite it.

Then report what the docs need, worst first:

```
🔴 <page or record>: <where it disagrees with the code, and which is right>
🟡 <term or page>: <a term the glossaries lack, or a gap a page should fill>
🟢 docs: <the pages that matched the code>
```

- When a page disagrees with the code, offer to fix it with `h2xd:docs-wiki`.
- When a term is missing, offer to add it with `h2xd:docs-glossary`.
- When the answer drew on several pages and will be asked again, offer to file
  it as a page with `h2xd:docs-wiki`.
- When a placement answer settles a seam that is hard to reverse, and no
  record decides it, offer `h2xd:docs-adr`.

When another skill started you with an output file, write the explanation and
the report there. Leave the offers to that skill.

Done when the user or the caller's output file has the explanation and report.

## Do

- Read the docs bundle before the code. A decision record often answers "why
  here" in one paragraph.
- Name modules and concepts by their glossary heading.
- Cite every claim about the code with a file path and a function name.
- Answer a placement question with one recommendation and the rule behind it.
- Say which parts the explorers could not trace.

## Don't

- Don't change code or docs in this skill. Report the gap and offer the skill
  that fixes it.
- Don't trust a page over the code. Check it, and report the disagreement.
- Don't start explorers for a narrow question. Take the simple path.
- Don't paste large code blocks. Name the file and function, and quote a
  snippet only when the point depends on it.
- Don't invent a placement rule. Cite a decision record, a glossary **Code**
  line, or the pattern of the neighboring code, and say which.
