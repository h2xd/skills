/** Pure helpers behind `node scripts/skills.ts`: the rows of the Skills page. */

export type SkillRow = {
  skill: string
  /** The technology a Technology skill covers, "-" for any other skill. */
  technology: string
  /** The date of the last review, as YYYY-MM-DD. */
  updated: string
  /** The date the next review is due, as YYYY-MM-DD. */
  due: string
}

const NO_TECHNOLOGY = "-"
const TABLE_HEADER = "| Skill | Technology | Updated | Review due |"
const TABLE_RULE = "|---|---|---|---|"
const ROW = /^\| ([^|]+?) \| ([^|]+?) \| (\d{4}-\d{2}-\d{2}) \| (\d{4}-\d{2}-\d{2}) \|$/

export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

export function parsePage(text: string): SkillRow[] {
  return text
    .split("\n")
    .map((line) => line.match(ROW))
    .filter((match) => match !== null)
    .map(([, skill, technology, updated, due]) => ({ skill, technology, updated, due }))
}

/** Keeps the row of each known skill, adds a row for a new one and drops a row of a deleted one. */
export function syncRows(
  rows: SkillRow[],
  skills: string[],
  today: string,
  intervalDays: number,
): SkillRow[] {
  return skills
    .toSorted()
    .map(
      (skill) =>
        rows.find((row) => row.skill === skill) ?? {
          skill,
          technology: NO_TECHNOLOGY,
          updated: today,
          due: addDays(today, intervalDays),
        },
    )
}

/** Sets the review date to `today` and the due date one interval later. */
export function markReviewed(
  rows: SkillRow[],
  skill: string,
  today: string,
  intervalDays: number,
): SkillRow[] {
  if (!rows.some((row) => row.skill === skill)) throw new Error(`no row for ${skill}`)
  return rows.map((row) =>
    row.skill === skill
      ? {
          skill,
          technology: row.technology,
          updated: today,
          due: addDays(today, intervalDays),
        }
      : row,
  )
}

/** The rows whose review is due on `today` or earlier, oldest due date first. */
export function dueSkills(rows: SkillRow[], today: string): SkillRow[] {
  return rows
    .filter((row) => row.due <= today)
    .toSorted((a, b) => a.due.localeCompare(b.due) || a.skill.localeCompare(b.skill))
}

function defaultPage(today: string): string {
  return [
    "---",
    "type: Agent Config",
    "title: Skills",
    "description: The repo-local skills, the technology each one covers, and when its review is due.",
    "tags: [agents, skills]",
    `generated: { by: "scripts/skills.ts", at: "${today}" }`,
    "---",
    "",
    "# Skills",
    "",
    "One row per repo-local skill. `node scripts/skills.ts` keeps the table.",
  ].join("\n")
}

function tableLines(rows: SkillRow[]): string[] {
  return [
    TABLE_HEADER,
    TABLE_RULE,
    ...rows.map(
      (row) => `| ${row.skill} | ${row.technology} | ${row.updated} | ${row.due} |`,
    ),
  ]
}

/** The page with `rows` as its table. The text around the table of `existing` stays. */
export function formatPage(
  rows: SkillRow[],
  today: string,
  existing: string | null,
): string {
  const lines = (existing ?? "").split("\n")
  const start = lines.indexOf(TABLE_HEADER)
  if (start === -1) {
    return `${[existing === null ? defaultPage(today).trimEnd() : existing.trimEnd(), "", ...tableLines(rows)].join("\n")}\n`
  }
  let end = start
  while (end < lines.length && lines[end].startsWith("|")) end++
  return [...lines.slice(0, start), ...tableLines(rows), ...lines.slice(end)].join("\n")
}
