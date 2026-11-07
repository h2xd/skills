# Tidy checks

Run each check against the paths in `docs/agents/design-system.md`. Each
finding names the check number, the paths and a proposed fix. Skip an entry
without `source` in checks 1, 2 and 5, and list it once as "no source".
When no entry has `source`, report once "no source on any entry, run
`h2xd:design-setup`", and skip check 2.

| # | Check | How to find it | Usual fix |
|---|---|---|---|
| 1 | Dead entry | An inventory `source` path that does not exist, or exports nothing the entry previews | Safe: fix the path after a rename. Decision: remove the entry |
| 2 | Missing element | A module in the components folder that two or more places import, and that no entry names as `source` | Decision: add an entry |
| 3 | Copies | The same class list, style block or markup in three or more places, with no shared module | Decision: extract one element, or merge into an existing one |
| 4 | Literal values | A color, duration or easing written in a stylesheet or a `style` attribute outside the token source | Safe: replace a value that matches one token exactly with that token. Decision: every other value |
| 5 | Unused entry | An entry whose module no app route imports | Decision: remove, or say why it stays |
| 6 | Stale intent | An `intent` entry whose last change is older than 30 days | Decision: decide, or keep with a reason |
| 7 | Thin entry | Empty `avoid`, a `reason` over one sentence, no preview, no variants for a module with variant props | Safe: fill from the code |
| 8 | Broken links | A design log link, a decision link or a `related` link that does not resolve | Safe: fix or drop the link |
| 9 | Stale agent view | The agent view generator's `--check` fails | Safe: run the generator |
| 10 | Logged but not done | A design log entry marked `todo` whose change is not in the code | Decision: do it, or log a reversal |

## Hints

- For check 2, list the imports of the components folder, without the
  design pages:
  `rg -o --no-filename "from ['\"][^'\"]*<components folder>/[^'\"]*['\"]" --glob '!<design pages>/**' | sort | uniq -c`.
- For check 3, sort the tokens of each class list, then count equal lists
  across files. Three or more is a finding. Compare prop types for
  components. Equal props under different names are the strongest sign.
- For check 4, search stylesheets and `style` attributes only. Skip class
  strings, tests, SVG geometry and the design pages. Sizes in a utility
  class are not findings.
- For check 6, run `git log -1 --format=%cs -L'/slug: "<slug>"/,+20:<entry file>' | head -1`
  on the file that holds the entry. When the repo writes the slug field in
  another form, use that form. Then the pattern matches the entry and not a
  mention. Or run `git blame` on the entry lines, and take the newest date.
