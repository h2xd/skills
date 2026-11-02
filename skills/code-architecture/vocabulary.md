# Vocabulary

The words every candidate, report line and grilling question uses. They extend
the deep-module rules in [`../code-quality/SKILL.md`](../code-quality/SKILL.md).
Use them exactly. Write "module", never "component", "service" or "unit".
Write "interface", never "API" or "signature". Write "seam", never "boundary".

## Terms

- **Module.** Anything with an interface and an implementation, at any scale: a
  function, a class, a package, a slice across tiers.
- **Interface.** Everything a caller must know to use the module correctly:
  types, invariants, ordering, error modes, required configuration, cost.
- **Implementation.** The code inside the module.
- **Depth.** How much behavior a caller or test reaches per piece of interface
  it learns. A module is **deep** when a small interface covers a lot of
  behavior. It is **shallow** when the interface is nearly as large as the
  implementation.
- **Seam.** The place where a module's interface lives, where behavior can
  change without editing that place. Where the seam goes is its own decision.
- **Adapter.** A concrete thing that satisfies an interface at a seam. The word
  names its role, not its size.
- **Leverage.** What callers get from depth: one implementation serves N call
  sites and M tests.
- **Locality.** What maintainers get from depth: a change, a bug and its test
  land in one module instead of across callers.

## Tests for a candidate

- **Deletion test.** Delete the module in your head. When complexity vanishes,
  it was a pass-through. When it reappears across callers, it earns its keep.
- **The interface is the test surface.** Callers and tests cross the same seam.
  A test that has to reach past the interface means the module has the wrong
  shape.
- **One adapter is a hypothetical seam. Two adapters make a real one.**
  Production plus a test adapter counts as two.
- **Internal seams stay internal.** A deep module may have seams its own tests
  use. Do not expose them through the interface.

## Dependency categories

Classify each dependency of the cluster you want to deepen. The category
decides how the deepened module is tested.

| Category | Examples | Seam and tests |
|---|---|---|
| `in-process` | Pure computation, in-memory state | Merge the modules. Test through the new interface. No adapter |
| `local-substitutable` | A database with a local stand-in, an in-memory filesystem | Run the stand-in in the test suite. The seam stays internal |
| `owned-remote` | Your own services over the network | A port at the seam. A network adapter in production, an in-memory adapter in tests |
| `external` | Third-party services you do not control | The module takes the service as a port. Tests pass a fake adapter |

## Replace the tests, do not add a layer

- Write the new tests at the deepened module's interface.
- Delete the old tests on the shallow modules once the new ones cover the same
  behavior.
- Assert on what a caller can observe, never on internal state.
- A test that changes when only the implementation changes tests past the
  interface. Rewrite it.
