# Tool template: a library-docs server

A server that returns the current docs of a library, so a subagent does not
guess an API from memory.

- **Applies to:** `builder.md`, `fixer.md`, `reviewer.md`.
- **Ask:** Does the repo use a library-docs server?
- **Values:** `{{LOAD}}`, the step that makes its tools callable, or `none`.
  `{{CALL}}`, the exact call that fetches the docs of one library.

## Lines

`builder.md`:

```markdown
### Library docs

- Load: {{LOAD}}.
- Before you call an API of a library, call `{{CALL}}` for that library.
  Do not write the call from memory.
```

`fixer.md`:

```markdown
### Library docs

- Load: {{LOAD}}.
- When a fix uses an API of a library, call `{{CALL}}` for it first.
```

`reviewer.md`:

```markdown
### Library docs

- Load: {{LOAD}}.
- When the diff calls an API you doubt, call `{{CALL}}` for it. Report a
  wrong call as a finding.
```
