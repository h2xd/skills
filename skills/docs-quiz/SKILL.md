---
name: docs-quiz
description: "Test whether the docs wiki answers real questions. A fresh agent that knows nothing of the repo answers 10 to 20 questions from the wiki alone, and you grade each answer against the code, the issues and the decision records. Wrong answers point to pages that mislead, and unanswered ones to gaps. Use when you want to measure the wiki, before you onboard someone, or after a large docs change."
argument-hint: "[<number of questions>] [<topic>]"
disable-model-invocation: true
---

# Quiz

Every page passes the lint, and every link resolves. Then a new session asks
"why do refunds wait three days?" and the wiki has no answer. The lint checks
the form of the wiki. This skill checks whether the wiki answers questions.

You write the questions and the answer key. A fresh agent takes the quiz with
the wiki as its only source. You grade, and the misses show where the wiki
fails a reader.

The bundle root is `docs.root` in `agents.config.json`, or `docs/` when that
key is not set. `$WORK` below is a folder in your scratchpad, outside the repo.

## Steps

### 1. Write the questions

Write 15 questions, or the number in the arguments. When the arguments name a
topic, keep to it. Take the questions from what people really ask:

- closed issues and PR discussions. Use the Search and View commands in
  `docs/agents/issue-tracker.md`, and include closed items,
- the glossary terms, such as "What is a <term>, and where is its code?",
- the accepted decision records, found with
  `node scripts/find-docs.ts --type Decision --status accepted`, such as
  "Why does X work this way?",
- the code paths that changed most often in `git log`.

Mix the kinds: what a thing is, why it is so, how it works, and where its code
lives. Write the answer key from the code, the issues and the records, never
from the wiki. Cite the source of each answer.

Write the questions to `$WORK/questions.md` and the key to `$WORK/key.md`.

Done when every question has an answer in the key and a source that is not a
wiki page.

### 2. Take the quiz

Start one agent through the CLI's subagent tool, such as Agent, on a fast
model, such as Sonnet. Give it only the path of `questions.md`, the bundle
root and these rules:

- Answer from the pages under the bundle root only. Do not read code, git
  history or the tracker.
- Start at `index.md` in the bundle root. To search, run
  `node scripts/find-docs.ts --search "<words>"`. It matches titles,
  descriptions and tags, never the prose.
- Cite every page the answer uses.
- When the wiki has no answer, write "not in the wiki". Do not guess.

It writes `$WORK/answers.md`. Never give it `key.md`.

Done when `answers.md` has an answer or "not in the wiki" for every question.

### 3. Grade

Compare each answer with the key:

| Grade | When |
|---|---|
| Wrong | The answer disagrees with the key |
| Not found | The answer is "not in the wiki" |
| Hard to find | The answer is right, but needed more than three pages, or a cited page that `node scripts/find-docs.ts --orphans` lists |
| Right | The answer agrees with the key and cites the page that says so |

For each Wrong answer, read the pages it cites. Decide whether a page is wrong
or the agent misread a correct page. A misread points to a page that is
unclear, so name the sentence.

Done when every question has a grade, and every Wrong answer names the page or
sentence at fault.

### 4. Report

Start with the score, the number of Right answers out of all questions. Then
one line per question, worst first:

```
🔴 <question>: wrong, [<page>](<path>) says "<quote>", the code says <fact>
🟡 <question>: not found, or hard to find because <reason>
🟢 <question>: right, from [<page>](<path>)
```

Name the skill that fixes each 🔴 and 🟡:

- A page that is wrong or unclear, or a missing page: `h2xd:docs-wiki`.
- A missing or vague term: `h2xd:docs-glossary`.
- A decision with no record: `h2xd:docs-adr`.

Done when the score is stated and every question has its line.

## Do

- Write the key from the code, the issues and the records, so a wrong page
  cannot grade itself.
- Use real questions from the tracker and the history, not trivia.
- Keep the quiz taker blind to the code and the key.
- Run the same questions again after a fix, and compare the scores.

## Don't

- Don't edit a page during the quiz. Report, and name the skill that fixes it.
- Don't let the quiz taker guess. "Not in the wiki" is a finding.
- Don't grade a right answer without a cited page as Right. Grade it Hard to
  find.
- Don't write questions from the wiki pages. A question the wiki suggests
  tests nothing.
