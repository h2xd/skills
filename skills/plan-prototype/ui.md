# UI prototype

Two or three structurally different versions of a screen live on one real
route. A floating bar flips between them. The user picks one or names the
parts to combine, and the rest goes to the prototype branch.

## Where the variants live

Judge a screen next to the real header, navigation, data and density. On an
empty route every variant looks fine.

- **Inside an existing page.** This is the default. Use it when the route
  exists, or the new thing belongs inside one, such as a new section, card or
  step. Render the variants on that route, chosen by a `?variant=` search
  parameter. Data loading, parameters and auth stay as they are. Only the
  rendered part changes.
- **A new route.** This is the last resort. Use it only when no page can host
  the variants, such as for a new top-level area. Follow the project's routing
  convention and put `prototype` in the path. Use the same `?variant=`
  parameter.

## 1. Plan the variants

Use the count from step 2 of the skill. With a precedent, build one version
that follows it. Without one, build two or three. When the user asks for more
in step 4, stop at five, because past that they stop differing in structure.

Write the plan in one line at the top of the switcher file, for example:
"Three variants of the settings page on the existing `/settings` route,
switched by `?variant=`."

Done when the plan line exists and names the route.

## 2. Draft each variant

Each variant gets:

- the page's purpose and the data the page already has,
- the project's component library and styling,
- an exported component with a short name, such as `VariantA` with the label
  "Sidebar layout".

Variants differ in layout, hierarchy and primary action. When two drafts come
out alike, redraft one and forbid the shared structure, for example "no card
grid". Two variants may share a small component, such as a header. When they
share the layout, the comparison shows nothing.

Keep the variants read-only. When a variant must change data, point it at a
stub.

Done when each variant renders with real data and no two share a layout.

## 3. Wire the switcher

Pick the variant from the search parameter, below the existing data loading:

```tsx
// pseudo-code, adapt to the project's framework
const variant = searchParams.get("variant") ?? "A"
return (
  <>
    {variant === "A" && <VariantA {...data} />}
    {variant === "B" && <VariantB {...data} />}
    {variant === "C" && <VariantC {...data} />}
    <PrototypeSwitcher variants={["A", "B", "C"]} current={variant} />
  </>
)
```

Put `PrototypeSwitcher` with the project's shared UI components. It is a small
fixed bar at the bottom center:

- It shows a left arrow, the current key and label, and a right arrow. An
  example label is "B, Sidebar layout". The arrows wrap around.
- A click updates the search parameter through the framework's router, so a
  variant URL can be shared and survives a reload.
- The left and right arrow keys also switch, except while an `input`,
  `textarea` or `contenteditable` element has focus.
- It looks unlike the page, for example a high-contrast pill with a shadow, so
  nobody judges it as part of the design.
- It renders only outside production builds, for example behind
  `process.env.NODE_ENV !== "production"`.

Done when every `?variant=` key renders its variant, the arrows and keys cycle
through all of them, and a production build hides the bar.

## 4. Capture

Rewrite the winning variant into the real page, with tests. When it lives on
a new route, move it to a real route. The switcher, the losing variants and any
`prototype` route go to the `prototype/<slug>` branch.

Done when step 5 of the skill is done.
