// @ts-check
// Deep-module boundaries for dependency-cruiser. Written by h2xd:lang-ts-deep-modules.
//
// Every directory directly under MODULES_ROOT is a module. A module's root
// files are its entry points, the only files other code may import. Every
// subfolder is private. By convention `lib/` holds the implementation and
// `tests/` the tests, but depth alone decides, so a new folder needs no change
// here. Prefer several small entry points, such as index.ts, client.ts and
// server.ts, over one barrel that re-exports a subtree.
//
// Edit MODULES_ROOT, and tsConfig.fileName when tsconfig.json is not at the
// repo root. Paths are relative to the directory depcruise runs in, the repo
// root.

/** Where modules live. Each immediate child directory is one module. */
const MODULES_ROOT = "src/modules";

const R = MODULES_ROOT;
/** Anything inside a module's subfolders. A module's root files do not match. */
const MODULE_INTERNALS = `^${R}/[^/]+/[^/]+/`;
/** A module's tests folder. */
const MODULE_TESTS = `^${R}/[^/]+/tests/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "entrypoint-boundary-from-app",
      comment:
        "Code outside every module imports a module through its root files, the entry points, never its subfolders.",
      severity: "error",
      from: { pathNot: `^${R}/` },
      to: { path: MODULE_INTERNALS },
    },
    {
      name: "entrypoint-boundary-across-modules",
      comment:
        "A module's files import each other freely. They reach another module only through its entry points.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/`, pathNot: MODULE_TESTS },
      to: { path: MODULE_INTERNALS, pathNot: `^${R}/$1/` },
    },
    {
      name: "tests-through-entrypoints",
      comment:
        "A module's tests import entry points and their own tests/ fixtures, never any module's internals, not even their own.",
      severity: "error",
      from: { path: `^${R}/([^/]+)/tests/` },
      to: { path: MODULE_INTERNALS, pathNot: `^${R}/$1/tests/` },
    },
    {
      name: "tests-folder-is-private",
      comment: "Only tests import from a tests/ folder.",
      severity: "error",
      from: { pathNot: MODULE_TESTS },
      to: { path: MODULE_TESTS },
    },
    {
      name: "no-circular",
      comment: "No dependency cycles.",
      severity: "error",
      from: {},
      to: { circular: true },
    },

    // Layering decides which modules may depend on which. It is a separate
    // concern. When the repo decides on a layering, add its rules here, such as:
    //
    // {
    //   name: "ui-does-not-import-billing",
    //   severity: "error",
    //   from: { path: `^${R}/ui/` },
    //   to: { path: `^${R}/billing/` },
    // },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
  },
};
