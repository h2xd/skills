import { describe, test } from "node:test"
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect } from "../../../scripts/expect.ts"
import { build, hashOf, loadChain, renderPage } from "./build.ts"
import { checkForm, firstBadOffset, formatIssues, parseJson } from "./check.ts"
import { inlineMarkdown } from "./inline-markdown.ts"
import { PAGES, type PageType } from "./schema.ts"
import { CheckError } from "./shape.ts"
import { pageServer, urlsOf } from "./serve.ts"
import { spec, specMarkdown } from "./spec.ts"
import { compile, render } from "./template.ts"

const HERE = import.meta.dirname
const TYPES = Object.keys(PAGES).filter((type): type is PageType => type in PAGES)

/** The message the checker gives for a form, or "ok". */
function problems(form: unknown): string {
  try {
    checkForm(form)
    return "ok"
  } catch (error) {
    if (!(error instanceof CheckError)) throw error
    return formatIssues(error)
  }
}

function chainProblems(file: string): string {
  try {
    loadChain(file)
    return "ok"
  } catch (error) {
    if (!(error instanceof CheckError)) throw error
    return formatIssues(error)
  }
}

const checklist = (items: unknown[], extra = {}) => ({ t: "checklist", id: "c", title: "T", intro: "I", items, ...extra })
const item = (extra = {}) => ({ id: "C1", title: "Title", text: "Text", ...extra })
const grilling = (items: unknown[], extra = {}) => ({ t: "grilling", id: "g", title: "T", intro: "I", items, ...extra })
const questionnaire = (items: unknown[], extra = {}) => ({ t: "questionnaire", id: "q", title: "T", intro: "I", to: "A customer", purpose: "P", items, ...extra })
const ask = (extra = {}) => ({ id: "Q1", q: "Q?", ...extra })
const question = (extra = {}) => ({ id: "Q1", prio: "blocker", q: "Q?", why: "Why", opts: [["a", "A"], ["b", "B"]], ...extra })

/** A copy of the 3-round fixture in a temp folder, so a test can break it. */
function rounds(): string {
  const dir = mkdtempSync(join(tmpdir(), "to-page-"))
  cpSync(join(HERE, "fixtures", "rounds"), dir, { recursive: true })
  return dir
}

describe("the form check", () => {
  test("accepts both examples", () => {
    for (const type of TYPES) {
      expect(problems(JSON.parse(readFileSync(join(HERE, "types", type, "example.form.json"), "utf8")))).toBe("ok")
    }
  })

  test("names the item, the field, the expected shape and the signature", () => {
    expect(problems(checklist([item(), item({ id: "C3", q: ["x"], opts: ["a", "b"] })]))).toBe(
      'items[1] "C3" › q: must be a string, got an array.\n  Item {id, title, text, q?, opts?: Opt[], rec?, preselect?: boolean, block?, where?: Where[], note?}',
    )
  })

  test("rejects an unknown field, so a typo cannot vanish", () => {
    expect(problems(checklist([item({ titel: "x" })]))).toContain('items[0] "C1": unknown field "titel"')
  })

  test("reports every broken item, not only the first", () => {
    const message = problems(checklist([item({ title: 1 }), item({ id: "C2", text: "" })]))
    expect(message).toContain('items[0] "C1" › title: must be a string, got a number')
    expect(message).toContain('items[1] "C2" › text: must not be empty')
  })

  test("rejects an unknown page type", () => {
    expect(problems({ t: "survey" })).toBe('t: must be one of checklist, grilling, questionnaire, got "survey".')
  })

  test("rejects an id that cannot be a form field name", () => {
    expect(problems(checklist([item({ id: "C 1" })]))).toContain('must use only letters, digits, "_" and "-", got "C 1"')
  })

  test("rejects a duplicate item id", () => {
    expect(problems(checklist([item(), item()]))).toContain('items[1] "C1": id "C1" is already used by items[0]')
  })

  test("wants q and opts together on a checklist item", () => {
    expect(problems(checklist([item({ q: "Q?" })]))).toContain("q and opts come together")
  })

  test("rejects a duplicate option id", () => {
    expect(problems(checklist([item({ q: "Q?", opts: ["Yes", "Yes"] })]))).toContain('option id "Yes" is used twice')
  })

  test("wants rec to name an option", () => {
    expect(problems(grilling([question({ rec: "c" })]))).toContain('› rec: "c" is not an option id. Use one of "a", "b"')
  })

  test("wants rec before preselect", () => {
    expect(problems(grilling([question({ preselect: true })]))).toContain("› preselect: needs rec")
  })

  test("keeps the built-in option ids for the page", () => {
    expect(problems(grilling([question({ opts: [["dunno", "Hm"], ["b", "B"]] })]))).toContain('option id "dunno" is taken by the page')
  })

  test("wants 2 to 4 options on a question", () => {
    expect(problems(grilling([question({ opts: ["a"] })]))).toContain("› opts: must have 2 to 4 entries, got 1")
  })

  test("wants a known priority", () => {
    expect(problems(grilling([question({ prio: "urgent" })]))).toContain('must be one of blocker, important, nice, got "urgent"')
  })

  test("reads a bare string option as its own id and label", () => {
    const form = checkForm(checklist([item({ q: "Q?", opts: ["Keep", ["x", "Drop", "Saves space."]] })]))
    expect(form.items[0]).toMatchObject({ opts: [{ id: "Keep", label: "Keep" }, { id: "x", label: "Drop", reason: "Saves space." }] })
  })
})

