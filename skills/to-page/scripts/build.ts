/**
 * Builds one page: check the form, load the earlier rounds, prepare the view,
 * render the template and inline the CSS and JS into one HTML file. Nothing
 * is written when a check fails.
 */

import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { checkForm, parseJson } from "./check.ts"
import { BUILT_IN_PICKS, MORE, type ChecklistForm, type DecisionForm, type Form, type GrillingForm, type Option, type QuestionnaireForm } from "./schema.ts"
import { CheckError, type Issue } from "./shape.ts"
import { compile, render } from "./template.ts"
import { inlineMarkdown } from "./inline-markdown.ts"

const HERE = import.meta.dirname
const SUFFIX = ".form.json"

/** `pick` is a list only on a decision with `multi: true`. */
export type Answer = { done?: boolean; pick?: string | string[]; note?: string }
export type Answers = { t: string; id: string; form: string; saved: string; answers: Record<string, Answer> }

/** One round of the chain, earliest first. Only the last round may have no answers yet. */
export type Round = { name: string; file: string; form: Form; hash: string; answers?: Answers }

export function hashOf(source: string): string {
  return createHash("sha256").update(source).digest("hex").slice(0, 12)
}

/** `dir/round-1.form.json` → the paths of its page and answers, and its round name. */
export function pathsOf(file: string): { name: string; html: string; answers: string } {
  if (!file.endsWith(SUFFIX)) {
    throw new CheckError([{ where: basename(file), message: `the file name must end with "${SUFFIX}", such as round-1${SUFFIX}` }])
  }
  const stem = file.slice(0, -SUFFIX.length)
  return { name: basename(stem), html: `${stem}.html`, answers: `${stem}.answers.json` }
}

const field = (source: object, key: string): unknown => Reflect.get(source, key)

