---
name: add-soul
description: "Cut AI tells and walls of text so writing reads as if a careful person wrote it: plain words, short sentences, the summary first, and one concrete picture instead of puffery. Use to edit prose, or read its rules by path while you write."
disable-model-invocation: true
---

# Add soul

One "delve" in the first line, and the reader stops reading and starts
skimming. Three paragraphs of background before the ask, and they close the
tab. This skill finds those tells and rewrites around them.

The soul does not come from flourish. It comes from saying exactly what is
true, in plain words, with one picture the reader remembers.

Other skills read the rules below by path while they write. Run the steps when
you edit a finished text.

## Steps

### 1. Scan

Read the text once against the rules below. Mark each hit with its number.

Done when every paragraph was read against every section.

### 2. Rewrite

Fix each hit. Keep the meaning, every fact, path and number, and the tone the
text was meant to have. When a fix needs a fact you do not have, ask for it or
cut the sentence.

Done when no marked hit is left.

### 3. Check

Read the result once more against rules 13, 27, 33 and 34. A rewrite brings
these back most often.

Done when the second read finds no hit.

## Rules

The numbers are stable. Other skills and `scripts/lint-skills.ts` cite them, so
a removed rule leaves a gap.

### Content

3. **Empty -ing phrases.** "highlighting…", "ensuring…", "showcasing…". Delete them, or say the fact they hint at.
5. **Vague sources.** "Experts believe", "Studies suggest". Name the source or cut the claim.

### Language

7. **AI words.** additionally, crucial, delve, enhance, foster, garner, interplay, intricate, landscape, pivotal, showcase, tapestry, testament, underscore, vibrant. Use the plain word.
8. **Fancy "is".** "serves as", "stands as", "boasts", "features". Say "is" or "has".
9. **"Not just X, but Y."** Say the point.
10. **Forced threes.** Use the number of items there are.
11. **Synonym cycling.** Pick one word for a thing and repeat it.
12. **False ranges.** "From X to Y" with no real scale. List the items.

### Style

13. **No parentheses, no em dashes.** Prose has none, not even one. En dashes and hyphens used as dashes count too. Give an aside its own sentence, or join it with a comma. Code, inline code, link targets and `<placeholders>` do not count. The skills lint fails a skill that breaks this rule.
14. **Colon as a connector.** A colon may open a list or an example. It does not glue two thoughts together. Write two sentences.
15. **Too much bold.** Bold a lead-in, not every name.
16. **Inline-header lists.** "**Speed:** Speed got better" repeats itself. A bold lead-in is fine when it ends in a period and new detail follows.
17. **Title case headings.** Use sentence case.
18. **Decorative emoji.** None in headings or bullets. Rule 36 covers status.
19. **Curly quotes.** Use straight quotes.

### Chat habits

20. **Chatbot phrases.** "I hope this helps!", "Let me know if…", "Certainly!". Cut them.
22. **Flattery.** "Great question!" Answer instead.

### Filler

23. **Filler phrases.** "In order to" becomes "to". "Due to the fact that" becomes "because". "It is important to note that" goes.
24. **Hedging.** "could potentially possibly" becomes "may".
25. **Generic endings.** "The future looks bright." End with the next step or the last fact.

### Jargon

26. **Metaphor nouns.** They sound technical and say less than the plain word.
    - "substrate" becomes "base". "wedge in" becomes "add". "vector" becomes "way".
    - "gold-plating" becomes "more than the job needs". "endgame" becomes "the last phase".
    - "ratchet" becomes the real mechanism, or "a limit that only tightens".
    - Also replace locus, nexus, primitive as a noun, harness, "surface" as in "API surface", bedrock, scaffolding, paradigm, north star and flywheel.

### Plain speech

27. **Say what it does, not how it feels.** "Types that follow your schema" is a feeling. "A column rename fails the build" is a fact. If a sentence could sit unchanged in another project's docs, it says nothing about this one. Cut it.
28. **One idea per sentence.** When the reader has to read twice, split the sentence.
29. **Active voice.** Name who does it. "The file is parsed by the loader" becomes "the loader parses the file".
30. **Adverbs.** "Runs quickly" becomes the number. "Significantly improves" becomes the measured change.
31. **The plain word.** "utilize" and "leverage" become "use". "facilitate" becomes "help". "in the event that" becomes "if".
32. **Mannered prose.** Aphorisms, figurative verbs such as "rides along", and personified code such as "the plan holds it". Write the literal phrase.
33. **Over-compression.** "Parser rejects bad date → exit 2" makes the reader decode. Write "The parser rejects a bad date and exits with code 2." Keep the articles and the verbs.

### Shape

34. **Walls of text.** At most three sentences per paragraph. Turn a list hidden in a paragraph into bullets.
35. **Summary first.** Text a person scans starts with the answer, the ask or the result. Background comes after. For GitHub text, follow `../setup-tone/github-text.md`.
36. **Status markers.** 🔴 🟡 🟢 mark status, one item per line, worst first. They never decorate.
37. **Short sentences.** An instruction has at most about 20 words. A description has at most about 25. Use the glossary's word for a thing.
38. **One concrete picture.** Open with a scene the reader remembers, such as "A ticket that says 'export is broken' sits for a week." Not "This skill enhances workflow quality."

## Report

After an edit, one line per rule hit, most hits first, then the result:

```
🟡 rule <n>, <name>: <count> fixed
🟢 <words before> words before, <words after> after, no hit left
```

## Do

- Keep every fact, number and name the text had.
- Name the actor, the mechanism or the number in place of a feeling.
- Cite a rule by its number when you explain a change.
- Keep one picture that makes the reader smile, when it also makes the point.

## Don't

- Don't add flourish to sound human. Say the plain fact.
- Don't renumber or reuse a rule. A removed rule leaves a gap.
- Don't change the meaning to remove a tell. Ask, or cut the sentence.
- Don't rewrite quoted text or code. Leave it as written.
- Don't trade clarity for a joke. Clean beats clever.