describe("the questionnaire check", () => {
  test("accepts an open question with a guess, and a question with options", () => {
    expect(problems(questionnaire([ask({ guess: "G" }), ask({ id: "Q2", opts: ["a", "b"], rec: "a" })]))).toBe("ok")
  })

  test("wants the reader and the purpose", () => {
    expect(problems({ ...questionnaire([ask()]), to: undefined })).toContain('to: must be a string, got a undefined')
  })

  test("keeps the id of the Anything else field for the page", () => {
    expect(problems(questionnaire([ask({ id: "more" })]))).toContain('id "more" is taken')
  })

  test("allows a guess only on an open question", () => {
    expect(problems(questionnaire([ask({ opts: ["a", "b"], guess: "G" })]))).toContain("only an open question has a guess")
  })

  test("wants options before rec", () => {
    expect(problems(questionnaire([ask({ rec: "a" })]))).toContain("needs opts")
  })

  test("keeps the built-in option ids for the page", () => {
    expect(problems(questionnaire([ask({ opts: ["a", "other"] })]))).toContain('option id "other" is taken')
  })

  test("wants at most 12 questions in a round", () => {
    const items = Array.from({ length: 13 }, (_, index) => ask({ id: `Q${index + 1}` }))
    expect(problems(questionnaire(items))).toContain("must have 1 to 12 entries, got 13")
  })
})

describe("JSON errors", () => {
  const message = (source: string) => {
    try {
      parseJson(source)
      return "ok"
    } catch (error) {
      if (!(error instanceof CheckError)) throw error
      return formatIssues(error)
    }
  }

  test("give the line and column of the first bad character", () => {
    expect(message('{"t": "checklist",\n "id": }')).toBe('2:8: unexpected "}" in JSON.')
  })

  test("name a trailing comma", () => {
    expect(message('{"a": [1, 2,]}')).toBe('1:13: unexpected "]" in JSON. JSON allows no trailing comma.')
  })

  test("name a raw line break in a string", () => {
    expect(message('{"a": "x\ny"}')).toContain("raw line break or a bad escape")
  })

  test("name a file that ends early", () => {
    expect(message('{"a": [1')).toBe("JSON: the file ends before the JSON is complete.")
  })

  test("find no bad character in valid JSON", () => {
    const source = '{"a": [1, -2.5e3, true, null, "\\u00e9\\n"], "b": {}}'
    expect(firstBadOffset(source)).toBe(source.length)
  })
})

