# Tool template: a code-graph server

A server that answers questions about the code from an index, such as who
calls a function.

- **Applies to:** `scout.md`, `builder.md`, `reviewer.md`.
- **Ask:** Does the repo use a code-graph server?
- **Values:** `{{LOAD}}`, the step that makes its tools callable, or `none`.
  `{{CALL}}`, the exact call that lists the users of a symbol.

## Lines

`scout.md`:

```markdown
### Code graph

- Load: {{LOAD}}.
- Before you list a file as touched, call `{{CALL}}` on each changed symbol.
  List the files of the users it returns too.
```

`builder.md`:

```markdown
### Code graph

- Load: {{LOAD}}.
- Before you change a function or type, call `{{CALL}}` on it. Update every
  user it returns, or write `not built` with the reason.
```

`reviewer.md`:

```markdown
### Code graph

- Load: {{LOAD}}.
- Call `{{CALL}}` on each changed symbol. Read the users outside the diff
  before you judge the change safe.
```
