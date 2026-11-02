/**
 * The few matchers the tests use, on top of node:assert, so the tests read the
 * same as before and need no test framework.
 */

import assert from "node:assert/strict"

type Matchers = {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toContain(expected: unknown): void
  toStartWith(expected: string): void
  toHaveLength(expected: number): void
  toBeDefined(): void
  toBeUndefined(): void
  toBeLessThan(expected: number): void
  toMatchObject(expected: Record<string, unknown>): void
  toThrow(expected?: string | RegExp): void
}

export function expect(actual: unknown): Matchers & { not: Pick<Matchers, "toContain"> } {
  return {
    toBe: (expected) => assert.equal(actual, expected),
    toEqual: (expected) => assert.deepEqual(actual, expected),
    toContain: (expected) => assert.ok(contains(actual, expected), `expected ${show(actual)} to contain ${show(expected)}`),
    toStartWith: (expected) => {
      assert.equal(typeof actual, "string")
      assert.ok((actual as string).startsWith(expected), `expected ${show(actual)} to start with ${show(expected)}`)
    },
    toHaveLength: (expected) => assert.equal((actual as { length: number }).length, expected),
    toBeDefined: () => assert.notEqual(actual, undefined),
    toBeUndefined: () => assert.equal(actual, undefined),
    toBeLessThan: (expected) => assert.ok((actual as number) < expected, `expected ${show(actual)} < ${expected}`),
    toMatchObject: (expected) => {
      for (const [key, value] of Object.entries(expected)) {
        assert.deepEqual((actual as Record<string, unknown>)[key], value)
      }
    },
    toThrow: (expected) => {
      if (expected === undefined) assert.throws(actual as () => unknown)
      else assert.throws(actual as () => unknown, (error: Error) => matches(error.message, expected))
    },
    not: {
      toContain: (expected) => assert.ok(!contains(actual, expected), `expected ${show(actual)} not to contain ${show(expected)}`),
    },
  }
}

function contains(actual: unknown, expected: unknown): boolean {
  if (typeof actual === "string") return actual.includes(String(expected))
  if (Array.isArray(actual)) return actual.some((item) => isDeepEqual(item, expected))
  return false
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  try {
    assert.deepEqual(a, b)
    return true
  } catch {
    return false
  }
}

function matches(message: string, expected: string | RegExp): boolean {
  return typeof expected === "string" ? message.includes(expected) : expected.test(message)
}

function show(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value, null, 0)
}
