# Inventory entry shape

The inventory is one typed module in the repo. The overview page, the agent
view generator, the export and `h2xd:design-tidy` read it. Nothing else lists
elements.

The names below are an example. When the repo already has an inventory,
keep its names and record them on the config page. Add a field to it only
after the user says yes.

## Entry

```ts
export const GROUPS = [<groups from step 2>] as const
export const STANDINGS = ['decided', 'intent', <more standing words from step 2>] as const

export type InventoryEntry = {
  /** Route segment and id. Unique across the inventory. */
  slug: string
  title: string
  group: (typeof GROUPS)[number]
  /** Why the element exists. One sentence. */
  reason: string
  /** When to use it. At least one item. */
  use: string[]
  /** When not to use it, and what to use instead. At least one item. */
  avoid: string[]
  standing: (typeof STANDINGS)[number]
  /** The source file of the real module, repo-relative. Tidy checks 1, 2 and 5 need it. */
  source?: string
  /** Renders the real module with real props. Returns the framework's renderable, such as ReactNode in React. */
  preview: () => Renderable
  variants?: { name: string; note?: string; render: () => Renderable }[]
  /** Slugs this element is built from. Empty means a leaf. */
  composes?: string[]
  keywords?: string[]
  /** Pages about this element, such as its foundation page or a design log entry. */
  related?: ({ href: string; label: string } | { path: string; label: string })[]
}
```

## Rules

- `GROUPS` and `STANDINGS` are closed unions. A new value is a decision
  record.
- `STANDINGS` always holds `decided` and `intent`. The design skills read
  both words.
- `Renderable` stands for the framework's renderable type, such as
  `ReactNode` in React.
- A `related` item carries `href` for a dev route or `path` for a repo path,
  never both. The overview page renders a `path` as a link to the repo file.
- `use` and `avoid` are lists, even when they hold one item.
- `source` points at the module the app imports. Without it, the tidy checks
  that need it report "no source" and skip the entry.
- The design pages import the inventory. The app never imports it.
- Previews are framework code, such as JSX. Keep them in separate files that
  the inventory imports. The agent view generator reads only the data fields.
