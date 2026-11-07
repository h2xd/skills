# Design words

The design skills use these words, each for one thing only.

- **Element.** One inventory entry. Its code is a module in the components
  folder.
- **Design pages.** The dev-only pages that show the design system.
- **Overview page.** The design pages' index.
- **Foundation page.** A design page for one foundation, such as color, type,
  motion or icons.
- **Screen page.** A design page the page list marks as a whole screen.
- **Reference page.** A design page that renders the agent view's `llms.md`
  and the design log. The mirror shows it, so a reader there can ask what
  exists and why.
- **Page list.** The module that lists the design pages, for the sidebar and
  the export.
- **Bare mode.** A design page opened with `?bare=1`. It drops the sidebar,
  so the export captures the page alone. Every design page supports it.
- **Inventory.** The one list of reusable elements. Its entry shape is in
  [inventory.md](inventory.md).
- **Standing.** An entry's status, such as `decided` or `intent`.
- **Token source.** The file that holds every token value, such as a global
  stylesheet. No other file holds a token value.
- **Agent view.** `index.json` and `llms.md`, generated from the inventory.
  See [agent-view.md](agent-view.md).
- **Snapshot.** One self-contained HTML file in the bundle. The export
  captures it from one design page or one inventory entry.
- **Bundle.** The folder the export command writes. It holds one snapshot
  per design page and per inventory entry. It is build output, out of git.
- **Mirror.** The copy of the bundle in the repo's Claude Design project.
  Edits made in the mirror never come back to the repo.
- **Sync skill.** The CLI skill that drives the design sync tool, such as
  `/design-sync`. Only it pushes to the mirror.
- **Mirror paths.** The file list of the mirror, kept in `remote-files.txt`.
- **Mirror state folder.** The repo folder that the config page's "Mirror
  state" row names. The skill in `../design-mirror/SKILL.md` keeps its push
  records there.
- **Marker file.** An empty file that wraps a push, such as
  `_ds_needs_recompile`. The sync skill writes it first and deletes it last.
- **Design log.** One page of small, dated design decisions. See
  `h2xd:design-log`.
- **Config page.** `docs/agents/design-system.md` in the target repo. It
  holds every repo-specific value the design skills need. See
  [config-page.md](config-page.md).
