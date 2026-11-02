# Smells

A baseline that applies even when a repo documents nothing. Each entry says
what the smell is, then gives the fix. Every smell is a judgment call, so name
it as "possible <smell>" and quote the code.

A documented repo standard overrides the baseline. Skip anything a tool
already enforces.

## Design red flags

These make the next change harder, and agents copy them.

- **Shallow module**: callers coordinate several calls to do one operation, or
  options expose internal stages. Fix: hide the stages behind one call.
- **Information leakage**: a representation, wire type or policy appears in
  more than one module, so a change to it takes coordinated edits. Fix: parse
  into a domain type behind one interface. Keep schemas and protocol details
  private.
- **Temporal decomposition**: modules split by execution order repeat one
  representation and its rules at every step. Fix: group by the knowledge each
  module owns.
- **Pass-through method**: it forwards the same arguments to a method of the
  same shape and adds nothing. Fix: delete it and call the target.
- **Split ownership**: two modules write the same state or keep their own copy.
  Fix: give the state one owner. Other modules read it or ask.
- **Two ways to do one task**: callers pick whichever they found first. Fix:
  keep one, move the callers and delete the rest in the same change.
- **Importable internals**: callers reach past the interface into internals.
  Fix: make the import fail the build.
- **Hand-synced list**: to add an item, you edit several lists. Fix: derive the
  others from one list, or fail the build when they disagree.
- **Symptom guard**: a check hides a state that should never occur. Fix: fix
  the code where the state is created.

## Code smells

These come from Martin Fowler's *Refactoring*, chapter 3.

- **Mysterious name**: the name does not say what it does or holds. Fix:
  rename it. When no honest name comes, the design is murky, so check the
  glossary.
- **Duplicated code**: the same logic shape is in more than one hunk or file.
  Fix: extract the shared shape and call it from both.
- **Feature envy**: a function reaches into another object's data more than
  its own. Fix: move it onto the data it envies.
- **Data clumps**: the same few fields or parameters keep traveling together.
  Fix: bundle them into one type.
- **Primitive obsession**: a string or number stands in for a domain concept.
  Fix: give the concept its own small type.
- **Repeated switches**: the same `switch` or `if` cascade on the same type is
  in several places. Fix: one map or one polymorphic call that both sites
  share.
- **Shotgun surgery**: one logical change forces edits across many files. Fix:
  gather what changes together into one module.
- **Divergent change**: one module changes for several unrelated reasons. Fix:
  split it so each part changes for one reason.
- **Speculative generality**: abstraction, parameters or hooks for needs nobody
  has. Fix: delete and inline until a real need shows.
- **Message chains**: the caller walks a chain such as `a.b().c().d()` that it
  should not depend on. Fix: hide the walk behind one method on the first
  object.
- **Middle man**: a class or function mostly delegates. Fix: call the real
  target.
- **Refused bequest**: an implementer ignores or overrides most of what it
  inherits. Fix: use composition instead of inheritance.