export function parseAnswers(value: unknown, where: string): Answers {
  const fail = (message: string): never => {
    throw new CheckError([{ where, message }])
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fail("must be a JSON object")
  const [t, id, form, saved, answers] = ["t", "id", "form", "saved", "answers"].map((key) => field(value, key))
  if (typeof t !== "string" || typeof id !== "string" || typeof form !== "string" || typeof saved !== "string") {
    return fail('needs the string fields "t", "id", "form" and "saved"')
  }
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return fail('needs an "answers" object')
  const parsed: Record<string, Answer> = {}
  for (const [key, entry] of Object.entries(answers)) {
    if (typeof entry !== "object" || entry === null) return fail(`answer "${key}" must be an object`)
    const [done, pick, note] = ["done", "pick", "note"].map((key) => field(entry, key))
    const picks = Array.isArray(pick) ? pick.filter((entry): entry is string => typeof entry === "string") : undefined
    parsed[key] = {
      ...(done === true ? { done } : {}),
      ...(typeof pick === "string" ? { pick } : picks !== undefined && picks.length > 0 ? { pick: picks } : {}),
      ...(typeof note === "string" ? { note } : {}),
    }
  }
  return { t, id, form, saved, answers: parsed }
}

/** Reads a form file and every round before it. Throws a CheckError naming the file. */
export function loadChain(file: string): Round[] {
  const rounds: Round[] = []
  const seen = new Set<string>()
  let current: string | undefined = file
  while (current !== undefined) {
    const { name, answers: answersFile } = pathsOf(current)
    if (seen.has(name)) throw new CheckError([{ where: basename(file), message: `previous makes a cycle at "${name}"` }])
    seen.add(name)
    if (!existsSync(current)) throw new CheckError([{ where: basename(current), message: "the file does not exist" }])
    const source: string = readFileSync(current, "utf8")
    const form: Form = withFile(basename(current), () => checkForm(parseJson(source)))
    const hash = hashOf(source)
    const round: Round = { name, file: current, form, hash }
    if (rounds.length > 0) {
      const later = basename(rounds[0].file)
      if (!existsSync(answersFile)) {
        throw new CheckError([{ where: `${later}: previous "${name}"`, message: `${basename(answersFile)} is missing. The user did not save ${name}` }])
      }
      const answers = withFile(basename(answersFile), () => parseAnswers(parseJson(readFileSync(answersFile, "utf8")), "top level"))
      if (answers.form !== hash) {
        throw new CheckError([{
          where: `${later}: previous "${name}"`,
          message: `${basename(current)} changed after ${basename(answersFile)} was saved. Render ${name} again, or delete the answers file`,
        }])
      }
      round.answers = answers
    }
    rounds.unshift(round)
    current = (form.t === "grilling" || form.t === "questionnaire") && form.previous !== undefined ? join(dirname(current), `${form.previous}${SUFFIX}`) : undefined
  }
  chainIssues(rounds)
  return rounds
}

function withFile<T>(file: string, run: () => T): T {
  try {
    return run()
  } catch (error) {
    if (!(error instanceof CheckError)) throw error
    throw new CheckError(error.issues.map((issue) => ({ ...issue, where: prefix(file, issue.where) })))
  }
}

function prefix(file: string, where: string): string {
  if (/^\d+:\d+$/.test(where)) return `${file}:${where}`
  return where ? `${file}: ${where}` : file
}

/** Ids unique across the chain, one page type per chain, and depends that point back. */
function chainIssues(rounds: Round[]): void {
  const issues: Issue[] = []
  const owner = new Map<string, string>()
  const last = rounds[rounds.length - 1]
  for (const round of rounds) {
    const file = basename(round.file)
    if (round.form.t !== last.form.t) {
      issues.push({ where: file, message: `is a ${round.form.t} page, but ${basename(last.file)} is a ${last.form.t} page` })
    }
    round.form.items.forEach((item, index) => {
      const earlier = owner.get(item.id)
      if (earlier !== undefined && earlier !== file) {
        issues.push({ where: `${file}: items[${index}] "${item.id}"`, message: `id "${item.id}" is already used in ${earlier}` })
      }
      owner.set(item.id, file)
    })
  }
  if (last.form.t === "grilling") {
    last.form.items.forEach((item, index) => {
      for (const dependency of item.depends ?? []) {
        if (dependency === item.id) issues.push({ where: `${basename(last.file)}: items[${index}] "${item.id}" › depends`, message: "an item cannot depend on itself" })
        else if (!owner.has(dependency)) {
          issues.push({ where: `${basename(last.file)}: items[${index}] "${item.id}" › depends`, message: `"${dependency}" is not an item id in this round or an earlier one` })
        }
      }
    })
  }
  if (issues.length > 0) throw new CheckError(issues)
}

const md = (value: string | undefined) => (value === undefined ? undefined : inlineMarkdown(value))

function optionView(name: string, option: Option, rec: string | undefined, preselect: boolean | undefined) {
  const recommended = option.id === rec
  return { name, id: option.id, label: md(option.label), reason: md(option.reason), recommended, checked: recommended && preselect === true }
}

function pickLabel(opts: Option[], pick: string | string[] | undefined): string | undefined {
  if (pick === undefined) return undefined
  if (Array.isArray(pick)) return pick.map((one) => pickLabel(opts, one)).join(", ")
  if (pick in BUILT_IN_PICKS) return BUILT_IN_PICKS[pick === "dunno" ? "dunno" : "other"]
  return opts.find((option) => option.id === pick)?.label ?? `${pick}, not an option any more`
}

function checklistView(form: ChecklistForm) {
  const href = (path: string) => (/^[a-z]+:\/\//i.test(path) || form.base === undefined ? path : `${form.base.replace(/\/$/, "")}${path}`)
  return {
    base: form.base,
    facts: (form.facts ?? []).map((fact) => md(fact)),
    items: form.items.map((item) => ({
      id: item.id,
      title: md(item.title),
      text: md(item.text),
      block: item.block,
      note: md(item.note),
      where: (item.where ?? []).map((where) => ({ href: href(where.path), path: where.path, hint: md(where.hint) })),
      q: md(item.q),
      opts: (item.opts ?? []).map((option) => optionView(`${item.id}.pick`, option, item.rec, item.preselect)),
    })),
  }
}

const TYPE_LABELS = { checklist: "Checklist", grilling: "Decisions", questionnaire: "Questionnaire", decision: "Decision" } as const
const PRIORITY_LABELS = { blocker: "Blocker", important: "Important", nice: "Nice to have" } as const

function grillingView(form: GrillingForm, rounds: Round[]) {
  const answered = new Map<string, { q: string; answer?: string; note?: string }>()
  for (const round of rounds) {
    if (round.form.t !== "grilling") continue
    for (const item of round.form.items) {
      const answer = round.answers?.answers[item.id]
      answered.set(item.id, { q: item.q, answer: pickLabel(item.opts, answer?.pick), note: answer?.note })
    }
  }
  return {
    recipient: form.from !== undefined || form.to !== undefined || form.purpose !== undefined || form.deadline !== undefined,
    from: form.from,
    to: form.to,
    purpose: md(form.purpose),
    deadline: form.deadline,
    items: form.items.map((item, number) => ({
      id: item.id,
      prio: item.prio,
      prioLabel: PRIORITY_LABELS[item.prio],
      q: md(item.q),
      why: md(item.why),
      refs: item.refs ?? [],
      depends: (item.depends ?? []).map((dependency) => {
        const earlier = answered.get(dependency)
        return { id: dependency, q: md(earlier?.q), answer: md(earlier?.answer), note: md(earlier?.note) }
      }),
      opts: [
        ...item.opts.map((option) => optionView(`${item.id}.pick`, option, item.rec, item.preselect)),
        ...builtInPicks(`${item.id}.pick`),
      ],
      number: number + 1,
    })),
  }
}

function builtInPicks(name: string) {
  return Object.entries(BUILT_IN_PICKS).map(([pickId, label]) => ({ name, id: pickId, label: md(label), builtIn: true }))
}

/** The page tells the reader that the recommendation comes first. */
function recFirst(opts: Option[], rec: string | undefined): Option[] {
  return [...opts.filter((option) => option.id === rec), ...opts.filter((option) => option.id !== rec)]
}

/** Groups items under their theme. An item without a theme joins the group before it. */
function questionnaireView(form: QuestionnaireForm) {
  const groups: { key?: string; theme?: string; items: unknown[] }[] = []
  for (const item of form.items) {
    const last = groups[groups.length - 1]
    const view = {
      id: item.id,
      q: md(item.q),
      why: md(item.why),
      guess: md(item.guess),
      open: item.opts === undefined,
      opts: item.opts === undefined ? [] : [...recFirst(item.opts, item.rec).map((option) => optionView(`${item.id}.pick`, option, item.rec, item.preselect)), ...builtInPicks(`${item.id}.pick`)],
    }
    if (last === undefined || (item.theme !== undefined && item.theme !== last.key)) groups.push({ key: item.theme, theme: md(item.theme), items: [view] })
    else last.items.push(view)
  }
  return {
    recipient: true,
    from: form.from,
    to: form.to,
    purpose: md(form.purpose),
    deadline: form.deadline,
    minutes: form.minutes,
    context: md(form.context),
    groups,
    more: `${MORE}.note`,
  }
}

/** The table of options against drivers, and the option cards with MADR's good and bad. */
function decisionView(form: DecisionForm) {
  return {
    recipient: form.from !== undefined || form.to !== undefined || form.purpose !== undefined || form.deadline !== undefined,
    from: form.from,
    to: form.to,
    purpose: md(form.purpose),
    deadline: form.deadline,
    items: form.items.map((item) => ({
      id: item.id,
      q: md(item.q),
      context: md(item.context),
      input: item.multi === true ? "checkbox" : "radio",
      drivers: item.drivers.map(md),
      rows: item.options.map((option) => ({
        label: md(option.label),
        recommended: option.id === item.rec,
        cells: option.scores.map((value) => ({ value, squares: [1, 2, 3, 4, 5].map((step) => step <= value) })),
      })),
      opts: [
        ...item.options.map((option) => ({
          ...optionView(`${item.id}.pick`, { id: option.id, label: option.label, reason: option.id === item.rec ? item.reason : undefined }, item.rec, false),
          pc: [...(option.good ?? []).map((line) => ({ kind: "good", line: md(line) })), ...(option.bad ?? []).map((line) => ({ kind: "bad", line: md(line) }))],
        })),
        ...builtInPicks(`${item.id}.pick`),
      ],
    })),
  }
}

/** The options of any item, so a view of earlier rounds reads every page type. */
function optsOf(item: Form["items"][number]): Option[] {
  return "options" in item ? item.options : (item.opts ?? [])
}

/** The rounds with their answers, for the folded history or the done page. */
function historyView(rounds: Round[]) {
  return rounds.map((round, index) => ({
    round: index + 1,
    title: md(round.form.title),
    items: round.form.items.map((item) => {
      const answer = round.answers?.answers[item.id]
      const opts = optsOf(item)
      return {
        id: item.id,
        q: md("title" in item ? (item.q ?? item.title) : item.q),
        answer: md(pickLabel(opts, answer?.pick) ?? (answer?.done ? "Done" : answer?.note)),
        note: md(answer?.pick !== undefined || answer?.done ? answer.note : undefined),
      }
    }),
  }))
}

function asset(path: string): string {
  return readFileSync(join(HERE, path), "utf8")
}

/** Renders the last round of a chain to HTML. Pure apart from reading the bundled assets. */
export function renderPage(rounds: Round[]): string {
  const round = rounds[rounds.length - 1]
  const { form } = round
  const answersName = `${round.name}.answers.json`
  const meta = { t: form.t, id: form.id, form: round.hash, file: answersName }
  const typeView =
    form.t === "checklist" ? checklistView(form)
    : form.t === "grilling" ? grillingView(form, rounds)
    : form.t === "questionnaire" ? questionnaireView(form)
    : decisionView(form)
  const view = {
    ...typeView,
    t: form.t,
    interactive: true,
    typeLabel: TYPE_LABELS[form.t],
    title: md(form.title),
    plainTitle: form.title,
    intro: md(form.intro),
    summary: form.summary?.map(md),
    round: rounds.length,
    multiRound: rounds.length > 1,
    total: form.items.length,
    progressLabel: form.t === "checklist" ? "Done" : "Answered",
    countPicks: form.t !== "checklist",
    history: historyView(rounds.slice(0, -1)),
    css: asset("assets/base.css"),
    js: asset("assets/app.js"),
    meta: JSON.stringify(meta).replace(/</g, "\\u003c"),
  }
  const partials = {
    body: compile(asset(`types/${form.t}/template.html`), `types/${form.t}/template.html`),
    history: compile(asset("assets/history.html"), "assets/history.html"),
    options: compile(asset("assets/options.html"), "assets/options.html"),
  }
  return render(compile(asset("assets/layout.html"), "assets/layout.html"), view, partials)
}

/** Checks a form file and writes its page. Returns the page path. */
export function build(file: string): string {
  const rounds = loadChain(file)
  const html = renderPage(rounds)
  const { html: out } = pathsOf(file)
  writeFileSync(out, html)
  return out
}

/** The page for the end of a chain: every decision of every round and its answer, with nothing left to submit. */
export function renderDone(rounds: Round[]): string {
  const last = rounds[rounds.length - 1]
  const all = historyView(rounds)
  const picks = rounds.flatMap((round) => round.form.items.map((item) => round.answers?.answers[item.id]))
  const open = picks.filter((answer) => answer === undefined || answer.pick === "dunno" || (answer.pick === undefined && answer.note === undefined)).length
  const view = {
    t: "done",
    interactive: false,
    typeLabel: "Done",
    title: md(last.form.title),
    plainTitle: last.form.title,
    intro: open === 0 ? "Every decision is settled." : `${picks.length - open} of ${picks.length} decisions are settled. ${open} stay open.`,
    rounds: all.map((round) => ({ ...round, title: rounds.length > 1 ? `Round ${round.round}: ${round.title}` : round.title })),
    css: asset("assets/base.css"),
  }
  const partials = { body: compile(asset("assets/done.html"), "assets/done.html"), history: compile("", "history") }
  return render(compile(asset("assets/layout.html"), "assets/layout.html"), view, partials)
}

/** Writes `done.html` next to the form, from the chain that ends at `file`. Returns the page path. */
export function buildDone(file: string): string {
  const rounds = loadChain(file)
  const last = rounds[rounds.length - 1]
  const { answers } = pathsOf(file)
  if (existsSync(answers)) {
    const saved = withFile(basename(answers), () => parseAnswers(parseJson(readFileSync(answers, "utf8")), "top level"))
    if (saved.form !== last.hash) {
      throw new CheckError([{ where: basename(file), message: `changed after ${basename(answers)} was saved. Render ${last.name} again, and let the user answer it` }])
    }
    last.answers = saved
  }
  const html = renderDone(rounds)
  const out = join(dirname(file), "done.html")
  writeFileSync(out, html)
  return out
}
