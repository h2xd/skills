/**
 * The fields of every page type, defined once. The checker parses with these
 * shapes and `spec.ts` prints their signatures, so the two cannot drift.
 */

import { flag, id, list, oneOf, orBare, record, score, text, tuple, type Infer, type RecordShape } from "./shape.ts"

export const Where = tuple("Where", ["path"], ["hint"])

/** An option. A bare string is its own id and label. */
export const Opt = orBare(tuple("Opt", ["id", "label"], ["reason"]), (value) => ({ id: value, label: value }))

export const Item = record(
  "Item",
  { id, title: text, text },
  { q: text, opts: list(Opt, { min: 2, max: 6 }), rec: text, preselect: flag, block: text, where: list(Where), note: text },
)

export const Checklist = record(
  "Checklist",
  { t: oneOf("checklist"), id, title: text, intro: text, items: list(Item, { min: 1 }) },
  { summary: list(text, { min: 1, max: 5 }), base: text, facts: list(text) },
)

export const PRIORITIES = ["blocker", "important", "nice"] as const

export const Q = record(
  "Q",
  { id, prio: oneOf(...PRIORITIES), q: text, why: text, opts: list(Opt, { min: 2, max: 4 }) },
  { rec: text, preselect: flag, refs: list(text), depends: list(id) },
)

export const Grilling = record(
  "Grilling",
  { t: oneOf("grilling"), id, title: text, intro: text, items: list(Q, { min: 1 }) },
  { summary: list(text, { min: 1, max: 5 }), previous: id, from: text, to: text, purpose: text, deadline: text },
)

export const Ask = record(
  "Ask",
  { id, q: text },
  { theme: text, why: text, opts: list(Opt, { min: 2, max: 4 }), rec: text, preselect: flag, guess: text },
)

export const Questionnaire = record(
  "Questionnaire",
  { t: oneOf("questionnaire"), id, title: text, intro: text, to: text, purpose: text, items: list(Ask, { min: 1, max: 12 }) },
  { summary: list(text, { min: 1, max: 5 }), previous: id, from: text, deadline: text, minutes: text, context: text },
)

/** An option of a decision, with one score per driver. `good` and `bad` are MADR's pros and cons. */
export const Considered = record(
  "Considered",
  { id, label: text, scores: list(score, { min: 1, max: 6 }) },
  { good: list(text, { max: 4 }), bad: list(text, { max: 4 }) },
)

/** One hard choice, with MADR's field names, so h2xd:docs-adr writes the record from it. */
export const Choice = record(
  "Choice",
  { id, q: text, context: text, drivers: list(text, { min: 1, max: 6 }), options: list(Considered, { min: 2, max: 5 }) },
  { rec: text, reason: text, multi: flag },
)

export const Decision = record(
  "Decision",
  { t: oneOf("decision"), id, title: text, intro: text, items: list(Choice, { min: 1, max: 1 }) },
  { summary: list(text, { min: 1, max: 5 }), from: text, to: text, purpose: text, deadline: text },
)

/** The id of the "Anything else?" field the questionnaire page adds at the end. */
export const MORE = "more"

/** Option ids the grilling and questionnaire pages add to every question with options. */
export const BUILT_IN_PICKS = { dunno: "I don't know", other: "Something else" } as const

export const PAGES = { checklist: Checklist, grilling: Grilling, questionnaire: Questionnaire, decision: Decision } as const

export type PageType = keyof typeof PAGES
export type ChecklistForm = Infer<typeof Checklist>
export type GrillingForm = Infer<typeof Grilling>
export type QuestionnaireForm = Infer<typeof Questionnaire>
export type DecisionForm = Infer<typeof Decision>
export type Form = ChecklistForm | GrillingForm | QuestionnaireForm | DecisionForm
export type Option = Infer<typeof Opt>

/** The helper shapes each page type uses, in the order the spec prints them. */
export const HELPERS: Record<PageType, RecordShape<unknown>[]> = {
  checklist: [Item, Where, Opt],
  grilling: [Q, Opt],
  questionnaire: [Ask, Opt],
  decision: [Choice, Considered],
}

/** The rules the shapes cannot express. The spec prints them, and `check.ts` enforces each one. */
export const RULES: Record<PageType, string[]> = {
  checklist: [
    "Item ids are unique. Option ids are unique per item.",
    "q and opts come together. rec names an option id. preselect needs rec.",
  ],
  grilling: [
    "Item ids are unique across the whole round chain. Option ids are unique per item.",
    `rec names an option id. preselect needs rec. Option ids "dunno" and "other" are taken: the page adds "${BUILT_IN_PICKS.dunno}" and "${BUILT_IN_PICKS.other}".`,
    'Round 2 and later set previous to the earlier file name without ".form.json", such as "round-1". depends names ids from this round or an earlier one.',
  ],
  questionnaire: [
    `Item ids are unique across the whole round chain, and "${MORE}" is taken: the page ends with "Anything else?".`,
    'An item without opts is an open question. guess is our best guess for the reader to correct, only on an open question.',
    'rec names an option id, and the page shows it first. preselect needs rec. Option ids are unique per item, and "dunno" and "other" are taken.',
    "An item with a new theme starts a heading. The items after it without a theme stay under that heading.",
    'Round 2 and later set previous to the earlier file name without ".form.json", such as "round-1".',
  ],
  decision: [
    "One decision per page, in one round. Ask follow-up questions in a grilling round.",
    "drivers are the criteria. Each option has one score per driver, in the same order: 1 is poor, 5 is strong.",
    `rec names an option id, and reason says why. multi: true lets the reader pick several options. Option ids are unique, and "dunno" and "other" are taken.`,
  ],
}

export function isPageType(value: unknown): value is PageType {
  return typeof value === "string" && value in PAGES
}
