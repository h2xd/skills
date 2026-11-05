/**
 * The YAML subset frontmatter uses: block maps and lists, inline `[a, b]` and
 * `{ a: b }`, quoted and plain scalars, comments. Anything else throws, so a
 * page that needs more YAML fails the lint instead of parsing wrong. Dates stay
 * strings; `toDate` in docs/bundle.ts reads them.
 */

type Line = { indent: number; text: string }

export function parseYaml(source: string): unknown {
  const lines: Line[] = source
    .split("\n")
    .map(stripComment)
    .filter((line) => line.trim() !== "")
    .map((line) => ({ indent: line.length - line.trimStart().length, text: line.trim() }))
  if (lines.length === 0) return null
  let at = 0

  const isItem = (text: string) => text === "-" || text.startsWith("- ")

  function block(indent: number): unknown {
    return isItem(lines[at].text) ? list(indent) : map(indent)
  }

  function map(indent: number): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    while (at < lines.length && lines[at].indent === indent && !isItem(lines[at].text)) {
      const { key, rest } = splitKey(lines[at].text)
      if (key in out) throw new Error(`duplicate key "${key}"`)
      at++
      if (rest !== "") out[key] = inline(rest)
      else if (at < lines.length && lines[at].indent > indent) out[key] = block(lines[at].indent)
      else if (at < lines.length && lines[at].indent === indent && isItem(lines[at].text)) out[key] = list(indent)
      else out[key] = null
    }
    if (at < lines.length && lines[at].indent > indent) {
      throw new Error(`unexpected indentation at "${lines[at].text}"`)
    }
    return out
  }

  function list(indent: number): unknown[] {
    const out: unknown[] = []
    while (at < lines.length && lines[at].indent === indent && isItem(lines[at].text)) {
      const rest = lines[at].text.slice(1).trimStart()
      if (rest === "") {
        at++
        out.push(at < lines.length && lines[at].indent > indent ? block(lines[at].indent) : null)
      } else if (KEY.test(rest)) {
        const childIndent = indent + lines[at].text.length - rest.length
        lines[at] = { indent: childIndent, text: rest }
        out.push(map(childIndent))
      } else {
        at++
        out.push(inline(rest))
      }
    }
    return out
  }

  const value = block(lines[0].indent)
  if (at < lines.length) throw new Error(`unexpected line "${lines[at].text}"`)
  return value
}

const KEY = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s"'[\]{},#&*!|>%@`-][^:]*?|-[^\s:][^:]*?):(\s|$)/

function splitKey(text: string): { key: string; rest: string } {
  const match = text.match(KEY)
  if (!match) throw new Error(`expected "key: value" at "${text}"`)
  const raw = match[1]
  const key = raw.startsWith('"') || raw.startsWith("'") ? (scalar(raw) as string) : raw.trim()
  return { key, rest: text.slice(match[0].length).trim() }
}

function inline(text: string): unknown {
  if (text.startsWith("[") || text.startsWith("{")) {
    const reader = new FlowReader(text)
    const value = reader.value()
    reader.end()
    return value
  }
  if (/^[&*!|>%@`]/.test(text)) throw new Error(`unsupported YAML at "${text}"`)
  if (!text.startsWith('"') && !text.startsWith("'") && /:(\s|$)/.test(text)) {
    throw new Error(`a plain value cannot hold ": ", quote it: "${text}"`)
  }
  return scalar(text)
}

function scalar(text: string): unknown {
  if (text.startsWith('"')) {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(text)) throw new Error(`unterminated string ${text}`)
    return JSON.parse(text)
  }
  if (text.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(text)) throw new Error(`unterminated string ${text}`)
    return text.slice(1, -1).replace(/''/g, "'")
  }
  if (/^(true|True|TRUE)$/.test(text)) return true
  if (/^(false|False|FALSE)$/.test(text)) return false
  if (/^(null|Null|NULL|~)$/.test(text)) return null
  if (/^[-+]?\d+$/.test(text)) return Number(text)
  if (/^[-+]?(\d+\.\d*|\.\d+)([eE][-+]?\d+)?$/.test(text)) return Number(text)
  return text
}

/** Drops a `#` comment that starts a line or follows a space, outside quotes. */
function stripComment(line: string): string {
  let quote = ""
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (quote) {
      if (char === "\\" && quote === '"') i++
      else if (char === quote) quote = ""
    } else if (char === '"' || char === "'") {
      if (i === 0 || /[\s:[{,-]/.test(line[i - 1])) quote = char
    } else if (char === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i)
    }
  }
  return line
}

class FlowReader {
  private at = 0
  private readonly text: string

  constructor(text: string) {
    this.text = text
  }

  value(): unknown {
    this.space()
    const char = this.text[this.at]
    if (char === "[") return this.sequence()
    if (char === "{") return this.mapping()
    if (char === '"' || char === "'") return scalar(this.quoted())
    return scalar(this.plain())
  }

  end(): void {
    this.space()
    if (this.at !== this.text.length) throw new Error(`unexpected "${this.text.slice(this.at)}"`)
  }

  private sequence(): unknown[] {
    const out: unknown[] = []
    this.at++
    this.space()
    if (this.text[this.at] === "]") {
      this.at++
      return out
    }
    for (;;) {
      out.push(this.value())
      this.space()
      const char = this.text[this.at++]
      if (char === "]") return out
      if (char !== ",") throw new Error(`expected "," or "]" in ${this.text}`)
    }
  }

  private mapping(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    this.at++
    this.space()
    if (this.text[this.at] === "}") {
      this.at++
      return out
    }
    for (;;) {
      this.space()
      const char = this.text[this.at]
      const key = char === '"' || char === "'" ? String(scalar(this.quoted())) : this.plain(true)
      this.space()
      if (this.text[this.at++] !== ":") throw new Error(`expected ":" in ${this.text}`)
      out[key] = this.value()
      this.space()
      const next = this.text[this.at++]
      if (next === "}") return out
      if (next !== ",") throw new Error(`expected "," or "}" in ${this.text}`)
    }
  }

  private quoted(): string {
    const quote = this.text[this.at]
    const start = this.at++
    while (this.at < this.text.length) {
      const char = this.text[this.at++]
      if (quote === '"' && char === "\\") this.at++
      else if (char === quote) {
        if (quote === "'" && this.text[this.at] === "'") this.at++
        else return this.text.slice(start, this.at)
      }
    }
    throw new Error(`unterminated string in ${this.text}`)
  }

  private plain(key = false): string {
    const start = this.at
    while (this.at < this.text.length) {
      const char = this.text[this.at]
      if (char === "," || char === "]" || char === "}") break
      if (key && char === ":") break
      this.at++
    }
    const value = this.text.slice(start, this.at).trim()
    if (value === "") throw new Error(`empty value in ${this.text}`)
    return value
  }

  private space(): void {
    while (/\s/.test(this.text[this.at] ?? "")) this.at++
  }
}
