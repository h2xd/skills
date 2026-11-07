# Writing the export script

Use this when the repo has no export command yet, or its export lacks a
folder below. The script is a capture step. It draws nothing itself. The
words, such as snapshot and bundle, are in `../design-setup/words.md`.

## What the script does

1. Reads the route list from the page list and the inventory. It never keeps
   its own list.
2. Uses a running dev server, or starts one on a free port.
3. Opens each route in Bare mode, with `?bare=1`.
4. Waits until the page settles. The fonts are loaded and the entrance
   motion is done.
5. Captures the rendered HTML in three steps.
   - Inlines every stylesheet.
   - Turns fonts and images into data URIs.
   - Drops every script.
6. Writes `<bundle>/<folder>/<slug>.html`. The first line is
   `<!-- @dsCard group="<group>" name="<title>" -->`. The `<title>` element
   holds the page title.
7. Checks its own output and prints the expected count.
8. Exits 1 on a problem, listed below.
   - The file count differs from its snapshot list.
   - A file lacks the `@dsCard` line.
   - A file has a `<script>`.
   - A body is empty.

## Folders

| Source | Folder | Group |
|---|---|---|
| Foundation pages | `foundation/` | `Foundation` |
| Inventory entries | `components/` | The entry's group label |
| Screen pages, which the page list marks as screens | `screens/` | `Screens` |
| Reference page | `reference/` | `Reference` |

## Requirements

- Use a browser driver that reuses the installed browser, such as
  `playwright-core`. No browser download.
- Add the bundle directory to `.gitignore`.
- Add a package script, such as `design:export`.
- Run the three tests in `../docs-adr/SKILL.md` on the choice of export
  script. When all three pass, record it with `h2xd:docs-adr`. Otherwise log
  it with `h2xd:design-log`.
