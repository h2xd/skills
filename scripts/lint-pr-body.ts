#!/usr/bin/env node
/**
 * Checks a PR body opens with `Closes #<n>`, per the Pull requests section of
 * CLAUDE.md. Merging is what closes a ticket, and the keyword is what makes
 * that automatic. The keyword comes from agents.config.json.
 *
 * Run by .github/workflows/pr.yml, which passes the PR body as PR_BODY.
 * Usage: PR_BODY="$body" node scripts/lint-pr-body.ts
 */

import { config } from "./config.ts"

const KEYWORD = config.pullRequests.closingKeyword
const CLOSES = new RegExp(`^${KEYWORD} #\\d+$`)
const OTHER_KEYWORD =
  /^(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\b/i
const MULTIPLE_ON_ONE_LINE = new RegExp(`^${KEYWORD} #\\d+.*#\\d+`)
const EXPECTED = `\`${KEYWORD} #<n>\``

const lines = (process.env.PR_BODY ?? "").replace(/\r\n/g, "\n").split("\n")
const errors: string[] = []

let index = 0
while (index < lines.length && lines[index].trim() === "") index++

if (index >= lines.length) {
  errors.push(`the PR body is empty. It must open with ${EXPECTED}, on its own line.`)
} else {
  let tickets = 0
  while (index < lines.length && lines[index].trim() !== "") {
    const line = lines[index].trim()
    if (MULTIPLE_ON_ONE_LINE.test(line)) {
      errors.push(
        `line ${index + 1} names more than one ticket on one line: "${line}"\n` +
          `    GitHub links only the number right after the keyword. Write one ${EXPECTED} line per ticket.`,
      )
    } else if (CLOSES.test(line)) {
      tickets++
    } else if (OTHER_KEYWORD.test(line)) {
      errors.push(
        `line ${index + 1} uses a different closing keyword: "${line}"\n` +
          `    CLAUDE.md standardizes on ${EXPECTED}. Use that word, not a synonym.`,
      )
    } else {
      break
    }
    index++
  }
  if (tickets === 0) {
    errors.push(
      `the PR body must open with ${EXPECTED} on its own line, before anything else.\n` +
        '    A prose reference ("resolves #64") reads the same to a human and does nothing to GitHub.',
    )
  }
}

if (errors.length > 0) {
  console.error("\nlint-pr-body: the PR body does not follow the convention.\n")
  for (const error of errors) console.error(`  - ${error}\n`)
  console.error("See the Pull requests section of CLAUDE.md.\n")
  process.exit(1)
}

console.log("The PR body opens with a closing keyword.")
