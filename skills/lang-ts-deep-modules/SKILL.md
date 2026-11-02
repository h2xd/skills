---
name: lang-ts-deep-modules
description: Install dependency-cruiser in a TypeScript repo with rules that let other code reach a module only through its entry-point files, so the deep modules of h2xd:code-quality hold without a reviewer. Proves the rules fail on a deep import. Use when the user wants module boundaries enforced, asks to stop deep imports into another module's internals, or h2xd:setup offers it.
disable-model-invocation: true
---

# TS deep modules

One import of `../billing/lib/retry`, and billing's private helper is public.
The next refactor of it breaks a caller nobody knew about. This skill makes
`depcruise` fail on that import, so each module keeps the small interface that
`h2xd:code-quality` asks of a deep module, with or without a reviewer.

## The shape

A module is one directory directly under the modules root. Its root files are
its entry points. Everything in its subfolders is private.

```
src/modules/
  billing/
    index.ts      entry point, importable from anywhere
    client.ts     a second entry point
    lib/          implementation, private
    tests/        tests and fixtures, private
```

The rules in [`dependency-cruiser.cjs`](dependency-cruiser.cjs), all `error`:

1. Code outside every module imports only a module's entry points.
2. A module's files import each other freely, other modules only by entry.
3. Files in `<module>/tests/` import entry points and their own fixtures,
   never internals, not even their own module's.
4. Only tests import from a `tests/` folder.
5. No dependency cycles.

Depth decides what is private, so a new subfolder needs no config change.
Several small entry points beat one barrel `index.ts` that re-exports a
subtree. A test inside `lib/` counts as module code, so tests go in `tests/`.

## Steps

### 1. Explore

- **Package manager**: `bun.lock` or `bun.lockb` means bun, `pnpm-lock.yaml`
  pnpm, `yarn.lock` yarn, else npm. Use it for every command below.
- **Modules root**: a directory of feature directories, such as `src/modules`,
  `src/packages` or `packages`. When none exists, propose `src/modules`.
- **Source roots**: every directory that imports modules, such as `src` or
  `app`. Rule 1 sees only the importers the cruise covers.
- **The rest**: the `tsconfig.json` path, any `.dependency-cruiser.*` file,
  the `package.json` script that runs the typecheck, and whether CI runs it.
- **Docs**: the pages `node scripts/find-docs.ts --links-to <modules root>` lists.

Done when you can state each of these, and the user confirmed the modules root.

### 2. Install and configure

1. Add `dependency-cruiser` as a dev dependency.
2. Copy [`dependency-cruiser.cjs`](dependency-cruiser.cjs) to the repo root as
   `.dependency-cruiser.cjs`. Set `MODULES_ROOT`, and `tsConfig.fileName` when
   the tsconfig is not at the root. Keep `.cjs` for `"type": "module"` repos.
3. When a config exists, merge the five rules and the options into it. Tell
   the user what you added.
4. Add a `package.json` script that names every source root:

   ```json
   "lint:boundaries": "depcruise src --config .dependency-cruiser.cjs"
   ```

Done when `.dependency-cruiser.cjs` holds the five rules with the confirmed root.

### 3. Meet the existing code

Run `lint:boundaries`. When it reports violations, count them per rule. Ask with
clickable options, through the CLI's question tool, such as AskUserQuestion:

- **Baseline**, recommended above about ten violations. Through `npx`, `bunx`,
  `pnpm exec` or `yarn`, run the script's `depcruise` command with
  `--output-type baseline > .dependency-cruiser-known-violations.json`. Add
  `--ignore-known` to the script and commit the file. Old violations pass, new
  ones fail.
- **Fix now**: point each import at an entry point, or add the entry point the
  caller needs, following `h2xd:code-quality`.
- **Narrow the root**: point `MODULES_ROOT` at a directory that already
  follows the shape.

Done when `lint:boundaries` exits 0.

### 4. Prove the rules fail

1. Pick a module with a file in a subfolder. When none has one, create a
   throwaway module with `index.ts` and `lib/impl.ts`.
2. From outside that module, import the subfolder file, such as
   `<modules root>/<module>/lib/impl`. Run `lint:boundaries`. It must fail with `entrypoint-boundary-from-app` or
   `entrypoint-boundary-across-modules`.
3. When the module has a `tests/` folder, plant `import "../lib/impl"` in a test.
   It must fail with `tests-through-entrypoints`.
4. Revert every planted import, delete the throwaway module, and run again.

Done when each planted import failed with its rule name, and the last run passed.

### 5. Wire it into the checks

- Add `lint:boundaries` to the script that runs the typecheck. Leave
  `tsconfig` and path aliases alone.
- When no such script exists, or CI does not run it, add a CI step that runs
  `lint:boundaries`.
- Leave the pre-commit hook alone. A full cruise is too slow for every commit.

Done when the command CI runs includes `lint:boundaries`.

### 6. Document the rule

1. Write one page with the shape, one line per rule, the advice against
   barrels, and how to run `lint:boundaries`. Link `.dependency-cruiser.cjs`
   and the modules root, so `find-docs.ts --links-to <modules root>` lists it.
   - With an h2xd docs bundle, write it with `h2xd:docs-wiki`, in the directory
     that `docs/agents/knowledge-base.md` lists for architecture.
   - Without a bundle, write it to `<modules root>/README.md`.
2. Add one line to the agent instructions file, `CLAUDE.md` or `AGENTS.md`:
   `Modules are deep: import only a module's root files. See <page>.`
3. When the user wants the module seams recorded as a decision, run `h2xd:docs-adr`.

Done when the page exists, the instructions file links it, and
`node scripts/lint-docs.ts` exits 0 where the bundle exists.

### 7. Report

```
🔴 <item>: <a rule that did not fail on its planted import, or a failing check>
🟡 <item>: <baselined violations per rule, a CI step left to the user>
🟢 <item>: <what was written or proven>
```

Done when every written file and every follow-up has a line.

## Do

- Cruise every source root, not only the modules root.
- Prove the boundary rules fail on planted imports before you report done.
- Offer baselined violations to the user as targets for `/h2xd:code-architecture`.

## Don't

- Don't overwrite an existing `.dependency-cruiser.*`. Merge the rules in.
- Don't split rule 2 into one rule per module. The `$1` group scopes it.
- Don't add a barrel `index.ts` to satisfy the rules. Add a small entry point.
- Don't nest a module inside a module. Keep modules one level under the root.
- Don't commit a planted import or the throwaway module. Revert both in step 4.
