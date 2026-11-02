---
name: teach
description: Explain a body of work plainly so a person understands what it is, how it works and why it is built that way. Reads the how and why skills by path to find the facts, then gives one plain account at the person's pace, named by the glossary headings and built up diagram by diagram. Use when the user says "teach me this", "help me really understand X", or asks to have a change, feature or subsystem explained to them.
disable-model-invocation: true
---

# Teach

A map of every street is not a tour. The person who asks to be taught wants
to understand the thing, not to change it. The how skill finds how the code works. The why skill finds why it is that
way. Both are user-only, so this skill reads them by path, `../how/SKILL.md`
and `../why/SKILL.md`, and never invokes them. Neither result is a lesson.
This skill picks what the person needs and explains it in plain speech, a
little at a time, in the repo's own words.

Hand-offs go through files in your scratchpad, called `$WORK` below.

## Steps

### 1. Pick what they should walk away with

Read from the conversation why they ask and what they know. Common reasons are
a coming change, a review, a bug, or being new to the area. Do not quiz them.
When the reason is unclear, assume they are new and say so in one line.

Choose two to four points they should understand at the end. Skip what they
know. Put the depth where their question is.

Done when `$WORK/goal.md` holds the points and the reason.

### 2. Get oriented

Read the code and the docs bundle yourself, briefly, to learn what the work is
and what it touches. For a change, read the diff. Look up each term of the
question in the glossaries, whose paths are in `agents.config.json` under
`docs.glossaries`. Note each term's `###` heading and its **Avoid** words.

Done when you can name the files involved and the glossary heading for each
term the explanation will use.

### 3. Follow how and why

Match the size to the question:

- **A subsystem or a feature.** Follow both.
- **A small change.** Follow `../how/SKILL.md`. Follow `../why/SKILL.md` only
  when they ask why.
- **A "why is it like this" question.** Follow `../why/SKILL.md`. Follow
  `../how/SKILL.md` only when the mechanism is unclear.

Keep the why work narrow unless the reasons are the point. Put the limit in
the ask: the scoped question, decision records, the tracker and git history
only. That skill then lists the skipped sources.

Run the two in parallel when you can. Start one subagent per file, through the
CLI's subagent tool, such as Agent, all in one message. Each prompt gives:

- the path of the file to follow, `../how/SKILL.md` or `../why/SKILL.md`
- the scoped question
- the path to `$WORK/goal.md`
- its output file, `$WORK/how.md` or `$WORK/why.md`

Otherwise follow the two files one after the other yourself.

Done when each file you followed has its output file written.

### 4. Explain the first layer

Start with a plain definition. Name the thing, give its common name when it
has one, and say what it is in general terms. Then tie it to this repo: "Here,
`<module>` uses it to …". Give the smallest complete answer, one or two
sentences, then stop.

Write it in the style below. Reword the how output freely. Keep each claim
from the why output at its confidence tier, Direct, Supported, Inferred,
Speculative or Unknown, and keep its wording. A hedge there is a finding.

When no person is reading live, deliver the whole account in one message. Use
this order: the definition, how it works, why, and the edge cases.

Done when the first answer names the thing and ties it to this repo in a few
sentences.

### 5. Go deeper when they ask

Follow their lead. Each turn adds one layer: how it works, the reasons behind
it, the edge cases. For each part, say the problem it solves and how it works.
Walk through what happens as someone uses it when that makes it land.

Show the thing when that is faster than words. Open the diff, the code or a
test. For three or more moving parts, draw a series of diagrams, not one. Each
redraws the last and adds a single part. A flow from A to B to C is three
diagrams: A to B, then A to B to C, then the return edge or the next piece.
Use a mermaid block when labels carry the meaning. When the idea is spatial,
such as layout, overlap or a before and after, use an image-generation tool
when one is connected, with a few short labels.

Done when the person says they understand, moves on, or stops asking.

### 6. Close

End with the threads worth chasing next, each with the skill that answers it.
Name the how and why skills as commands the person can start, not as skills
you run. Then report what the docs lack, worst first:

```
🔴 <page or record>: <where it disagrees with the code, and which is right>
🟡 <term>: <a word the explanation needed that no glossary defines>
🟢 docs: <the pages and glossary entries the explanation used>
```

Offer `h2xd:docs-glossary` for a missing term and `h2xd:docs-wiki` for a wrong
page. Offer `h2xd:docs-wiki` again to file the explanation as a page when
others will ask the same.

Done when the person has the threads and the docs report.

## Style

Write as you would explain it out loud to a colleague, following
`../add-soul/SKILL.md`.

- **Glossary headings.** Name each term by its `###` heading, every time.
  Link the entry the first time: `[Order](/glossary/project.md#order)`. Never
  use a word listed under **Avoid**.
- **New words.** Define a term no glossary has in one sentence when it first
  appears, or drop it. Report it in step 6.
- **Mechanism over framing.** State what happens, with file and function
  names. This is the density to aim for: "Virtualization runs in two parts,
  one for rendering and one for loading from disk. When an item scrolls past
  the buffer, both its DOM node and its in-memory data are evicted."
- **Short sentences.** One idea each, at most two commas. Split piled clauses.
- **No labels.** Never print "the key insight", "TL;DR", "at its core", "the
  tricky part" or "here is where it gets interesting". Say the thing.

## Do

- Lead with the point that matters most to this person.
- Let the how and why files do the digging, and teach from their output.
- Keep facts, file names and numbers exactly as the sources give them.
- Stop after each layer and let the person steer.

## Don't

- Don't redo the search the how or why work already did. Read the output file.
- Don't strengthen a hedged claim from the why output. Keep its tier and wording.
- Don't list functions and constants as the explanation. Say what problem each part solves and how.
- Don't draw one diagram with every part at once. Draw a series that adds one part each.
- Don't change code or docs here. Report the gap and offer the skill that fixes it.
- Don't re-pitch a message that did not land with this skill. Use `h2xd:what`.
