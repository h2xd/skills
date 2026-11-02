# Logic prototype

One self-contained HTML file that lets anyone drive a state model by clicking
buttons. Use it for business rules, state transitions and data shape: designs
that read well on paper and only feel wrong when pushed through real cases.

The file needs no install, so a designer, product owner or domain expert can
open it. Every label uses their words from the project glossary, not names from
the code.

## 1. Write the question into the page

Put the question from step 1 of the skill in a visible intro at the top of the
page, not in a code comment. Add the precedent from step 2, or the note that
there is none.

Done when the page opens with the question as its first paragraph.

## 2. Write the logic as a pure module

Put the logic in one `<script>` block as a small pure module that could move
into the real codebase unchanged. Pick the shape the question needs:

| Shape | Fits when |
|---|---|
| Reducer, `(state, action) => state` | Actions are discrete events and state is one value |
| State machine with explicit states and transitions | Which actions are legal right now is part of the question |
| Pure functions over a plain data type | There is no current state, only transformations |
| Class with a small method surface | The logic owns ongoing internal state |

The module never touches `document`, the DOM or a button handler. The page
calls into the module. The module never calls the page.

With competing variants, write one module per variant. All of them take the
same actions, so the same scenarios run against each.

Done when no line in the module names the DOM, and each variant module exposes
the same actions.

## 3. Build the page

Write plain HTML, CSS and JavaScript, all inline. Use no framework, bundler or
server. Lay the page out top to bottom:

1. **Title and question.** One line on what the prototype lets you explore.
2. **Variant picker.** Only with competing variants. Switching resets the state
   and shows the variant's name and its one-line idea.
3. **Current state.** A readable panel with labeled fields, not a JSON dump.
   Re-render it after every click and mark what changed.
4. **Free play.** One button per action, always shown. An action the module
   rejects shows the rejection in the state panel.
5. **Guided scenarios.** One tab per scenario. Each tab has:
   - a short description of the situation and what to watch,
   - the ordered steps as buttons. A click runs the step and moves to the next.
   - a reset to a known state on start, so the scenario runs the same way
     every time.

Pick scenarios that are hard to reason about on paper: the normal path, an
awkward edge case, and an attempt at something that must be illegal. For an
order model, that is "pay, then ship", "refund after a partial shipment", and
"refund twice".

Use clean type, generous spacing and one accent color. Add no animation.

Done when the file opens by double-click, and every scenario runs to its last
step on every variant.

## 4. Capture

The pure module of the winning variant is what moves into the real code. The
HTML page goes to the `prototype/<slug>` branch with the losing variants. It
stays a single file there, so anyone can rerun it later.

Done when step 5 of the skill is done.
