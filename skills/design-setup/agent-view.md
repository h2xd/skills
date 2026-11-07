# Agent view

The agent view is two generated files: `index.json` for scripts and
`llms.md` for agents. They are committed, so an agent reads them from git, a
PR or a raw file URL with no dev server. Dev routes serve the same files for
a quick `curl`.

## Generator

Write one script, such as `scripts/design-agent-view.ts`. When the repo
already has a generator, extend it to emit both files instead. It imports
the inventory and the page list. It writes both files to the folder on the
config page.

The output folder is `design/` at the repo root by default. It is never under
the docs root, because the docs lint rejects a page without wiki frontmatter.
It is never under the static assets folder, such as `public/`.

- `<generator>` writes the files.
- `<generator> --check` exits 1 when a file differs from what it would write.
- It writes no token value. It names the token source file instead.

## Where the check runs

Add a package script, such as `design:check`, that runs `<generator> --check`.
Put `design:check` in the package script of a workflow that installs the
dependencies. Never put it in a script the pre-commit hook runs when it needs
the dependencies.

Put the gate check from [gating.md](gating.md) in the CI job that already
builds the app. Otherwise add a new workflow, such as
`.github/workflows/design.yml`. Never put a production build in a pre-commit
script.

## `index.json`

```json
{
  "tokens": { "path": "<token source>", "href": "<overview route>/<color page>" },
  "log": { "path": "<design log path>" },
  "pages": [{ "href": "<route>", "title": "<title>", "blurb": "<one line>" }],
  "groups": [{ "id": "<group>", "label": "<label>", "blurb": "<one line>" }],
  "elements": [
    {
      "slug": "<slug>",
      "title": "<title>",
      "group": "<group>",
      "standing": "<standing>",
      "reason": "<one sentence>",
      "use": ["<when to use>"],
      "avoid": ["<when not, and what instead>"],
      "path": "<source>",
      "href": "<overview route>/components/<slug>",
      "composes": [],
      "related": []
    }
  ]
}
```

- `path` is a repo path. `href` is a dev route. Every item that has both
  gives both.
- `elements` has one item per inventory entry, in inventory order.

## `llms.md`

Plain Markdown that an agent reads before it builds UI:

```markdown
# <app> design system

Tokens: <token source>. Design log: <design log path>.

## <Group label>

### <Title>, <standing>
<reason> Source: <path>
- Use: <when to use>
- Avoid: <when not, and what instead>
```

## Dev routes

Serve both files under the overview route, as `index.json` and `llms.md`.
Support `?slug=<slug>` and `?group=<id>` on `index.json`. Gate the routes
as [gating.md](gating.md) says.

```sh
curl -s <base><overview route>/index.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).elements.length))'
curl -s '<base><overview route>/index.json?slug=<slug>'
curl -s <base><overview route>/llms.md | head -20
```