describe("the template engine", () => {
  test("escapes a value and writes a raw value as it is", () => {
    expect(render(compile("{{ a }}|{{{ a }}}"), { a: "<b>" })).toBe("&#60;b&#62;|<b>")
  })

  test("loops with @index, @first and @last, and reads the outer scope", () => {
    const out = render(compile("{{#each list}}{{ @index }}{{ this }}{{ sep }}{{#if @last}}!{{/if}}{{/each}}"), { list: ["a", "b"], sep: "," })
    expect(out).toBe("0a,1b,!")
  })

  test("takes if, else and unless, with an empty list as false", () => {
    const template = compile("{{#if list}}yes{{else}}no{{/if}}{{#unless list}}-{{/unless}}")
    expect(render(template, { list: [] })).toBe("no-")
    expect(render(template, { list: [1] })).toBe("yes")
  })

  test("renders a partial in the current scope", () => {
    expect(render(compile("{{#each list}}{{> row }}{{/each}}"), { list: [{ n: 1 }] }, { row: compile("<{{ n }}>") })).toBe("<1>")
  })

  test("names the line of a block that is not closed", () => {
    expect(() => compile("a\n{{#each list}}\nb", "page.html")).toThrow("page.html:2: {{#each}} is not closed")
  })

  test("names a block closed by the wrong tag", () => {
    expect(() => compile("{{#if a}}{{/each}}", "page.html")).toThrow("page.html:1: {{/each}} closes {{#if}} from line 1")
  })
})

describe("inline Markdown", () => {
  test("writes code, bold, links and line breaks, and escapes the rest", () => {
    expect(inlineMarkdown("`<a>` **b** [c](/d) <i>\nx")).toBe('<code>&#60;a&#62;</code> <strong>b</strong> <a href="/d">c</a> &#60;i&#62;<br>x')
  })

  test("leaves a javascript link as text", () => {
    expect(inlineMarkdown("[x](javascript:alert(1))")).not.toContain("<a")
  })
})

describe("the spec", () => {
  test("fits in 30 lines for every type", () => {
    for (const type of TYPES) expect(spec(type).split("\n").length).toBeLessThan(31)
  })

  test("has an example that passes the check", () => {
    for (const type of TYPES) {
      const example = spec(type).split("Example:\n")[1]
      expect(problems(JSON.parse(example))).toBe("ok")
    }
  })

  test("matches spec.md, so the skill reads the current spec", () => {
    expect(readFileSync(join(HERE, "..", "spec.md"), "utf8")).toBe(specMarkdown())
  })
})

