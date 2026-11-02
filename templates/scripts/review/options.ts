/**
 * The A/B/C choice block that `review-pr` puts in a comment with
 * more than one reasonable fix, and the engineer's reply that picks one.
 *
 *   - Suggestion A (recommended): <fix>
 *   - Suggestion B: <fix>
 *
 *   Note: Reply with A or B. If you reply with nothing Suggestion A will be used.
 */

export type Option = { letter: string; recommended: boolean; fix: string }

export type Choice =
  | { letter: string; source: "reply"; login: string }
  | { letter: string; source: "default" }
  | { source: "no-letter"; login: string }

export type CommentBody = { login: string; body: string }

const OPTION_LINE = /^- Suggestion ([A-Z])( \(recommended\))?: (.*)$/
const REPLY_LINE = /^(?:suggestion\s+)?([a-c])\.?$/i
const NOTE_PREFIX = "Note: Reply with "
const NOTE_SUFFIX = ". If you reply with nothing Suggestion A will be used."
const ALLOWED_LETTERS = ["A", "B", "C"]
const MINIMUM_OPTIONS = 2

export function parseOptions(body: string): Option[] {
  return body.split("\n").flatMap((line) => {
    const match = OPTION_LINE.exec(line.trimEnd())
    if (!match) return []
    return [
      { letter: match[1], recommended: match[2] !== undefined, fix: match[3] },
    ]
  })
}

/**
 * The latest pick among replies to the first comment. Replies by the first
 * comment's author don't count. With options and no reply at all, A is the
 * choice. A reply without a letter means the engineer wants something else,
 * so the item goes through normal triage instead of defaulting to A.
 * Returns undefined when the first comment has no options.
 */
export function parseChoice(comments: CommentBody[]): Choice | undefined {
  const [first, ...replies] = comments
  if (!first) return undefined
  const options = parseOptions(first.body)
  if (options.length === 0) return undefined

  const letters = options.map((option) => option.letter)
  const otherReplies = replies.filter((reply) => reply.login !== first.login)
  const picks = otherReplies.flatMap((reply) => {
    const firstLine = reply.body.trim().split("\n")[0].trim()
    const letter = REPLY_LINE.exec(firstLine)?.[1].toUpperCase()
    return letter && letters.includes(letter)
      ? [{ letter, login: reply.login }]
      : []
  })
  const latest = picks.at(-1)
  if (latest)
    return { letter: latest.letter, source: "reply", login: latest.login }
  const lastReply = otherReplies.at(-1)
  if (lastReply) return { source: "no-letter", login: lastReply.login }
  return { letter: "A", source: "default" }
}

export function formatOptionsLine(options: Option[]): string {
  return options
    .map((option) =>
      option.recommended ? `${option.letter} (recommended)` : option.letter,
    )
    .join(", ")
}

export function formatChoiceLine(choice: Choice): string {
  if (choice.source === "reply") {
    return `${choice.letter} (replied by ${choice.login})`
  }
  if (choice.source === "no-letter") {
    return `none (${choice.login} replied without a letter, triage as usual)`
  }
  return `${choice.letter} (default, no reply)`
}

function expectedNote(count: number): string {
  const letters = ALLOWED_LETTERS.slice(0, count)
  const list =
    count === MINIMUM_OPTIONS
      ? letters.join(" or ")
      : `${letters.slice(0, -1).join(", ")}, or ${letters.at(-1)}`
  return `${NOTE_PREFIX}${list}${NOTE_SUFFIX}`
}

/** Problems with the choice block in a drafted comment. Empty when it has none or is exact. */
export function validateChoiceBlock(body: string): string[] {
  const options = parseOptions(body)
  if (options.length === 0) {
    return body.includes("- Suggestion ")
      ? ['an option line does not match "- Suggestion X: <fix>"']
      : []
  }

  const problems: string[] = []
  const expectedLetters = ALLOWED_LETTERS.slice(0, options.length)
  if (
    options.length < MINIMUM_OPTIONS ||
    options.length > ALLOWED_LETTERS.length
  ) {
    problems.push(`expected 2 or 3 options, found ${options.length}`)
  } else if (
    options.some((option, index) => option.letter !== expectedLetters[index])
  ) {
    problems.push(
      `option labels are ${options.map((option) => option.letter).join(", ")}, expected ${expectedLetters.join(", ")}`,
    )
  }
  options.forEach((option, index) => {
    if (option.recommended !== (index === 0)) {
      problems.push(
        index === 0
          ? "option A must be marked (recommended)"
          : `option ${option.letter} must not be marked (recommended)`,
      )
    }
    if (option.fix.trim() === "") {
      problems.push(`option ${option.letter} has no fix text`)
    }
  })

  const noteLines = body
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("Note:"))
  const note = expectedNote(options.length)
  if (!noteLines.includes(note)) {
    problems.push(`the note line must read exactly: ${note}`)
  }
  return problems
}

export type DraftComment = { path: string; line: number; body: string }

/** One problem per line, prefixed with the comment's location. */
export function validateDraftComments(comments: DraftComment[]): string[] {
  return comments.flatMap((comment) =>
    validateChoiceBlock(comment.body).map(
      (problem) => `${comment.path}:${comment.line}: ${problem}`,
    ),
  )
}
