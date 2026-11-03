/**
 * A minimal template engine. No logic in templates: values, each, if, unless
 * and partials. Derived values come from the page's `prepare` function.
 *
 *   {{ path }}        escaped value
 *   {{{ path }}}      raw value, only for inline-markdown output
 *   {{#each list}} {{ @index }} {{ @first }} {{ @last }} {{/each}}
 *   {{#if path}} … {{else}} … {{/if}}, and {{#unless path}} … {{/unless}}
 *   {{> name }}       a partial
 */

type Node =
  | { kind: "text"; text: string }
  | { kind: "value"; path: string; raw: boolean }
  | { kind: "partial"; name: string; line: number }
  | { kind: "block"; tag: "each" | "if" | "unless"; path: string; body: Node[]; otherwise: Node[] }

const TAG = /\{\{\{\s*([\w.@]+)\s*\}\}\}|\{\{\s*(#each|#if|#unless|\/each|\/if|\/unless|else|>)?\s*([\w.@-]*)\s*\}\}/g

export class TemplateError extends Error {}

export function compile(source: string, name = "template"): Node[] {
  const root: Node[] = []
  type Open = { tag: "each" | "if" | "unless"; node: Extract<Node, { kind: "block" }>; line: number; inElse: boolean }
  const stack: Open[] = []
  const target = () => {
    const top = stack.at(-1)
    if (!top) return root
    return top.inElse ? top.node.otherwise : top.node.body
  }
  const lineAt = (offset: number) => source.slice(0, offset).split("\n").length
  let last = 0
  for (const match of source.matchAll(TAG)) {
    const offset = match.index
    if (offset > last) target().push({ kind: "text", text: source.slice(last, offset) })
    last = offset + match[0].length
    const [, rawPath, tag, path] = match
    if (rawPath !== undefined) {
      target().push({ kind: "value", path: rawPath, raw: true })
    } else if (tag === undefined) {
      if (path === "") throw new TemplateError(`${name}:${lineAt(offset)}: empty tag`)
      target().push({ kind: "value", path, raw: false })
    } else if (tag === ">") {
      target().push({ kind: "partial", name: path, line: lineAt(offset) })
    } else if (tag === "else") {
      const top = stack.at(-1)
      if (!top || top.tag === "each" || top.inElse) throw new TemplateError(`${name}:${lineAt(offset)}: else outside an if or unless`)
      top.inElse = true
    } else if (tag.startsWith("#")) {
      const blockTag = tag === "#each" ? "each" : tag === "#if" ? "if" : "unless"
      const node: Extract<Node, { kind: "block" }> = { kind: "block", tag: blockTag, path, body: [], otherwise: [] }
      target().push(node)
      stack.push({ tag: blockTag, node, line: lineAt(offset), inElse: false })
    } else {
      const top = stack.pop()
      if (!top || `/${top.tag}` !== tag) {
        throw new TemplateError(`${name}:${lineAt(offset)}: {{${tag}}} closes ${top ? `{{#${top.tag}}} from line ${top.line}` : "nothing"}`)
      }
    }
  }
  const open = stack.at(-1)
  if (open) throw new TemplateError(`${name}:${open.line}: {{#${open.tag}}} is not closed`)
  if (last < source.length) root.push({ kind: "text", text: source.slice(last) })
  return root
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

type Scope = { data: unknown; meta: Record<string, unknown> }

function lookup(scopes: Scope[], path: string): unknown {
  const top = scopes.at(-1)
  if (path === "this" || path === ".") return top?.data
  if (path.startsWith("@")) return top?.meta[path.slice(1)]
  const [head, ...rest] = path.split(".")
  for (let index = scopes.length - 1; index >= 0; index--) {
    const data = scopes[index].data
    if (typeof data === "object" && data !== null && head in data) {
      let value: unknown = Reflect.get(data, head)
      for (const key of rest) value = typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined
      return value
    }
  }
  return undefined
}

function truthy(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value)
}

export function render(nodes: Node[], data: unknown, partials: Record<string, Node[]> = {}): string {
  const walk = (list: Node[], scopes: Scope[]): string =>
    list
      .map((node) => {
        switch (node.kind) {
          case "text":
            return node.text
          case "value": {
            const value = lookup(scopes, node.path)
            const shown = value === undefined || value === null || value === false ? "" : String(value)
            return node.raw ? shown : escapeHtml(shown)
          }
          case "partial": {
            const partial = partials[node.name]
            if (!partial) throw new TemplateError(`line ${node.line}: no partial "${node.name}"`)
            return walk(partial, scopes)
          }
          case "block": {
            const value = lookup(scopes, node.path)
            if (node.tag === "each") {
              if (!Array.isArray(value)) return ""
              return value
                .map((item, index) =>
                  walk(node.body, [...scopes, { data: item, meta: { index, first: index === 0, last: index === value.length - 1 } }]),
                )
                .join("")
            }
            const pass = node.tag === "if" ? truthy(value) : !truthy(value)
            return walk(pass ? node.body : node.otherwise, scopes)
          }
          default: {
            const unknownNode: never = node
            return unknownNode
          }
        }
      })
      .join("")
  return walk(nodes, [{ data, meta: {} }])
}