describe("the page", () => {
  test("matches the golden file for every type. Run with UPDATE_GOLDEN=1 to accept a change", () => {
    for (const type of TYPES) {
      const html = renderPage(loadChain(join(HERE, "types", type, "example.form.json")))
      const golden = join(HERE, "types", type, "example.html")
      if (process.env.UPDATE_GOLDEN) writeFileSync(golden, html)
      expect(html).toBe(readFileSync(golden, "utf8"))
    }
  })

  test("loads nothing from outside the file", () => {
    for (const type of TYPES) {
      const html = renderPage(loadChain(join(HERE, "types", type, "example.form.json")))
      for (const pattern of [/<script[^>]*\ssrc=/, /<link[^>]*rel=/, /@import/, /url\(\s*['"]?https?:/]) {
        expect(pattern.test(html)).toBe(false)
      }
    }
  })

  test("stays inside the size budgets", () => {
    const html = renderPage(loadChain(join(HERE, "types", "checklist", "example.form.json")))
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ""
    expect(Buffer.byteLength(script)).toBeLessThan(4 * 1024 + 1)
    expect(Buffer.byteLength(readFileSync(join(HERE, "assets", "base.css")))).toBeLessThan(6 * 1024 + 1)
    expect(Buffer.byteLength(html)).toBeLessThan(40 * 1024 + 1)
  })

  test("keeps the agent's files small: the 15-item form and its answers", () => {
    expect(readFileSync(join(HERE, "types", "checklist", "example.form.json"), "utf8").length).toBeLessThan(4001)
    expect(readFileSync(join(HERE, "types", "checklist", "example.answers.json"), "utf8").length).toBeLessThan(1001)
  })

  test("puts the form hash in the page, for the answers file", () => {
    const file = join(HERE, "types", "grilling", "example.form.json")
    expect(renderPage(loadChain(file))).toContain(`"form":"${hashOf(readFileSync(file, "utf8"))}"`)
  })

  test("puts each theme once, an open answer field per open question, and Anything else at the end", () => {
    const html = renderPage(loadChain(join(HERE, "types", "questionnaire", "example.form.json")))
    expect(html.match(/<h2 class="theme">/g)?.length).toBe(3)
    expect(html).toContain('<textarea name="Q2.note" rows="2" placeholder="Your answer" data-done></textarea>')
    expect(html).toContain('name="Q1.pick" value="dunno"')
    expect(html).toContain('name="more.note"')
  })

  test("never puts form text into the page as HTML", () => {
    const html = renderPage([{ name: "x", file: "x.form.json", hash: "0", form: checkForm(checklist([item({ title: "<script>alert(1)</script>" })])) }])
    expect(html).not.toContain("<script>alert")
  })
})

describe("rounds", () => {
  test("render round 3 with rounds 1 and 2 folded, and the answers each question builds on", () => {
    const dir = rounds()
    const html = readFileSync(build(join(dir, "round-3.form.json")), "utf8")
    expect(html).toContain("<summary>CSV export · Round 1</summary>")
    expect(html).toContain("<summary>CSV export · Round 2</summary>")
    expect(html).toContain('Builds on <b>Q5</b>: How long does a download link stay valid? <span class="answer">7 days</span>')
    expect(html).toContain("Round 3")
  })

  test("fold an earlier questionnaire round and show an open answer as the answer", () => {
    const dir = mkdtempSync(join(tmpdir(), "to-page-"))
    const first = JSON.stringify(questionnaire([ask({ q: "Where do users get stuck?" })]))
    writeFileSync(join(dir, "round-1.form.json"), first)
    writeFileSync(join(dir, "round-1.answers.json"), JSON.stringify({ t: "questionnaire", id: "q", form: hashOf(first), saved: "now", answers: { Q1: { note: "At the calendar step" } } }))
    writeFileSync(join(dir, "round-2.form.json"), JSON.stringify(questionnaire([ask({ id: "Q2" })], { previous: "round-1" })))
    const html = readFileSync(build(join(dir, "round-2.form.json")), "utf8")
    expect(html).toContain("Where do users get stuck?<br><b>At the calendar step</b></li>")
    rmSync(dir, { recursive: true })
  })

  test("reject an id that an earlier round used", () => {
    const dir = rounds()
    const file = join(dir, "round-3.form.json")
    writeFileSync(file, readFileSync(file, "utf8").replace('"id":"Q7"', '"id":"Q2"').replace('"depends":["Q5","Q2"]', '"depends":["Q5"]'))
    expect(chainProblems(file)).toContain('round-3.form.json: items[0] "Q2": id "Q2" is already used in round-1.form.json')
  })

  test("reject a missing answers file", () => {
    const dir = rounds()
    const file = join(dir, "round-3.form.json")
    rmSync(join(dir, "round-2.answers.json"))
    expect(chainProblems(file)).toBe('round-3.form.json: previous "round-2": round-2.answers.json is missing. The user did not save round-2.')
  })

  test("reject a form that changed after its answers were saved", () => {
    const dir = rounds()
    const earlier = join(dir, "round-1.form.json")
    writeFileSync(earlier, readFileSync(earlier, "utf8").replace("Who may export?", "Who can export?"))
    expect(chainProblems(join(dir, "round-3.form.json"))).toContain(
      'round-2.form.json: previous "round-1": round-1.form.json changed after round-1.answers.json was saved',
    )
  })

  test("reject depends on an id no round has", () => {
    const dir = rounds()
    const file = join(dir, "round-3.form.json")
    writeFileSync(file, readFileSync(file, "utf8").replace('"Q2"]', '"Q9"]'))
    expect(chainProblems(file)).toContain('"Q9" is not an item id in this round or an earlier one')
  })

  test("reject a cycle", () => {
    const dir = rounds()
    const file = join(dir, "round-1.form.json")
    writeFileSync(file, readFileSync(file, "utf8").replace('"id":"example-export"', '"id":"example-export","previous":"round-1"'))
    expect(chainProblems(file)).toContain('previous makes a cycle at "round-1"')
  })
})

describe("the CLI", () => {
  const cli = (...args: string[]) => {
    try {
      return { code: 0, out: execFileSync(process.execPath, [join(HERE, "to-page.ts"), ...args], { encoding: "utf8", stdio: "pipe" }) }
    } catch (error) {
      const failed = error instanceof Error && "status" in error && "stderr" in error ? error : undefined
      return { code: Number(failed?.status), out: String(failed?.stderr) }
    }
  }

  test("renders a form and prints the file URL of the page", () => {
    const dir = rounds()
    const result = cli("render", join(dir, "round-1.form.json"))
    expect(result.code).toBe(0)
    expect(result.out).toStartWith("file://")
    expect(existsSync(join(dir, "round-1.html"))).toBe(true)
  })

  test("writes no page for a broken form and exits 1", () => {
    const dir = rounds()
    const file = join(dir, "round-1.form.json")
    writeFileSync(file, readFileSync(file, "utf8").replace('"prio":"nice"', '"prio":"later"'))
    const result = cli("render", file)
    expect(result.code).toBe(1)
    expect(result.out).toContain('round-1.form.json: items[3] "Q4" › prio: must be one of blocker, important, nice, got "later".')
    expect(existsSync(join(dir, "round-1.html"))).toBe(false)
  })

  test("wants the .form.json suffix", () => {
    expect(cli("check", join(HERE, "spec.ts")).out).toContain('the file name must end with ".form.json"')
  })
})

describe("the server", () => {
  /** Starts a server on a free port for `round-1` of a fresh chain, and stops it after `run`. */
  const withServer = async (run: (base: string, dir: string) => Promise<void>) => {
    const dir = rounds()
    rmSync(join(dir, "round-1.answers.json"))
    build(join(dir, "round-1.form.json"))
    const server = pageServer(dir, "round-1.html")
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
    const address = server.address()
    if (address === null || typeof address === "string") throw new Error("no port")
    try {
      await run(`http://127.0.0.1:${address.port}`, dir)
    } finally {
      server.close()
    }
  }
  const post = (url: string, body: string) => fetch(url, { method: "POST", body })
  const answers = (dir: string) => JSON.stringify({ t: "grilling", id: "example-export", form: hashOf(readFileSync(join(dir, "round-1.form.json"), "utf8")), saved: "2030-01-15T10:00:00.000Z", answers: { Q1: { pick: "b" } } })

  test("sends / to the page and serves it", async () => {
    await withServer(async (base) => {
      const response = await fetch(`${base}/`)
      expect(response.url).toBe(`${base}/round-1.html`)
      expect(await response.text()).toContain('<form id="page"')
    })
  })

  test("serves only the pages, not the forms or files outside the folder", async () => {
    await withServer(async (base) => {
      expect((await fetch(`${base}/round-1.form.json`)).status).toBe(404)
      expect((await fetch(`${base}/..%2Fround-1.html`)).status).toBe(404)
    })
  })

  test("writes posted answers next to the form and returns the path", async () => {
    await withServer(async (base, dir) => {
      const response = await post(`${base}/round-1.answers.json`, answers(dir))
      expect(response.status).toBe(200)
      expect((await response.json()).path).toBe(join(dir, "round-1.answers.json"))
      expect(readFileSync(join(dir, "round-1.answers.json"), "utf8")).toBe(answers(dir))
    })
  })

  test("refuses answers for a form that changed, or that are not answers", async () => {
    await withServer(async (base, dir) => {
      const stale = answers(dir)
      const form = join(dir, "round-1.form.json")
      writeFileSync(form, readFileSync(form, "utf8").replace("Who may export?", "Who can export?"))
      expect((await post(`${base}/round-1.answers.json`, stale)).status).toBe(409)
      expect((await post(`${base}/round-1.answers.json`, "[1]")).status).toBe(400)
      expect((await post(`${base}/round-9.answers.json`, stale)).status).toBe(404)
      expect(existsSync(join(dir, "round-1.answers.json"))).toBe(false)
    })
  })

  test("lists one URL per network address when it listens on all of them", () => {
    expect(urlsOf("127.0.0.1", 8080, "/a/round-1.html")).toEqual(["http://127.0.0.1:8080/round-1.html"])
    expect(urlsOf("0.0.0.0", 8080, "/a/round-1.html")).toContain("http://127.0.0.1:8080/round-1.html")
  })
})
