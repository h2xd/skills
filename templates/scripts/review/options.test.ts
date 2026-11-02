import { describe, test } from "node:test"
import { expect } from "../../../scripts/expect.ts"
import {
  formatChoiceLine,
  formatOptionsLine,
  parseChoice,
  parseOptions,
  validateChoiceBlock,
  validateDraftComments,
} from "./options.ts"

describe("validateDraftComments", () => {
  test("prefixes each problem with path:line", () => {
    const problems = validateDraftComments([
      { path: "a.ts", line: 3, body: TWO },
      { path: "b.ts", line: 9, body: TWO.replace(" (recommended)", "") },
    ])
    expect(problems).toEqual(["b.ts:9: option A must be marked (recommended)"])
  })
})

const THREE = [
  "suggestion (non-blocking): name it",
  "",
  "- Suggestion A (recommended): rename to `count`",
  "- Suggestion B: rename to `total`",
  "- Suggestion C: leave it",
  "",
  "Note: Reply with A, B, or C. If you reply with nothing Suggestion A will be used.",
  "",
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
].join("\n")

const TWO = [
  "- Suggestion A (recommended): one",
  "- Suggestion B: two",
  "",
  "Note: Reply with A or B. If you reply with nothing Suggestion A will be used.",
].join("\n")

describe("parseOptions", () => {
  test("reads letters, the recommended mark and the fix", () => {
    expect(parseOptions(THREE)).toEqual([
      { letter: "A", recommended: true, fix: "rename to `count`" },
      { letter: "B", recommended: false, fix: "rename to `total`" },
      { letter: "C", recommended: false, fix: "leave it" },
    ])
  })

  test("returns nothing for a comment without a block", () => {
    expect(parseOptions("nitpick: spacing")).toEqual([])
  })
})

describe("parseChoice", () => {
  const first = { login: "reviewer", body: THREE }

  test("is undefined without options", () => {
    expect(parseChoice([{ login: "reviewer", body: "plain" }])).toBeUndefined()
    expect(parseChoice([])).toBeUndefined()
  })

  test("defaults to A when nobody replied", () => {
    expect(parseChoice([first])).toEqual({ letter: "A", source: "default" })
  })

  test("reads a bare letter, with period, with the word Suggestion, any case", () => {
    for (const reply of [
      "B",
      "b.",
      "Suggestion B",
      "suggestion b.",
      "  B  \nthanks",
    ]) {
      expect(parseChoice([first, { login: "dev", body: reply }])).toEqual({
        letter: "B",
        source: "reply",
        login: "dev",
      })
    }
  })

  test("a reply without a valid letter sends the item to normal triage", () => {
    const choice = parseChoice([
      first,
      { login: "dev", body: "I think B is better" },
      { login: "dev", body: "D" },
      { login: "reviewer", body: "C" },
    ])
    expect(choice).toEqual({ source: "no-letter", login: "dev" })
  })

  test("the author's own replies don't count as a reply", () => {
    const choice = parseChoice([first, { login: "reviewer", body: "C" }])
    expect(choice).toEqual({ letter: "A", source: "default" })
  })

  test("the latest pick wins", () => {
    const choice = parseChoice([
      first,
      { login: "dev", body: "B" },
      { login: "other", body: "C" },
    ])
    expect(choice).toEqual({ letter: "C", source: "reply", login: "other" })
  })

  test("a two-option block rejects C", () => {
    const choice = parseChoice([
      { login: "reviewer", body: TWO },
      { login: "dev", body: "C" },
    ])
    expect(choice).toEqual({ source: "no-letter", login: "dev" })
  })
})

describe("formatters", () => {
  test("options line marks the recommendation", () => {
    expect(formatOptionsLine(parseOptions(THREE))).toBe("A (recommended), B, C")
  })

  test("choice line names the source", () => {
    expect(
      formatChoiceLine({ letter: "B", source: "reply", login: "dev" }),
    ).toBe("B (replied by dev)")
    expect(formatChoiceLine({ letter: "A", source: "default" })).toBe(
      "A (default, no reply)",
    )
    expect(formatChoiceLine({ source: "no-letter", login: "dev" })).toBe(
      "none (dev replied without a letter, triage as usual)",
    )
  })
})

describe("validateChoiceBlock", () => {
  test("accepts comments without a block and exact blocks", () => {
    expect(validateChoiceBlock("nitpick: x")).toEqual([])
    expect(validateChoiceBlock(THREE)).toEqual([])
    expect(validateChoiceBlock(TWO)).toEqual([])
  })

  test("rejects a wrong note for the option count", () => {
    const body = THREE.replace("A, B, or C", "A or B")
    expect(validateChoiceBlock(body)[0]).toContain("the note line must read")
  })

  test("rejects a missing note", () => {
    const body = TWO.split("\n").slice(0, 2).join("\n")
    expect(validateChoiceBlock(body)).toHaveLength(1)
  })

  test("rejects labels out of order", () => {
    const body = THREE.replace("Suggestion B:", "Suggestion C:").replace(
      "Suggestion C: leave",
      "Suggestion B: leave",
    )
    expect(validateChoiceBlock(body).join("\n")).toContain("option labels are")
  })

  test("rejects a missing or misplaced recommended mark", () => {
    const missing = validateChoiceBlock(TWO.replace(" (recommended)", ""))
    expect(missing).toContain("option A must be marked (recommended)")
    const extra = validateChoiceBlock(TWO.replace("B:", "B (recommended):"))
    expect(extra).toContain("option B must not be marked (recommended)")
  })

  test("rejects a single option and a malformed option line", () => {
    expect(
      validateChoiceBlock("- Suggestion A (recommended): only one").join("\n"),
    ).toContain("expected 2 or 3 options")
    expect(validateChoiceBlock("- Suggestion A recommended: x")[0]).toContain(
      "does not match",
    )
  })
})
