---
name: code-quality
description: The standard for code quality and architecture in every repo using the h2xd skills. Use before writing code that more than one function calls, when designing a module, type or interface, when refactoring, when a fix is tempting to bolt on, when reviewing code, or when another skill asks for the quality bar.
---

# Code quality

Leave one workaround in the code, and the next agent that reads it writes two
more. An agent copies the shape it finds. A shallow module gets a shallow
neighbor, and a second way to do one task gets a third.

Code is read many more times than it is written, and agents read it most.
Quality is not polish at the end. It is the shape the next change starts from.

The bar below applies to every change. Where a repo's own documented standards
disagree, they override it. Those are the agent instructions file,
`CONTRIBUTING.md` and the decision records.

## Before writing

1. **Name the data first.** Decide the core types and data structures before
   the logic. Get those right, and the code that uses them becomes obvious.
   - Encode the domain in a structure instead of conditionals across files.
     Use a discriminated union, a state machine, a lookup table or a typed
     model.
   - A second boolean that must stay in sync with the first means you skipped
     this step.
2. **Use the glossary's words.** Types, modules and functions take the `###`
   heading of their glossary entry, per `h2xd:docs-glossary`. A thing without
   an entry gets one before it gets a name in code.
3. **Read the decisions.** `node scripts/find-docs.ts --links-to <path>` lists
   the records that constrain the files you will touch. Follow them, or
   supersede one on purpose with `h2xd:docs-adr`. Never drift from one
   silently.
4. **Sketch the shape when a change touches more than one module.** Write the
   types, the signatures and which module owns what, before the bodies. When
   the repo has no precedent for the design, compare two shapes.

Done when you can name the types, their glossary entries and the records that
apply.

## The shape

- **Deep modules.** A small interface over a lot of behavior.
  - The interface is everything a caller must know: types, invariants,
    ordering and error modes.
  - When learning the interface does not save the caller from learning the
    implementation, the module is shallow.
  - Deletion test: delete the module in your head. When complexity vanishes,
    it was a pass-through. When it reappears across callers, it earns its keep.
  - In TypeScript, `h2xd:lang-ts-deep-modules` makes the build fail on a deep
    import.
- **Seams only where something varies.** One adapter is a hypothetical seam.
  Two adapters make a real one, such as production and test. Accept
  dependencies, and do not construct them inside.
- **One owner per piece of state.** Other modules read it or ask the owner.
- **One way to do one task.** When you add the new way, move the callers and
  delete the old way in the same change. An internal interface gets no
  compatibility layer.
- **Organize by knowledge, not by execution order.** Modules named after steps
  repeat the same rules at every step, such as load, validate, transform and
  save.
- **Guards where data enters, trust inside.** Parse and validate external data
  once, where it enters, into types that cannot hold an invalid value. External
  data is network responses, files, config and user input. Internal code trusts
  its types, and business logic stays in pure functions.
- **Make illegal states unrepresentable.** Brand a string or number that
  carries meaning, so an `OrderId` is not a `string`. Exhaust every variant.
  Derive types from the authoritative schema instead of restating them. In
  TypeScript, `h2xd:lang-ts-base` gives the patterns.
- **Idempotent operations.** Commands, lifecycle steps and loops that can be
  interrupted reach the same end state when you run them again.

## While changing code

- **Subtract before you add.** Remove dead code, redundant checks and stale
  stubs first. Then build on the simpler base.
- **The smallest change that solves the problem.** Add no abstraction,
  parameter or hook for a need the issue does not have.
- **Fix the root cause.** Trace a symptom back to the first place the system
  went wrong, and fix it there.
  - A guard is a fix only when the state it handles is legitimate.
  - A `try/catch`, a `?? default` or an `if (!x) return` that hides an
    impossible state is a second bug.
- **Redesign when a requirement does not fit.** Build a new requirement in as
  if it had been there from the start. Do not force it into the old shape.
- **Keep the reader's load small.** Count the layers between a question and its
  answer, and the mutable state a reader must hold. Collapse one-caller
  wrappers, shrink mutable scope, and prefer a flat early return to nesting.
- **No comments that explain the code.** Rename, extract or retype until the
  code says it. Only comments on the keep list of the `comment-reaper` agent
  survive. `h2xd:review-code-comments` runs that agent.
- **Encode lessons in structure.** A correction you would write down twice
  becomes a type, a lint rule, a test or a script. Its error message names the
  fix. `h2xd:session-reflect` routes a lesson to the strongest fix.

## Tests

- Test behavior through the interface, which is what a caller can observe. A
  test that breaks when only internals change tests the implementation.
- A bug fix comes with the test that would have caught it, when a cheap one
  exists. `h2xd:code-tdd` is the workflow for writing it first.
- A test earns its place when it kills a plausible mutant, a bug a person could
  write in the code it covers. After you write tests for logic, run
  `h2xd:prove-tests` on the change. Delete or rewrite a test that kills nothing.

## Done

- Prove that the change works on the real thing. Run it, read the actual
  output and inspect the diff. "It compiles" and "the tests pass" are proxies.
- The pages that link the changed files are current, per `h2xd:docs-wiki`.
- Lint, typecheck and tests pass, and you added no suppression to get there.

## Reviewing

Reviewers check the diff against the bar above and against
[`smells.md`](smells.md), a fixed baseline of design red flags and code smells.
Every smell is a judgment call, never a hard violation. The repo's documented
standards override it.

## Do

- Name the types before you write the logic.
- Move every caller to the new way and delete the old one in the same change.
- Validate external data once, where it enters.
- Run the change and read its real output before you call it done.

## Don't

- Don't add a seam for one implementation. Add it when the second one arrives.
- Don't hide an impossible state behind a guard or a default. Fix it where it
  starts.
- Don't keep a compatibility layer for an internal interface. Move the callers.
- Don't silence a lint or type error with a suppression. Fix the code.
- Don't explain code with a comment. Rename, extract or retype it.
