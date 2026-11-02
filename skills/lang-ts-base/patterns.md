# TypeScript patterns

Code examples for the rules in [`SKILL.md`](SKILL.md). The examples use zod.
Use the same pattern with the schema library the repo already has.

## Discriminated unions

```ts
// Don't. A boolean and optional fields allow contradictory states.
type DiffState = { loading: boolean; diff?: GitDiff; error?: string };

// Do. Only the three real states exist.
type DiffState =
  | { kind: "loading" }
  | { kind: "ready"; diff: GitDiff }
  | { kind: "error"; error: string };
```

## Constructive shapes

```ts
type NonEmpty<T> = [T, ...T[]];
type Pairs<T> = [T, T][];

// Don't. A comment holds the invariant.
type TimeRange = { start: Date; end: Date }; // start <= end

// Do. A negative range cannot be written. Derive the end when needed.
type TimeRange = { start: Date; durationMs: number };
const rangeEnd = (r: TimeRange) => new Date(r.start.getTime() + r.durationMs);
```

Where a plain `T[]` arrives, narrow it once. The fact then travels in the type.

```ts
const isNonEmpty = <T>(xs: T[]): xs is NonEmpty<T> => xs.length > 0;
```

## The simplest total type

```ts
// Fine. Every operation works on [].
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Don't. The `!` hides a crash on [].
function newestSession(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// Do. Strengthen the input and the assertion disappears.
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

## Lookup tables

```ts
type Kind = DiffState["kind"];

const labels = {
  loading: "Loading diff",
  ready: "Diff",
  error: "Diff failed",
} satisfies Record<Kind, string>;
```

## Branded types

```ts
type OrderId = string & { readonly __brand: "OrderId" };

function isOrderId(input: string): input is OrderId {
  return UUID_PATTERN.test(input);
}

function parseOrderId(input: string): OrderId {
  if (!isOrderId(input)) throw new Error(`Invalid order id: ${input}`);
  return input;
}

function cancelOrder(id: OrderId): void {
  // id is trusted here. No second check.
}
```

With a schema library, the schema creates the brand:

```ts
const OrderId = z.string().uuid().brand<"OrderId">();
type OrderId = z.infer<typeof OrderId>;
```

## Schema owns the shape

```ts
const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});
type User = z.infer<typeof UserSchema>;

function parseUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

When the type comes first, pin the schema to it. Remove `name` from the schema
and the assignment fails to compile.

```ts
type User = { id: string; name: string };
const UserSchema: z.ZodType<User> = z.object({ id: z.string(), name: z.string() });
```

## Lying guards

```ts
// Don't. Claims User, checks only `id`.
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data;
}

// Do. Checks every property the type claims.
function isUser(data: unknown): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "string" &&
    "name" in data &&
    typeof data.name === "string"
  );
}
```

## Derived types

```ts
// Don't. A second copy of a generated shape drifts when the schema changes.
type CheckSummary = { totalCount: number; checks: { name: string; status: string }[] };

// Do. Derive it from the generated type.
import type { ChecksMessage } from "<generated module>";
type CheckSummary = Pick<ChecksMessage, "totalCount" | "checks">;

// A union from a runtime list.
const ROLES = ["admin", "member"] as const;
type Role = (typeof ROLES)[number];
```

## Exhaustive switches

```ts
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
    default: {
      const unhandled: never = s;
      return unhandled;
    }
  }
}

function draw(s: Shape): void {
  switch (s.kind) {
    case "circle":
      drawCircle(s);
      break;
    case "rect":
      drawRect(s);
      break;
    default: {
      const unhandled: never = s;
      void unhandled;
    }
  }
}
```

## `satisfies` over `as`

```ts
// Don't. Checks nothing and widens the literals.
const config = { theme: "dark", cols: 3 } as Config;

// Do. Checks the value and keeps `theme` as "dark".
const config = { theme: "dark", cols: 3 } satisfies Config;
```

## Object arguments

```ts
// Don't. Swap two numbers and it still compiles.
select(uri, 10, 1, 10, 1);

// Do.
select({ uri, start: { line: 10, column: 1 }, end: { line: 10, column: 1 } });
```
