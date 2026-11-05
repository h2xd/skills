/**
 * A small schema kit. Each shape parses `unknown` into a typed value and
 * describes itself for the spec, so the checks and the spec text come from
 * one object and cannot drift apart.
 */

export type Issue = { where: string; message: string; signature?: string }

export class CheckError extends Error {
  readonly issues: Issue[]
  constructor(issues: Issue[]) {
    super(issues.map((issue) => `${issue.where}: ${issue.message}`).join("\n"))
    this.issues = issues
  }
}

/** Where a value sits in the file, and the signature of the nearest named record. */
export type At = { where: string; signature?: string }

export type Shape<T> = {
  parse(value: unknown, at: At): T
  /** The short type name in a signature, such as `string`, `Item[]` or `"a"|"b"`. */
  readonly type: string
}

export type Infer<S> = S extends Shape<infer T> ? T : never

function fail(at: At, message: string): never {
  throw new CheckError([{ where: at.where, message, signature: at.signature }])
}

function kindOf(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "an array"
  if (typeof value === "object") return "an object"
  return `a ${typeof value}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export const text: Shape<string> = {
  type: "string",
  parse(value, at) {
    if (typeof value !== "string") fail(at, `must be a string, got ${kindOf(value)}`)
    if (value.trim() === "") fail(at, "must not be empty")
    return value
  },
}

export const flag: Shape<boolean> = {
  type: "boolean",
  parse(value, at) {
    if (typeof value !== "boolean") fail(at, `must be true or false, got ${kindOf(value)}`)
    return value
  },
}

/** An id that is safe in a form field name and in an answers key. */
export const id: Shape<string> = {
  type: "string",
  parse(value, at) {
    const parsed = text.parse(value, at)
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(parsed)) fail(at, `must use only letters, digits, "_" and "-", got "${parsed}"`)
    return parsed
  },
}

/** A whole number from 1 to 5, such as the rating of one option on one criterion. */
export const score: Shape<number> = {
  type: "1..5",
  parse(value, at) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
      fail(at, `must be a whole number from 1 to 5, got ${JSON.stringify(value)}`)
    }
    return value
  },
}

export function oneOf<const L extends readonly string[]>(...literals: L): Shape<L[number]> {
  return {
    type: literals.map((literal) => `"${literal}"`).join("|"),
    parse(value, at) {
      const match = literals.find((literal) => literal === value)
      if (match === undefined) fail(at, `must be one of ${literals.join(", ")}, got ${JSON.stringify(value)}`)
      return match
    },
  }
}

export function list<T>(item: Shape<T>, size: { min?: number; max?: number } = {}): Shape<T[]> {
  return {
    type: `${item.type}[]`,
    parse(value, at) {
      if (!Array.isArray(value)) fail(at, `must be an array, got ${kindOf(value)}`)
      const { min = 0, max = Infinity } = size
      if (value.length < min || value.length > max) {
        const range = max === Infinity ? `at least ${min}` : `${min} to ${max}`
        fail(at, `must have ${range} entries, got ${value.length}`)
      }
      const issues: Issue[] = []
      const parsed: T[] = []
      value.forEach((entry, index) => {
        try {
          parsed.push(item.parse(entry, { ...at, where: `${at.where}[${index}]${idLabel(entry)}` }))
        } catch (error) {
          if (!(error instanceof CheckError)) throw error
          issues.push(...error.issues)
        }
      })
      if (issues.length > 0) throw new CheckError(issues)
      return parsed
    },
  }
}

function idLabel(entry: unknown): string {
  return isPlainObject(entry) && typeof entry.id === "string" ? ` "${entry.id}"` : ""
}

type Fields = Record<string, Shape<unknown>>
type Optional<O extends Fields> = { [K in keyof O]?: Infer<O[K]> }
type Required<R extends Fields> = { [K in keyof R]: Infer<R[K]> }
type Flat<T> = { [K in keyof T]: T[K] }

export type RecordShape<T> = Shape<T> & { readonly signature: string }

/** A JSON object with named keys. An unknown key is an error, so a typo cannot vanish. */
export function record<R extends Fields, O extends Fields>(
  name: string,
  required: R,
  optional: O,
): RecordShape<Flat<Required<R> & Optional<O>>> {
  const show = (key: string, shape: Shape<unknown>, mark: string) =>
    shape.type === "string" ? `${key}${mark}` : `${key}${mark}: ${shape.type}`
  const signature = `${name} {${[
    ...Object.entries(required).map(([key, shape]) => show(key, shape, "")),
    ...Object.entries(optional).map(([key, shape]) => show(key, shape, "?")),
  ].join(", ")}}`
  return {
    type: name,
    signature,
    parse(value, outer) {
      const at: At = { where: outer.where, signature }
      if (!isPlainObject(value)) fail(at, `must be an object, got ${kindOf(value)}`)
      const issues: Issue[] = []
      const out: Record<string, unknown> = {}
      const field = (key: string, shape: Shape<unknown>) => {
        try {
          out[key] = shape.parse(value[key], { where: at.where ? `${at.where} › ${key}` : key, signature })
        } catch (error) {
          if (!(error instanceof CheckError)) throw error
          issues.push(...error.issues)
        }
      }
      for (const [key, shape] of Object.entries(required)) field(key, shape)
      for (const [key, shape] of Object.entries(optional)) if (value[key] !== undefined) field(key, shape)
      for (const key of Object.keys(value)) {
        if (!(key in required) && !(key in optional)) {
          issues.push({ where: at.where || "top level", message: `unknown field "${key}"`, signature })
        }
      }
      if (issues.length > 0) throw new CheckError(issues)
      // Every required key was parsed and every optional key was parsed or left out.
      return out as Flat<Required<R> & Optional<O>>
    },
  }
}

/** A short JSON array read into named fields, such as `[path, hint]`. Trailing fields may be optional. */
export function tuple<const N extends readonly string[], const Opt extends readonly string[] = []>(
  name: string,
  names: N,
  optionalNames: Opt,
): RecordShape<Flat<{ [K in N[number]]: string } & { [K in Opt[number]]?: string }>> {
  const all = [...names, ...optionalNames]
  const shapeText = `[${[...names, ...optionalNames.map((key) => `${key}?`)].join(", ")}]`
  return {
    type: name,
    signature: `${name} ${shapeText}`,
    parse(value, at) {
      if (!Array.isArray(value)) fail(at, `must be an array ${shapeText}, got ${kindOf(value)}`)
      if (value.length < names.length || value.length > all.length) {
        fail(at, `must be ${shapeText}, got ${value.length} entries`)
      }
      const out: Record<string, string> = {}
      value.forEach((entry, index) => {
        out[all[index]] = text.parse(entry, { ...at, where: `${at.where}[${index}] ${all[index]}` })
      })
      // The length check above makes every required name present.
      return out as Flat<{ [K in N[number]]: string } & { [K in Opt[number]]?: string }>
    },
  }
}

/** A tuple, or a bare string that stands for the whole tuple. */
export function orBare<T>(shape: RecordShape<T>, fromString: (value: string) => NoInfer<T>): RecordShape<T> {
  return {
    type: shape.type,
    signature: `${shape.signature}, or a bare string that is its own id and label`,
    parse(value, at) {
      return typeof value === "string" ? fromString(text.parse(value, at)) : shape.parse(value, at)
    },
  }
}
