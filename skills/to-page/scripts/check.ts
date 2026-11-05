/**
 * Reads a form file into a typed form: JSON.parse, the shape of its page
 * type, then the rules a shape cannot express. Every problem is a CheckError
 * that names the item, the field and the expected signature.
 */

import { BUILT_IN_PICKS, isPageType, MORE, PAGES, type Form, type Option } from "./schema.ts"
import { CheckError, type Issue } from "./shape.ts"

/** Line and column of a character offset, both counted from 1. */
export function lineAndColumn(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, offset)
  const line = before.split("\n").length
  return { line, column: offset - before.lastIndexOf("\n") }
}

export function parseJson(source: string): unknown {
  try {
    return JSON.parse(source)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    const offset = firstBadOffset(source)
    if (offset === source.length) throw new CheckError([{ where: "JSON", message: "the file ends before the JSON is complete" }])
    const { line, column } = lineAndColumn(source, offset)
    const char = source[offset]
    const hint =
      char === '"' ? ". The string has a raw line break or a bad escape. Write \\n for a line break"
      : /[}\]]/.test(char) && /,\s*$/.test(source.slice(0, offset)) ? ". JSON allows no trailing comma"
      : ""
    throw new CheckError([{ where: `${line}:${column}`, message: `unexpected ${JSON.stringify(char)} in JSON${hint}` }])
  }
}

/**
 * The offset of the first character that breaks the JSON grammar, or the
 * length of the source when it ends early. V8's message text changes between
 * versions, so the tool finds the offset itself.
 */
export function firstBadOffset(source: string): number {
  let at = 0
  const space = () => {
    while (/[ \t\n\r]/.test(source[at] ?? "")) at++
  }
  const match = (pattern: RegExp) => {
    pattern.lastIndex = at
    const found = pattern.exec(source)
    if (!found) throw at
    at += found[0].length
  }
  const string = () => match(/"(?:[^"\\\u0000-\u001f]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*"/y)
  const value = (): void => {
    space()
    const char = source[at]
    if (char === "{" || char === "[") {
      const close = char === "{" ? "}" : "]"
      at++
      space()
      if (source[at] === close) return void at++
      for (;;) {
        if (close === "}") {
          space()
          if (source[at] !== '"') throw at
          string()
          space()
          if (source[at] !== ":") throw at
          at++
        }
        value()
        space()
        if (source[at] === ",") at++
        else if (source[at] === close) return void at++
        else throw at
      }
    }
    if (char === '"') return string()
    match(/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/y)
  }
  try {
    value()
    space()
    return at
  } catch (offset) {
    if (typeof offset !== "number") throw offset
    return Math.min(offset, source.length)
  }
}

export function checkForm(value: unknown): Form {
  const type = typeof value === "object" && value !== null && "t" in value ? value.t : undefined
  if (!isPageType(type)) {
    const types = Object.keys(PAGES).join(", ")
    throw new CheckError([{ where: "t", message: `must be one of ${types}, got ${JSON.stringify(type)}` }])
  }
  const form: Form = PAGES[type].parse(value, { where: "" })
  const issues = ruleIssues(form)
  if (issues.length > 0) throw new CheckError(issues)
  return form
}

type CheckedItem = { id: string; q?: string; opts?: Option[]; rec?: string; preselect?: boolean; guess?: string }

function ruleIssues(form: Form): Issue[] {
  const issues: Issue[] = []
  const items: CheckedItem[] = form.t === "decision" ? form.items.map((item) => ({ ...item, opts: item.options })) : form.items
  const seen = new Map<string, number>()
  items.forEach((item, index) => {
    const where = `items[${index}] "${item.id}"`
    const first = seen.get(item.id)
    if (first !== undefined) issues.push({ where, message: `id "${item.id}" is already used by items[${first}]` })
    else seen.set(item.id, index)

    if (form.t === "checklist" && (item.q === undefined) !== (item.opts === undefined)) {
      issues.push({ where, message: "q and opts come together. Set both, or neither" })
    }
    const optionIds = (item.opts ?? []).map((option) => option.id)
    const duplicate = optionIds.find((optionId, at) => optionIds.indexOf(optionId) !== at)
    if (duplicate !== undefined) issues.push({ where: `${where} › opts`, message: `option id "${duplicate}" is used twice` })
    if (form.t === "questionnaire") {
      if (item.id === MORE) issues.push({ where, message: `id "${MORE}" is taken by the page's "Anything else?" field. Use another id` })
      if (item.opts !== undefined && item.guess !== undefined) {
        issues.push({ where: `${where} › guess`, message: "only an open question has a guess. Remove guess, or remove opts" })
      }
    }
    if (form.t === "decision") {
      const { drivers, options, reason } = form.items[index]
      if (reason !== undefined && item.rec === undefined) issues.push({ where: `${where} › reason`, message: "needs rec, the option it gives the reason for" })
      options.forEach((option, at) => {
        if (option.scores.length !== drivers.length) {
          issues.push({
            where: `${where} › options[${at}] "${option.id}" › scores`,
            message: `needs one score per driver, ${drivers.length}, got ${option.scores.length}`,
          })
        }
      })
    }
    if (form.t !== "checklist") {
      for (const taken of optionIds.filter((optionId) => optionId in BUILT_IN_PICKS)) {
        issues.push({ where: `${where} › opts`, message: `option id "${taken}" is taken by the page. Use another id` })
      }
    }
    if (item.rec !== undefined && item.opts === undefined) {
      issues.push({ where: `${where} › rec`, message: "needs opts. An open question has no option to recommend" })
    } else if (item.rec !== undefined && !optionIds.includes(item.rec)) {
      issues.push({ where: `${where} › rec`, message: `"${item.rec}" is not an option id. Use one of ${optionIds.map((o) => `"${o}"`).join(", ")}` })
    }
    if (item.preselect && item.rec === undefined) {
      issues.push({ where: `${where} › preselect`, message: "needs rec, the option to preselect" })
    }
  })
  return issues
}

/** One line per issue, with the signature of the record it sits in. */
export function formatIssues(error: CheckError): string {
  return error.issues
    .map((issue) => {
      const head = `${issue.where}: ${issue.message}.`
      return issue.signature ? `${head}\n  ${issue.signature}` : head
    })
    .join("\n")
}
