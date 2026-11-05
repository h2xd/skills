#!/usr/bin/env node
/**
 * Checks one commit message against the convention in CLAUDE.md.
 *
 * Run by .githooks/commit-msg with the message file as argv[2]. The type and
 * scope vocabularies in agents.config.json are closed on purpose: a scope only
 * helps a future session if there are few enough of them to hold in mind at
 * once. Widening either set takes a decision record.
 */

import { config } from "./config.ts"
import { readFile } from "node:fs/promises"

const TYPES = config.commits.types
const SCOPES = config.commits.scopes
const SUBJECT_MAX = config.commits.subjectMax
const MAX_PARAGRAPHS = config.commits.maxBodyParagraphs

const SUBJECT = new RegExp(
  `^(${TYPES.join("|")})(\\((${SCOPES.join("|")})\\))?!?: (.+)$`,
)

// A trailer block ends the body; paragraphs are counted before the first one.
const TRAILER = /^(Refs|Closes|Fixes|Co-Authored-By|BREAKING CHANGE):/i

const path = process.argv[2]
if (!path) {
  console.error("lint-commit-message: no message file given")
  process.exit(2)
}

const raw = await readFile(path, "utf8")
const lines = raw
  .split("\n")
  .filter((line) => !line.startsWith("#"))
  .join("\n")
  .trimEnd()
  .split("\n")

const subject = lines[0] ?? ""

// Merges, reverts and fixups are written by git, not by us.
if (/^(Merge|Revert|fixup!|squash!)/.test(subject)) process.exit(0)

const errors: string[] = []

if (!SUBJECT.test(subject)) {
  errors.push(
    [
      "the subject must read `type(scope): summary`",
      `    type   one of: ${TYPES.join(", ")}`,
      `    scope  optional, one of: ${SCOPES.join(", ")}`,
      `    got:   ${subject}`,
    ].join("\n"),
  )
}

if (subject.length > SUBJECT_MAX) {
  errors.push(
    `the subject is ${subject.length} characters, at most ${SUBJECT_MAX} allowed`,
  )
}

if (lines.length > 1 && lines[1].trim() !== "") {
  errors.push("the line after the subject must be blank")
}

const rest = lines.slice(2)
const bodyEnd = rest.findIndex((line) => TRAILER.test(line))
const body = (bodyEnd === -1 ? rest : rest.slice(0, bodyEnd)).join("\n").trim()

if (body === "") {
  errors.push(
    [
      "the body is empty. Write one paragraph saying what changed and why.",
      "    The commit history is what a future session reads to rebuild context.",
    ].join("\n"),
  )
} else {
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim() !== "")
  if (paragraphs.length > MAX_PARAGRAPHS) {
    errors.push(
      `the body has ${paragraphs.length} paragraphs, at most ${MAX_PARAGRAPHS} allowed (one, unless the change genuinely has two parts)`,
    )
  }
}

if (errors.length > 0) {
  console.error(
    "\ncommit-msg: the commit message does not follow the convention.\n",
  )
  for (const error of errors) console.error(`  - ${error}\n`)
  console.error(
    "See the Commits section of CLAUDE.md. To commit past this: git commit --no-verify\n",
  )
  process.exit(1)
}

