---
name: to-page
description: Turn a checklist, a set of next steps or a round of hard decisions into a polished HTML page the user works through, then read the answers back as compact JSON. The agent writes a small JSON form file and runs one command. Use when the user must tick off, test or decide more than three things, when a plan waits on answers from the user or the team, or when the user asks for a page, a form or a checklist. For a customer or another person outside the team, use h2xd:to-questionnaire.
---

# To page

Fifteen release checks pasted into chat get skimmed, and answers come back as
a wall of Markdown. A page with cards, a progress bar and a save button gets
worked through. A hand-written page costs about 5 k output tokens. Here the
agent writes about 1 k tokens of JSON, and a script renders the rest.

Call the tool as `node "${CLAUDE_PLUGIN_ROOT}/skills/to-page/scripts/to-page.ts"`.
When that variable is empty, use `scripts/to-page.ts` next to this file.

## Page types

| Type | Use it for |
|---|---|
| `checklist` | Items to work through and tick off: a release check, a manual test, next steps. Each item may ask one question. |
| `grilling` | Hard decisions: questions with options and a recommendation, in rounds that build on earlier answers. |
| `decision` | One hard choice in depth: the options rated 1 to 5 against the drivers, with the good and the bad of each. One round. |

A fourth type, `questionnaire`, belongs to `/h2xd:to-questionnaire`, for a
reader outside the team. For such a reader, tell the user to run that skill.

## Steps

### 1. Look up what you can

Never put a question on the page that a search answers. Read the code, the
docs and the tracker first. In a repo set up with `h2xd:setup`, run
`node scripts/find-docs.ts --search "<words>"`.

Done when every fact you could find is found, and what is left needs a person.

### 2. Pick the type and the reader

Pick the type from the table. The reader is the user, or a teammate who
shares the context.

For a teammate, put their name in `to`, and the deadline in `deadline`.

Done when the type and the reader are known.

### 3. Read the spec

Run `to-page.ts spec <type>`. It prints the fields, the rules and an example
in at most 30 lines. [spec.md](spec.md) holds the same text for every type.

Done when you have read the spec of the type you picked.

### 4. Write the form file

Write `<folder>/round-1.form.json`. Use the CLI's scratch or temp folder, such
as the scratchpad directory. Without one, use `.to-page/<slug>/` in the
current directory. One folder holds all rounds of one topic.

- Write the `summary` first, as for an executive: what is at stake, what is
  settled, what this page asks. A reader who stops there knows the state.
- One idea per item. Give every question a `rec` with a `reason`.
- Draft options wherever options fit. The page adds a note field to every item.
- Keep the ids short and unique: `C1` or `Q1`. Number them across rounds.
- For grilling, order items as `h2xd:plan-grill` orders its frontier. A
  question that depends on an open one waits for the next round.

Done when the file exists and holds every item for this round.

### 5. Render and hand over

Run `to-page.ts render <folder>/round-1.form.json`. When it exits 1, fix each
line it prints and run it again. `to-page.ts check` only validates. On success
`render` prints the `file://` URL of the page.

Then run `to-page.ts serve <folder>/round-1.form.json` in the background,
through the CLI's background option. It renders the page again, serves its
folder over HTTP and prints the page URL. A page from the server writes the
answers next to the form, with no save dialog. While it runs, put its URLs on
top of every message. Start one server per topic. It serves every round.

- To open the page on another device, such as a phone or a tester's laptop,
  add `--host 0.0.0.0`. It prints one URL per network address. Tell the user
  that every device on the network can then open the pages of that folder.
- Add `--port <n>` for a fixed port. The default is a free port.
- A server started inside the CLI's sandbox can answer the agent but not the
  user's browser. Start it outside the sandbox, which needs the user's
  approval. When that is not possible, give the user the `file://` URL from
  `render`.

For a teammate with no network path to the server, tell the user to send
them the `.html` file. It works offline and holds everything it needs.

Done when `render` exits 0, the server runs, and the user has the URL.

### 6. Wait for the answers

While the server runs, run `to-page.ts wait <folder>/round-N.form.json` in
the background. It exits and prints the answers when the user submits, which
wakes you. After you read them, run it again with `--after <saved>`, so a
replace wakes you too. Without a server, the user pastes `Read the answers:
<path>` or the JSON. Never read the `.html` file.

- `answers` holds only the items with input, keyed by id.
- `pick` is the option id, or a list on a decision with `multi`. `dunno` is
  "I don't know", `other` puts the answer in the note. `done` is a tick.
- An item missing from `answers` got no answer.

Report the round, worst first:

```
🔴 <id>: no answer, or "I don't know". <who else might know>
🟡 <id>: "other", or a note that changes the pick. <what is still unclear>
🟢 <id>: <the answer>
```

Done when every item of the round has a line in the report.

### 7. Next round

When decisions are still open, write `round-2.form.json` in the same folder
with `"previous": "round-1"`. The page shows the earlier rounds folded, and
`depends` shows the earlier answer next to a question. New ids continue the
numbers.

Run `render` on the new form, then go back to step 6. The open page loads the
new round by itself. Do not start a second server or give a new URL. When the
last round is answered, run `to-page.ts done <last form>`. The open page then
shows every decision of the chain.

Hand every `decision` page and each settled decision worth keeping to
`h2xd:docs-adr`. Hand each settled fact to `h2xd:docs-wiki`.

Done when no decision is open, or the user chose to stop, and each settled
decision has a record or the user declined one.

## Do

- Look up every fact before you put a question on the page.
- Recommend an option on every question, with a one-line reason.
- Keep a round small enough to finish in one sitting.
- Fix every line `render` prints before you give the user a URL.
- Accept the answers as a path or as pasted JSON.

## Don't

- Don't write HTML, CSS or JS for a page. Write the form file and run `render`.
- Don't read the generated `.html` file. Read the answers JSON.
- Don't edit a form after the user saved its answers. Write the next round.
- Don't ask a question that depends on an open one. Hold it for the next round.
- Don't use this for one or two quick questions. Ask them in chat.
