# Answer format

Write for the user, in this structure. Leave out "What we can reasonably
infer" and "Competing hypotheses" when they would be empty. Keep every other
section.

```markdown
### The question

<The user's question in one or two sentences.>

### The code

<Files with line ranges and key symbols. Two or three lines for a cold reader.>

### What we found

- **[Direct]** <Claim>. Source: <record path, #issue, PR #n, commit hash or file:line>. "<Short quote.>"
- **[Supported]** <Claim>. Evidence: <each item and what it adds>.

### What we can reasonably infer

- **[Inferred]** <Hedged claim>. Reasoning: <the evidence, then the step from it to the claim>.

### Competing hypotheses

- **Hypothesis:** <one sentence>
  - **For:** <items>
  - **Against or missing:** <what would have to be true but isn't, or counter signals>

### What we don't know

- <The open question>: searched <source> for "<query>", "<query>". <What came back.>
- <A source you could not reach, and why.>
- <The person who would likely know: the commit author, the issue reporter.>

### Sources consulted

🔴 <category>: <not reachable, such as no connected tool or failed auth>
🟡 <category>: <searched, nothing relevant: the queries and the range>
🟢 <category>: <searched, evidence found: records, issues, PRs, commits, queries>

### Confidence

<One or two sentences: what is well supported, what is inferred, what stayed
open.>
```

List every category in "Sources consulted": decision records and wiki pages,
the tracker, git history, and each category from `sources.md`. A category with
no connected tool gets a 🔴 line saying so. A category skipped on purpose
gets a 🟡 line with the reason.

## Before a change

When the user asks because they plan to change the code, add:

```markdown
### Constraints for the change

- **Preserve:** <behavior the evidence says was deliberate, with its citation>
- **Change:** <what the evidence says no longer holds>
- **Avoid:** <an approach the record says was tried and rejected>
- **Risk:** <what could break, and what is still unknown>
```

## Checks

Revise until each one holds.

1. Every claim under "What we found" has a citation. Move one without a
   citation to Inferred or to the hypotheses.
2. The wording matches the tier. "Because" appears only next to a Direct or
   Supported citation.
3. Every contradiction you saw is shown with both sides.
4. "What we don't know" names queries and sources. An empty section is
   suspect, because history almost always has gaps.
5. A guess in the user's question was tested, not confirmed by default.
6. No claim cites the code as proof of its own intent.
7. The overall tone matches the evidence. A confident answer on thin evidence
   is the failure this skill exists to prevent.
