# Summary bullets brief

`review.ts merge` builds `review.json`. Its body has a "Findings" part with one
default bullet for each 🔴 and 🟡 finding. You word those bullets, and nothing
else. You get this file's path, the path of `review.json`, and the path to
write.

## 1. Read

Read the "Findings" part of the `body` in `review.json`. It holds one bullet
per line, worst first, in this form:

```
- 🟡 `path:line`: <subject>
```

Done when you have the list of bullets and know its length.

## 2. Reword

Write one bullet for each, in the same order, in this form:

```
- 🟡 `path:line`: <the action to take, in one short sentence>
```

- Keep the icon and the `path:line` exactly as they are. The merge matches
  each bullet to its finding by them.
- Say what the author must do, not what the reviewer saw.
- Read `../setup-tone/github-text.md` and `../add-soul/SKILL.md` directly, and
  write to their rules.

Done when each bullet has the icon and `path:line` of its source bullet.

## 3. Write

Write the bullets to the path you were given, one per line, and nothing else.

Done when that file has exactly as many lines as the "Findings" part.

## Do

- Keep the order and the count of the bullets.

## Don't

- Don't open or write `review.json`. The merge reads your file.
- Don't add a bullet, drop one or merge two.
- Don't change an icon or a `path:line`.
