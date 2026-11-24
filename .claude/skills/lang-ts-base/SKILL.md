---
name: lang-ts-base
description: TypeScript rules that make the compiler reject bad states. Unions over optional-field bags, branded ids, exhaustive switches, no `as` casts, and types derived from the schema that owns the shape. Use when reading, writing, editing or reviewing any .ts or .tsx file.
paths: ["**/*.ts", "**/*.tsx"]
---

# TypeScript

`{ loading: false, error: "timeout", diff: d }` compiles today and shows a
broken screen next month. These rules make the compiler reject that value, so
the bug fails the build before it reaches a user.

`h2xd:code-quality` says to make illegal states unrepresentable, brand
semantic primitives, exhaust every variant and derive types from the schema.
This skill says how to do each one in TypeScript. Apply `h2xd:code-quality`
first, because these rules add to it and never replace it.

Code examples for every rule are in [`patterns.md`](patterns.md).

When the repo has a decision record or a documented convention that disagrees
with a rule here, the repo wins.

## Before writing

1. Read `tsconfig.json`. Write code that compiles under its `strict` settings.
   Never loosen a compiler option to make a change compile.
2. Find the runtime schema library in `package.json`, for example zod,
   valibot or arktype. Find the schemas that already exist, and use them.
3. Search for `__brand`, `assertNever` and `never` to find the repo's brand
   shape and exhaustiveness helper. Reuse what is there.

Done when you can name the schema library, the brand shape and the
exhaustiveness helper, or know that the repo has none.

## States

- **One union per set of variants.** Model variants as a discriminated union
  with one literal discriminant field. Use the field name the repo already
  uses, such as `kind`, `type` or `tag`. A type with a `boolean` flag and optional
  fields that are only set in some states becomes a union.
- **Build the shape so the bad value cannot exist.** `[T, ...T[]]` for a
  non-empty list. `[T, T][]` for pairs. `start` plus `durationMs` instead of
  `start` plus `end`. Derive the other reading with a helper.
- **The simplest total type.** Keep `T[]` while every operation on it works on
  an empty array. Strengthen to `NonEmpty<T>` only where the loose type forces
  a `!`, an `as`, or a "should never happen" throw. Returning `T | undefined`
  is the other honest signature.
- **Lookup tables over switches.** When each variant maps to a value, write
  `const labels = { ... } satisfies Record<Kind, string>`. A new variant then
  fails the build until the table has its entry.

## Primitives

- **Brand ids and units.** Two parameters with the same primitive type but
  different meanings get brands, such as
  `type OrderId = string & { readonly __brand: "OrderId" }`. Brand a unit,
  such as milliseconds or cents, only when a raw number could reach a place
  that expects it.
- **A brand comes from a verifying check.** Create branded values in one parse
  function or a type guard `(input: string): input is OrderId` that tests the
  real rule. Never brand with `as`.
- **Object arguments.** A function with two or more parameters of the same
  type takes one object. Skip this on hot paths: render loops, tokenizers,
  parsers.

## External data

- **`unknown`, never `any`.** `JSON.parse`, `fetch` bodies, `postMessage`, IPC,
  file contents, environment variables and database rows are `unknown` until
  parsed.
- **One schema owns the shape.** Write the schema with the repo's schema
  library and infer the type from it, for example `z.infer<typeof UserSchema>`.
  Use the safe-parse variant when failure is an expected branch.
- **When the type comes first, pin the schema to it.** Annotate the schema with
  the type it proves, for example `z.ZodType<User>`. A schema that proves less
  than the type then fails to compile.
- **A hand-written guard is the last resort.** Write one only when no schema
  library exists. Name it `isX` or `hasX`, and check every property the type
  claims. A guard that checks less than it claims is worse than an `as`.
- **Wide types stop at the parse.** `Record<string, unknown>`, `object` and
  `{}` appear only in the function that parses them into a named domain type.

## Derived types

- **Derive before you declare.** Generated types come from OpenAPI, GraphQL,
  protobuf or a database schema. When a generated or existing type owns the
  shape, derive from it before you write a new interface. Use `Pick`, `Omit`,
  `Parameters`, `ReturnType`, `Awaited`, `typeof` and indexed access, such as
  `Order["status"]`.
- **Unions from values.** When a list of literals exists at runtime, derive
  the type from it: `const ROLES = ["admin", "member"] as const` and
  `type Role = (typeof ROLES)[number]`. One list, no drift.

## Narrowing

Narrow with the first tool on this list that works:

1. A `switch` or `if` on the discriminant.
2. The `in` operator.
3. `typeof` or `instanceof`.
4. A schema parse.
5. A user-defined type guard that verifies its claim.

`as` is not on the list. `as const` is not a cast and is fine.

- **Every switch on a union is exhaustive.** The `default` arm assigns the
  value to a `never` local, or calls the repo's `assertNever` helper. Adding a
  variant then fails the build at every switch that misses it.
- **`satisfies` instead of `as` for literals.** `satisfies Config` checks the
  value and keeps its literal types. `as Config` checks nothing.

## Removing an `as`

Find why the compiler cannot infer the type, then fix that cause:

| Cause | Fix |
|---|---|
| No discriminant | Add one and make the type a union. |
| Source type too wide, such as `Record<string, unknown>` | Narrow it at the parse. |
| Untyped input | Parse with the schema that owns the shape. Add a schema only where none exists. |
| A literal widened | Use `satisfies` or `as const`. |
| A primitive that needs a meaning | Brand it through a verifying guard. |
| A `!` or `arr[0] as T` | Strengthen the input type, or return `T \| undefined`. |

When no cause fits, keep the cast and add a test that covers its claim. Say
why in the change description.

## Do

- Model each set of variants as a discriminated union with one discriminant.
- Brand every id and every unit a raw primitive could be confused with.
- Infer types from the repo's schema library and its generated types.
- End every switch on a union with a `never` check.
- Use `satisfies` to check a literal against a type.

## Don't

- Don't write an `as` cast. Narrow, parse or brand through a guard instead.
- Don't type external data as `any`. Type it `unknown` and parse it.
- Don't keep a boolean plus optional fields. Make the states a union.
- Don't restate a shape a schema already owns. Derive it with `Pick`, `Omit` or
  the schema's infer helper.
- Don't add a schema library for one guard. Use the one the repo has, or write
  a guard that checks every property.
- Don't strengthen a type by reflex. Strengthen it where the loose type forces
  a `!`, a cast or an impossible throw.
